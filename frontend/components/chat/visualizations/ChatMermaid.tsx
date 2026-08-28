"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  X,
  Download,
  Move,
} from "lucide-react";

interface ChatMermaidProps {
  chart: string;
}

/**
 * Intelligent Mermaid Syntax Healer
 * Automatically repairs common LLM syntax bugs:
 * - Markdown bullets in mindmaps (`- item` -> `["item"]`)
 * - Inline `%%` comments breaking mindmap trees
 * - Unquoted parentheses/brackets in node labels
 * - Markdown bold/italic `**text**` inside raw node tokens
 */
export function healMermaidCode(raw: string): string {
  let text = raw
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  if (!text) return "";

  const lines = text.split("\n");
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || "";
  const isMindmap = /^mindmap\b/i.test(firstNonEmpty.trim());

  if (isMindmap) {
    const cleanedLines: string[] = [];

    for (const rawLine of lines) {
      // 1. Skip comments that break mindmap hierarchy
      if (/^\s*%%/i.test(rawLine)) continue;
      if (!rawLine.trim()) continue;

      if (/^mindmap\b/i.test(rawLine.trim())) {
        cleanedLines.push("mindmap");
        continue;
      }

      // Preserve indentation level
      const indentMatch = rawLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : "  ";
      let content = rawLine.trim();

      // Remove markdown bullets `- `
      if (content.startsWith("- ")) {
        content = content.substring(2).trim();
      }

      // If already well-formed root syntax like `root((Label))` or `root["Label"]`
      if (/^root\s*(\(\(.*?\)|\(.*?\)|\[.*?\]|\{.*?\})/i.test(content)) {
        cleanedLines.push(`${indent}${content}`);
        continue;
      }

      // If starts with NodeLabel[...] or NodeLabel(...)
      const nodeShapeMatch = content.match(
        /^([a-zA-Z0-9_\u0400-\u04FF]+)\s*(\(\(.*?\)|\(.*?\)|\[.*?\]|\{.*?\})$/
      );
      if (nodeShapeMatch) {
        cleanedLines.push(`${indent}${content}`);
        continue;
      }

      // Strip outer quotes if already present
      if (content.startsWith('"') && content.endsWith('"') && content.length > 2) {
        content = content.substring(1, content.length - 1);
      }

      // Clean inside text of markdown bold/italic and quotes
      const cleanLabel = content
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/"/g, "'")
        .replace(/[()]/g, " ");

      cleanedLines.push(`${indent}["${cleanLabel.trim()}"]`);
    }
    return cleanedLines.join("\n");
  }

  // Flowchart & graph healer:
  // Quote unquoted labels containing parentheses or colons: A[Some text (details)] -> A["Some text (details)"]
  text = text.replace(/\[([^[\]\n]*?\([^)\n]+?\)[^[\]\n]*?)\]/g, (match, p1) => {
    if (p1.startsWith('"') && p1.endsWith('"')) return match;
    return `["${p1.replace(/"/g, "'")}"]`;
  });

  return text;
}

/**
 * Injects an ultra-premium, balanced dark theme into rendered SVG
 * Guarantees crisp white text on root and all nodes, with elegant balanced glows.
 */
export function enhanceMermaidSvg(rawSvg: string, isFullscreen = false): string {
  if (!rawSvg) return "";

  let svg = rawSvg;

  if (isFullscreen) {
    // Replace ID to avoid duplicate DOM ID collision between inline and modal SVG
    svg = svg.replace(/id="mermaid-([a-zA-Z0-9_-]+)"/g, 'id="mermaid-fs-$1"');
    svg = svg.replace(/#mermaid-([a-zA-Z0-9_-]+)/g, '#mermaid-fs-$1');
  }

  // Ensure SVG has proper responsive attributes
  if (!/viewBox=/i.test(svg)) {
    const widthMatch = svg.match(/width="([0-9.]+)"/i);
    const heightMatch = svg.match(/height="([0-9.]+)"/i);
    if (widthMatch && heightMatch) {
      svg = svg.replace(
        /<svg\b/i,
        `<svg viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}" `
      );
    }
  }

  // Clean any hardcoded dark text fills inside <text> or <tspan>
  svg = svg.replace(/fill="#(?:000000|111827|18181b|000|222222)"/gi, 'fill="#ffffff"');
  svg = svg.replace(/fill="black"/gi, 'fill="#ffffff"');

  const premiumStyles = `
    <style>
      /* Center Root Node - Balanced Dark Sapphire Core with Soft Sky Blue Stroke */
      .section-root rect, .section-root circle, .section-root polygon, .section-root path,
      .mindmap-node.section-root rect, .mindmap-node.section-root circle,
      g[class*="root"] rect, g[class*="root"] circle, g[class*="root"] path,
      .mindmap-node:first-of-type circle, .mindmap-node:first-of-type rect {
        fill: #0c1527 !important;
        stroke: #38bdf8 !important;
        stroke-width: 2.8px !important;
        filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.4)) drop-shadow(0 4px 14px rgba(0,0,0,0.85)) !important;
      }

      /* Mindmap Branch Categories - Sleek Dark Glass Jewel Tones */
      .section-0 rect, .section-0 circle, .section-0 path { fill: #0f172a !important; stroke: #3b82f6 !important; stroke-width: 2px !important; }
      .section-1 rect, .section-1 circle, .section-1 path { fill: #1a0f2e !important; stroke: #a855f7 !important; stroke-width: 2px !important; }
      .section-2 rect, .section-2 circle, .section-2 path { fill: #06281e !important; stroke: #10b981 !important; stroke-width: 2px !important; }
      .section-3 rect, .section-3 circle, .section-3 path { fill: #082733 !important; stroke: #06b6d4 !important; stroke-width: 2px !important; }
      .section-4 rect, .section-4 circle, .section-4 path { fill: #2d1604 !important; stroke: #f59e0b !important; stroke-width: 2px !important; }
      .section-5 rect, .section-5 circle, .section-5 path { fill: #2e0918 !important; stroke: #f43f5e !important; stroke-width: 2px !important; }
      .section-6 rect, .section-6 circle, .section-6 path { fill: #0f172a !important; stroke: #64748b !important; stroke-width: 2px !important; }
      .section-7 rect, .section-7 circle, .section-7 path { fill: #13173d !important; stroke: #6366f1 !important; stroke-width: 2px !important; }

      /* ALL Text & Tspans - Pure Bright White with Crisp Dark Legibility Shadow */
      text,
      tspan,
      .mindmap-node text,
      .mindmap-node tspan,
      .mindmap-node text *,
      .node text,
      .node tspan,
      .section-root text,
      .section-root tspan,
      .section-root text *,
      g[class*="root"] text,
      g[class*="root"] tspan,
      g[class*="root"] text *,
      g text,
      g tspan {
        fill: #ffffff !important;
        color: #ffffff !important;
        font-family: "Inter", system-ui, -apple-system, sans-serif !important;
        font-weight: 700 !important;
        font-size: 13.5px !important;
        filter: drop-shadow(0 1px 3px rgba(0,0,0,0.98)) drop-shadow(0 0 1px rgba(0,0,0,1)) !important;
        letter-spacing: 0.015em !important;
        opacity: 1 !important;
        visibility: visible !important;
      }

      /* Root Node Text Extra Crispness */
      .section-root text,
      .section-root tspan,
      .mindmap-node.section-root text,
      .mindmap-node.section-root tspan,
      g[class*="root"] text,
      g[class*="root"] tspan,
      .mindmap-node:first-of-type text,
      .mindmap-node:first-of-type tspan {
        fill: #ffffff !important;
        font-weight: 800 !important;
        font-size: 14.5px !important;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,1)) drop-shadow(0 0 2px rgba(0,0,0,1)) !important;
      }

      /* Card Node Rounding & Elevation */
      .mindmap-node rect, .node rect {
        rx: 10px !important;
        ry: 10px !important;
        stroke-width: 2px !important;
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.7)) !important;
      }

      /* Connection Lines / Curves - Balanced Soft Glow */
      .edgePath path, .mindmap-edge, path.edge-thickness-normal {
        stroke: #6366f1 !important;
        stroke-width: 2px !important;
        stroke-opacity: 0.8 !important;
      }
    </style>
  `;

  // Inject styles right after opening <svg ...>
  svg = svg.replace(/<svg\b([^>]*)>/i, (match) => {
    return `${match}${premiumStyles}`;
  });

  return svg;
}

export default function ChatMermaid({ chart }: ChatMermaidProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"diagram" | "code">("diagram");
  const [zoom, setZoom] = useState(1);
  const [fullscreenZoom, setFullscreenZoom] = useState(1.1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Pan / Drag in Fullscreen
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sanitizedChart = healMermaidCode(chart);

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
    let active = true;

    async function renderChart() {
      if (!sanitizedChart) return;
      try {
        setError(null);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: "base",
          themeVariables: {
            darkMode: true,
            background: "transparent",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
            // Center Root / Primary: Deep Sapphire Navy with Sky Blue
            primaryColor: "#0c1527",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#38bdf8",
            lineColor: "#6366f1",
            secondaryColor: "#1e1b4b",
            tertiaryColor: "#0f172a",
            mainBkg: "#0c1527",
            nodeBorder: "#38bdf8",
            clusterBkg: "#09090b",
            clusterBorder: "#4f46e5",
            titleColor: "#ffffff",
            edgeLabelBackground: "#09090b",
            // Explicit Mindmap Palette
            mindmapNodeFill: "#0c1527",
            mindmapNodeBorder: "#38bdf8",
            mindmapTextColor: "#ffffff",
            mindmapLineColor: "#6366f1",
            cScale0: "#1e3a8a",
            cScaleLabel0: "#ffffff",
            cScale1: "#4c1d95",
            cScaleLabel1: "#ffffff",
            cScale2: "#065f46",
            cScaleLabel2: "#ffffff",
            cScale3: "#0e7490",
            cScaleLabel3: "#ffffff",
            cScale4: "#78350f",
            cScaleLabel4: "#ffffff",
            cScale5: "#831843",
            cScaleLabel5: "#ffffff",
            cScale6: "#1e293b",
            cScaleLabel6: "#ffffff",
            cScale7: "#312e81",
            cScaleLabel7: "#ffffff",
          },
          securityLevel: "loose",
        });

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, sanitizedChart);
        if (active) {
          setSvgContent(enhanceMermaidSvg(svg, false));
        }
      } catch (err: any) {
        console.warn("Mermaid render error:", err);
        cleanupMermaidErrorDOM();
        if (active) {
          setError(err?.message || "Failed to render diagram");
        }
      } finally {
        cleanupMermaidErrorDOM();
      }
    }

    renderChart();

    return () => {
      active = false;
      cleanupMermaidErrorDOM();
    };
  }, [sanitizedChart, cleanupMermaidErrorDOM]);

  // Handle ESC key and lock body scroll during fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setPan({ x: 0, y: 0 });
      setFullscreenZoom(1.1);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
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

  // Fullscreen Pan Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
          <div className="p-6 flex items-center justify-center overflow-auto bg-zinc-950/60 min-h-[240px] max-h-[550px] relative">
            {svgContent ? (
              <div
                ref={containerRef}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className="w-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:drop-shadow-xl"
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

      {/* ── FULLSCREEN EXPANDED MODAL (React Portal directly into document.body) ── */}
      {isMounted &&
        isFullscreen &&
        svgContent &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-zinc-950/98 backdrop-blur-3xl flex flex-col p-4 sm:p-6 select-none animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_14px_rgba(99,102,241,0.8)]" />
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm sm:text-base tracking-wide">
                    Interactive Diagram & Mindmap — Fullscreen View
                  </h3>
                  <p className="text-xs text-zinc-400 hidden sm:flex items-center gap-2">
                    <Move className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Click & drag to pan canvas. Scroll to zoom. Press ESC to exit.</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Fullscreen Zoom Controls */}
                <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1 shadow-inner">
                  <button
                    onClick={() => setFullscreenZoom((z) => Math.min(4.0, z + 0.25))}
                    className="p-1.5 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="text-[12px] font-mono text-zinc-200 px-2 min-w-[52px] text-center font-bold">
                    {Math.round(fullscreenZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setFullscreenZoom((z) => Math.max(0.3, z - 0.25))}
                    className="p-1.5 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setFullscreenZoom(1.1);
                      setPan({ x: 0, y: 0 });
                    }}
                    className="p-1.5 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="Reset View & Center"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Download SVG */}
                <button
                  onClick={handleDownloadSVG}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer shadow-sm"
                  title="Download SVG file"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Export SVG</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer shadow-sm"
                  title="Close Fullscreen (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Diagram Canvas (Pan & Zoom) */}
            <div
              className={`flex-1 w-full h-full overflow-hidden flex items-center justify-center relative p-4 ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={(e) => {
                e.preventDefault();
                setFullscreenZoom((z) =>
                  e.deltaY < 0 ? Math.min(4.0, z + 0.15) : Math.max(0.3, z - 0.15)
                );
              }}
              onDoubleClick={() => {
                setFullscreenZoom(1.1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${fullscreenZoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.1s ease-out",
                }}
                className="w-full h-full flex items-center justify-center [&_svg]:max-w-[90vw] [&_svg]:max-h-[82vh] [&_svg]:w-auto [&_svg]:h-auto [&_svg]:min-w-[550px] [&_svg]:min-h-[350px] [&_svg]:drop-shadow-2xl"
                dangerouslySetInnerHTML={{
                  __html: enhanceMermaidSvg(svgContent, true),
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
