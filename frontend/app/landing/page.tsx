"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSearch,
  Layers3,
  ShieldCheck,
  GraduationCap,
  Zap,
  ChevronRight,
  Check,
  X,
  Database,
  MessageSquare,
  BarChart3,
  Cpu,
  Mic,
  Lock,
  ArrowRight,
  Sparkles,
  Play,
  FileText,
  Clock,
  CheckCircle2,
  Building2,
  Server,
  Globe2,
  HardDrive
} from "lucide-react";

const FEATURES = [
  {
    icon: Cpu,
    color: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/25",
    title: "Groq LPU Inference Engine",
    badge: "500+ tok/s Ultra Speed",
    description:
      "Enterprise inference powered by OpenAI GPT-OSS 120B and Llama 3.2 Vision on Groq LPUs. Sub-second response streaming with zero lag.",
  },
  {
    icon: Mic,
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/25",
    title: "Whisper Large v3 Meeting Intelligence",
    badge: "Audio & Meeting Parsing",
    description:
      "Upload audio/video recordings (.mp3, .wav, .m4a). Automatically transcribes speech in Ukrainian, Polish, English & Spanish and extracts executive Action Items.",
  },
  {
    icon: Layers3,
    color: "from-indigo-500 to-blue-500",
    glow: "shadow-indigo-500/15",
    title: "Isolated Knowledge Spaces",
    badge: "Zero Cross-Bleed",
    description:
      "Partition documents into isolated workspaces ('Legal', 'Financial Audits', 'Engineering'). Multi-tenant isolation guarantees no document contamination.",
  },
  {
    icon: GraduationCap,
    color: "from-purple-500 to-pink-600",
    glow: "shadow-purple-500/25",
    title: "Adaptive Persona Intelligence",
    badge: "Mentor · Auditor · Architect",
    description:
      "Switch on the fly between Mentor (step-by-step guidance), Auditor (strict evidence-only verification), and Architect (systems-level analysis).",
  },
  {
    icon: Database,
    color: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/25",
    title: "FastEmbed ONNX & Dual Retrieval",
    badge: "PostgreSQL 16 + Qdrant",
    description:
      "Local dense BGE embeddings combined with PostgreSQL structured metadata and Qdrant vector indexing for sub-5ms semantic search.",
  },
  {
    icon: ShieldCheck,
    color: "from-rose-500 to-red-600",
    glow: "shadow-rose-500/25",
    title: "Zero Model Training Guarantee",
    badge: "100% GDPR & Private",
    description:
      "Your documents are never used to train public foundation models. All inference is processed via zero-data-retention endpoints with instant purge.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Ingest Your Documents",
    desc: "Drag and drop PDFs, Office documents (.docx, .pptx, .xlsx), CSVs, EPUBs, images, or audio recordings into your Knowledge Space.",
    icon: Database,
  },
  {
    num: "02",
    title: "Hybrid Vector Indexing",
    desc: "Neurach chunks text, vectorizes content using FastEmbed BGE ONNX models, and indexes vectors into Qdrant in milliseconds.",
    icon: Cpu,
  },
  {
    num: "03",
    title: "Query with Traceable Citations",
    desc: "Ask complex questions in any language. Receive executive answers backed by exact paragraph citations and actionable meeting summaries.",
    icon: FileSearch,
  },
];

const COMPARISON = [
  { feature: "Answers strictly grounded in private documents", gpt: false, gemini: false, core: true },
  { feature: "Exact paragraph & document source citations", gpt: false, gemini: false, core: true },
  { feature: "Multi-format doc parsing (PDF, Office, CSV, XLSX, Audio)", gpt: false, gemini: false, core: true },
  { feature: "Audio Meeting Intelligence & Action Item Extraction", gpt: false, gemini: false, core: true },
  { feature: "Isolated Knowledge Spaces per team or project", gpt: false, gemini: false, core: true },
  { feature: "Persona Switcher (Mentor / Auditor / Architect)", gpt: false, gemini: false, core: true },
  { feature: "Zero public AI training on proprietary files", gpt: false, gemini: false, core: true },
  { feature: "Sub-150ms TTFT on Groq LPU inference", gpt: false, gemini: false, core: true },
];

export default function LandingPage() {
  const router = useRouter();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState<"auditor" | "meeting" | "architect">("auditor");

  const handleLaunchDemo = async () => {
    setIsDemoLoading(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Failed to initialize demo:", err);
      router.push("/login");
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#08080a]/85 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt="Neurach"
              className="h-8 w-8 object-contain drop-shadow-[0_2px_8px_rgba(99,102,241,0.25)] transition-transform duration-200 group-hover:scale-105"
            />
            <div className="flex items-center gap-1.5 font-bold tracking-tight">
              <span className="text-white text-lg tracking-tight">Neurach</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/25">CORE</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#benchmarks" className="hover:text-white transition-colors">Benchmarks</a>
            <a href="#compare" className="hover:text-white transition-colors">Comparison</a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunchDemo}
              disabled={isDemoLoading}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{isDemoLoading ? "Loading..." : "Live Demo"}</span>
            </button>
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-300 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-bold text-black bg-white hover:bg-zinc-200 transition-all px-4 py-2 rounded-lg shadow-md hover:shadow-white/20 active:scale-95"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 text-center overflow-hidden">
        {/* Glowing Background Radial Blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-blue-500/15 rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="relative mx-auto max-w-5xl space-y-7">
          {/* Keynote Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-950/30 px-4 py-1.5 text-xs text-indigo-300 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="font-semibold tracking-wide">NEURACH · ENTERPRISE HYBRID RAG 2.4</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            <span className="text-white">Private Knowledge Intelligence</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-indigo-200 bg-clip-text text-transparent">
              at the Speed of Light.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
            Stop pasting sensitive documents into generic AI. Neurach establishes cryptographically isolated{" "}
            <span className="text-white font-medium">Knowledge Spaces</span>, indexes documents and meeting recordings, and synthesizes answers with{" "}
            <span className="text-indigo-300 font-medium">verifiable source citations</span> powered by Groq LPU inference.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={handleLaunchDemo}
              disabled={isDemoLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-950/40 hover:scale-[1.02] active:scale-98 cursor-pointer text-sm"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>{isDemoLoading ? "Starting Demo..." : "Explore Interactive Demo"}</span>
              <ChevronRight className="w-4 h-4 text-indigo-200 ml-0.5" />
            </button>

            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 text-white font-medium px-7 py-3.5 rounded-xl transition-all text-sm active:scale-98"
            >
              <span>Provision Workspace</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Instant Demo Access
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero AI Model Training
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Groq 500+ tok/s LPU Engine
            </span>
          </div>
        </div>

        {/* ── LIVE INTERACTIVE SIMULATION TERMINAL ───────────────────────── */}
        <div className="relative mt-16 mx-auto max-w-3xl">
          <div className="rounded-2xl border border-white/10 bg-[#0e0e12]/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-indigo-950/40 text-left">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#09090c]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs text-zinc-400 font-mono">
                  Neurach Enterprise Workspace · Space: <span className="text-indigo-400 font-semibold">Q3_Executive_Audits</span>
                </span>
              </div>

              {/* Mode Selectors in Demo */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveDemoTab("auditor")}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${activeDemoTab === "auditor"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  Auditor Mode
                </button>
                <button
                  onClick={() => setActiveDemoTab("meeting")}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${activeDemoTab === "meeting"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  Meeting Audio
                </button>
                <button
                  onClick={() => setActiveDemoTab("architect")}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${activeDemoTab === "architect"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  Architect Mode
                </button>
              </div>
            </div>

            {/* Simulated Chat Content */}
            <div className="p-6 space-y-4 text-xs sm:text-sm">
              {activeDemoTab === "auditor" && (
                <>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600/30 border border-indigo-500/30 px-4 py-2.5 text-zinc-100">
                      What are the GDPR compliance requirements and SLA uptime guarantee in the Master Services Agreement?
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo-icon.png" alt="Neurach" className="w-4 h-4 object-contain" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="rounded-2xl rounded-tl-sm border border-white/5 bg-zinc-900/80 p-4 text-zinc-200 leading-relaxed">
                        Based on §4.2 of the audited agreement:
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-300">
                          <li><strong>SLA Guarantee:</strong> Minimum <span className="text-indigo-300 font-semibold">99.9% monthly uptime</span> with automated failover.</li>
                          <li><strong>Data Governance:</strong> All customer data is processed under strict <span className="text-indigo-300 font-semibold">Zero-Data-Retention (ZDR)</span> terms.</li>
                          <li><strong>Breach Notification:</strong> Mandatory reporting within <span className="text-indigo-300 font-semibold">24 hours</span> of detection.</li>
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          <FileText className="w-3 h-3 text-indigo-400" />
                          Master_Services_Agreement_2026.pdf · §4.2 (Score: 0.94)
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          <FileText className="w-3 h-3 text-indigo-400" />
                          SLA_Compliance_Annex.pdf · §1.1 (Score: 0.91)
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeDemoTab === "meeting" && (
                <>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600/30 border border-indigo-500/30 px-4 py-2.5 text-zinc-100">
                      Summarize the key decisions and Action Items from yesterday's product sync recording.
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <Mic className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="rounded-2xl rounded-tl-sm border border-indigo-500/20 bg-indigo-950/20 p-4 text-zinc-200 leading-relaxed">
                        <div className="text-xs font-bold text-indigo-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Meeting Intelligence Brief · Audio Recording Parsed</span>
                        </div>
                        <ul className="space-y-1.5 text-zinc-300 text-xs">
                          <li>⚡ <strong>Architecture:</strong> Approved rollout of FastEmbed BGE ONNX embeddings for sub-5ms vectorization.</li>
                          <li>✅ <strong>Action Item:</strong> Stas to finalize Knowledge Spaces permissions modal by Friday.</li>
                          <li>🔐 <strong>Security:</strong> DigitalOcean VPS deployment confirmed at IP 159.89.110.69.</li>
                        </ul>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        <Mic className="w-3 h-3 text-indigo-400" />
                        Audio_Sync_2026-08-19.mp3 · 44.5s · Ukrainian Whisper v3
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeDemoTab === "architect" && (
                <>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600/30 border border-indigo-500/30 px-4 py-2.5 text-zinc-100">
                      Evaluate our hybrid RAG scaling limits with 100,000 documents in Qdrant and PostgreSQL.
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="rounded-2xl rounded-tl-sm border border-indigo-500/20 bg-indigo-950/20 p-4 text-zinc-200 leading-relaxed">
                        <strong>Architectural Assessment:</strong>
                        <p className="mt-1 text-zinc-300">
                          With HNSW indexing in Qdrant and payload partitioning per `space_id`, 100k vectors require &lt; 400MB RAM. FastEmbed ONNX processes ~1,200 chunks/sec on CPU without GPU overhead.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── VERIFIED BUSINESS VALUE STRIP ─────────────────────────────────── */}
      <section id="benchmarks" className="py-14 px-6 border-y border-white/5 bg-[#09090d]">
        <div className="mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-400">
              10x
            </div>
            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Faster Document Search</div>
          </div>

          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-400">
              100%
            </div>
            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Grounded Citations</div>
          </div>

          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-400">
              0%
            </div>
            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Public Model Training</div>
          </div>

          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-400">
              150ms
            </div>
            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Time to First Token</div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE SECTION ─────────────────────────────────────────── */}
      <section id="architecture" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center space-y-3 mb-16">
            <p className="text-xs font-bold text-indigo-400 tracking-widest uppercase">System Design</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">Engineered for Enterprise Truth</h2>
            <p className="text-zinc-400 text-sm max-w-2xl mx-auto">
              How Neurach transforms unstructured documents into verifiable intelligence in three automated stages.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="relative rounded-2xl border border-white/5 bg-zinc-900/40 p-6 space-y-4 hover:border-white/15 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-zinc-700">{step.num}</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-[#09090c] border-t border-white/5">
        <div className="mx-auto max-w-6xl">
          <div className="text-center space-y-3 mb-16">
            <p className="text-xs font-bold text-indigo-400 tracking-widest uppercase">Enterprise Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">Built for Regulated & High-Stakes Teams</h2>
            <p className="text-zinc-400 text-sm max-w-2xl mx-auto">
              No generic chatbot answers. Every feature is tuned for absolute precision, traceability, and speed.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/80 p-6 space-y-4 transition-all duration-200 hover:border-white/15 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-md ${f.glow}`}>
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                    {f.badge}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON MATRIX ─────────────────────────────────────────────── */}
      <section id="compare" className="py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center space-y-3 mb-14">
            <p className="text-xs font-bold text-indigo-400 tracking-widest uppercase">Competitive Matrix</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">Neurach vs Generic AI</h2>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden bg-zinc-900/40 shadow-xl">
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-12 border-b border-white/10 bg-zinc-950/80 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <div className="col-span-6">Feature</div>
                  <div className="col-span-2 text-center">ChatGPT</div>
                  <div className="col-span-2 text-center">Gemini</div>
                  <div className="col-span-2 text-center text-indigo-300 font-extrabold">Neurach</div>
                </div>

                {COMPARISON.map((row, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-12 px-6 py-4 items-center text-sm ${idx % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent"
                      }`}
                  >
                    <div className="col-span-6 font-medium text-zinc-300">{row.feature}</div>
                    <div className="col-span-2 text-center flex justify-center">
                      <X className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="col-span-2 text-center flex justify-center">
                      <X className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="col-span-2 text-center flex justify-center">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/30">
                        <Check className="w-4 h-4 text-indigo-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden border-t border-white/5 bg-gradient-to-b from-transparent to-indigo-950/20 text-center">
        <div className="relative mx-auto max-w-4xl mt-36 p-12 rounded-3xl border border-white/10 bg-gradient-to-b from-[#111116] to-[#0a0a0d] shadow-2xl text-center space-y-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)] pointer-events-none" />

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ready to deploy your private knowledge base?
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto">
            Test with the live sandbox demo or provision a cryptographically isolated workspace for your organization in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleLaunchDemo}
              disabled={isDemoLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-950/50 cursor-pointer text-sm"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Launch Interactive Demo</span>
            </button>
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium px-8 py-3.5 rounded-xl transition-all text-sm"
            >
              <span>Create Account</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6 bg-[#060608]">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="Neurach" className="h-5 w-5 object-contain" />
            <span className="text-zinc-400 font-semibold">Neurach</span>
            <span>· Built by Stanislav Pepryk</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-zinc-300 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
