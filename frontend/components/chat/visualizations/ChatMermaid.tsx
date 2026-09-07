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
  Loader2,
} from "lucide-react";

interface ChatMermaidProps {
  chart: string;
  isStreaming?: boolean;
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

  // 1. Normalize typographic quotes, apostrophes, non-breaking characters
  text = text
    .replace(/[«»“”„]/g, '"')
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\u2011/g, "-")
    .replace(/[\u00A0\u2002\u2003\u2009]/g, " ");

  const lines = text.split("\n");
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || "";
  const isMindmap = /^mindmap\b/i.test(firstNonEmpty.trim());

  if (isMindmap) {
    const cleanedLines: string[] = [];

    for (const rawLine of lines) {
      if (/^\s*%%/i.test(rawLine)) continue;
      if (!rawLine.trim()) continue;

      if (/^mindmap\b/i.test(rawLine.trim())) {
        cleanedLines.push("mindmap");
        continue;
      }

      const indentMatch = rawLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : "  ";
      let content = rawLine.trim();

      if (content.startsWith("- ")) {
        content = content.substring(2).trim();
      }

      if (/^root\s*(\(\(.*?\)|\(.*?\)|\[.*?\]|\{.*?\})/i.test(content)) {
        cleanedLines.push(`${indent}${content}`);
        continue;
      }

      const nodeShapeMatch = content.match(
        /^([a-zA-Z0-9_\u0400-\u04FF]+)\s*(\(\(.*?\)|\(.*?\)|\[.*?\]|\{.*?\})$/
      );
      if (nodeShapeMatch) {
        cleanedLines.push(`${indent}${content}`);
        continue;
      }

      if (content.startsWith('"') && content.endsWith('"') && content.length > 2) {
        content = content.substring(1, content.length - 1);
      }

      const cleanLabel = content
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/"/g, "'")
        .replace(/[()]/g, " ");

      cleanedLines.push(`${indent}["${cleanLabel.trim()}"]`);
    }
    return cleanedLines.join("\n");
  }

  // 2. Flowchart & Architecture Diagram Healer
  const isDeclared = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|quadrantChart|xychart-beta|timeline|architecture-beta)\b/i.test(firstNonEmpty.trim());
  
  if (!isDeclared) {
    text = `flowchart TD\n${text}`;
  }

  // Edge link labels: -->|Label text (with: colon)| -> -->|"Label text (with: colon)"|
  text = text.replace(/(-->|---|==>|-\.->)\s*\|([^|\n]+)\|\s*/g, (match, arrow, label) => {
    let clean = label.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) return `${arrow}|${clean}| `;
    clean = clean.replace(/"/g, "'").replace(/\*\*/g, "").replace(/__/g, "");
    return `${arrow}|"${clean}"| `;
  });

  // Stadium node shape: ([ ... ])
  text = text.replace(/\(\[\s*([^\]\n]+?)\s*\]\)/g, (match, p1) => {
    let clean = p1.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) return match;
    clean = clean.replace(/"/g, "'").replace(/\*\*/g, "").replace(/__/g, "");
    return `(["${clean}"])`;
  });

  // Cylinder node shape: [( ... )]
  text = text.replace(/\[\(\s*([^)\n]+?)\s*\)\]/g, (match, p1) => {
    let clean = p1.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) return match;
    clean = clean.replace(/"/g, "'").replace(/\*\*/g, "").replace(/__/g, "");
    return `[("${clean}")]`;
  });

  // Circle node shape: (( ... ))
  text = text.replace(/\(\(\s*([^)\n]+?)\s*\)\)/g, (match, p1) => {
    let clean = p1.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) return match;
    clean = clean.replace(/"/g, "'").replace(/\*\*/g, "").replace(/__/g, "");
    return `(("${clean}"))`;
  });

  // Rhombus / Decision node shape: { ... }
  text = text.replace(/\{\s*([^}\n]+?)\s*\}/g, (match, p1) => {
    let clean = p1.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) return match;
    clean = clean.replace(/"/g, "'").replace(/\*\*/g, "").replace(/__/g, "");
    return `{"${clean}"}`;
  });

  // Square node shape: [ ... ] (ignoring [[ or [( or [/)
  text = text.replace(/(?<!\[)\[\s*([^\[\]\n]+?)\s*\](?!\])/g, (match, p1) => {
    let clean = p1.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) return match;
    clean = clean.replace(/"/g, "'").replace(/\*\*/g, "").replace(/__/g, "");
    return `["${clean}"]`;
  });

  // Round node shape: ( ... ) (ignoring (( or ([)
  text = text.replace(/(?<!\()\(\s*([^()\n]+?)\s*\)(?!\))/g, (match, p1) => {
    let clean = p1.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) return match;
    clean = clean.replace(/"/g, "'").replace(/\*\*/g, "").replace(/__/g, "");
    return `("${clean}")`;
  });

  return text;
}

export function healMermaidCodeFallback(text: string): string {
  let cleaned = text
    .replace(/<[^>]*>/g, "")
    .replace(/[«»“”„]/g, '"')
    .replace(/[‘’ʼ`]/g, "'");

  const lines = cleaned.split("\n");
  const processed: string[] = [];
  let hasHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!hasHeader) {
      if (/^(graph|flowchart|sequenceDiagram|classDiagram|mindmap|erDiagram)\b/i.test(trimmed)) {
        hasHeader = true;
        processed.push(trimmed);
        continue;
      } else {
        hasHeader = true;
        processed.push("flowchart TD");
      }
    }

    if (/^(classDef|style|linkStyle|click)\b/i.test(trimmed)) {
      continue;
    }

    const safeLine = trimmed
      .replace(/\[\((.+?)\)\]/g, '["$1"]')
      .replace(/\(\[(.+?)\]\)/g, '["$1"]')
      .replace(/\(\((.+?)\)\)/g, '["$1"]')
      .replace(/\{(.+?)\}/g, '["$1"]')
      .replace(/\((.+?)\)/g, '["$1"]');

    processed.push(safeLine);
  }

  return processed.join("\n");
}

/**
 * Premium Mindmap SVG Theme — Clean, Modern, Readable
 *
 * Design philosophy:
 *   - Root node: solid medium-dark background with high-contrast white text
 *   - Category nodes (depth 1): slightly lighter, with a subtle left-border accent
 *   - Detail nodes (depth 2+): lighter still, clear text hierarchy
 *   - Connection lines: soft, organic, not distracting
 *   - No harsh neon. No aggressive glows. Professional and readable.
 */
export function enhanceMermaidSvg(rawSvg: string, isFullscreen = false): string {
  if (!rawSvg) return "";

  let svg = rawSvg;

  if (isFullscreen) {
    svg = svg.replace(/id="mermaid-([a-zA-Z0-9_-]+)"/g, 'id="mermaid-fs-$1"');
    svg = svg.replace(/#mermaid-([a-zA-Z0-9_-]+)/g, '#mermaid-fs-$1');
  }

  // Ensure SVG has proper responsive viewBox attributes
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

  // Force all text/tspan to white with inline attributes (baseline safety net)
  svg = svg.replace(/<text\b([^>]*)>/gi, (_m, attrs) => {
    const cleanAttrs = attrs
      .replace(/\bfill="[^"]*"/gi, "")
      .replace(/\bstyle="[^"]*"/gi, "");
    return `<text ${cleanAttrs} fill="#f0f0f5" style="fill:#f0f0f5 !important;">`;
  });
  svg = svg.replace(/<tspan\b([^>]*)>/gi, (_m, attrs) => {
    const cleanAttrs = attrs
      .replace(/\bfill="[^"]*"/gi, "")
      .replace(/\bstyle="[^"]*"/gi, "");
    return `<tspan ${cleanAttrs} fill="#f0f0f5" style="fill:#f0f0f5 !important;">`;
  });

  // Clean hardcoded dark fills from Mermaid internals
  svg = svg.replace(/fill="#(?:000000|111827|18181b|000|222222|09090b)"/gi, 'fill="#f0f0f5"');
  svg = svg.replace(/fill="black"/gi, 'fill="#f0f0f5"');

  const premiumStyles = `
    <style>
      /* ──────────────────────────────────────────────────────────
         ROOT NODE — Solid slate-blue, visible and prominent
         ────────────────────────────────────────────────────────── */
      .section-root rect, .section-root circle, .section-root polygon, .section-root path,
      .mindmap-node.section-root rect, .mindmap-node.section-root circle,
      g[class*="root"] rect, g[class*="root"] circle, g[class*="root"] path,
      .mindmap-node:first-of-type circle, .mindmap-node:first-of-type rect {
        fill: #334155 !important;
        stroke: #94a3b8 !important;
        stroke-width: 2.5px !important;
        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5)) !important;
      }

      /* ──────────────────────────────────────────────────────────
         BRANCH CATEGORIES — Each has a muted but distinct palette
         Dark enough for white text, light enough to feel airy
         ────────────────────────────────────────────────────────── */
      .section-0 rect, .section-0 circle, .section-0 path { fill: #1e3a5f !important; stroke: #60a5fa !important; stroke-width: 1.5px !important; }
      .section-1 rect, .section-1 circle, .section-1 path { fill: #312e5c !important; stroke: #a78bfa !important; stroke-width: 1.5px !important; }
      .section-2 rect, .section-2 circle, .section-2 path { fill: #1a3a2a !important; stroke: #6ee7b7 !important; stroke-width: 1.5px !important; }
      .section-3 rect, .section-3 circle, .section-3 path { fill: #1a3544 !important; stroke: #67e8f9 !important; stroke-width: 1.5px !important; }
      .section-4 rect, .section-4 circle, .section-4 path { fill: #3d2b10 !important; stroke: #fbbf24 !important; stroke-width: 1.5px !important; }
      .section-5 rect, .section-5 circle, .section-5 path { fill: #3d1525 !important; stroke: #fb7185 !important; stroke-width: 1.5px !important; }
      .section-6 rect, .section-6 circle, .section-6 path { fill: #27303d !important; stroke: #94a3b8 !important; stroke-width: 1.5px !important; }
      .section-7 rect, .section-7 circle, .section-7 path { fill: #272650 !important; stroke: #818cf8 !important; stroke-width: 1.5px !important; }

      /* ──────────────────────────────────────────────────────────
         TYPOGRAPHY — Clean, readable, professional
         ────────────────────────────────────────────────────────── */
      svg text, svg tspan,
      .mindmap-node text, .mindmap-node tspan,
      .node text, .node tspan,
      g text, g tspan {
        fill: #f0f0f5 !important;
        color: #f0f0f5 !important;
        stroke: none !important;
        font-family: "Inter", system-ui, -apple-system, sans-serif !important;
        font-weight: 500 !important;
        font-size: 13px !important;
        letter-spacing: 0.01em !important;
        opacity: 1 !important;
        visibility: visible !important;
      }

      /* Root text — slightly larger and bolder */
      .section-root text, .section-root tspan,
      .mindmap-node.section-root text, .mindmap-node.section-root tspan,
      g[class*="root"] text, g[class*="root"] tspan,
      .mindmap-node:first-of-type text, .mindmap-node:first-of-type tspan {
        fill: #ffffff !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        font-size: 15px !important;
      }

      /* ──────────────────────────────────────────────────────────
         NODE SHAPES — Rounded cards with subtle elevation
         ────────────────────────────────────────────────────────── */
      .mindmap-node rect, .node rect {
        rx: 8px !important;
        ry: 8px !important;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35)) !important;
      }

      /* ──────────────────────────────────────────────────────────
         CONNECTION LINES — Soft, unobtrusive
         ────────────────────────────────────────────────────────── */
      .edgePath path, .mindmap-edge, path.edge-thickness-normal {
        stroke: #475569 !important;
        stroke-width: 1.8px !important;
        stroke-opacity: 0.7 !important;
      }
    </style>
  `;

  // Inject at the END of SVG so custom styles override Mermaid's internal stylesheet
  if (svg.includes("</svg>")) {
    svg = svg.replace("</svg>", `${premiumStyles}</svg>`);
  } else {
    svg = `${svg}${premiumStyles}`;
  }

  return svg;
}

export default function ChatMermaid({ chart, isStreaming }: ChatMermaidProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rawSvgContent, setRawSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
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
      // While streaming tokens, do not render broken partial syntax
      if (isStreaming) {
        return;
      }
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
            fontSize: "13px",
            // Root node: slate-blue
            primaryColor: "#334155",
            primaryTextColor: "#f0f0f5",
            primaryBorderColor: "#94a3b8",
            lineColor: "#475569",
            secondaryColor: "#1e293b",
            tertiaryColor: "#1e293b",
            mainBkg: "#334155",
            nodeBorder: "#64748b",
            clusterBkg: "#0f172a",
            clusterBorder: "#334155",
            titleColor: "#f0f0f5",
            edgeLabelBackground: "#0f172a",
            // Mindmap palette — muted, professional
            mindmapNodeFill: "#1e293b",
            mindmapNodeBorder: "#64748b",
            mindmapTextColor: "#f0f0f5",
            mindmapLineColor: "#475569",
            cScale0: "#1e3a5f",
            cScaleLabel0: "#f0f0f5",
            cScale1: "#312e5c",
            cScaleLabel1: "#f0f0f5",
            cScale2: "#1a3a2a",
            cScaleLabel2: "#f0f0f5",
            cScale3: "#1a3544",
            cScaleLabel3: "#f0f0f5",
            cScale4: "#3d2b10",
            cScaleLabel4: "#f0f0f5",
            cScale5: "#3d1525",
            cScaleLabel5: "#f0f0f5",
            cScale6: "#27303d",
            cScaleLabel6: "#f0f0f5",
            cScale7: "#272650",
            cScaleLabel7: "#f0f0f5",
          },
          securityLevel: "loose",
        });

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        let svgResult = "";

        try {
          // Pass 1: Standard healed code render
          const res = await mermaid.render(uniqueId, sanitizedChart);
          svgResult = res.svg;
        } catch (firstErr: any) {
          console.warn("Mermaid pass 1 render failed, trying aggressive fallback heal...", firstErr);
          cleanupMermaidErrorDOM();
          // Pass 2: Aggressive fallback healing (strip rogue HTML and exotic shapes)
          const fallbackChart = healMermaidCodeFallback(sanitizedChart);
          const retryId = `mermaid-retry-${Math.random().toString(36).substring(2, 9)}`;
          const res = await mermaid.render(retryId, fallbackChart);
          svgResult = res.svg;
        }

        if (active) {
          setRawSvgContent(svgResult);
        }
      } catch (err: any) {
        console.warn("Mermaid render error after fallback:", err);
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
  }, [sanitizedChart, isStreaming, retryCount, cleanupMermaidErrorDOM]);

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
    if (!rawSvgContent) return;
    const finalSvg = enhanceMermaidSvg(rawSvgContent, false);
    const blob = new Blob([finalSvg], { type: "image/svg+xml" });
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

  const inlineSvgHtml = enhanceMermaidSvg(rawSvgContent, false);
  const fullscreenSvgHtml = enhanceMermaidSvg(rawSvgContent, true);

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
            {viewMode === "diagram" && !error && rawSvgContent && (
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
            {rawSvgContent && !error && (
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
              <div className="flex items-center justify-between gap-3 p-3 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Diagram preview unavailable — showing raw definition.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-all cursor-pointer text-xs font-sans font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}
            <code>{sanitizedChart}</code>
          </div>
        ) : (
          <div className="p-6 flex items-center justify-center overflow-auto bg-zinc-950/60 min-h-[240px] max-h-[550px] relative">
            {isStreaming ? (
              <div className="w-full my-2 flex flex-col items-center justify-center gap-3 text-muted-foreground animate-pulse">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Generating diagram...</span>
                </div>
                <div className="w-full max-w-sm h-14 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-around px-4">
                  <div className="w-16 h-6 rounded-md bg-muted/80" />
                  <div className="w-6 h-0.5 bg-muted-foreground/30" />
                  <div className="w-20 h-6 rounded-md bg-muted/80" />
                  <div className="w-6 h-0.5 bg-muted-foreground/30" />
                  <div className="w-16 h-6 rounded-md bg-muted/80" />
                </div>
              </div>
            ) : rawSvgContent ? (
              <div
                ref={containerRef}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className="w-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:drop-shadow-xl"
                dangerouslySetInnerHTML={{ __html: inlineSvgHtml }}
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
        rawSvgContent &&
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
                  __html: fullscreenSvgHtml,
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
