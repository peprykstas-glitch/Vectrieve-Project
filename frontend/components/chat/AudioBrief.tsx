"use client";

import React, { useState, useEffect, useRef } from "react";
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
  MessageSquare,
  Mic,
  SlidersHorizontal,
  SkipBack,
  SkipForward
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

const BAR_COUNT = 24;
const FADE_SECONDS = 0.18; // crossfade length between dialogue turns
const CLICK_DEBOUNCE_MS = 350; // ignore rapid repeat clicks on transcript rows

export default function AudioBrief({ documentId, sessionId, filename, onClose }: AudioBriefProps) {
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [lang, setLang] = useState<"uk" | "en">("uk");

  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(-1);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [viewMode, setViewMode] = useState<"modern" | "retro">("modern");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Progress of the currently speaking turn (0-1), drives the inline progress underline
  const [activeProgress, setActiveProgress] = useState(0);
  // Real frequency-derived bar heights (0-1) for the visualizer, replaces random jitter
  const [barLevels, setBarLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.08));

  // Audio element refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const turnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Web Audio graph refs (created lazily on first playback)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const currentGainRef = useRef<GainNode | null>(null);
  const fadingOutRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Refs that mirror state to avoid stale reads inside long-lived callbacks
  const isMutedRef = useRef(isMuted);
  const lastClickAtRef = useRef(0);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  // Cache key helper
  const getCacheKey = () => {
    if (sessionId) return `vectrieve_podcast_brief_session_${sessionId}_${lang}`;
    if (documentId) return `vectrieve_podcast_brief_${documentId}_${lang}`;
    return `vectrieve_podcast_brief_latest_${lang}`;
  };

  const resetPlaybackVisuals = () => {
    setActiveProgress(0);
    setBarLevels(Array(BAR_COUNT).fill(0.08));
    fadingOutRef.current = false;
    if (currentGainRef.current) {
      try {
        currentGainRef.current.disconnect();
      } catch {
        // already disconnected, ignore
      }
      currentGainRef.current = null;
    }
  };

  // Synchronize loading from local storage on component mount or config/lang change
  useEffect(() => {
    const cacheKey = getCacheKey();
    const cached = localStorage.getItem(cacheKey);

    setIsPlaying(false);
    setCurrentTurnIdx(-1);
    resetPlaybackVisuals();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current = null;
    }

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.transcript && parsed.transcript.length > 0) {
          setPodcast(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse cached podcast briefing", e);
      }
    }

    // If not cached (or cache was corrupt), reset podcast to allow fresh generation
    setPodcast(null);
  }, [documentId, sessionId, lang]);

  // Clean up audio + Web Audio graph when component unmounts
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
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
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

  // Keyboard shortcuts: space = play/pause, arrows = skip turn
  useEffect(() => {
    if (!podcast) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === "ArrowRight" && currentTurnIdx < podcast.transcript.length - 1) {
        e.preventDefault();
        setCurrentTurnIdx(currentTurnIdx + 1);
        setIsPlaying(true);
      } else if (e.code === "ArrowLeft" && currentTurnIdx > 0) {
        e.preventDefault();
        setCurrentTurnIdx(currentTurnIdx - 1);
        setIsPlaying(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcast, isPlaying, currentTurnIdx]);

  // Global listener for click-to-seek timestamp events dispatched from ChatMessage or Meeting Intelligence
  useEffect(() => {
    const handleTimestampSeek = (e: any) => {
      const { seconds, timestamp } = e.detail || {};
      if (!podcast || !podcast.transcript || podcast.transcript.length === 0) {
        return;
      }
      let targetSec = seconds;
      if (targetSec === undefined && timestamp) {
        const parts = timestamp.split(":").map(Number);
        if (parts.length === 2) targetSec = parts[0] * 60 + parts[1];
        else if (parts.length === 3) targetSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      if (targetSec !== undefined) {
        // Map seconds across transcript turns (estimated ~10-12s per turn)
        const estTurn = Math.min(Math.floor(targetSec / 10), podcast.transcript.length - 1);
        setCurrentTurnIdx(Math.max(0, estTurn));
        setIsPlaying(true);
      }
    };

    window.addEventListener("seek-audio-timestamp", handleTimestampSeek);
    return () => window.removeEventListener("seek-audio-timestamp", handleTimestampSeek);
  }, [podcast]);

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = ratio * audioRef.current.duration;
    setActiveProgress(ratio);
  };

  const handleJump = (deltaSeconds: number) => {
    if (!audioRef.current) return;
    const duration = audioRef.current.duration || 0;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + deltaSeconds));
    audioRef.current.currentTime = newTime;
    if (duration > 0) {
      setActiveProgress(newTime / duration);
    }
  };

  // Real audio-reactive visualizer loop (reads the shared analyser node each frame)
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let active = true;
    const tick = () => {
      if (!active) return;
      const analyser = analyserRef.current;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        setBarLevels(
          Array.from({ length: BAR_COUNT }, (_, i) => Math.max(0.06, (data[i] ?? 0) / 255))
        );
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const ensureAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      const AudioCtxClass: typeof AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.7;

      const masterGain = ctx.createGain();
      masterGain.gain.value = isMutedRef.current ? 0 : volume;

      masterGain.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      masterGainRef.current = masterGain;
    }

    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => { });
    }

    return audioCtxRef.current;
  };

  // Wires a fresh <audio> element into the shared Web Audio graph via its own gain node,
  // so each dialogue turn can be faded in/out independently for a smooth crossfade.
  const attachGraph = (audio: HTMLAudioElement): GainNode => {
    const ctx = ensureAudioContext();
    const source = ctx.createMediaElementSource(audio);
    const trackGain = ctx.createGain();
    trackGain.gain.value = 0; // start silent, fade in once playback begins
    source.connect(trackGain);
    trackGain.connect(masterGainRef.current!);
    return trackGain;
  };

  const generatePodcast = async () => {
    setLoading(true);
    setErrorMsg(null);
    setProgressPercent(0);

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

    setProgressMsg(steps[0]);

    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setProgressMsg(steps[stepIdx]);
      setProgressPercent(Math.round(((stepIdx + 1) / steps.length) * 100));
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

      setProgressPercent(100);
      setPodcast(data);

      try {
        localStorage.setItem(getCacheKey(), JSON.stringify(data));
      } catch (storageErr) {
        // Private browsing / quota exceeded — non-fatal, briefing still works this session
        console.warn("Unable to cache podcast briefing:", storageErr);
      }

      setCurrentTurnIdx(0);
      setIsPlaying(true);
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setProgressPercent(0);
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
      audioRef.current.ontimeupdate = null;
    }
    if (currentGainRef.current) {
      try {
        currentGainRef.current.disconnect();
      } catch {
        // ignore
      }
      currentGainRef.current = null;
    }

    setActiveProgress(0);
    fadingOutRef.current = false;

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

    const advance = () => {
      if (index + 1 < podcast.transcript.length) {
        setCurrentTurnIdx(index + 1);
      } else {
        setIsPlaying(false);
        setCurrentTurnIdx(-1);
        setActiveProgress(0);
      }
    };

    // Try to route through the Web Audio graph for the visualizer + crossfade.
    // If Web Audio is unavailable for any reason, fall back to plain playback.
    let trackGain: GainNode | null = null;
    try {
      trackGain = attachGraph(audio);
      currentGainRef.current = trackGain;
    } catch (graphErr) {
      console.warn("Web Audio graph unavailable, falling back to native playback:", graphErr);
      audio.muted = isMuted;
      audio.volume = isMuted ? 0 : volume;
    }

    audio.ontimeupdate = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setActiveProgress(audio.currentTime / audio.duration);

        if (trackGain && audioCtxRef.current) {
          const remaining = audio.duration - audio.currentTime;
          if (remaining <= FADE_SECONDS && !fadingOutRef.current) {
            fadingOutRef.current = true;
            const ctx = audioCtxRef.current;
            const now = ctx.currentTime;
            trackGain.gain.cancelScheduledValues(now);
            trackGain.gain.setValueAtTime(trackGain.gain.value, now);
            trackGain.gain.linearRampToValueAtTime(0, now + Math.max(remaining, 0.01));
          }
        }
      }
    };

    audio.onended = () => {
      advance();
    };

    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      setTimeout(advance, 1000);
    };

    audio
      .play()
      .then(() => {
        if (trackGain && audioCtxRef.current) {
          const ctx = audioCtxRef.current;
          const now = ctx.currentTime;
          trackGain.gain.cancelScheduledValues(now);
          trackGain.gain.setValueAtTime(0, now);
          trackGain.gain.linearRampToValueAtTime(1, now + FADE_SECONDS);
        }
      })
      .catch(err => {
        console.error("Audio play failed:", err);
        setTimeout(advance, 2000);
      });

    // Preload next turn in background (skip if it's already preloaded)
    if (index + 1 < podcast.transcript.length) {
      const nextTurn = podcast.transcript[index + 1];
      const nextUrl = `/api/proxy/podcast/audio?text=${encodeURIComponent(nextTurn.text)}&host=${encodeURIComponent(nextTurn.host)}&language=${encodeURIComponent(lang)}`;

      if (!nextAudioRef.current || !nextAudioRef.current.src.endsWith(nextUrl)) {
        const preload = new Audio(nextUrl);
        preload.preload = "auto";
        preload.load();
        nextAudioRef.current = preload;
      }
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
    resetPlaybackVisuals();
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
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = nextMuted ? 0 : volume;
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    const nextMuted = v === 0;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.volume = v;
      audioRef.current.muted = nextMuted;
    }
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = nextMuted ? 0 : v;
    }
  };

  // Debounced so a burst of clicks on the transcript doesn't spin up several
  // overlapping Audio() instances before the previous one has a chance to pause.
  const handleTurnClick = (idx: number) => {
    const now = Date.now();
    if (now - lastClickAtRef.current < CLICK_DEBOUNCE_MS) return;
    lastClickAtRef.current = now;

    setCurrentTurnIdx(idx);
    if (!isPlaying) setIsPlaying(true);
  };

  const currentTurn = podcast && currentTurnIdx >= 0 && currentTurnIdx < podcast.transcript.length
    ? podcast.transcript[currentTurnIdx]
    : null;
  const activeHost = currentTurn ? currentTurn.host.toLowerCase() : "";
  const isMaxSpeaking = isPlaying && activeHost === "max";
  const isJuliaSpeaking = isPlaying && activeHost === "julia";

  return (
    <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 relative overflow-hidden shadow-2xl backdrop-blur-xl transition-all duration-1000">
      {/* Background glows */}
      <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
        isMaxSpeaking
          ? "bg-indigo-500/20"
          : isJuliaSpeaking
            ? "bg-purple-500/20"
            : "bg-indigo-500/10"
      }`} />
      <div className={`absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
        isMaxSpeaking
          ? "bg-blue-500/15"
          : isJuliaSpeaking
            ? "bg-pink-500/15"
            : "bg-emerald-500/5"
      }`} />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse motion-reduce:animate-none" />
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
            <Sparkles className="w-8 h-8 animate-pulse motion-reduce:animate-none" />
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${lang === "uk"
                  ? "bg-zinc-850 text-white shadow-sm border border-white/5"
                  : "text-zinc-500 hover:text-zinc-300"
                  }`}
              >
                🇺🇦 Українська
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${lang === "en"
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
        <div className="space-y-4">
          <div className="text-center py-8 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20 px-5">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin motion-reduce:animate-none mb-4" />
            <h5 className="text-sm font-semibold text-zinc-200">{progressMsg}</h5>
            <p className="text-[10px] text-zinc-500 mt-1 mb-4 max-w-[280px]">
              Processing transcript context and drafting dialogue turns...
            </p>

            <div className="w-full max-w-xs h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[9px] text-zinc-600 mt-1 w-full max-w-xs text-right">{progressPercent}%</p>
          </div>

          {/* Skeleton preview of the dialogue rows about to arrive */}
          <div className="space-y-2.5 px-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-11 rounded-xl bg-zinc-900/50 border border-white/5 animate-pulse motion-reduce:animate-none ${i % 2 === 0 ? "mr-10" : "ml-10"}`}
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-zinc-950 p-4 border border-white/5 rounded-xl transition-all duration-300">
            {/* Visualizer view based on viewMode */}
            {viewMode === "modern" ? (
              <div className="flex items-center justify-around w-full max-w-[280px] h-[120px] mx-auto bg-zinc-900/30 border border-white/5 rounded-xl p-3 relative select-none shadow-inner">
                {/* Host 1: Max */}
                <div className="flex flex-col items-center gap-1.5 transition-all duration-300">
                  <div className={`relative p-1 rounded-full transition-all duration-500 ${
                    isMaxSpeaking
                      ? "bg-gradient-to-tr from-indigo-500 to-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105"
                      : isJuliaSpeaking
                        ? "opacity-40 scale-95"
                        : "bg-zinc-800"
                  }`}>
                    {/* Max avatar */}
                    <svg className="w-12 h-12 rounded-full" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <radialGradient id="max-avatar-bg" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#1e1b4b" />
                          <stop offset="100%" stopColor="#312e81" />
                        </radialGradient>
                        <linearGradient id="max-avatar-glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>
                      <circle cx="32" cy="32" r="32" fill="url(#max-avatar-bg)" />
                      {/* Headphone silhouette */}
                      <path d="M18 34 C18 22 46 22 46 34" stroke="url(#max-avatar-glow)" strokeWidth="3" strokeLinecap="round" fill="none" />
                      <rect x="15" y="32" width="6" height="10" rx="3" fill="url(#max-avatar-glow)" />
                      <rect x="43" y="32" width="6" height="10" rx="3" fill="url(#max-avatar-glow)" />
                      {/* Cool sunglasses (Max) */}
                      <rect x="22" y="27" width="9" height="6" rx="2" fill="#1e1b4b" stroke="url(#max-avatar-glow)" strokeWidth="2" />
                      <rect x="33" y="27" width="9" height="6" rx="2" fill="#1e1b4b" stroke="url(#max-avatar-glow)" strokeWidth="2" />
                      <line x1="31" y1="30" x2="33" y2="30" stroke="url(#max-avatar-glow)" strokeWidth="2" />
                      {/* Microphone */}
                      <circle cx="32" cy="46" r="3" fill="url(#max-avatar-glow)" />
                      <rect x="30" y="49" width="4" height="10" fill="url(#max-avatar-glow)" />
                    </svg>
                    
                    {isMaxSpeaking && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-zinc-900 text-[6px] font-bold text-white items-center justify-center">ON</span>
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isMaxSpeaking ? "text-indigo-400" : "text-zinc-500"}`}>Max</span>
                </div>

                {/* Central Mic & Audio indicator icon */}
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-950/40 border border-white/5">
                  <Mic className={`w-5 h-5 transition-all duration-300 ${isPlaying ? "text-indigo-400 animate-pulse" : "text-zinc-650"}`} />
                  <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest mt-1">ON AIR</span>
                </div>

                {/* Host 2: Julia */}
                <div className="flex flex-col items-center gap-1.5 transition-all duration-300">
                  <div className={`relative p-1 rounded-full transition-all duration-500 ${
                    isJuliaSpeaking
                      ? "bg-gradient-to-tr from-purple-500 to-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-105"
                      : isMaxSpeaking
                        ? "opacity-40 scale-95"
                        : "bg-zinc-800"
                  }`}>
                    {/* Julia avatar */}
                    <svg className="w-12 h-12 rounded-full" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <radialGradient id="julia-avatar-bg" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#3b0764" />
                          <stop offset="100%" stopColor="#581c87" />
                        </radialGradient>
                        <linearGradient id="julia-avatar-glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c084fc" />
                          <stop offset="100%" stopColor="#9333ea" />
                        </linearGradient>
                      </defs>
                      <circle cx="32" cy="32" r="32" fill="url(#julia-avatar-bg)" />
                      {/* Headphone silhouette */}
                      <path d="M18 34 C18 22 46 22 46 34" stroke="url(#julia-avatar-glow)" strokeWidth="3" strokeLinecap="round" fill="none" />
                      <rect x="15" y="32" width="6" height="10" rx="3" fill="url(#julia-avatar-glow)" />
                      <rect x="43" y="32" width="6" height="10" rx="3" fill="url(#julia-avatar-glow)" />
                      {/* Elegant hair/face shape (Julia) */}
                      <path d="M24 28 C24 20 40 20 40 28 C40 33 37 36 32 38 C27 36 24 33 24 28 Z" fill="none" stroke="url(#julia-avatar-glow)" strokeWidth="1.5" />
                      {/* Microphone */}
                      <circle cx="32" cy="46" r="3" fill="url(#julia-avatar-glow)" />
                      <rect x="30" y="49" width="4" height="10" fill="url(#julia-avatar-glow)" />
                    </svg>

                    {isJuliaSpeaking && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-zinc-900 text-[6px] font-bold text-white items-center justify-center">ON</span>
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isJuliaSpeaking ? "text-purple-400" : "text-zinc-500"}`}>Julia</span>
                </div>
              </div>
            ) : (
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
                    className={isPlaying ? "origin-[55px_72px] animate-[spin_6s_linear_infinite] motion-reduce:animate-none" : ""}
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
                    className={isPlaying ? "origin-[105px_72px] animate-[spin_6s_linear_infinite] motion-reduce:animate-none" : ""}
                  />

                  <path d="M 60 85 L 100 85 L 94 95 L 66 95 Z" fill="#27272a" />
                </svg>
              </div>
            )}

            {/* Audio Controls and Spectrum */}
            <div className="flex flex-col justify-between h-full space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Now playing</span>
                  <h5 className="text-xs font-semibold text-zinc-200 truncate mt-0.5 max-w-[140px] sm:max-w-[200px]" title={podcast.title}>
                    {podcast.title}
                  </h5>

                  <div className="text-[10px] mt-1.5 text-zinc-400 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-emerald-500 animate-ping motion-reduce:animate-none" : "bg-zinc-600"}`} />
                    {isPlaying ? (
                      currentTurnIdx >= 0 ? (
                        <span>
                          Speaking: <strong className={isMaxSpeaking ? "text-indigo-400" : "text-purple-400"}>{podcast.transcript[currentTurnIdx].host}</strong> ({currentTurnIdx + 1}/{podcast.transcript.length})
                        </span>
                      ) : (
                        "Initializing speech..."
                      )
                    ) : (
                      "Paused"
                    )}
                  </div>
                </div>

                {/* View Mode Toggle */}
                <button
                  onClick={() => setViewMode(viewMode === "modern" ? "retro" : "modern")}
                  className="px-2 py-1 text-[9px] font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="Toggle player style"
                >
                  <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                  <span>{viewMode === "modern" ? "Classic Tape" : "Studio View"}</span>
                </button>
              </div>

              {/* Interactive Audio Waveform Visualizer & Scrub Bar */}
              <div 
                onClick={handleWaveformClick}
                className="h-8 flex items-end gap-1 px-3 bg-zinc-950 border border-white/5 rounded-xl overflow-hidden py-1.5 shadow-inner cursor-pointer relative group/wave select-none"
                title="Click waveform to scrub and seek"
              >
                {/* Active progress scrub overlay */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-indigo-500/10 pointer-events-none transition-all duration-100 border-r border-indigo-500/50"
                  style={{ width: `${Math.round(activeProgress * 100)}%` }}
                />
                {barLevels.map((level, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-gradient-to-t from-indigo-500 via-purple-500 to-emerald-450 rounded-full transition-transform duration-75 ease-out motion-reduce:transition-none relative z-10"
                    style={{
                      height: "100%",
                      transform: `scaleY(${isPlaying ? Math.max(0.12, level) : 0.2})`,
                      transformOrigin: "bottom",
                    }}
                  />
                ))}
              </div>

              {/* Player Core Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePlayPause}
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${isPlaying
                      ? "bg-zinc-800 border border-zinc-700 text-white"
                      : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-900/30"
                      }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={() => handleJump(-5)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center gap-0.5 text-[9px] font-mono font-semibold"
                    title="Jump backward 5s"
                  >
                    <SkipBack className="w-3 h-3" />
                    <span>-5s</span>
                  </button>

                  <button
                    onClick={() => handleJump(5)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center gap-0.5 text-[9px] font-mono font-semibold"
                    title="Jump forward 5s"
                  >
                    <span>+5s</span>
                    <SkipForward className="w-3 h-3" />
                  </button>

                  <button
                    onClick={handleReset}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                    title="Restart brief"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  
                  {/* volume controls with hover slide-out slider */}
                  <div className="flex items-center gap-1 group relative">
                    <button
                      onClick={toggleMute}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover:w-16 transition-all duration-300 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Speed Multiplier select */}
                <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-white/5">
                  {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${speechRate === rate
                        ? "bg-zinc-800 text-indigo-400 border border-white/5 shadow-inner"
                        : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[9px] text-zinc-600 text-center">
                Space to play/pause · ← → to skip a turn
              </p>
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
                    onClick={() => handleTurnClick(idx)}
                    className={`p-3 rounded-xl transition-all duration-300 cursor-pointer border ${isActive
                      ? isMax
                        ? "bg-indigo-950/40 border-indigo-500/50 shadow-[0_0_12px_rgba(99,102,241,0.15)] scale-[1.01]"
                        : "bg-purple-950/40 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.15)] scale-[1.01]"
                      : "bg-zinc-900/30 border-transparent hover:border-zinc-800/80"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${isMax ? "bg-indigo-400" : "bg-purple-400"
                          }`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isMax ? "text-indigo-400" : "text-purple-400"
                          }`}>
                          {turn.host}
                        </span>
                      </div>

                      {isActive && (
                        <div className="flex items-center gap-1 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                          <MessageSquare className="w-2.5 h-2.5 animate-bounce motion-reduce:animate-none" />
                          <span>Active Turn</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-xs font-sans leading-relaxed transition-colors ${isActive ? "text-zinc-100" : "text-zinc-400"
                      }`}>
                      {turn.text}
                    </p>

                    {isActive && (
                      <div className="mt-2 h-[3px] w-full bg-zinc-800/70 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-[width] duration-150 ease-linear"
                          style={{ width: `${Math.min(100, Math.round(activeProgress * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}