"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Document } from "@/hooks/useFiles";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Search, 
  Maximize2, 
  Minimize2,
  FileText, 
  Headphones, 
  Database, 
  Layers3, 
  Sparkles,
  Info,
  Play,
  Pause,
  SlidersHorizontal,
  MessageSquare,
  ExternalLink,
  X,
  Network,
  Filter,
  Eye,
  EyeOff
} from "lucide-react";

export interface GraphNode {
  id: string;
  name: string;
  type: "hub" | "doc";
  fileType?: "pdf" | "audio" | "sheet" | "doc" | "other";
  doc?: Document;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  degree: number;
  spaceName?: string;
  isPinned?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number; // 0.0 to 1.0 similarity / strength
  length: number;
}

interface KnowledgeGraphProps {
  documents: Document[];
  onSelectDocument?: (doc: Document) => void;
}

export default function KnowledgeGraph({ documents, onSelectDocument }: KnowledgeGraphProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isPhysicsActive, setIsPhysicsActive] = useState(true);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.25);
  const [showIsolatedNodes, setShowIsolatedNodes] = useState(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pan & Zoom Transform (world coordinates)
  const transformRef = useRef({ x: 0, y: 0, scale: 0.9 });
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<GraphNode | null>(null);
  const clickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Graph data references
  const rawNodesRef = useRef<GraphNode[]>([]);
  const rawEdgesRef = useRef<GraphEdge[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Build graph nodes and edges
  useEffect(() => {
    if (!documents || documents.length === 0) {
      rawNodesRef.current = [];
      rawEdgesRef.current = [];
      return;
    }

    const docNodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const hubId = "hub-workspace";

    // Central workspace hub node
    const hubNode: GraphNode = {
      id: hubId,
      name: "Knowledge Core",
      type: "hub",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 26,
      color: "#6366f1",
      glowColor: "rgba(99, 102, 241, 0.5)",
      degree: documents.length,
      spaceName: "Primary Workspace",
    };

    // Calculate document nodes
    documents.forEach((doc, idx) => {
      const angle = (idx / Math.max(documents.length, 1)) * Math.PI * 2;
      const baseDist = 140 + (idx % 3) * 60 + Math.random() * 30;

      let fileType: GraphNode["fileType"] = "other";
      let color = "#8b5cf6"; // Purple default
      let glowColor = "rgba(139, 92, 246, 0.4)";
      const lower = doc.filename.toLowerCase();

      if (lower.endsWith(".pdf")) {
        fileType = "pdf";
        color = "#6366f1"; // Indigo
        glowColor = "rgba(99, 102, 241, 0.4)";
      } else if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".m4a") || lower.endsWith(".ogg")) {
        fileType = "audio";
        color = "#10b981"; // Emerald
        glowColor = "rgba(16, 185, 129, 0.4)";
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".csv")) {
        fileType = "sheet";
        color = "#06b6d4"; // Cyan
        glowColor = "rgba(6, 182, 212, 0.4)";
      } else if (lower.endsWith(".docx") || lower.endsWith(".txt") || lower.endsWith(".md")) {
        fileType = "doc";
        color = "#ec4899"; // Pink
        glowColor = "rgba(236, 72, 153, 0.4)";
      }

      // Base radius scaled by chunk count (degree centrality)
      const chunkCount = doc.chunk_count || 1;
      const radius = Math.max(12, Math.min(22, 10 + Math.sqrt(chunkCount) * 2.2));

      const docNode: GraphNode = {
        id: `doc-${doc.id}`,
        name: doc.filename,
        type: "doc",
        fileType,
        doc,
        x: Math.cos(angle) * baseDist + (Math.random() - 0.5) * 40,
        y: Math.sin(angle) * baseDist + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius,
        color,
        glowColor,
        degree: 1,
        spaceName: "Primary Workspace",
      };

      docNodes.push(docNode);

      // Primary edge connecting to Hub
      edges.push({
        id: `edge-${hubId}-${docNode.id}`,
        source: hubId,
        target: docNode.id,
        weight: 0.85,
        length: baseDist,
      });

      // Semantic Cross-linking between similar files
      for (let j = 0; j < idx; j++) {
        const other = docNodes[j];
        if (!other) continue;

        let similarity = 0;
        if (other.fileType === docNode.fileType) similarity += 0.35;
        if (other.doc && Math.abs((other.doc.chunk_count || 0) - chunkCount) < 5) similarity += 0.25;

        // Add edge if similarity exceeds basic noise
        if (similarity >= 0.35) {
          edges.push({
            id: `edge-${other.id}-${docNode.id}`,
            source: other.id,
            target: docNode.id,
            weight: Number(similarity.toFixed(2)),
            length: 100 + (1 - similarity) * 90,
          });
          docNode.degree += 1;
          other.degree += 1;
        }
      }
    });

    rawNodesRef.current = [hubNode, ...docNodes];
    rawEdgesRef.current = edges;

    // Center camera on container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      transformRef.current = {
        x: rect.width / 2,
        y: rect.height / 2,
        scale: 0.85,
      };
    }
  }, [documents]);

  // Filter active nodes & edges based on similarity slider, search, and type filter
  const { activeNodes, activeEdges, neighborIdsMap } = useMemo(() => {
    const rawNodes = rawNodesRef.current;
    const rawEdges = rawEdgesRef.current;

    // Filter edges by similarity threshold
    const filteredEdges = rawEdges.filter((e) => e.weight >= similarityThreshold);

    // Build adjacency map (1-hop neighbors)
    const adjMap = new Map<string, Set<string>>();
    filteredEdges.forEach((e) => {
      if (!adjMap.has(e.source)) adjMap.set(e.source, new Set());
      if (!adjMap.has(e.target)) adjMap.set(e.target, new Set());
      adjMap.get(e.source)!.add(e.target);
      adjMap.get(e.target)!.add(e.source);
    });

    // Filter nodes by type and isolated toggle
    const filteredNodes = rawNodes.filter((n) => {
      if (selectedTypeFilter !== "all" && n.type === "doc" && n.fileType !== selectedTypeFilter) {
        return false;
      }
      if (!showIsolatedNodes && n.type === "doc") {
        const neighbors = adjMap.get(n.id);
        if (!neighbors || neighbors.size === 0) return false;
      }
      return true;
    });

    const activeNodeIds = new Set(filteredNodes.map((n) => n.id));
    const validEdges = filteredEdges.filter(
      (e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
    );

    return {
      activeNodes: filteredNodes,
      activeEdges: validEdges,
      neighborIdsMap: adjMap,
    };
  }, [documents, similarityThreshold, showIsolatedNodes, selectedTypeFilter]);

  // High-performance 60 FPS Physics simulation & 2D Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const nodes = activeNodes;
      const edges = activeEdges;
      const t = transformRef.current;

      // Handle Retina High-DPI Scaling
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      // --- Force-Directed Physics Step ---
      if (isPhysicsActive) {
        const repulsion = 480;
        const springK = 0.035;
        const centerGravity = 0.015;
        const damping = 0.88;

        // 1. Coulomb Repulsion between all pairs
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy + 20;
            const dist = Math.sqrt(distSq);

            // Collision detection & prevention
            const minDist = n1.radius + n2.radius + 12;
            if (dist < minDist) {
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / (dist || 1);
              const ny = dy / (dist || 1);
              if (draggedNodeRef.current !== n1) {
                n1.x -= nx * overlap;
                n1.y -= ny * overlap;
              }
              if (draggedNodeRef.current !== n2) {
                n2.x += nx * overlap;
                n2.y += ny * overlap;
              }
            } else if (dist < 400) {
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

        // 2. Hooke's Spring Law for edges
        edges.forEach((edge) => {
          const n1 = nodes.find((n) => n.id === edge.source);
          const n2 = nodes.find((n) => n.id === edge.target);
          if (n1 && n2) {
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const displacement = dist - edge.length;
            const force = displacement * springK * edge.weight;
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

        // 3. Center Gravity & Velocity Integration
        nodes.forEach((n) => {
          if (draggedNodeRef.current !== n) {
            // Pull towards center
            n.vx -= n.x * centerGravity;
            n.vy -= n.y * centerGravity;

            // Apply damping
            n.vx *= damping;
            n.vy *= damping;

            n.x += n.vx;
            n.y += n.vy;
          }
        });
      }

      // --- Draw Canvas ---
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // Determine active highlight/dim set
      const isSearching = searchQuery.trim().length > 0;
      const isFocused = hoveredNode !== null || selectedNode !== null;
      const focusTarget = hoveredNode || selectedNode;
      const neighborsOfFocus = focusTarget ? neighborIdsMap.get(focusTarget.id) : null;

      // 1. Draw Edges
      edges.forEach((edge) => {
        const n1 = nodes.find((n) => n.id === edge.source);
        const n2 = nodes.find((n) => n.id === edge.target);
        if (!n1 || !n2) return;

        const isEdgeConnectedToFocus =
          focusTarget &&
          (focusTarget.id === n1.id || focusTarget.id === n2.id);

        let strokeStyle = "rgba(255, 255, 255, 0.08)";
        let lineWidth = Math.max(1, edge.weight * 2.2);

        if (isFocused) {
          if (isEdgeConnectedToFocus) {
            strokeStyle = "rgba(99, 102, 241, 0.75)"; // Highlighted active link
            lineWidth = 2.4;
          } else {
            strokeStyle = "rgba(255, 255, 255, 0.02)"; // Dimmed
          }
        }

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      });

      // 2. Draw Nodes
      nodes.forEach((n) => {
        const isHovered = hoveredNode?.id === n.id;
        const isSelected = selectedNode?.id === n.id;
        const isConnectedNeighbor = neighborsOfFocus ? neighborsOfFocus.has(n.id) : false;
        const isMatch = isSearching
          ? n.name.toLowerCase().includes(searchQuery.toLowerCase())
          : false;

        let alpha = 1.0;
        if (isFocused && !isHovered && !isSelected && !isConnectedNeighbor) {
          alpha = 0.15; // Dim un-connected nodes
        } else if (isSearching && !isMatch) {
          alpha = 0.2;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        // Outer ambient glow ring
        if (isHovered || isSelected || isMatch) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 9, 0, Math.PI * 2);
          ctx.fillStyle = isHovered || isSelected ? "rgba(99, 102, 241, 0.4)" : "rgba(255, 255, 255, 0.2)";
          ctx.fill();
        }

        // Main Node Circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = isHovered || isSelected ? 20 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner rim border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node Label
        const fontSize = n.type === "hub" ? 12 : 10;
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = isHovered || isSelected || isMatch ? "#ffffff" : "rgba(244, 244, 245, 0.75)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const displayName = n.name.length > 22 ? n.name.slice(0, 20) + "..." : n.name;
        ctx.fillText(displayName, n.x, n.y + n.radius + 5);

        ctx.restore();
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
  }, [activeNodes, activeEdges, hoveredNode, selectedNode, searchQuery, isPhysicsActive, neighborIdsMap]);

  // Coordinate Conversion Helper (Screen space -> World physics space)
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const t = transformRef.current;
    return {
      x: (screenX - t.x) / t.scale,
      y: (screenY - t.y) / t.scale,
    };
  }, []);

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const worldPos = screenToWorld(clientX, clientY);

    clickStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    // Check if clicked a node
    const clickedNode = activeNodes.find((n) => {
      const dx = n.x - worldPos.x;
      const dy = n.y - worldPos.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 5;
    });

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      setSelectedNode(clickedNode);
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
    const hovered = activeNodes.find((n) => {
      const dx = n.x - worldPos.x;
      const dy = n.y - worldPos.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 5;
    });

    setHoveredNode(hovered || null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (clickStartRef.current && draggedNodeRef.current) {
      const distMoved = Math.hypot(
        e.clientX - clickStartRef.current.x,
        e.clientY - clickStartRef.current.y
      );
      // Clean click (not a drag) -> trigger selection
      if (distMoved < 6 && draggedNodeRef.current.doc && onSelectDocument) {
        onSelectDocument(draggedNodeRef.current.doc);
      }
    }

    draggedNodeRef.current = null;
    isDraggingCanvasRef.current = false;
    clickStartRef.current = null;
  };

  // Double Click -> Focus camera onto node cluster
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !containerRef.current) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const worldPos = screenToWorld(clientX, clientY);

    const targetNode = activeNodes.find((n) => {
      const dx = n.x - worldPos.x;
      const dy = n.y - worldPos.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 8;
    });

    if (targetNode) {
      // Smoothly pan camera to target node
      const containerRect = containerRef.current.getBoundingClientRect();
      const targetScale = 1.35;
      transformRef.current = {
        x: containerRect.width / 2 - targetNode.x * targetScale,
        y: containerRect.height / 2 - targetNode.y * targetScale,
        scale: targetScale,
      };
      setSelectedNode(targetNode);
    }
  };

  // Zoom Handler
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newScale = Math.max(0.25, Math.min(3.5, transformRef.current.scale * zoomFactor));

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
        scale: 0.85,
      };
    }
  };

  // Empty State Guard
  if (!documents || documents.length === 0) {
    return (
      <div className="relative w-full h-[540px] bg-[#070709] rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center p-6 shadow-2xl overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
          <Network className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-white">Interactive Knowledge Graph</h3>
        <p className="text-xs text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
          No indexed knowledge base documents found. Upload files above to automatically visualize semantic connections, entity clusters, and similarity networks.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full bg-[#070709] rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 h-screen rounded-none border-none" : "h-[620px]"
      }`}
    >
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Floating Header Control Strip */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2.5 pointer-events-auto bg-zinc-950/85 backdrop-blur-2xl border border-white/10 rounded-2xl px-3.5 py-2 shadow-2xl">
          <Layers3 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white tracking-wide">Knowledge Graph</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
            {activeNodes.length} Nodes • {activeEdges.length} Links
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Node Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search nodes & files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-zinc-950/85 backdrop-blur-2xl border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 w-44 sm:w-56 shadow-lg"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-lg backdrop-blur-2xl ${
              showFilterPanel
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-zinc-950/85 text-zinc-400 hover:text-white border-white/10 hover:border-white/20"
            }`}
            title="Graph Filters & Similarity"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Physics Play / Pause Toggle */}
          <button
            onClick={() => setIsPhysicsActive(!isPhysicsActive)}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-lg backdrop-blur-2xl ${
              isPhysicsActive
                ? "bg-zinc-950/85 text-emerald-400 border-white/10 hover:border-emerald-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
            }`}
            title={isPhysicsActive ? "Pause Physics Simulation" : "Resume Physics Simulation"}
          >
            {isPhysicsActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Zoom & View Controls */}
          <div className="flex items-center gap-1 bg-zinc-950/85 backdrop-blur-2xl border border-white/10 rounded-xl p-1 shadow-lg">
            <button
              onClick={() => {
                transformRef.current.scale = Math.min(3.5, transformRef.current.scale * 1.2);
              }}
              className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                transformRef.current.scale = Math.max(0.25, transformRef.current.scale * 0.8);
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
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Filter & Similarity Threshold Settings Drawer */}
      {showFilterPanel && (
        <div className="absolute top-16 right-4 w-72 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl z-30 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" /> Graph Physics & Filter
            </span>
            <button 
              onClick={() => setShowFilterPanel(false)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Similarity Threshold Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">Similarity Threshold</span>
              <span className="font-mono font-bold text-indigo-400">{(similarityThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.8"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[9px] text-zinc-500">Hide weaker semantic links to untangle dense clusters.</p>
          </div>

          {/* Filter by Type */}
          <div className="space-y-1.5 border-t border-white/5 pt-3">
            <span className="text-[11px] font-semibold text-zinc-300">File Type</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "all", label: "All Files" },
                { id: "pdf", label: "PDFs" },
                { id: "audio", label: "Audio / Voice" },
                { id: "sheet", label: "Sheets / CSV" },
                { id: "doc", label: "Docs / MD" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedTypeFilter(filter.id)}
                  className={`text-[10px] font-medium py-1 px-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedTypeFilter === filter.id
                      ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                      : "bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-white/15"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Isolated Nodes */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-[11px] text-zinc-300">Show Isolated Nodes</span>
            <button
              onClick={() => setShowIsolatedNodes(!showIsolatedNodes)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                showIsolatedNodes
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                  : "bg-zinc-900 text-zinc-500 border-white/5"
              }`}
            >
              {showIsolatedNodes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Node Legend Bar */}
      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-3 bg-zinc-950/85 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-2 text-[11px] text-zinc-400 shadow-xl pointer-events-auto">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]" /> PDF Documents
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" /> Audio & Meetings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4]" /> Spreadsheets / CSV
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]" /> Word / Markdown
        </span>
      </div>

      {/* Selected Node Interactive Detail Card */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 w-80 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 z-20">
          <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              {selectedNode.fileType === "audio" ? (
                <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : selectedNode.type === "hub" ? (
                <Network className="w-4 h-4 text-indigo-400 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-white truncate" title={selectedNode.name}>
                {selectedNode.name}
              </span>
            </div>
            <button 
              onClick={() => setSelectedNode(null)} 
              className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedNode.doc ? (
            <div className="text-[11px] text-zinc-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Total Chunks:</span>
                <span className="text-zinc-200 font-semibold">{selectedNode.doc.chunk_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>File Size:</span>
                <span className="text-zinc-200 font-semibold">
                  {((selectedNode.doc.file_size || 0) / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex justify-between">
                <span>Direct Links:</span>
                <span className="text-indigo-400 font-semibold">{selectedNode.degree} connections</span>
              </div>

              {selectedNode.doc.summary && (
                <p className="text-[10px] text-zinc-400 italic line-clamp-3 pt-1 border-t border-white/5">
                  "{selectedNode.doc.summary}"
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    if (selectedNode.doc && onSelectDocument) {
                      onSelectDocument(selectedNode.doc);
                    }
                  }}
                  className="flex-1 py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/50"
                >
                  <Info className="w-3 h-3" />
                  <span>Inspect Chunks</span>
                </button>
                <button
                  onClick={() => {
                    router.push(`/?file=${encodeURIComponent(selectedNode.name)}`);
                  }}
                  className="py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Query document in Chat"
                >
                  <MessageSquare className="w-3 h-3 text-emerald-400" />
                  <span>Chat</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400 space-y-1">
              <p>Primary Knowledge Base root hub coordinating vector context.</p>
              <div className="text-indigo-400 font-semibold pt-1">{activeNodes.length - 1} documents connected</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
