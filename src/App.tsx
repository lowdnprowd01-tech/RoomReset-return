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
  RotateCcw
} from "lucide-react";

interface Hotspot {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface ActionStep {
  id: string;
  stepNumber: number;
  title: string;
  category: "Keep" | "Donate" | "Sell" | "Trash" | "Organize";
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

export default function App() {
  const [activeTab, setActiveTab] = useState<"analyze" | "rooms" | "reset" | "coach" | "guide">("analyze");
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

  // AI Coach Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "Hello! I'm your DeclutterIQ Coach. I can help you sort items, return shoes to racks, pencils to holders, and transform your living spaces. How can I assist you with organizing today?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Concept generation state
  const [isGeneratingConcept, setIsGeneratingConcept] = useState<boolean>(false);

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
    let sampleImg = type === "Living Room" 
      ? "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1000&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1000&auto=format&fit=crop";
    setResetImage(sampleImg);
    setResetError(null);
  };

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
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze room.");
      }

      const data = await response.json();

      const newAnalysis: RoomAnalysis = {
        id: "room_" + Date.now(),
        roomName: data.roomName || `${roomType} Organization Plan`,
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

  const runRoomReset = async () => {
    if (!resetImage) {
      setResetError("Please upload a photo of the room or items to reset.");
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
        const errData = await response.json();
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
    } catch (err: any) {
      console.error(err);
      setResetError(err.message || "Failed to reset room items.");
    } finally {
      setIsResetting(false);
    }
  };

  const generateRoomConcept = async () => {
    if (!currentAnalysis) return;
    setIsGeneratingConcept(true);
    try {
      const response = await fetch("/api/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${currentAnalysis.roomType} styled with clean minimalist organization, bespoke storage baskets, clear bins, and tidy layout`,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate concept.");
      const data = await response.json();

      const updated = { ...currentAnalysis, conceptImageUrl: data.imageUrl };
      setCurrentAnalysis(updated);
      saveRoomToStorage(updated);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not generate concept image.");
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  const toggleStep = (stepId: string) => {
    setCompletedStepIds((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

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
      setChatMessages([...newMessages, { role: "model", text: "Sorry, I had trouble responding. Please try again." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Keep":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Keep</span>;
      case "Donate":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200">Donate</span>;
      case "Sell":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200">Sell</span>;
      case "Trash":
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200">Trash</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">Organize</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Bar Contract */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("analyze")}>
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">DeclutterIQ</h1>
            <span className="text-[11px] text-slate-500 font-medium">AI Room Organizer & Studio</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
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
            Active Plan {savedRooms.length > 0 && <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-100 rounded-full">{savedRooms.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("reset")}
            className={`transition-colors hover:text-slate-900 py-1 flex items-center gap-1.5 ${activeTab === "reset" ? "text-slate-900 font-semibold border-b-2 border-slate-900" : ""}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Room Reset & Items
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("reset")}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm whitespace-nowrap flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Room Reset Studio
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: ANALYZE ROOM & UPLOAD */}
        {activeTab === "analyze" && (
          <div className="space-y-10 animate-fade-in">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Powered by Gemini AI Multi-Modal Vision
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 text-wrap balance">
                Transform any cluttered room into a serene sanctuary.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Upload a photo of your living room, kitchen, bedroom, or office. Our AI assesses clutter hot spots, builds custom sorting checklists, and provides professional organization blueprints.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 sm:p-8 max-w-3xl mx-auto space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Room Type
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    Specific Goals / Challenges (Optional)
                  </label>
                  <input
                    type="text"
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="e.g. Too many cords, need toy storage, overflowing closet..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
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
                      <p className="text-sm font-medium text-slate-800">Drag and drop your room photo here, or browse</p>
                      <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, WEBP up to 10MB</p>
                    </div>
                    <label className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm">
                      Upload Photo
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Or try a sample room scan:</p>
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
                      <p className="text-[11px] text-slate-500 truncate">Scattered pillows & cables</p>
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
                      <p className="text-[11px] text-slate-500 truncate">Paper piles & desk clutter</p>
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
                      <p className="text-[11px] text-slate-500 truncate">Overstuffed wardrobe</p>
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
                    <span>Analyzing Room & Building Plan...</span>
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

        {/* TAB 2: ROOM ANALYSIS & ACTION PLAN */}
        {activeTab === "rooms" && currentAnalysis && (
          <div className="space-y-8 animate-fade-in">
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

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={generateRoomConcept}
                    disabled={isGeneratingConcept}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2"
                  >
                    {isGeneratingConcept ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering Concept...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Generate AI Organized Concept</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {currentAnalysis.conceptImageUrl && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <h3 className="text-lg font-bold">AI Organized Room Vision</h3>
                  </div>
                  <span className="text-xs text-slate-300">Generated by Gemini 3.1 Flash Image</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-700 aspect-video max-h-[450px]">
                  <img src={currentAnalysis.conceptImageUrl} alt="Organized room concept" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

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
                    Zone Organization Plan
                  </h3>
                  <div className="space-y-4">
                    {currentAnalysis.organizationPlan.map((zone, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                        <p className="text-xs font-bold text-slate-900">{zone.zoneName}</p>
                        <p className="text-xs text-slate-600">{zone.recommendation}</p>
                        <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 space-y-1">
                          <p><strong>Containers:</strong> {zone.containersNeeded}</p>
                          <p><strong>Layout Tip:</strong> {zone.layoutTip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Step-by-Step Declutter Checklist</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Check off tasks as you sort, donate, and organize.</p>
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
                Item-by-Item Return & AI Visual Reset Studio
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Put every stray item back where it belongs.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Upload a photo of your messy room or scattered items (shoes, pencils, cords, books). AI will itemize every stray object, assign its proper home, and render an immaculate 'After' photo showing your room fully restored!
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
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
                      <p className="text-sm font-medium text-slate-800">Upload photo of stray items or messy room</p>
                      <p className="text-xs text-slate-500 mt-1">Shoes on floor, pencils on desk, cords tangled...</p>
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
                <div className="flex gap-3">
                  <button
                    onClick={() => selectSampleReset("Living Room")}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                  >
                    Sample Living Room Mess
                  </button>
                  <button
                    onClick={() => selectSampleReset("Home Office")}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                  >
                    Sample Office Desk Mess
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

            {/* Reset Results Display */}
            {resetResult && (
              <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                {/* Before / After Photo Comparison */}
                {resetResult.generatedAfterImageUrl && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                        <h3 className="text-lg font-bold">AI Restored Room Preview (After Reset)</h3>
                      </div>
                      <span className="text-xs text-slate-300">Shoes on rack, items in proper homes</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1.5 uppercase">Before (Messy State)</p>
                        <div className="rounded-xl overflow-hidden border border-slate-700 aspect-video">
                          <img src={resetResult.originalImage} alt="Before reset" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-400 mb-1.5 uppercase">After (Fully Restored & Organized)</p>
                        <div className="rounded-xl overflow-hidden border border-emerald-600/50 aspect-video">
                          <img src={resetResult.generatedAfterImageUrl} alt="After reset" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Item Inventory & Proper Homes Table */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Stray Item Inventory & Proper Homes</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Every detected item mapped back to its designated storage location.</p>
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
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-emerald-800 text-xs font-semibold self-start sm:self-center">
                          <Home className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Home: {item.properHome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AI ROOM COACH CHAT */}
        {activeTab === "coach" && (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[75vh] animate-fade-in">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">DeclutterIQ AI Room Coach</h3>
                <p className="text-xs text-slate-500">Ask questions about organizing, bin selection, and storage systems.</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-br-sm"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl px-4 py-3 text-xs shadow-sm flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Coach is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
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

        {/* TAB 5: DECLUTTER GUIDE */}
        {activeTab === "guide" && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">The Ultimate Room Organization Guide</h2>
              <p className="text-sm sm:text-base text-slate-600">
                Proven methodologies from master organizers to maintain a clutter-free, peaceful home.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900">The 4-Box Sorting Method</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  When tackling any room, set up four containers: <strong>Keep</strong>, <strong>Donate</strong>, <strong>Sell</strong>, and <strong>Trash</strong>. Make quick decisions within 10 seconds per item to avoid decision fatigue.
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
                  Once your room is decluttered, maintain equilibrium by committing to the rule: whenever you bring a new item into the space (e.g. a book or sweater), an equivalent item must leave via donation or disposal.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h3 className="text-base font-bold text-slate-900">Zone-Based Grouping</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Store items where you use them. Keep charging cables near the couch, cooking oils right next to the stove, and workout gear in a dedicated athletic basket.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} DeclutterIQ Studio. Powered by Gemini AI.</p>
      </footer>
    </div>
  );
}
