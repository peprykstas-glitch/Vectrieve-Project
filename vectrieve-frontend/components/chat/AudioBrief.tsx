"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Radio, 
  Sparkles, 
  Loader2, 
  X,
  MessageSquare
} from "lucide-react";

interface AudioBriefProps {
  documentId?: number;
  sessionId?: string | null;
  filename: string;
  onClose?: () => void;
}

interface PodcastTurn {
  host: "Max" | "Julia" | string;
  text: string;
}

interface PodcastData {
  title: string;
  transcript: PodcastTurn[];
}

export default function AudioBrief({ documentId, sessionId, filename, onClose }: AudioBriefProps) {
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [lang, setLang] = useState<"uk" | "en">("uk");
  
  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(-1);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Audio Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const turnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Cache key helper
  const getCacheKey = () => {
    if (sessionId) return `vectrieve_podcast_brief_session_${sessionId}_${lang}`;
    if (documentId) return `vectrieve_podcast_brief_${documentId}_${lang}`;
    return `vectrieve_podcast_brief_latest_${lang}`;
  };

  // Synchronize loading from local storage on component mount or config/lang change
  useEffect(() => {
    const cacheKey = getCacheKey();
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.transcript && parsed.transcript.length > 0) {
          setPodcast(parsed);
          setCurrentTurnIdx(-1);
          setIsPlaying(false);
          // Stop any current playbacks
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          if (nextAudioRef.current) {
            nextAudioRef.current.pause();
            nextAudioRef.current = null;
          }
          return;
        }
      } catch (e) {
        console.error("Failed to parse cached podcast briefing", e);
      }
    }
    
    // If not cached, reset podcast to allow fresh generation
    setPodcast(null);
    setCurrentTurnIdx(-1);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current = null;
    }
  }, [documentId, sessionId, lang]);

  // Clean up audios when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (nextAudioRef.current) {
        nextAudioRef.current.pause();
        nextAudioRef.current = null;
      }
    };
  }, []);

  // Scroll active turn into view
  useEffect(() => {
    if (currentTurnIdx >= 0 && turnRefs.current[currentTurnIdx]) {
      turnRefs.current[currentTurnIdx]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentTurnIdx]);

  // Trigger speech when active turn changes
  useEffect(() => {
    if (isPlaying && podcast && currentTurnIdx >= 0 && currentTurnIdx < podcast.transcript.length) {
      speakTurn(currentTurnIdx);
    } else if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [currentTurnIdx, isPlaying]);

  const generatePodcast = async () => {
    setLoading(true);
    setErrorMsg(null);
    setProgressMsg("Scanning conversation context..." if sessionId else "Scanning vector segments...");
    
    const steps = sessionId 
      ? [
          "Parsing chat messages...",
          "Synthesizing dialogue briefing...",
          "Julia is reviewing questions...",
          "Max is analyzing AI answers...",
          "Finalizing chat briefing..."
        ]
      : [
          "Extracting key themes...",
          "Drafting host scripts...",
          "Julia is structuring details...",
          "Max is adding commentary...",
          "Finalizing audio brief..."
        ];
    
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgressMsg(steps[stepIdx]);
        stepIdx++;
      }
    }, 1500);

    try {
      const payload: any = { language: lang };
      if (sessionId) {
        payload.session_id = sessionId;
      } else if (documentId) {
        payload.document_id = documentId;
      }

      const res = await fetch("/api/proxy/podcast/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      clearInterval(interval);
      
      if (!res.ok) {
        throw new Error(sessionId ? "Failed to summarize chat session." : "Failed to synthesize document overview.");
      }
      
      const data = await res.json();
      if (!data.transcript || data.transcript.length === 0) {
        throw new Error("Empty script returned.");
      }
      
      setPodcast(data);
      localStorage.setItem(getCacheKey(), JSON.stringify(data));
      setCurrentTurnIdx(0);
      setIsPlaying(true);
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during generation.");
    } finally {
      setLoading(false);
    }
  };

  const speakTurn = (index: number) => {
    if (!podcast) return;

    // Pause any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }

    const turn = podcast.transcript[index];
    const audioUrl = `/api/proxy/podcast/audio?text=${encodeURIComponent(turn.text)}&host=${encodeURIComponent(turn.host)}&language=${encodeURIComponent(lang)}`;
    
    let audio: HTMLAudioElement;

    // Use preloaded audio if available
    if (nextAudioRef.current && nextAudioRef.current.src.endsWith(audioUrl)) {
      audio = nextAudioRef.current;
      nextAudioRef.current = null;
    } else {
      audio = new Audio(audioUrl);
    }

    audioRef.current = audio;
    audio.playbackRate = speechRate;
    audio.muted = isMuted;

    audio.onended = () => {
      if (index + 1 < podcast.transcript.length) {
        setCurrentTurnIdx(index + 1);
      } else {
        setIsPlaying(false);
        setCurrentTurnIdx(-1);
      }
    };

    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      setTimeout(() => {
        if (index + 1 < podcast.transcript.length) {
          setCurrentTurnIdx(index + 1);
        } else {
          setIsPlaying(false);
          setCurrentTurnIdx(-1);
        }
      }, 1000);
    };

    audio.play().catch(err => {
      console.error("Audio play failed:", err);
      setTimeout(() => {
        if (index + 1 < podcast.transcript.length) {
          setCurrentTurnIdx(index + 1);
        } else {
          setIsPlaying(false);
          setCurrentTurnIdx(-1);
        }
      }, 2000);
    });

    // Preload next turn in background
    if (index + 1 < podcast.transcript.length) {
      const nextTurn = podcast.transcript[index + 1];
      const nextUrl = `/api/proxy/podcast/audio?text=${encodeURIComponent(nextTurn.text)}&host=${encodeURIComponent(nextTurn.host)}&language=${encodeURIComponent(lang)}`;
      const nextAudio = new Audio(nextUrl);
      nextAudio.load();
      nextAudioRef.current = nextAudio;
    }
  };

  const handlePlayPause = () => {
    if (!podcast) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (currentTurnIdx === -1) {
        setCurrentTurnIdx(0);
      } else {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            speakTurn(currentTurnIdx);
          });
        } else {
          speakTurn(currentTurnIdx);
        }
      }
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTurnIdx(0);
  };

  const handleSpeedChange = (rate: number) => {
    setSpeechRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Background glows */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <span>Vectrieve Audio Briefing Studio</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                Neural
              </span>
            </h4>
            <p className="text-[10px] text-zinc-500 truncate max-w-[280px] sm:max-w-md">
              {sessionId 
                ? "Podcast-style summary of active chat conversation"
                : `Podcast-style executive dialogue of: ${filename}`}
            </p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!podcast && !loading && (
        <div className="text-center py-10 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
          <div className="p-4 rounded-full bg-zinc-800/40 mb-4 text-indigo-400">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <h5 className="text-sm font-medium text-zinc-200 mb-1">
            {sessionId ? "Generate Chat Briefing" : "Generate Podcast Overview"}
          </h5>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto mb-6 px-4">
            {sessionId 
              ? "Transform this chat conversation into a briefing between Max and Julia. They will summarize your questions and debate responses live."
              : "Transform this document into a conversation between hosts Max and Julia. They will debate key ideas and summarize obligations live."}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Language Selector */}
            <div className="flex bg-zinc-950 p-0.5 rounded-xl border border-white/5">
              <button
                onClick={() => setLang("uk")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  lang === "uk" 
                    ? "bg-zinc-850 text-white shadow-sm border border-white/5" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                🇺🇦 Українська
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  lang === "en" 
                    ? "bg-zinc-850 text-white shadow-sm border border-white/5" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                🇺🇸 English
              </button>
            </div>

            <button
              onClick={generatePodcast}
              className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-950/30 border border-indigo-400/20 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Radio className="w-3.5 h-3.5" />
              Generate Audio Overview
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <h5 className="text-sm font-semibold text-zinc-200 animate-pulse">{progressMsg}</h5>
          <p className="text-[10px] text-zinc-500 mt-1 max-w-[280px]">
            Please wait. Processing transcript context and drafting dialogue turns...
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 mb-4 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-2">
          <span className="font-bold text-red-500">Error:</span>
          <div>
            <p>{errorMsg}</p>
            <button 
              onClick={generatePodcast}
              className="mt-2 text-indigo-400 underline font-semibold cursor-pointer border-0 bg-transparent hover:text-indigo-300"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {podcast && !loading && (
        <div className="space-y-5">
          {/* Cassette and Visualizer Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-zinc-950 p-4 border border-white/5 rounded-xl">
            {/* Cassette Graphic */}
            <div className="flex justify-center select-none">
              <svg 
                className="w-full max-w-[200px] h-[120px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl relative"
                viewBox="0 0 160 100"
              >
                <rect x="5" y="5" width="150" height="90" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
                <rect x="15" y="15" width="130" height="40" rx="3" fill="#2d1b4e" stroke="#6366f1" strokeWidth="1" />
                <text x="80" y="27" textAnchor="middle" fill="#818cf8" fontSize="6" fontWeight="bold" fontFamily="monospace">
                  VECTRIEVE OVERVIEW
                </text>
                <text x="80" y="38" textAnchor="middle" fill="#c084fc" fontSize="5" fontWeight="bold" fontFamily="monospace" opacity="0.8">
                  {lang === "uk" ? "🇺🇦 УКР.ОГЛЯД" : "🇺🇸 ENG.BRIEF"}
                </text>
                <rect x="35" y="60" width="90" height="25" rx="3" fill="#101010" />
                
                <circle cx="55" cy="72" r="10" fill="#27272a" stroke="#4b5563" strokeWidth="1" />
                <circle 
                  cx="55" 
                  cy="72" 
                  r="6" 
                  fill="#18181b" 
                  stroke="#6366f1" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,2" 
                  className={isPlaying ? "origin-[55px_72px] animate-[spin_6s_linear_infinite]" : ""}
                />
                
                <circle cx="105" cy="72" r="10" fill="#27272a" stroke="#4b5563" strokeWidth="1" />
                <circle 
                  cx="105" 
                  cy="72" 
                  r="6" 
                  fill="#18181b" 
                  stroke="#6366f1" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,2" 
                  className={isPlaying ? "origin-[105px_72px] animate-[spin_6s_linear_infinite]" : ""}
                />

                <path d="M 60 85 L 100 85 L 94 95 L 66 95 Z" fill="#27272a" />
              </svg>
            </div>

            {/* Audio Controls and Spectrum */}
            <div className="flex flex-col justify-between h-full space-y-4">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Now playing</span>
                <h5 className="text-xs font-semibold text-zinc-200 truncate mt-0.5">{podcast.title}</h5>
                
                <div className="text-[10px] mt-1.5 text-zinc-400 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-emerald-500 animate-ping" : "bg-zinc-600"}`} />
                  {isPlaying ? (
                    currentTurnIdx >= 0 ? (
                      <span>
                        Speaking: <strong className="text-indigo-400">{podcast.transcript[currentTurnIdx].host}</strong> ({currentTurnIdx + 1}/{podcast.transcript.length})
                      </span>
                    ) : (
                      "Initializing speech..."
                    )
                  ) : (
                    "Paused"
                  )}
                </div>
              </div>

              {/* Bounce Soundbars Visualizer */}
              <div className="h-6 flex items-end gap-0.5 px-2 bg-zinc-900 border border-white/5 rounded-lg overflow-hidden py-1">
                {Array.from({ length: 24 }).map((_, idx) => {
                  const delay = (idx % 5) * 0.15;
                  return (
                    <div 
                      key={idx}
                      className={`w-1 bg-gradient-to-t from-indigo-500 to-emerald-400 rounded-t-sm transition-all duration-300 visualizer-bar ${
                        isPlaying ? "visualizer-bar-active" : ""
                      }`}
                      style={{
                        height: isPlaying ? "100%" : "20%",
                        transform: isPlaying ? `scaleY(${0.1 + Math.random() * 0.9})` : "scaleY(1)",
                        "--bar-delay": `${delay}s`
                      } as React.CSSProperties}
                    />
                  );
                })}
              </div>

              {/* Player Core Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayPause}
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                      isPlaying 
                        ? "bg-zinc-800 border border-zinc-700 text-white" 
                        : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-900/30"
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                    title="Restart brief"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Speed Multiplier select */}
                <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-white/5">
                  {[1.0, 1.25, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                        speechRate === rate 
                          ? "bg-zinc-800 text-indigo-400 border border-white/5 shadow-inner" 
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Dialogue scrolling feed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider pl-1">
              <span>Interactive Podcast Script</span>
              <span>Scrolls automatically</span>
            </div>
            
            <div 
              ref={scrollContainerRef}
              className="max-h-56 overflow-y-auto custom-scrollbar border border-white/5 bg-zinc-950/60 rounded-xl p-3.5 space-y-3"
            >
              {podcast.transcript.map((turn, idx) => {
                const isActive = idx === currentTurnIdx;
                const isMax = turn.host.toLowerCase() === "max";
                
                return (
                  <div
                    key={idx}
                    ref={(el) => { turnRefs.current[idx] = el; }}
                    onClick={() => {
                      setCurrentTurnIdx(idx);
                      if (!isPlaying) setIsPlaying(true);
                    }}
                    className={`p-3 rounded-xl transition-all duration-300 cursor-pointer border ${
                      isActive 
                        ? isMax
                          ? "bg-indigo-950/40 border-indigo-500/50 shadow-[0_0_12px_rgba(99,102,241,0.15)] scale-[1.01]"
                          : "bg-purple-950/40 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.15)] scale-[1.01]"
                        : "bg-zinc-900/30 border-transparent hover:border-zinc-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          isMax ? "bg-indigo-400" : "bg-purple-400"
                        }`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isMax ? "text-indigo-400" : "text-purple-400"
                        }`}>
                          {turn.host}
                        </span>
                      </div>
                      
                      {isActive && (
                        <div className="flex items-center gap-1 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                          <MessageSquare className="w-2.5 h-2.5 animate-bounce" />
                          <span>Active Turn</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-xs font-sans leading-relaxed transition-colors ${
                      isActive ? "text-zinc-100" : "text-zinc-400"
                    }`}>
                      {turn.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Styled animation keyframes */}
      <style jsx global>{`
        @keyframes bounce {
          0% { transform: scaleY(0.2); }
          100% { transform: scaleY(1.0); }
        }
        .visualizer-bar {
          transform-origin: bottom;
        }
        .visualizer-bar-active {
          animation: bounce 1s ease-in-out infinite alternate;
          animation-delay: var(--bar-delay);
        }
      `}</style>
    </div>
  );
}
