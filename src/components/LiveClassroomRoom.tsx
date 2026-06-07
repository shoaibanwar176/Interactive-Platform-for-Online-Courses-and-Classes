import React, { useEffect, useRef, useState } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Send,
  Users,
  X,
  MessageSquare,
  Sparkles,
  Hand,
  Eraser,
  PenTool,
  Monitor,
  CheckCircle,
  HelpCircle,
  LogOut,
  ChevronRight
} from "lucide-react";
import api from "../services/api";

interface LiveClassroomRoomProps {
  liveClass: any;
  user: any;
  onClose: () => void;
}

export const LiveClassroomRoom: React.FC<LiveClassroomRoomProps> = ({
  liveClass,
  user,
  onClose
}) => {
  // WebRTC / Stream states
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Classroom features states
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: "m1",
      senderName: "Prof. Marcus Vance",
      senderRole: "teacher",
      message: "Welcome to today's live interactive lesson! We are streaming our live session.",
      timestamp: "Just now"
    },
    {
      id: "m2",
      senderName: "Sarah Connor (AI Assistant)",
      senderRole: "assistant",
      message: "Class agenda uploaded. Review whiteboard drawings for the homework prompt.",
      timestamp: "Just now"
    }
  ]);
  const [newMsg, setNewMsg] = useState("");
  const [handRaised, setHandRaised] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "roster">("chat");
  const [isClassStarting, setIsClassStarting] = useState(true);
  const [roster, setRoster] = useState<any[]>([
    { name: "Prof. Marcus Vance", role: "teacher", active: true },
    { name: "Avery Johnson (You)", role: "student", active: true }
  ]);

  // Whiteboard drawing states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#4f46e5"); // Indigo default
  const [brushSize, setBrushSize] = useState(3);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  // Initialize camera and voice stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    async function initMedia(retryCount = 0) {
      if (!cameraEnabled && !micEnabled) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        return;
      }

      try {
        const constraints = {
          video: cameraEnabled ? { width: 400, height: 300, facingMode: "user" } : false,
          audio: micEnabled
        };
        
        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = activeStream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = activeStream;
          // Play without blocking
          localVideoRef.current.play().catch(err => console.log("Video play warning:", err));
        }
      } catch (err) {
        console.warn("Could not acquire media stream:", err);
        // Fallback for non-cam testing environments: try audio only
        if (cameraEnabled && retryCount === 0) {
          console.log("Retrying with audio only fallback stream...");
          setCameraEnabled(false);
          initMedia(1);
        }
      }
    }

    initMedia();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraEnabled, micEnabled]);

  // Log Join Event & Attendance auto trigger
  useEffect(() => {
    const registerAttendance = async () => {
      try {
        await api.post(`/live-classes/${liveClass.id}/join`);
      } catch (err) {
        console.error("Join tracking warning:", err);
      }
    };
    registerAttendance();
  }, [liveClass.id]);

  // Canvas context initializer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill canvas background to light gray
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Initial message drawing
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Interactive LMS Classroom Whiteboard", canvas.width / 2, canvas.height / 2);
    ctx.fillText("[Draw in this space to explain systems]", canvas.width / 2, (canvas.height / 2) + 24);
  }, []);

  // Drawing whiteboard operations
  const drawOnCanvas = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastXRef.current = x;
    lastYRef.current = y;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates based on canvas internal width/height versus client width/height
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    setIsDrawing(true);
    lastXRef.current = x;
    lastYRef.current = y;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    drawOnCanvas(x, y);
  };

  const handleMouseUpOrLeave = () => {
    setIsDrawing(false);
  };

  const handleClearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSendMessage = () => {
    if (!newMsg.trim()) return;
    const ourMsg = {
      id: `m_${Date.now()}`,
      senderName: user ? user.name : "Scholar Guest",
      senderRole: user ? user.role : "student",
      message: newMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, ourMsg]);
    setNewMsg("");

    // Simulate passive responses from the teacher or other students for interactive immersion
    setTimeout(() => {
      const answers = [
        "Incredible insight! Let's outline that model structure on our whiteboard.",
        "That matches the primary learning outcomes. Thank you for raising your hand!",
        "Let's write a code loop to test this logic on our server later.",
        "Yes! Let's ensure our streaming camera configuration stays active.",
        "That's exactly correct Avery! Attendance scores stand at 100%."
      ];
      const botResponse = {
        id: `m_${Date.now() + 1}`,
        senderName: "Prof. Marcus Vance",
        senderRole: "teacher",
        message: answers[Math.floor(Math.random() * answers.length)],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, botResponse]);
    }, 1500);
  };

  const handleRaiseHandToggle = () => {
    setHandRaised((prev) => {
      const next = !prev;
      if (next) {
        // Send a temporary simulation chat
        const alertMsg = {
          id: `h_${Date.now()}`,
          senderName: "System Operator",
          senderRole: "system",
          message: `📢 Avery Johnson raised their hand in the queue!`,
          timestamp: "Just now"
        };
        setChatMessages((prevMsg) => [...prevMsg, alertMsg]);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col text-slate-100 font-sans select-none overflow-hidden h-screen w-screen">
      {/* HEADER BAR */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              Live Interactive Room
              <span className="text-[10px] bg-red-600/30 text-rose-400 border border-red-500/30 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                {liveClass.meetingType?.toUpperCase() || "WEBRTC"} LIVE
              </span>
            </h1>
            <p className="text-[10.5px] text-slate-400 truncate max-w-sm font-mono tracking-tight">
              Class: {liveClass.courseName} &mdash; &ldquo;{liveClass.title}&rdquo;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/55 text-xs font-semibold text-slate-200">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span>Class Rosters Locked (Automated Present Track)</span>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 hover:bg-rose-600 bg-rose-600/90 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all outline-none"
          >
            <LogOut className="h-3.5 w-3.5" /> Close Call
          </button>
        </div>
      </header>

      {/* BODY COLUMN PANEL */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-slate-950">
        
        {/* LEFT COLUMN: video layouts & canvas board */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 min-w-0">
          
          {/* VIDEO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* LOCAL USER STREAM CARD */}
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col justify-center items-center group shadow-xl">
              {cameraEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-2xl transform -scale-x-100"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border-2 border-dashed border-indigo-400/50 flex items-center justify-center text-xl font-bold text-indigo-400 uppercase">
                    {user ? user.name.slice(0, 2) : "S"}
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-350">Camera Muted</h4>
                  <p className="text-4xs text-slate-550 font-mono">Stream inactive &mdash; audio check enabled</p>
                </div>
              )}

              {/* Status pill overlay */}
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-3 py-1 rounded-full text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 shadow-md">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Local Media Feed (You)
              </div>

              {/* MIC indicator overlay */}
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                <span className={`p-1.5 rounded-full backdrop-blur-md border ${micEnabled ? "bg-emerald-500/25 border-emerald-500 text-emerald-400" : "bg-red-500/25 border-red-500 text-red-400"}`}>
                  {micEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                </span>
                {handRaised && (
                  <span className="bg-amber-500 px-2.5 py-1 text-4xs font-black uppercase text-black rounded-full flex items-center gap-1 border border-amber-600 shadow-md">
                    <Hand className="h-3 w-3" /> Hand Raised
                  </span>
                )}
              </div>
            </div>

            {/* REMOTE PEER FEEDS CARD */}
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col justify-center items-center shadow-xl group">
              {/* Virtual visual avatar of Professor Marcus Vance or screen sharing simulations */}
              {screenSharing ? (
                <div className="w-full h-full bg-slate-850 p-4 flex flex-col justify-between">
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-slate-400 border border-dashed border-slate-700/80 rounded-2xl">
                    <Monitor className="h-10 w-10 text-blue-500 animate-pulse mb-2" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">Simulating Screen-Share Transmission</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">Drawing live assets. Check whiteboard coordinates below.</span>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-t from-indigo-950/20 to-slate-950">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-emerald-400 to-sky-600 flex items-center justify-center text-xl font-black text-white shadow-xl ring-4 ring-slate-800">
                    MV
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Prof. Marcus Vance (Instructor)</h4>
                    <p className="text-4xs text-slate-450 uppercase font-mono tracking-wider">Session Host &mdash; Broadcaster Stream</p>
                  </div>
                  <div className="flex gap-1.5 items-center bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-4xs text-emerald-400 font-mono uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Connection Excellent (HD)
                  </div>
                </div>
              )}

              {/* Status pill overlay */}
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-3 py-1 rounded-full text-[10px] font-bold text-sky-400 flex items-center gap-1.5 shadow-md">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Broadcaster Feed
              </div>
            </div>

          </div>

          {/* INTERACTIVE WHITEBOARD CONTAINER */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 flex flex-col text-left shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                  <PenTool className="h-4 w-4 text-indigo-400" /> Digital Workshop Canvas Board
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">Use your mouse or trackpad to sketch, design and explain equations</p>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Palette */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {["#4f46e5", "#10b981", "#ef4444", "#3b82f6", "#f59e0b"].map((col) => (
                    <button
                      key={col}
                      onClick={() => setDrawColor(col)}
                      className={`h-4.5 w-4.5 rounded-full border cursor-pointer active:scale-95 transition-all ${
                        drawColor === col ? "border-white scale-110 shadow" : "border-transparent opacity-65 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: col }}
                      title={`Draw color: ${col}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearWhiteboard}
                    className="px-2.5 py-1 hover:bg-slate-800 bg-slate-950 text-slate-350 border border-slate-800 hover:text-white rounded-lg text-4xs font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Eraser className="h-3 w-3" /> Clear Board
                  </button>
                </div>
              </div>
            </div>

            {/* CANVAS WRAPPER */}
            <div className="relative w-full aspect-[21/9] bg-white rounded-2xl overflow-hidden shadow-inner cursor-crosshair border border-slate-800/80">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                width={800}
                height={340}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>

          {/* CONTROLS UTILITY BAR */}
          <div className="bg-slate-900 border border-slate-850 p-4 rounded-3xl flex flex-wrap items-center justify-center gap-4 shadow-xl">
            <button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase rounded-2xl cursor-pointer transition-all active:scale-95 border ${
                cameraEnabled
                  ? "bg-slate-850 hover:bg-slate-800 text-white border-slate-700"
                  : "bg-red-900/40 text-rose-400 border-red-800/60"
              }`}
            >
              {cameraEnabled ? <Video className="h-4 w-4 text-emerald-400" /> : <VideoOff className="h-4 w-4 text-red-400" />}
              <span>{cameraEnabled ? "Stop Camera" : "Start Camera"}</span>
            </button>

            <button
              onClick={() => setMicEnabled(!micEnabled)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase rounded-2xl cursor-pointer transition-all active:scale-95 border ${
                micEnabled
                  ? "bg-slate-850 hover:bg-slate-800 text-white border-slate-700"
                  : "bg-red-900/40 text-rose-400 border-red-800/60"
              }`}
            >
              {micEnabled ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4 text-red-400" />}
              <span>{micEnabled ? "Mute Mic" : "Unmute Mic"}</span>
            </button>

            <button
              onClick={() => setScreenSharing(!screenSharing)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase rounded-2xl cursor-pointer transition-all active:scale-95 border ${
                screenSharing
                  ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                  : "bg-slate-850 hover:bg-slate-800 text-white border-slate-700"
              }`}
            >
              <Monitor className={`h-4 w-4 ${screenSharing ? "text-blue-400" : "text-slate-400"}`} />
              <span>{screenSharing ? "Sharing Screen" : "Share Screen"}</span>
            </button>

            <button
              onClick={handleRaiseHandToggle}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase rounded-2xl cursor-pointer transition-all active:scale-95 border ${
                handRaised
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                  : "bg-slate-850 hover:bg-slate-800 text-white border-slate-700"
              }`}
            >
              <Hand className={`h-4 w-4 ${handRaised ? "text-amber-400 fill-amber-400/25" : "text-slate-400"}`} />
              <span>{handRaised ? "Hand Raised" : "Raise Hand"}</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar (Chat Room, Active Roster) */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/90 flex flex-col overflow-hidden shrink-0">
          
          {/* TAB BAR */}
          <div className="flex border-b border-slate-850 p-1.5 bg-slate-950">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 text-4xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                activeTab === "chat" ? "bg-slate-850 text-white border border-slate-700/45" : "text-slate-450 hover:text-slate-200"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" /> Room Feed Chat
            </button>
            <button
              onClick={() => setActiveTab("roster")}
              className={`flex-1 py-2 text-4xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                activeTab === "roster" ? "bg-slate-850 text-white border border-slate-700/45" : "text-slate-450 hover:text-slate-200"
              }`}
            >
              <Users className="h-3.5 w-3.5 text-emerald-400" /> Active Roster
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "chat" ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* MESSAGES LIST */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg) => {
                    const isSystem = msg.senderRole === "system";
                    const isTeacher = msg.senderRole === "teacher";
                    
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-2xl text-left border ${
                          isSystem
                            ? "bg-slate-950/90 border-amber-500/20"
                            : isTeacher
                            ? "bg-emerald-950/20 border-emerald-800/30 text-slate-100"
                            : "bg-slate-950 border-slate-850"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase ${
                            isSystem ? "text-amber-400" : isTeacher ? "text-emerald-400" : "text-slate-300"
                          }`}>
                            {msg.senderName}
                          </span>
                          <span className="text-[8px] font-mono text-slate-550">{msg.timestamp}</span>
                        </div>
                        <p className="text-[11.5px] text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* SENDER INPUT */}
                <div className="p-3 border-t border-slate-850 bg-slate-950 flex items-center gap-2">
                  <input
                    type="text"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Ask a question..."
                    className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white outline-none focus:border-slate-750"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                <span className="block text-[9px] font-mono font-black text-slate-450 uppercase tracking-widest text-left">Classroom Directory</span>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-850 text-left">
                    <div>
                      <span className="block text-xs font-black text-white">Prof. Marcus Vance</span>
                      <span className="block text-[9px] text-emerald-400 uppercase font-mono tracking-wider font-bold">COURSE INSTRUCTOR</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-850 text-left">
                    <div>
                      <span className="block text-xs font-black text-white">{user ? user.name : "Student Scholar"}</span>
                      <span className="block text-[9px] text-blue-400 uppercase font-mono tracking-wider font-bold">YOU (PRESENCE LOGGED)</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  {/* Mock Class attendees listing */}
                  <div className="p-3 bg-slate-950/40 rounded-2xl flex items-center justify-between border border-slate-850/40 text-left">
                    <div>
                      <span className="block text-xs font-black text-slate-400">Sarah Jenkins</span>
                      <span className="block text-[9px] text-slate-500 uppercase font-mono">Student Roster</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-700/50" />
                  </div>

                  <div className="p-3 bg-slate-950/40 rounded-2xl flex items-center justify-between border border-slate-850/40 text-left">
                    <div>
                      <span className="block text-xs font-black text-slate-400">Michael Cole</span>
                      <span className="block text-[9px] text-slate-500 uppercase font-mono">Student Roster</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-700/50" />
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-950/20 border border-slate-800 rounded-2xl space-y-2 text-left">
                  <h4 className="text-[10px] uppercase font-black text-indigo-400 tracking-wider flex items-center gap-1 font-mono">
                    <Sparkles className="h-3.5 w-3.5 animate-spin text-indigo-400" /> Intelligent Agent Presence
                  </h4>
                  <p className="text-[10.5px] text-slate-300 font-sans leading-relaxed">
                    Socrates AI study companion is actively summarizing this live session. Transcript files are auto-synced into coursework assets upon call finalization.
                  </p>
                </div>
              </div>
            )}
          </div>

        </aside>

      </div>
    </div>
  );
};
