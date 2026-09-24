/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  Trash2,
  HeartHandshake,
  DollarSign,
  Package,
  MessageSquare,
  Home,
  Clock,
  AlertTriangle,
  ChevronRight,
  Plus,
  RefreshCw,
  Layers,
  ArrowRight,
  Check,
  X,
  SlidersHorizontal,
  Lightbulb,
  Bookmark,
  Share2,
  ShieldCheck,
  Compass,
  RotateCcw,
  Download,
  Printer,
  Layout,
  Tag,
  Image as ImageIcon,
  Eye,
  Palette,
  Grid,
  Maximize2,
  SplitSquareHorizontal,
  FolderDown,
  Wand2,
  Sliders
} from "lucide-react";

// Types
interface Hotspot {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low" | string;
}

interface ActionStep {
  id: string;
  stepNumber: number;
  title: string;
  category: "Keep" | "Donate" | "Sell" | "Trash" | "Organize" | string;
  description: string;
  completed?: boolean;
}

interface OrganizationZone {
  zoneName: string;
  recommendation: string;
  containersNeeded: string;
  layoutTip: string;
}

interface RoomAnalysis {
  id: string;
  roomName: string;
  roomType: string;
  imageUrl: string;
  clutterScore: number;
  summary: string;
  estimatedTimeToComplete: string;
  hotspots: Hotspot[];
  actionSteps: ActionStep[];
  organizationPlan: OrganizationZone[];
  conceptImageUrl?: string;
  createdAt: string;
}

interface ItemInventoryEntry {
  itemName: string;
  quantityOrCount: string;
  properHome: string;
  actionDescription: string;
}

interface RoomResetResult {
  roomType: string;
  itemInventory: ItemInventoryEntry[];
  imagePromptForOrganizedResult: string;
  generatedAfterImageUrl?: string;
  originalImage: string;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

interface FloorPlanElement {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
  assignedItems: string[];
}

interface FloorPlanData {
  roomTitle: string;
  dimensions: string;
  recommendationSummary: string;
  elements: FloorPlanElement[];
  trafficPathways: { from: string; to: string; description: string }[];
}

interface CustomLabel {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  zone: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"analyze" | "rooms" | "reset" | "graphics" | "coach" | "guide">("analyze");
  const [roomType, setRoomType] = useState<string>("Living Room");
  const [userNotes, setUserNotes] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<RoomAnalysis | null>(null);
  const [savedRooms, setSavedRooms] = useState<RoomAnalysis[]>([]);
  const [completedStepIds, setCompletedStepIds] = useState<Record<string, boolean>>({});

  // Room Reset & Item Return state
  const [resetImage, setResetImage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetResult, setResetResult] = useState<RoomResetResult | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  // Graphics & Visual Studio Sub-tabs
  const [graphicsSubTab, setGraphicsSubTab] = useState<"image-gen" | "floorplan" | "labels" | "slider">("image-gen");
  
  // AI Concept Image Generator state
  const [conceptPrompt, setConceptPrompt] = useState<string>("Clean minimalist living room with custom built-in shelves and hidden shoe storage");
  const [conceptStyle, setConceptStyle] = useState<string>("Warm Japandi Minimalist");
  const [conceptAspectRatio, setConceptAspectRatio] = useState<"16:9" | "1:1" | "4:3">("16:9");
  const [generatedConcepts, setGeneratedConcepts] = useState<{ id: string; url: string; prompt: string; style: string }[]>([]);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState<boolean>(false);
  const [conceptError, setConceptError] = useState<string | null>(null);

  // 2D Floor Plan Graphics state
  const [floorPlanRoomType, setFloorPlanRoomType] = useState<string>("Living Room");
  const [floorPlanDimensions, setFloorPlanDimensions] = useState<string>("15ft x 18ft");
  const [isGeneratingFloorPlan, setIsGeneratingFloorPlan] = useState<boolean>(false);
  const [floorPlanData, setFloorPlanData] = useState<FloorPlanData | null>(null);
  const [selectedElement, setSelectedElement] = useState<FloorPlanElement | null>(null);
  const [floorPlanError, setFloorPlanError] = useState<string | null>(null);

  // Label Designer Graphics state
  const [labelTheme, setLabelTheme] = useState<"minimalist" | "kraft" | "slate" | "chalkboard" | "emerald">("minimalist");
  const [labelShape, setLabelShape] = useState<"rounded" | "pill" | "tag" | "modern">("rounded");
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>([
    { id: "1", title: "SHOES & SNEAKERS", subtitle: "TIERED RACK · ZONE A", iconName: "home", zone: "Entryway" },
    { id: "2", title: "PENCILS & PENS", subtitle: "DESKTOP ORGANIZER", iconName: "box", zone: "Home Office" },
    { id: "3", title: "TECH & CHARGERS", subtitle: "CABLE BASKET · BIN 03", iconName: "package", zone: "Media Center" },
    { id: "4", title: "BOOKS & JOURNALS", subtitle: "SHELF 02 · CATEGORY B", iconName: "bookmark", zone: "Living Room" },
    { id: "5", title: "DAILY LINENS", subtitle: "COTTON BASKET", iconName: "sparkles", zone: "Closet" },
    { id: "6", title: "SNACKS & GRAINS", subtitle: "AIRTIGHT PANTRY JAR", iconName: "home", zone: "Pantry" },
  ]);
  const [newLabelTitle, setNewLabelTitle] = useState<string>("");
  const [newLabelSubtitle, setNewLabelSubtitle] = useState<string>("");

  // AI Coach Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "Hello! I'm your DeclutterIQ Coach. I help you sort clutter, return shoes to racks, stationery to holders, and style spaces with serenity. Ask me anything about room organizing!",
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load saved rooms from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("declutteriq_rooms");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSavedRooms(parsed);
        if (parsed.length > 0 && !currentAnalysis) {
          setCurrentAnalysis(parsed[0]);
        }
      } catch (e) {
        console.error("Failed to parse saved rooms", e);
      }
    }
  }, []);

  // Initialize a default floor plan
  useEffect(() => {
    if (!floorPlanData) {
      setFloorPlanData({
        roomTitle: "DeclutterIQ Optimized Living Room",
        dimensions: "15ft x 18ft",
        recommendationSummary: "Open traffic corridors, perimeter wall-mounted shoe credenza, and centralized seating with integrated cable management.",
        elements: [
          {
            id: "door1",
            name: "Main Entryway Door",
            category: "door",
            x: 5,
            y: 80,
            width: 12,
            height: 12,
            color: "#64748b",
            label: "Entry Door (36\")",
            assignedItems: ["Entry flow"]
          },
          {
            id: "shoe_rack",
            name: "Tiered Shoe Rack & Bench",
            category: "storage",
            x: 20,
            y: 80,
            width: 25,
            height: 12,
            color: "#059669",
            label: "Shoe Storage Rack",
            assignedItems: ["Sneakers", "Boots", "House Slippers"]
          },
          {
            id: "sofa",
            name: "Minimalist Sectional Sofa",
            category: "furniture",
            x: 30,
            y: 35,
            width: 40,
            height: 25,
            color: "#334155",
            label: "Main Sofa & Rug Zone",
            assignedItems: ["Throw Blankets in Ottoman", "Floor Pillows"]
          },
          {
            id: "tv_unit",
            name: "Floating Media Credenza",
            category: "storage",
            x: 35,
            y: 8,
            width: 32,
            height: 10,
            color: "#0284c7",
            label: "Media & Cord Console",
            assignedItems: ["Hidden Cord Organizer", "Remote Caddy", "Game Consoles"]
          },
          {
            id: "desk_station",
            name: "Study & Stationery Nook",
            category: "station",
            x: 75,
            y: 65,
            width: 18,
            height: 25,
            color: "#d97706",
            label: "Desk & Stationery Station",
            assignedItems: ["Pencil Holder", "Notebooks", "Desktop Tray"]
          },
          {
            id: "bookshelf",
            name: "Vertical Bookshelf Tower",
            category: "storage",
            x: 78,
            y: 15,
            width: 15,
            height: 25,
            color: "#7c3aed",
            label: "Bookshelf & Baskets",
            assignedItems: ["Hardcovers", "Woven Storage Bins", "Decor"]
          }
        ],
        trafficPathways: [
          { from: "Entry Door", to: "Shoe Rack", description: "Direct 3ft landing strip for footwear return" },
          { from: "Entryway", to: "Main Seating", description: "Unobstructed 4ft main circulation corridor" },
          { from: "Sofa", to: "Desk Station", description: "Clear secondary passage" }
        ]
      });
    }
  }, [floorPlanData]);

  const saveRoomToStorage = (analysis: RoomAnalysis) => {
    const updated = [analysis, ...savedRooms.filter((r) => r.id !== analysis.id)];
    setSavedRooms(updated);
    localStorage.setItem("declutteriq_rooms", JSON.stringify(updated));
  };

  useEffect(() => {
    if (activeTab === "coach") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setAnalysisError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleResetImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setResetImage(reader.result as string);
      setResetError(null);
    };
    reader.readAsDataURL(file);
  };

  const selectSampleRoom = (type: string) => {
    let sampleImg = "";
    if (type === "Living Room") {
      sampleImg = "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1000&auto=format&fit=crop";
    } else if (type === "Home Office") {
      sampleImg = "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1000&auto=format&fit=crop";
    } else {
      sampleImg = "https://images.unsplash.com/photo-1558997519-83ea9252edf8?q=80&w=1000&auto=format&fit=crop";
    }
    setSelectedImage(sampleImg);
    setRoomType(type);
    setAnalysisError(null);
  };

  const selectSampleReset = (type: string) => {
    const sampleImg = type === "Living Room"
      ? "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1000&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1000&auto=format&fit=crop";
    setResetImage(sampleImg);
    setResetError(null);
  };

  // Run Room Analysis
  const runAnalysis = async () => {
    if (!selectedImage) {
      setAnalysisError("Please upload or select a room photo first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch("/api/analyze-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedImage,
          roomType,
          userNotes,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to analyze room.");
      }

      const data = await response.json();

      const newAnalysis: RoomAnalysis = {
        id: "room_" + Date.now(),
        roomName: data.roomName || `${roomType} Organization Blueprint`,
        roomType,
        imageUrl: selectedImage,
        clutterScore: data.clutterScore ?? 50,
        summary: data.summary || "Room analysis completed successfully.",
        estimatedTimeToComplete: data.estimatedTimeToComplete || "2 hours",
        hotspots: data.hotspots || [],
        actionSteps: (data.actionSteps || []).map((s: any, idx: number) => ({
          ...s,
          id: s.id || `step_${idx}`,
          stepNumber: s.stepNumber || idx + 1,
        })),
        organizationPlan: data.organizationPlan || [],
        createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };

      setCurrentAnalysis(newAnalysis);
      saveRoomToStorage(newAnalysis);
      setCompletedStepIds({});
      setActiveTab("rooms");
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || "An error occurred during AI room analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run Room Reset & Item Return
  const runRoomReset = async () => {
    if (!resetImage) {
      setResetError("Please upload a photo of the messy room or items first.");
      return;
    }

    setIsResetting(true);
    setResetError(null);

    try {
      const response = await fetch("/api/reset-room-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: resetImage,
          roomType,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to process room reset.");
      }

      const data = await response.json();
      setResetResult({
        roomType: data.roomType || roomType,
        itemInventory: data.itemInventory || [],
        imagePromptForOrganizedResult: data.imagePromptForOrganizedResult || "",
        generatedAfterImageUrl: data.generatedAfterImageUrl || "",
        originalImage: resetImage,
      });
      setSliderPosition(50);
    } catch (err: any) {
      console.error(err);
      setResetError(err.message || "Failed to reset room items.");
    } finally {
      setIsResetting(false);
    }
  };

  // Transfer reset items into label creator
  const transferItemsToLabels = () => {
    if (!resetResult || resetResult.itemInventory.length === 0) return;
    const newLabels: CustomLabel[] = resetResult.itemInventory.map((item, idx) => ({
      id: "transfer_" + idx + "_" + Date.now(),
      title: item.itemName.toUpperCase(),
      subtitle: `HOME: ${item.properHome.toUpperCase()}`,
      iconName: item.properHome.toLowerCase().includes("shoe") ? "home" : "package",
      zone: resetResult.roomType,
    }));
    setCustomLabels([...newLabels, ...customLabels]);
    setActiveTab("graphics");
    setGraphicsSubTab("labels");
  };

  // Generate Floor Plan Graphic via AI
  const runGenerateFloorPlan = async () => {
    setIsGeneratingFloorPlan(true);
    setFloorPlanError(null);
    try {
      const itemsList = resetResult
        ? resetResult.itemInventory.map((i) => `${i.itemName} to ${i.properHome}`)
        : ["Shoes on rack", "Pencils on desk", "Books on wall shelf", "Cables in storage box"];

      const res = await fetch("/api/generate-floorplan-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType: floorPlanRoomType,
          dimensions: floorPlanDimensions,
          items: itemsList,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate floor plan graphic.");
      }

      const data = await res.json();
      setFloorPlanData(data);
      setSelectedElement(null);
    } catch (err: any) {
      console.error(err);
      setFloorPlanError(err.message || "Could not generate floor plan.");
    } finally {
      setIsGeneratingFloorPlan(false);
    }
  };

  // Download Floor Plan as SVG
  const downloadFloorPlanSVG = () => {
    const svgEl = document.getElementById("floorplan-svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `declutteriq_floorplan_${floorPlanRoomType.toLowerCase().replace(/\s+/g, "_")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate Concept Image via AI
  const runGenerateConceptImage = async () => {
    if (!conceptPrompt.trim()) return;
    setIsGeneratingConcept(true);
    setConceptError(null);
    try {
      const res = await fetch("/api/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: conceptPrompt,
          style: conceptStyle,
          aspectRatio: conceptAspectRatio,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate image.");
      }

      const data = await res.json();
      const newEntry = {
        id: "concept_" + Date.now(),
        url: data.imageUrl,
        prompt: conceptPrompt,
        style: conceptStyle,
      };
      setGeneratedConcepts([newEntry, ...generatedConcepts]);
    } catch (err: any) {
      console.error(err);
      setConceptError(err.message || "Failed to generate concept image.");
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  // Toggle Action Step Checkbox
  const toggleStep = (stepId: string) => {
    setCompletedStepIds((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  // Send Chat message
  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isChatting) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", text: userText }];
    setChatMessages(newMessages);
    setIsChatting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: newMessages.slice(0, -1),
        }),
      });

      if (!response.ok) throw new Error("Chat request failed.");
      const data = await response.json();

      setChatMessages([...newMessages, { role: "model", text: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages([...newMessages, { role: "model", text: "Sorry, I had trouble responding. Please ask again!" }]);
    } finally {
      setIsChatting(false);
    }
  };

  // Add custom label
  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelTitle.trim()) return;
    const newLbl: CustomLabel = {
      id: "label_" + Date.now(),
      title: newLabelTitle.trim().toUpperCase(),
      subtitle: newLabelSubtitle.trim().toUpperCase() || "STORAGE BIN",
      iconName: "package",
      zone: roomType,
    };
    setCustomLabels([newLbl, ...customLabels]);
    setNewLabelTitle("");
    setNewLabelSubtitle("");
  };

  const removeLabel = (id: string) => {
    setCustomLabels(customLabels.filter((l) => l.id !== id));
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Keep":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Keep</span>;
      case "Donate":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">Donate</span>;
      case "Sell":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">Sell</span>;
      case "Trash":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">Trash</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">Organize</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("analyze")}>
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">DeclutterIQ</h1>
            <span className="text-[11px] text-slate-500 font-medium">AI Room Organizer & Graphics Studio</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab("analyze")}
            className={`transition-colors hover:text-slate-900 py-1 ${activeTab === "analyze" ? "text-slate-900 font-semibold border-b-2 border-slate-900" : ""}`}
          >
            Analyze Room
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`transition-colors hover:text-slate-900 py-1 ${activeTab === "rooms" ? "text-slate-900 font-semibold border-b-2 border-slate-900" : ""}`}
          >
            Active Plan {savedRooms.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-100 rounded-full">{savedRooms.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("reset")}
            className={`transition-colors hover:text-slate-900 py-1 flex items-center gap-1.5 ${activeTab === "reset" ? "text-slate-900 font-semibold border-b-2 border-slate-900" : ""}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Room Reset & Items
          </button>
          <button
            onClick={() => setActiveTab("graphics")}
            className={`transition-colors hover:text-slate-900 py-1 flex items-center gap-1.5 ${activeTab === "graphics" ? "text-slate-900 font-semibold border-b-2 border-slate-900" : ""}`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            Image & Graphics Studio
          </button>
          <button
            onClick={() => setActiveTab("coach")}
            className={`transition-colors hover:text-slate-900 py-1 ${activeTab === "coach" ? "text-slate-900 font-semibold border-b-2 border-slate-900" : ""}`}
          >
            AI Room Coach
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`transition-colors hover:text-slate-900 py-1 ${activeTab === "guide" ? "text-slate-900 font-semibold border-b-2 border-slate-900" : ""}`}
          >
            Declutter Guide
          </button>
        </nav>

        {/* Quick Access CTA Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("graphics");
              setGraphicsSubTab("image-gen");
            }}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Graphics Studio</span>
          </button>
          <button
            onClick={() => setActiveTab("reset")}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Studio</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: ANALYZE ROOM & PHOTO UPLOAD */}
        {activeTab === "analyze" && (
          <div className="space-y-10 animate-fade-in">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Gemini Multi-Modal AI Room Analysis
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 text-balance">
                Upload your room photo. Get a serenity blueprint.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Scan your cluttered bedroom, living room, office, or closet. Receive instant clutter severity scores, hotspot diagnostics, and actionable 5-category sorting checklists.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Room Type
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Living Room">Living Room</option>
                    <option value="Kitchen & Pantry">Kitchen & Pantry</option>
                    <option value="Bedroom">Bedroom</option>
                    <option value="Home Office">Home Office</option>
                    <option value="Walk-in Closet">Walk-in Closet</option>
                    <option value="Garage & Workshop">Garage & Workshop</option>
                    <option value="Bathroom">Bathroom</option>
                    <option value="Nursery & Kids Room">Nursery & Kids Room</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Challenges / Specific Goals
                  </label>
                  <input
                    type="text"
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="e.g. Shoes piling up at door, tangled cords, desk paper stacks..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Room Photo
                </label>
                {selectedImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center group">
                    <img src={selectedImage} alt="Room preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="px-4 py-2 bg-white text-slate-900 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-100 shadow-md">
                        Change Photo
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Upload your room photo, or drag and drop</p>
                      <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, WEBP formats</p>
                    </div>
                    <label className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm">
                      Upload Photo
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">Or try a sample room scan:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => selectSampleRoom("Living Room")}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-400 bg-white text-left transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                      <img src="https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=200&auto=format&fit=crop" alt="Living room" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-900 truncate">Living Room</p>
                      <p className="text-[11px] text-slate-500 truncate">Shoes, pillows & clutter</p>
                    </div>
                  </button>

                  <button
                    onClick={() => selectSampleRoom("Home Office")}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-400 bg-white text-left transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                      <img src="https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=200&auto=format&fit=crop" alt="Office" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-900 truncate">Home Office</p>
                      <p className="text-[11px] text-slate-500 truncate">Pencils & desk piles</p>
                    </div>
                  </button>

                  <button
                    onClick={() => selectSampleRoom("Walk-in Closet")}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-400 bg-white text-left transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                      <img src="https://images.unsplash.com/photo-1558997519-83ea9252edf8?q=80&w=200&auto=format&fit=crop" alt="Closet" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-900 truncate">Walk-in Closet</p>
                      <p className="text-[11px] text-slate-500 truncate">Overstuffed garments</p>
                    </div>
                  </button>
                </div>
              </div>

              {analysisError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              <button
                onClick={runAnalysis}
                disabled={isAnalyzing || !selectedImage}
                className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Analyzing Room & Building Blueprint...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate AI Organization Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE PLAN & ANALYSIS */}
        {activeTab === "rooms" && currentAnalysis && (
          <div className="space-y-8 animate-fade-in">
            {/* Overview Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row gap-8 items-center">
              <div className="w-full lg:w-1/2 aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
                <img src={currentAnalysis.imageUrl} alt={currentAnalysis.roomName} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-medium rounded-lg">
                  {currentAnalysis.roomType}
                </div>
              </div>

              <div className="w-full lg:w-1/2 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{currentAnalysis.createdAt}</span>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    Est. Time: {currentAnalysis.estimatedTimeToComplete}
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{currentAnalysis.roomName}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{currentAnalysis.summary}</p>

                <div className="pt-2">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Clutter Severity Score</span>
                    <span className={currentAnalysis.clutterScore > 60 ? "text-rose-600" : "text-emerald-600"}>
                      {currentAnalysis.clutterScore}/100 ({currentAnalysis.clutterScore > 60 ? "High Clutter" : "Moderate"})
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        currentAnalysis.clutterScore > 70 ? "bg-rose-500" : currentAnalysis.clutterScore > 40 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${currentAnalysis.clutterScore}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => {
                      setConceptPrompt(`Organized and serene ${currentAnalysis.roomType} with built-in storage and pristine surfaces`);
                      setActiveTab("graphics");
                      setGraphicsSubTab("image-gen");
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>Generate AI Visuals</span>
                  </button>

                  <button
                    onClick={() => {
                      setFloorPlanRoomType(currentAnalysis.roomType);
                      setActiveTab("graphics");
                      setGraphicsSubTab("floorplan");
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>2D Floor Plan Graphic</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hotspots & Zone Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Clutter Hotspots
                  </h3>
                  <div className="space-y-3">
                    {currentAnalysis.hotspots.map((spot) => (
                      <div key={spot.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{spot.title}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                              spot.severity === "high"
                                ? "bg-rose-100 text-rose-700"
                                : spot.severity === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {spot.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{spot.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-700" />
                    Zone Storage Layout
                  </h3>
                  <div className="space-y-3">
                    {currentAnalysis.organizationPlan.map((zone, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                        <p className="text-xs font-bold text-slate-900">{zone.zoneName}</p>
                        <p className="text-xs text-slate-600">{zone.recommendation}</p>
                        <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <p><strong>Containers:</strong> {zone.containersNeeded}</p>
                          <p><strong>Layout Tip:</strong> {zone.layoutTip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Steps Checklist */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Step-by-Step Declutter Checklist</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Check off items as you sort, donate, and organize.</p>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                      {Object.values(completedStepIds).filter(Boolean).length} / {currentAnalysis.actionSteps.length} Completed
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentAnalysis.actionSteps.map((step) => {
                      const isDone = !!completedStepIds[step.id];
                      return (
                        <div
                          key={step.id}
                          onClick={() => toggleStep(step.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            isDone ? "bg-emerald-50/40 border-emerald-200 opacity-75" : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${
                              isDone ? "bg-emerald-600 text-white" : "border-2 border-slate-300 bg-white"
                            }`}
                          >
                            {isDone && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold ${isDone ? "line-through text-slate-500" : "text-slate-900"}`}>
                                {step.stepNumber}. {step.title}
                              </span>
                              {getCategoryBadge(step.category)}
                            </div>
                            <p className={`text-xs ${isDone ? "text-slate-400" : "text-slate-600"}`}>{step.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {savedRooms.length > 1 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">Your Scanned Rooms History</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedRooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => setCurrentAnalysis(room)}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                            room.id === currentAnalysis.id ? "border-slate-900 bg-slate-50 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={room.imageUrl} alt={room.roomName} className="w-full h-full object-cover" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-slate-900 truncate">{room.roomName}</p>
                            <p className="text-[11px] text-slate-500">Score: {room.clutterScore}/100 · {room.createdAt}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ROOM RESET & ITEM RETURN STUDIO */}
        {activeTab === "reset" && (
          <div className="space-y-8 animate-fade-in">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                Item-by-Item Return & AI Restored Photo Generator
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Return every item to its proper home.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Take a photo of loose items (shoes, pencils, cords, books). AI detects every stray object, maps it back to its designated container, and generates an AI 'After' photo showing your room restored!
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Upload Messy Room or Scattered Items Photo
                </label>
                {resetImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center group">
                    <img src={resetImage} alt="Reset room preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="px-4 py-2 bg-white text-slate-900 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-100 shadow-md">
                        Change Photo
                        <input type="file" accept="image/*" onChange={handleResetImageUpload} className="hidden" />
                      </label>
                      <button
                        onClick={() => setResetImage(null)}
                        className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Upload photo of scattered items or messy floor/desk</p>
                      <p className="text-xs text-slate-500 mt-1">Shoes, pencils, cables, books, toys...</p>
                    </div>
                    <label className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm">
                      Upload Photo
                      <input type="file" accept="image/*" onChange={handleResetImageUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Or select a sample mess:</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => selectSampleReset("Living Room")}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                  >
                    Sample Living Room (Shoes & Cushions)
                  </button>
                  <button
                    onClick={() => selectSampleReset("Home Office")}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                  >
                    Sample Desk Mess (Pencils & Cords)
                  </button>
                </div>
              </div>

              {resetError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <button
                onClick={runRoomReset}
                disabled={isResetting || !resetImage}
                className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Analyzing Items & Rendering Reset Photo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Run AI Room Reset & Return Items</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Presentation */}
            {resetResult && (
              <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                {/* Before / After Photo Comparison */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <h3 className="text-lg font-bold">Room Transformation: Before vs. After Reset</h3>
                    </div>
                    <span className="text-xs text-slate-300">Shoes back on rack, pencils back in holder</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-1.5 uppercase">Before (Messy Clutter)</p>
                      <div className="rounded-xl overflow-hidden border border-slate-700 aspect-video bg-black/40">
                        <img src={resetResult.originalImage} alt="Before reset" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 mb-1.5 uppercase">After (Immaculately Organized)</p>
                      <div className="rounded-xl overflow-hidden border border-emerald-600/50 aspect-video bg-black/40 relative">
                        {resetResult.generatedAfterImageUrl ? (
                          <img src={resetResult.generatedAfterImageUrl} alt="After reset" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-800/80">
                            <Sparkles className="w-8 h-8 text-amber-300 mb-2" />
                            <p className="text-xs font-bold text-white mb-1">Restored Room Concept</p>
                            <p className="text-[11px] text-slate-300 line-clamp-3">{resetResult.imagePromptForOrganizedResult}</p>
                            <button
                              onClick={() => {
                                setConceptPrompt(resetResult.imagePromptForOrganizedResult);
                                setActiveTab("graphics");
                                setGraphicsSubTab("image-gen");
                              }}
                              className="mt-3 px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-100"
                            >
                              Render in Graphics Studio
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stray Item Inventory & Proper Homes Table */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Stray Item Inventory & Proper Homes</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Every detected object mapped back to its designated home.</p>
                    </div>
                    <button
                      onClick={transferItemsToLabels}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Create Bin Labels For These Items</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {resetResult.itemInventory.map((item, idx) => (
                      <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{item.itemName}</span>
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                              Qty: {item.quantityOrCount}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{item.actionDescription}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-emerald-800 text-xs font-semibold self-start sm:self-center">
                          <Home className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Proper Home: {item.properHome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: IMAGE & GRAPHICS GENERATING STUDIO */}
        {activeTab === "graphics" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header & Sub-Nav */}
            <div className="max-w-4xl mx-auto text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <Palette className="w-3.5 h-3.5 text-amber-500" />
                Image & Graphics Generating Studio
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Design visual tools, floor plans, and container labels.
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl mx-auto">
                Generate high-resolution interior concepts, interactive 2D architectural floor plan graphics, customizable storage container tags, and before/after split sliders.
              </p>

              {/* Sub-Tabs Nav */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 mt-2">
                <button
                  onClick={() => setGraphicsSubTab("image-gen")}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    graphicsSubTab === "image-gen" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI Concept Visualizer</span>
                </button>
                <button
                  onClick={() => setGraphicsSubTab("floorplan")}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    graphicsSubTab === "floorplan" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layout className="w-3.5 h-3.5 text-blue-500" />
                  <span>2D Floor Plan Graphic</span>
                </button>
                <button
                  onClick={() => setGraphicsSubTab("labels")}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    graphicsSubTab === "labels" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Bin & Label Designer</span>
                </button>
                <button
                  onClick={() => setGraphicsSubTab("slider")}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    graphicsSubTab === "slider" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <SplitSquareHorizontal className="w-3.5 h-3.5 text-purple-500" />
                  <span>Split-View Slider</span>
                </button>
              </div>
            </div>

            {/* SUB-TAB A: AI CONCEPT IMAGE VISUALIZER */}
            {graphicsSubTab === "image-gen" && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Room Organizing Concept Prompt
                    </label>
                    <textarea
                      value={conceptPrompt}
                      onChange={(e) => setConceptPrompt(e.target.value)}
                      rows={3}
                      placeholder="Describe your ideal organized room layout, storage features, or materials..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Interior Aesthetic Style
                      </label>
                      <select
                        value={conceptStyle}
                        onChange={(e) => setConceptStyle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="Warm Japandi Minimalist">Warm Japandi Minimalist (Wood & Linen)</option>
                        <option value="Scandinavian Light & Bright">Scandinavian Light & Bright (Airy White)</option>
                        <option value="Modern Luxury Organizing">Modern Luxury (Smoked Glass & LED)</option>
                        <option value="Industrial Studio Loft">Industrial Studio Loft (Black Metal & Brick)</option>
                        <option value="Earthy Mid-Century">Earthy Mid-Century (Walnut & Brass)</option>
                        <option value="Bespoke Closet Boutique">Bespoke Walk-in Closet Boutique</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Aspect Ratio
                      </label>
                      <div className="flex gap-2">
                        {(["16:9", "1:1", "4:3"] as const).map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setConceptAspectRatio(ratio)}
                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                              conceptAspectRatio === ratio
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Style Chips */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Quick Storage Feature Add-ons:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Tiered Shoe Wall Rack",
                        "Clear Acrylic Drawer Dividers",
                        "Recessed Bookshelf Nook",
                        "Floating Desk with Cable Trough",
                        "Woven Natural Baskets",
                        "Color-Coded Pantry Bins",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setConceptPrompt((p) => `${p}, ${chip.toLowerCase()}`)}
                          className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {conceptError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span>{conceptError}</span>
                    </div>
                  )}

                  <button
                    onClick={runGenerateConceptImage}
                    disabled={isGeneratingConcept || !conceptPrompt.trim()}
                    className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
                  >
                    {isGeneratingConcept ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Rendering Architectural Concept...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Generate High-Resolution Image</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Generated Concepts Gallery */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
                    <span>Generated Organization Visuals</span>
                    <span className="text-xs text-slate-500 font-normal">{generatedConcepts.length} Images</span>
                  </h3>

                  {generatedConcepts.length === 0 ? (
                    <div className="border border-slate-200 rounded-2xl p-8 text-center bg-white space-y-2">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700">No custom visuals generated yet.</p>
                      <p className="text-xs text-slate-500">Pick a style and click generate above to render your vision!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {generatedConcepts.map((item) => (
                        <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-3">
                          <div className="aspect-video overflow-hidden bg-slate-900 relative group">
                            <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <a
                                href={item.url}
                                download={`declutteriq_${item.id}.png`}
                                className="px-3.5 py-1.5 bg-white text-slate-900 text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5 hover:bg-slate-100"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download PNG
                              </a>
                            </div>
                          </div>
                          <div className="p-4 pt-1 space-y-1">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{item.style}</span>
                            <p className="text-xs text-slate-700 line-clamp-2">{item.prompt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB B: 2D ARCHITECTURAL FLOOR PLAN GRAPHIC */}
            {graphicsSubTab === "floorplan" && (
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Floor Plan Controls */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Room
                      </label>
                      <select
                        value={floorPlanRoomType}
                        onChange={(e) => setFloorPlanRoomType(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50"
                      >
                        <option value="Living Room">Living Room</option>
                        <option value="Home Office">Home Office</option>
                        <option value="Master Bedroom">Master Bedroom</option>
                        <option value="Walk-in Closet">Walk-in Closet</option>
                        <option value="Kitchen Pantry">Kitchen Pantry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Scale Dimensions
                      </label>
                      <input
                        type="text"
                        value={floorPlanDimensions}
                        onChange={(e) => setFloorPlanDimensions(e.target.value)}
                        placeholder="e.g. 15ft x 18ft"
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={runGenerateFloorPlan}
                      disabled={isGeneratingFloorPlan}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
                    >
                      {isGeneratingFloorPlan ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Layout...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                          <span>AI Regenerate Floor Plan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {floorPlanError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{floorPlanError}</span>
                  </div>
                )}

                {/* SVG Floor Plan Canvas */}
                {floorPlanData && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{floorPlanData.roomTitle}</h3>
                          <span className="text-xs text-slate-500">Dimensions: {floorPlanData.dimensions} · 2D Architectural Layout</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={downloadFloorPlanSVG}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download SVG
                          </button>
                          <button
                            onClick={() => window.print()}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                          </button>
                        </div>
                      </div>

                      {/* Interactive SVG Viewport */}
                      <div className="w-full aspect-[4/3] bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center p-4">
                        <svg
                          id="floorplan-svg"
                          viewBox="0 0 100 100"
                          className="w-full h-full drop-shadow-sm select-none"
                          style={{ maxHeight: "480px" }}
                        >
                          {/* Grid Background Pattern */}
                          <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                            </pattern>
                          </defs>
                          <rect width="100" height="100" fill="url(#grid)" />

                          {/* Outer Perimeter Wall */}
                          <rect
                            x="2"
                            y="2"
                            width="96"
                            height="96"
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="1.5"
                            rx="2"
                          />

                          {/* Traffic Pathways */}
                          <path
                            d="M 11 86 Q 40 80 50 47"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                          />
                          <path
                            d="M 50 47 Q 65 50 84 75"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                          />

                          {/* Placed Elements */}
                          {floorPlanData.elements.map((el) => {
                            const isSelected = selectedElement?.id === el.id;
                            return (
                              <g
                                key={el.id}
                                onClick={() => setSelectedElement(el)}
                                className="cursor-pointer transition-transform hover:opacity-90"
                              >
                                <rect
                                  x={el.x}
                                  y={el.y}
                                  width={el.width}
                                  height={el.height}
                                  fill={el.color}
                                  fillOpacity={isSelected ? 0.95 : 0.85}
                                  stroke={isSelected ? "#000000" : "#ffffff"}
                                  strokeWidth={isSelected ? 1.5 : 0.6}
                                  rx="1.5"
                                />
                                <text
                                  x={el.x + el.width / 2}
                                  y={el.y + el.height / 2 + 1}
                                  fill="#ffffff"
                                  fontSize="2.5"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  {el.label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>

                        {/* Interactive Helper Overlay */}
                        <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-white/80 backdrop-blur-xs border border-slate-200 rounded text-[10px] text-slate-500 font-medium">
                          Click any unit to view assigned items & storage instructions
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 italic">
                        <strong>Architectural Insight:</strong> {floorPlanData.recommendationSummary}
                      </p>
                    </div>

                    {/* Element Inspector Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Storage Unit Inspector
                        </h4>
                        {selectedElement ? (
                          <div className="space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900">{selectedElement.name}</span>
                              <span
                                className="px-2 py-0.5 text-[10px] font-bold rounded text-white"
                                style={{ backgroundColor: selectedElement.color }}
                              >
                                {selectedElement.category.toUpperCase()}
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                              <p><strong>Position:</strong> X: {selectedElement.x}%, Y: {selectedElement.y}%</p>
                              <p><strong>Dimensions:</strong> {selectedElement.width}% x {selectedElement.height}%</p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-slate-700 mb-1.5">Designated Items to Store Here:</p>
                              <ul className="space-y-1">
                                {selectedElement.assignedItems.map((item, i) => (
                                  <li key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                                    <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">Click any furniture or storage unit in the floor plan to inspect its assigned items.</p>
                        )}
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Traffic Pathways & Corridors
                        </h4>
                        <div className="space-y-2">
                          {floorPlanData.trafficPathways.map((path, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-0.5">
                              <span className="font-semibold text-slate-800">{path.from} → {path.to}</span>
                              <p className="text-[11px] text-slate-500">{path.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB C: BIN & LABEL DESIGNER GRAPHIC TOOL */}
            {graphicsSubTab === "labels" && (
              <div className="max-w-5xl mx-auto space-y-8">
                {/* Label Design Controls */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Custom Storage Bin & Tag Designer</h3>
                      <p className="text-xs text-slate-500">Generate uniform, aesthetic print-ready labels for bins, baskets, and shoe racks.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Label Sheet
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Visual Aesthetic Theme
                      </label>
                      <select
                        value={labelTheme}
                        onChange={(e) => setLabelTheme(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50"
                      >
                        <option value="minimalist">Modern Minimalist (Black on White)</option>
                        <option value="kraft">Warm Kraft Paper & Linen</option>
                        <option value="slate">Nordic Slate (Charcoal White)</option>
                        <option value="chalkboard">Chalkboard Studio (Dark Invert)</option>
                        <option value="emerald">Botanical Emerald & Gold</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Tag Shape & Framing
                      </label>
                      <select
                        value={labelShape}
                        onChange={(e) => setLabelShape(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50"
                      >
                        <option value="rounded">Classic Rounded Card</option>
                        <option value="modern">Crisp Sharp Border</option>
                        <option value="pill">Smooth Capsule Pill</option>
                        <option value="tag">Luggage Hang Tag</option>
                      </select>
                    </div>

                    <form onSubmit={handleAddLabel} className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Add Custom Label
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newLabelTitle}
                          onChange={(e) => setNewLabelTitle(e.target.value)}
                          placeholder="e.g. WINTER SCARVES"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Printable Label Grid Graphics Preview */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Printable Label Sheet ({customLabels.length} Labels)
                    </span>
                    <span className="text-xs text-slate-400">Fits Standard 8.5" x 11" Sticker Sheet</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {customLabels.map((lbl) => {
                      // Theme Styling
                      let themeClass = "bg-white text-slate-900 border-2 border-slate-900";
                      if (labelTheme === "kraft") {
                        themeClass = "bg-[#f5ebd7] text-[#4a3b2c] border-2 border-[#8c7355]";
                      } else if (labelTheme === "slate") {
                        themeClass = "bg-slate-100 text-slate-900 border-2 border-slate-400";
                      } else if (labelTheme === "chalkboard") {
                        themeClass = "bg-slate-900 text-white border-2 border-slate-600";
                      } else if (labelTheme === "emerald") {
                        themeClass = "bg-emerald-900 text-emerald-50 border-2 border-amber-300";
                      }

                      // Shape Styling
                      let shapeClass = "rounded-xl";
                      if (labelShape === "pill") shapeClass = "rounded-full px-6";
                      if (labelShape === "modern") shapeClass = "rounded-none";
                      if (labelShape === "tag") shapeClass = "rounded-t-none rounded-b-2xl border-t-8";

                      return (
                        <div
                          key={lbl.id}
                          className={`p-5 relative group transition-transform shadow-xs flex flex-col items-center text-center justify-center min-h-[120px] ${themeClass} ${shapeClass}`}
                        >
                          <button
                            onClick={() => removeLabel(lbl.id)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <div className="w-6 h-6 mb-2 rounded-full border border-current flex items-center justify-center opacity-80">
                            <Tag className="w-3 h-3" />
                          </div>

                          <span className="text-sm font-black tracking-widest leading-snug">
                            {lbl.title}
                          </span>

                          <span className="text-[10px] tracking-wider mt-1 opacity-75 font-semibold">
                            {lbl.subtitle}
                          </span>

                          <span className="text-[9px] uppercase tracking-widest mt-2 px-2 py-0.5 rounded-full border border-current opacity-60">
                            {lbl.zone}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB D: BEFORE/AFTER SPLIT-VIEW SLIDER GRAPHIC */}
            {graphicsSubTab === "slider" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Interactive Split-Screen Comparison</h3>
                      <p className="text-xs text-slate-500">Drag slider left/right to witness full declutter transformation.</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{sliderPosition}% Visible</span>
                  </div>

                  {/* Interactive Slider Graphic */}
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden select-none border border-slate-200 shadow-inner bg-slate-900">
                    {/* After Image (Background) */}
                    <img
                      src={
                        resetResult?.generatedAfterImageUrl ||
                        "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200&auto=format&fit=crop"
                      }
                      alt="After room"
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Before Image (Hardware CSS Clip-Path overlay) */}
                    <div
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                      style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                    >
                      <img
                        src={
                          resetResult?.originalImage ||
                          currentAnalysis?.imageUrl ||
                          "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1200&auto=format&fit=crop"
                        }
                        alt="Before room"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 text-white rounded text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                        Before Mess
                      </div>
                    </div>

                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-600/90 text-white rounded text-xs font-bold uppercase tracking-wider backdrop-blur-xs pointer-events-none">
                      After Reset
                    </div>

                    {/* Drag Handle Bar */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white flex items-center justify-center shadow-lg pointer-events-none"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <div className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center border-2 border-slate-900">
                        <SplitSquareHorizontal className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Range Input for Dragging */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sliderPosition}
                      onChange={(e) => setSliderPosition(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                    />
                  </div>

                  <p className="text-xs text-center text-slate-500">
                    Drag the handle across the frame to inspect clutter removal details.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AI ROOM COACH CHAT */}
        {activeTab === "coach" && (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[75vh] animate-fade-in">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">DeclutterIQ AI Room Coach</h3>
                  <p className="text-xs text-slate-500">Ask questions about organizing shoes, pencil cups, and storage hacks.</p>
                </div>
              </div>

              <button
                onClick={() => setChatMessages([
                  {
                    role: "model",
                    text: "Conversation reset! What space or storage challenge can I help you tackle next?",
                  },
                ])}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Clear Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-br-sm shadow-xs"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl px-4 py-3 text-xs shadow-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>DeclutterIQ Coach is formulating your plan...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto text-[11px]">
              {[
                "How do I organize entryway shoes?",
                "Best way to store pencils & desk supplies?",
                "How to manage tangled phone cords?",
                "Marie Kondo 4-box method tips",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setInputMessage(chip)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap"
                >
                  {chip}
                </button>
              ))}
            </div>

            <form onSubmit={sendChatMessage} className="p-4 border-t border-slate-200 bg-white flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about shoe racks, pencil holders, cord management..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
              />
              <button
                type="submit"
                disabled={isChatting || !inputMessage.trim()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: DECLUTTER GUIDE */}
        {activeTab === "guide" && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">The Master Room Organization Guide</h2>
              <p className="text-sm sm:text-base text-slate-600">
                Core philosophies from certified professional organizers to keep every room peaceful.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900">The 4-Box Sorting Method</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  When tackling any room, set up four bins: <strong>Keep</strong>, <strong>Donate</strong>, <strong>Sell</strong>, and <strong>Trash</strong>. Make quick decisions within 10 seconds per item to eliminate fatigue.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900">Vertical Storage Maximization</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Floor space is precious. Utilize vertical wall shelves, over-the-door organizers, and stackable clear bins to double your effective storage capacity in closets and pantries.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900">The One-In, One-Out Rule</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Once your room is decluttered, maintain equilibrium by committing to the rule: whenever you bring a new item into the space (shoes, coat, book), an equivalent item must leave via donation.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h3 className="text-base font-bold text-slate-900">Zone-Based Point of Use</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Store items where you actually use them. Shoes directly at the entryway threshold, pencils on the desk, cords adjacent to charging hubs, and daily essentials within forearm reach.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} DeclutterIQ: AI Room Organizer & Graphics Studio. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
}
