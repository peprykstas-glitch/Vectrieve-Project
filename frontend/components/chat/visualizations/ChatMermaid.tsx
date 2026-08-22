"use client";

import React, { useEffect, useRef, useState } from "react";
import { Copy, Check, Eye, Code2, ZoomIn, ZoomOut, RotateCcw, AlertCircle } from "lucide-react";

interface ChatMermaidProps {
  chart: string;
}

export default function ChatMermaid({ chart }: ChatMermaidProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"diagram" | "code">("diagram");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      if (!chart.trim()) return;
      try {
        setError(null);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
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
            fontSize: "13px"
          },
          securityLevel: "loose",
        });

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chart.trim());
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.warn("Mermaid render error:", err);
        if (isMounted) {
          setError(err?.message || "Failed to render diagram");
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chart.trim());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-4 rounded-2xl border border-white/10 bg-zinc-950/90 shadow-xl overflow-hidden backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/70 border-b border-white/5 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="font-semibold text-zinc-200 tracking-wide text-xs">
            Interactive Architecture & Flow Diagram
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls (diagram mode only) */}
          {viewMode === "diagram" && !error && (
            <div className="flex items-center gap-0.5 bg-zinc-900 border border-white/5 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
                className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
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
              <span>Diagram preview unavailable — showing raw Mermaid definition.</span>
            </div>
          )}
          <code>{chart.trim()}</code>
        </div>
      ) : (
        <div className="p-6 flex items-center justify-center overflow-x-auto bg-zinc-950/60 min-h-[180px]">
          {svgContent ? (
            <div
              ref={containerRef}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.15s ease-out" }}
              className="max-w-full [&_svg]:max-w-full [&_svg]:h-auto"
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
  );
}
