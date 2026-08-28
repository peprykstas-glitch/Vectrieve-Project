"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Copy,
  Check,
  Eye,
  Code2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  Maximize2,
  Minimize2,
  X,
  Download,
} from "lucide-react";

interface ChatMermaidProps {
  chart: string;
}

export default function ChatMermaid({ chart }: ChatMermaidProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"diagram" | "code">("diagram");
  const [zoom, setZoom] = useState(1);
  const [fullscreenZoom, setFullscreenZoom] = useState(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clean and sanitize chart definition
  const sanitizedChart = chart
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Remove rogue Mermaid v11 error nodes from document.body
  const cleanupMermaidErrorDOM = useCallback(() => {
    if (typeof document === "undefined") return;
    try {
      const rogueElements = document.querySelectorAll(
        '[id^="dmermaid"], [id^="mermaid-"], svg[aria-roledescription="error"]'
      );
      rogueElements.forEach((el) => {
        if (el && el.parentNode === document.body) {
          document.body.removeChild(el);
        }
      });
    } catch {
      // Ignore cleanup error
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      if (!sanitizedChart) return;
      try {
        setError(null);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#09090b",
            primaryColor: "#6366f1",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#818cf8",
            lineColor: "#a1a1aa",
            secondaryColor: "#10b981",
            tertiaryColor: "#06b6d4",
            mainBkg: "#18181b",
            nodeBorder: "#3f3f46",
            clusterBkg: "#18181b80",
            clusterBorder: "#3f3f46",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "13px",
          },
          securityLevel: "loose",
        });

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, sanitizedChart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.warn("Mermaid render error:", err);
        cleanupMermaidErrorDOM();
        if (isMounted) {
          setError(err?.message || "Failed to render diagram");
        }
      } finally {
        cleanupMermaidErrorDOM();
      }
    }

    renderChart();

    return () => {
      isMounted = false;
      cleanupMermaidErrorDOM();
    };
  }, [sanitizedChart, cleanupMermaidErrorDOM]);

  // Handle ESC key to close fullscreen modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sanitizedChart);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="my-4 rounded-2xl border border-white/10 bg-zinc-950/90 shadow-2xl overflow-hidden backdrop-blur-xl transition-all">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-white/5 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="font-semibold text-zinc-200 tracking-wide text-xs">
              Interactive Architecture & Flow Diagram
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Zoom controls (diagram mode only) */}
            {viewMode === "diagram" && !error && svgContent && (
              <div className="flex items-center gap-0.5 bg-zinc-900 border border-white/5 rounded-lg p-0.5 mr-1">
                <button
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
                  className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                  className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Fullscreen Expand Button */}
            {svgContent && !error && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 transition-all cursor-pointer mr-1"
                title="Expand Fullscreen"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fullscreen</span>
              </button>
            )}

            {/* Toggle between Diagram & Code */}
            <button
              onClick={() => setViewMode(viewMode === "diagram" ? "code" : "diagram")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            >
              {viewMode === "diagram" ? (
                <>
                  <Code2 className="w-3 h-3 text-indigo-400" />
                  <span>Source</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 text-emerald-400" />
                  <span>Diagram</span>
                </>
              )}
            </button>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === "code" || error ? (
          <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed">
            {error && (
              <div className="flex items-center gap-2 p-2.5 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Diagram preview unavailable — showing raw definition.</span>
              </div>
            )}
            <code>{sanitizedChart}</code>
          </div>
        ) : (
          <div className="p-6 flex items-center justify-center overflow-auto bg-zinc-950/60 min-h-[220px] max-h-[500px] relative">
            {svgContent ? (
              <div
                ref={containerRef}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className="w-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:drop-shadow-lg"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-500 py-8">
                <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <span>Rendering interactive diagram...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FULLSCREEN EXPANDED MODAL ── */}
      {isFullscreen && svgContent && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm sm:text-base">
                  Interactive Diagram & Architecture Map
                </h3>
                <p className="text-xs text-zinc-400 hidden sm:block">
                  Scroll or use controls to zoom. Press ESC to close.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen Zoom Controls */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setFullscreenZoom((z) => Math.min(3.5, z + 0.25))}
                  className="p-1.5 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-zinc-400 px-1.5 min-w-[45px] text-center">
                  {Math.round(fullscreenZoom * 100)}%
                </span>
                <button
                  onClick={() => setFullscreenZoom((z) => Math.max(0.4, z - 0.25))}
                  className="p-1.5 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFullscreenZoom(1.2)}
                  className="p-1.5 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Download SVG */}
              <button
                onClick={handleDownloadSVG}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Download SVG file"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Export SVG</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Close Fullscreen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Diagram Canvas */}
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-6 sm:p-12 my-2 cursor-grab active:cursor-grabbing select-none"
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setFullscreenZoom((z) =>
                  e.deltaY < 0 ? Math.min(3.5, z + 0.15) : Math.max(0.4, z - 0.15)
                );
              }
            }}
          >
            <div
              ref={fullscreenContainerRef}
              style={{
                transform: `scale(${fullscreenZoom})`,
                transformOrigin: "center center",
                transition: "transform 0.1s ease-out",
              }}
              className="max-w-none [&_svg]:max-w-none [&_svg]:w-auto [&_svg]:h-auto [&_svg]:drop-shadow-2xl"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </div>
      )}
    </>
  );
}

