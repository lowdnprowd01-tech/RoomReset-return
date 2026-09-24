import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Routes
app.post("/api/analyze-room", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", roomType = "Living Room", userNotes = "" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Room photo (imageBase64) is required." });
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ""),
      },
    };

    const prompt = `You are an expert professional organizer, interior designer, and decluttering coach.
Analyze this photo of a ${roomType}. ${userNotes ? `Additional user notes: ${userNotes}` : ""}

Provide a rigorous, constructive, and comprehensive organization and decluttering assessment in JSON format matching this exact schema:
{
  "roomName": "string (e.g. Modern Living Room)",
  "clutterScore": number (0 to 100, where 100 is completely chaotic/cluttered and 0 is pristine minimalist),
  "summary": "string (2-3 sentences summarizing the overall state and biggest opportunity for transformation)",
  "estimatedTimeToComplete": "string (e.g. 2 hours)",
  "hotspots": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "severity": "high" | "medium" | "low"
    }
  ],
  "actionSteps": [
    {
      "id": "string",
      "stepNumber": number,
      "title": "string",
      "category": "Keep" | "Donate" | "Sell" | "Trash" | "Organize",
      "description": "string"
    }
  ],
  "organizationPlan": [
    {
      "zoneName": "string",
      "recommendation": "string",
      "containersNeeded": "string",
      "layoutTip": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [imagePart, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roomName: { type: Type.STRING },
            clutterScore: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            estimatedTimeToComplete: { type: Type.STRING },
            hotspots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING, description: "high, medium, or low" },
                },
                required: ["id", "title", "description", "severity"],
              },
            },
            actionSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING, description: "Keep, Donate, Sell, Trash, or Organize" },
                  description: { type: Type.STRING },
                },
                required: ["id", "stepNumber", "title", "category", "description"],
              },
            },
            organizationPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  zoneName: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                  containersNeeded: { type: Type.STRING },
                  layoutTip: { type: Type.STRING },
                },
                required: ["zoneName", "recommendation", "containersNeeded", "layoutTip"],
              },
            },
          },
          required: ["roomName", "clutterScore", "summary", "estimatedTimeToComplete", "hotspots", "actionSteps", "organizationPlan"],
        },
      },
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No response generated from Gemini AI.");
    }

    const parsedData = JSON.parse(textResult);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in /api/analyze-room:", error);
    res.status(500).json({ error: error.message || "Failed to analyze room." });
  }
});

// NEW ENDPOINT: Reset room items (identify scattered items & proper homes + generate after photo)
app.post("/api/reset-room-items", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", roomType = "Living Room" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Image is required." });
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ""),
      },
    };

    const prompt = `Analyze this photo of scattered items and clutter in a ${roomType}.
Identify the specific loose items (e.g. shoes, pencils, books, cables, toys, cosmetics) and specify their proper organized home (e.g., shoe rack, pencil holder, bookshelf, storage bin).
Return JSON matching this exact schema:
{
  "roomType": "string",
  "itemInventory": [
    {
      "itemName": "string",
      "quantityOrCount": "string",
      "properHome": "string",
      "actionDescription": "string"
    }
  ],
  "imagePromptForOrganizedResult": "string (A detailed visual description of this room perfectly tidy with all these items returned to their correct homes)"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roomType: { type: Type.STRING },
            itemInventory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING },
                  quantityOrCount: { type: Type.STRING },
                  properHome: { type: Type.STRING },
                  actionDescription: { type: Type.STRING },
                },
                required: ["itemName", "quantityOrCount", "properHome", "actionDescription"],
              },
            },
            imagePromptForOrganizedResult: { type: Type.STRING },
          },
          required: ["roomType", "itemInventory", "imagePromptForOrganizedResult"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");

    // Generate After image using gemini-3.1-flash-lite-image
    let generatedAfterImageUrl = "";
    try {
      const imgRes = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [
            {
              text: `A pristine, beautifully organized ${roomType} where every stray item has been put away into its proper home: ${parsedData.imagePromptForOrganizedResult}, architectural interior photography, warm natural lighting, immaculate order.`,
            },
          ],
        },
        config: {
          imageConfig: { aspectRatio: "16:9" },
        },
      });

      if (imgRes.candidates?.[0]?.content?.parts) {
        for (const p of imgRes.candidates[0].content.parts) {
          if (p.inlineData?.data) {
            generatedAfterImageUrl = `data:image/png;base64,${p.inlineData.data}`;
            break;
          }
        }
      }
    } catch (imgErr) {
      console.error("Image generation error:", imgErr);
    }

    res.json({
      ...parsedData,
      generatedAfterImageUrl,
    });
  } catch (error: any) {
    console.error("Error in /api/reset-room-items:", error);
    res.status(500).json({ error: error.message || "Failed to process item reset." });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const chat = ai.chats.create({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: "You are 'DeclutterIQ Coach', a world-class professional home organizer, Marie Kondo-trained decluttering specialist, and interior design consultant. You give warm, practical, actionable, and encouraging advice on organizing spaces, sorting items into keep/donate/sell/trash, styling shelves, maximizing vertical storage, and maintaining tidy habits. Keep responses concise, structured, and easy to read.",
      },
      history: history.map((h: any) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage({ message });
    res.json({ reply: result.text || "I'm here to help you organize! Could you clarify?" });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Chat error." });
  }
});

app.post("/api/generate-concept", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            text: `A beautifully organized, minimalist, and serene interior design concept of ${prompt}, pristine layout, architectural digest style, warm lighting, perfect order.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    let imageUrl = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      throw new Error("Failed to generate concept image.");
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Error in /api/generate-concept:", error);
    res.status(500).json({ error: error.message || "Image generation failed." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
