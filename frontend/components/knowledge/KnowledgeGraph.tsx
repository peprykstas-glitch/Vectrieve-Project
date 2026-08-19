"use client";

import React, { useEffect, useRef, useState } from "react";
import { Document } from "@/hooks/useFiles";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Search, 
  Maximize2, 
  FileText, 
  Headphones, 
  Database, 
  Layers3, 
  Sparkles,
  Info
} from "lucide-react";

interface Node {
  id: string;
  name: string;
  type: "space" | "doc";
  fileType?: "pdf" | "audio" | "sheet" | "doc" | "other";
  doc?: Document;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  spaceName?: string;
}

interface Edge {
  source: string;
  target: string;
  length: number;
}

interface KnowledgeGraphProps {
  documents: Document[];
  onSelectDocument?: (doc: Document) => void;
}

export default function KnowledgeGraph({ documents, onSelectDocument }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Transform states (Pan & Zoom)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<Node | null>(null);

  // Graph data ref
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize graph nodes and edges from documents
  useEffect(() => {
    const spacesMap = new Map<string, Node>();
    const docNodes: Node[] = [];
    const edges: Edge[] = [];

    // Create default/active Space hub
    const defaultSpaceId = "space-main";
    const defaultSpaceNode: Node = {
      id: defaultSpaceId,
      name: "Primary Workspace",
      type: "space",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 28,
      color: "#6366f1", // Indigo
      spaceName: "Primary Workspace",
    };
    spacesMap.set(defaultSpaceId, defaultSpaceNode);

    documents.forEach((doc, idx) => {
      const angle = (idx / Math.max(documents.length, 1)) * Math.PI * 2;
      const dist = 120 + (idx % 3) * 60 + Math.random() * 40;

      let fileType: Node["fileType"] = "other";
      let color = "#a855f7"; // Violet
      const lower = doc.filename.toLowerCase();

      if (lower.endsWith(".pdf")) {
        fileType = "pdf";
        color = "#6366f1"; // Indigo
      } else if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".m4a") || lower.endsWith(".ogg")) {
        fileType = "audio";
        color = "#10b981"; // Emerald
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".csv")) {
        fileType = "sheet";
        color = "#06b6d4"; // Cyan
      } else if (lower.endsWith(".docx") || lower.endsWith(".txt") || lower.endsWith(".md")) {
        fileType = "doc";
        color = "#ec4899"; // Pink
      }

      const docNode: Node = {
        id: `doc-${doc.id}`,
        name: doc.filename,
        type: "doc",
        fileType,
        doc,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.max(12, Math.min(22, 10 + (doc.chunk_count || 1) * 1.2)),
        color,
        spaceName: "Primary Workspace",
      };

      docNodes.push(docNode);

      // Connect doc node to Space hub
      edges.push({
        source: defaultSpaceId,
        target: docNode.id,
        length: dist,
      });

      // Semantic Cross-linking between similar files
      for (let j = 0; j < idx; j++) {
        const other = docNodes[j];
        if (other && (other.fileType === docNode.fileType || (other.doc && doc.chunk_count === other.doc.chunk_count))) {
          if (Math.random() > 0.45) {
            edges.push({
              source: other.id,
              target: docNode.id,
              length: 90 + Math.random() * 40,
            });
          }
        }
      }
    });

    nodesRef.current = [...Array.from(spacesMap.values()), ...docNodes];
    edgesRef.current = edges;

    // Reset center on container dimensions
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      transformRef.current = {
        x: rect.width / 2,
        y: rect.height / 2,
        scale: 0.9,
      };
    }
  }, [documents]);

  // Main 60 FPS Physics simulation and Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const t = transformRef.current;

      // Handle retina high-DPI scaling
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // --- Physics Step ---
      const repulsion = 450;
      const springK = 0.04;
      const damping = 0.88;

      // Repulsion between all nodes (Coulomb force)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 10;
          const dist = Math.sqrt(distSq);
          if (dist < 350) {
            const force = repulsion / distSq;
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

      // Attraction along connected edges (Hooke's Spring Law)
      edges.forEach((edge) => {
        const n1 = nodes.find((n) => n.id === edge.source);
        const n2 = nodes.find((n) => n.id === edge.target);
        if (n1 && n2) {
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const displacement = dist - edge.length;
          const force = displacement * springK;
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

      // Integrate velocities & apply position
      nodes.forEach((n) => {
        if (draggedNodeRef.current !== n) {
          n.vx *= damping;
          n.vy *= damping;
          n.x += n.vx;
          n.y += n.vy;
        }
      });

      // --- Draw Canvas ---
      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // Draw glowing edges
      edges.forEach((edge) => {
        const n1 = nodes.find((n) => n.id === edge.source);
        const n2 = nodes.find((n) => n.id === edge.target);
        if (n1 && n2) {
          const isHighlighted =
            (hoveredNode && (hoveredNode.id === n1.id || hoveredNode.id === n2.id)) ||
            (selectedNode && (selectedNode.id === n1.id || selectedNode.id === n2.id));

          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = isHighlighted ? "rgba(99, 102, 241, 0.6)" : "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = isHighlighted ? 2.5 : 1;
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach((n) => {
        const isHovered = hoveredNode?.id === n.id;
        const isSelected = selectedNode?.id === n.id;
        const matchesSearch = searchQuery.trim()
          ? n.name.toLowerCase().includes(searchQuery.toLowerCase())
          : false;

        // Outer glow
        if (isHovered || isSelected || matchesSearch) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? "rgba(99, 102, 241, 0.35)" : "rgba(255, 255, 255, 0.15)";
          ctx.fill();
        }

        // Main Node Circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = isHovered || isSelected ? 18 : 6;
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow

        // Inner border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node Label
        const fontSize = n.type === "space" ? 12 : 10;
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "rgba(244, 244, 245, 0.75)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const displayName = n.name.length > 20 ? n.name.slice(0, 18) + "..." : n.name;
        ctx.fillText(displayName, n.x, n.y + n.radius + 5);
      });

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hoveredNode, selectedNode, searchQuery]);

  // Coordinate conversion helper
  const screenToWorld = (screenX: number, screenY: number) => {
    const t = transformRef.current;
    return {
      x: (screenX - t.x) / t.scale,
      y: (screenY - t.y) / t.scale,
    };
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const worldPos = screenToWorld(clientX, clientY);

    // Check if clicked a node
    const clickedNode = nodesRef.current.find((n) => {
      const dx = n.x - worldPos.x;
      const dy = n.y - worldPos.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      setSelectedNode(clickedNode);
      if (clickedNode.doc && onSelectDocument) {
        onSelectDocument(clickedNode.doc);
      }
    } else {
      isDraggingCanvasRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const worldPos = screenToWorld(clientX, clientY);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = worldPos.x;
      draggedNodeRef.current.y = worldPos.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    if (isDraggingCanvasRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Hover detection
    const hovered = nodesRef.current.find((n) => {
      const dx = n.x - worldPos.x;
      const dy = n.y - worldPos.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    setHoveredNode(hovered || null);
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
    isDraggingCanvasRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newScale = Math.max(0.3, Math.min(3.0, transformRef.current.scale * zoomFactor));

    // Zoom towards mouse pointer
    transformRef.current.x = clientX - (clientX - transformRef.current.x) * (newScale / transformRef.current.scale);
    transformRef.current.y = clientY - (clientY - transformRef.current.y) * (newScale / transformRef.current.scale);
    transformRef.current.scale = newScale;
  };

  const handleResetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      transformRef.current = {
        x: rect.width / 2,
        y: rect.height / 2,
        scale: 0.9,
      };
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-[650px] bg-[#070709] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Floating Header & Search Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-1.5 shadow-lg">
          <Layers3 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white tracking-wide">Obsidian Knowledge Graph</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {documents.length} Nodes
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Node Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search document nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 w-48 shadow-lg"
            />
          </div>

          {/* Zoom & View Controls */}
          <div className="flex items-center gap-1 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-lg">
            <button
              onClick={() => {
                transformRef.current.scale = Math.min(3.0, transformRef.current.scale * 1.2);
              }}
              className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                transformRef.current.scale = Math.max(0.3, transformRef.current.scale * 0.8);
              }}
              className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Node Legend Bar */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-xl px-3.5 py-2 text-[11px] text-zinc-400 shadow-lg pointer-events-auto">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]" /> PDF Documents
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" /> Audio / Meetings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4]" /> Spreadsheets / CSV
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]" /> Word / Markdown
        </span>
      </div>

      {/* Hovered Node Tooltip Card */}
      {hoveredNode && (
        <div className="absolute bottom-4 right-4 max-w-sm bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl pointer-events-none space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2">
            {hoveredNode.fileType === "audio" ? (
              <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span className="text-xs font-bold text-white truncate">{hoveredNode.name}</span>
          </div>

          {hoveredNode.doc && (
            <div className="text-[11px] text-zinc-400 space-y-1 border-t border-white/5 pt-2">
              <div className="flex justify-between">
                <span>Vector Chunks:</span>
                <span className="text-zinc-200 font-semibold">{hoveredNode.doc.chunk_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>File Size:</span>
                <span className="text-zinc-200 font-semibold">
                  {((hoveredNode.doc.file_size || 0) / 1024).toFixed(1)} KB
                </span>
              </div>
              {hoveredNode.doc.summary && (
                <p className="text-[10px] text-zinc-400 italic line-clamp-3 pt-1 border-t border-white/5">
                  "{hoveredNode.doc.summary}"
                </p>
              )}
            </div>
          )}
          <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest pt-1">
            Click node to view document details →
          </div>
        </div>
      )}
    </div>
  );
}
