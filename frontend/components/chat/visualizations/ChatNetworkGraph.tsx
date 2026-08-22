"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Network, ZoomIn, ZoomOut, RotateCcw, Copy, Check, Eye, Code2 } from "lucide-react";

export interface NetworkNode {
  id: string;
  label: string;
  type?: string;
  color?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface NetworkEdge {
  from: string;
  to: string;
  label?: string;
  weight?: number;
}

export interface NetworkGraphConfig {
  title?: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

interface ChatNetworkGraphProps {
  jsonString: string;
}

const TYPE_COLORS: Record<string, string> = {
  hub: "#6366f1",
  vector: "#10b981",
  db: "#06b6d4",
  inference: "#ec4899",
  user: "#f59e0b",
  service: "#8b5cf6",
  default: "#6366f1",
};

export default function ChatNetworkGraph({ jsonString }: ChatNetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"graph" | "code">("graph");
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);

  const transformRef = useRef({ x: 0, y: 0, scale: 0.9 });
  const nodesRef = useRef<any[]>([]);
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<any | null>(null);

  const parsedConfig = useMemo<NetworkGraphConfig | null>(() => {
    try {
      let cleaned = jsonString.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```[a-z0-9_-]*\s*/i, "").replace(/```$/i, "").trim();
      }
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }, [jsonString]);

  useEffect(() => {
    if (!parsedConfig || !Array.isArray(parsedConfig.nodes)) return;

    const nList = parsedConfig.nodes.map((n, idx) => {
      const angle = (idx / Math.max(parsedConfig.nodes.length, 1)) * Math.PI * 2;
      const dist = 90 + (idx % 2) * 40;
      const color = n.color || TYPE_COLORS[n.type || "default"] || "#6366f1";
      return {
        ...n,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 16,
        color,
      };
    });

    nodesRef.current = nList;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      transformRef.current = { x: rect.width / 2, y: rect.height / 2, scale: 0.9 };
    }
  }, [parsedConfig]);

  // 60 FPS Canvas Physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsedConfig || viewMode !== "graph") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const nodes = nodesRef.current;
      const edges = parsedConfig.edges || [];
      const t = transformRef.current;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      // Physics
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 15;
          const dist = Math.sqrt(distSq);
          if (dist < 220) {
            const force = 320 / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (draggedNodeRef.current !== n1) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (draggedNodeRef.current !== n2) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      edges.forEach((e) => {
        const n1 = nodes.find((n) => n.id === e.from);
        const n2 = nodes.find((n) => n.id === e.to);
        if (n1 && n2) {
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 100) * 0.04;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (draggedNodeRef.current !== n1) {
            n1.vx += fx;
            n1.vy += fy;
          }
          if (draggedNodeRef.current !== n2) {
            n2.vx -= fx;
            n2.vy -= fy;
          }
        }
      });

      nodes.forEach((n) => {
        if (draggedNodeRef.current !== n) {
          n.vx -= n.x * 0.02;
          n.vy -= n.y * 0.02;
          n.vx *= 0.88;
          n.vy *= 0.88;
          n.x += n.vx;
          n.y += n.vy;
        }
      });

      // Draw
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // Edges
      edges.forEach((e) => {
        const n1 = nodes.find((n) => n.id === e.from);
        const n2 = nodes.find((n) => n.id === e.to);
        if (n1 && n2) {
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
          ctx.lineWidth = 1.8;
          ctx.stroke();

          if (e.label) {
            const mx = (n1.x + n2.x) / 2;
            const my = (n1.y + n2.y) / 2;
            ctx.font = "9px Inter, sans-serif";
            ctx.fillStyle = "#a1a1aa";
            ctx.textAlign = "center";
            ctx.fillText(e.label, mx, my - 4);
          }
        }
      });

      // Nodes
      nodes.forEach((n) => {
        const isHovered = hoveredNode?.id === n.id;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = isHovered ? 16 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = "11px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(n.label || n.id, n.x, n.y + n.radius + 6);
      });

      ctx.restore();
      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [parsedConfig, viewMode, hoveredNode]);

  if (!parsedConfig || !Array.isArray(parsedConfig.nodes)) {
    return null;
  }

  return (
    <div className="my-4 rounded-2xl border border-white/10 bg-zinc-950/90 shadow-xl overflow-hidden backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/70 border-b border-white/5 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-zinc-200 text-xs">
            {parsedConfig.title || "Interactive Network Topology"}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300">
            {parsedConfig.nodes.length} Nodes
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode(viewMode === "graph" ? "code" : "graph")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
          >
            {viewMode === "graph" ? <Code2 className="w-3 h-3 text-indigo-400" /> : <Eye className="w-3 h-3 text-emerald-400" />}
            <span>{viewMode === "graph" ? "Source" : "Graph"}</span>
          </button>

          <button
            onClick={async () => {
              await navigator.clipboard.writeText(JSON.stringify(parsedConfig, null, 2));
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === "code" ? (
        <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre">
          {JSON.stringify(parsedConfig, null, 2)}
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full h-64 bg-zinc-950/60">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing block"
          />
        </div>
      )}
    </div>
  );
}
