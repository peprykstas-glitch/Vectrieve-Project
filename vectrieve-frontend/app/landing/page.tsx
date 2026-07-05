import Link from "next/link"
import type { Metadata } from "next"
import {
  BrainCircuit,
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
  Quote,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Vectrieve — AI that knows YOUR knowledge, not the world's",
  description:
    "Stop explaining your documents to AI every session. Vectrieve builds a permanent, private knowledge base from your files and answers with cited sources — not guesses.",
}

/* ─── Design tokens ────────────────────────────────────────────────────────── */
// All styles are inline Tailwind utilities to keep the file self-contained

/* ─── Data ─────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: FileSearch,
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/25",
    title: "Source Citations",
    badge: "Like Perplexity, but private",
    description:
      "Every AI answer shows exactly which document and paragraph it came from. No hallucinations, no guessing. Click to see the raw source.",
  },
  {
    icon: Layers3,
    color: "from-cyan-500 to-blue-600",
    glow: "shadow-cyan-500/25",
    title: "Knowledge Spaces",
    badge: "Unique to Vectrieve",
    description:
      "Separate isolated knowledge collections — 'Project Alpha', 'Legal Docs', 'Sales Playbook'. The AI stays strictly within the space you choose.",
  },
  {
    icon: GraduationCap,
    color: "from-fuchsia-500 to-pink-600",
    glow: "shadow-fuchsia-500/25",
    title: "Thinking Modes",
    badge: "Adaptive intelligence",
    description:
      "Switch between Mentor (explains patiently), Auditor (strict, source-only), and Architect (system-level thinking). One click, totally different AI personality.",
  },
  {
    icon: ShieldCheck,
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/25",
    title: "Local & Private",
    badge: "Your data stays yours",
    description:
      "Run the AI entirely on your own machine with Ollama. Your documents never leave your computer. No cloud, no logs, no data sharing.",
  },
]

const STEPS = [
  {
    num: "01",
    title: "Upload your knowledge",
    desc: "Drop PDFs, code files, text docs, or entire ZIP archives into your Knowledge Space. Vectrieve parses and indexes everything automatically.",
    icon: Database,
  },
  {
    num: "02",
    title: "Ask anything",
    desc: "Ask questions in natural language. Vectrieve retrieves the most relevant chunks from your documents and feeds them to the AI as precise context.",
    icon: MessageSquare,
  },
  {
    num: "03",
    title: "Get cited answers",
    desc: "Receive a clear answer with links to the exact source paragraphs. Every claim is traceable. Export the full session as a PDF report.",
    icon: FileSearch,
  },
]

const COMPARISON = [
  { feature: "Answers based on YOUR private documents", gpt: false, gemini: false, core: true },
  { feature: "Cites exact source paragraph", gpt: false, gemini: false, core: true },
  { feature: "Persistent knowledge base (survives sessions)", gpt: false, gemini: false, core: true },
  { feature: "Isolated Knowledge Spaces per project", gpt: false, gemini: false, core: true },
  { feature: "Thinking Mode selector (Mentor / Auditor / Architect)", gpt: false, gemini: false, core: true },
  { feature: "100% local / air-gapped mode", gpt: false, gemini: false, core: true },
  { feature: "General world knowledge", gpt: true, gemini: true, core: false },
]

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Vectrieve</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#compare" className="hover:text-white transition-colors">Compare</a>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-1.5 rounded-full"
          >
            Get started free
          </Link>
        </div>
      </div>
    </nav>
  )
}

function HeroBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
      <Zap className="w-3.5 h-3.5 text-violet-400" />
      <span>Built for teams who can't afford wrong answers</span>
    </div>
  )
}

function HeroChatMockup() {
  return (
    <div className="relative mx-auto max-w-xl">
      {/* Glow ring behind */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/10 blur-3xl scale-110 -z-10" />

      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-sm overflow-hidden shadow-2xl">
        {/* Terminal bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-zinc-950/50">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <span className="ml-2 text-xs text-zinc-500 font-mono">Vectrieve · Project Alpha · Auditor Mode</span>
        </div>

        <div className="p-5 space-y-4">
          {/* User message */}
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-violet-600/30 border border-violet-500/20 px-4 py-2.5 text-sm text-zinc-200">
              What are the payment terms in the Q3 partnership agreement?
            </div>
          </div>

          {/* AI response */}
          <div className="flex gap-3">
            <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mt-0.5">
              <BrainCircuit className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="rounded-xl rounded-tl-sm border border-white/5 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-300 leading-relaxed">
                The Q3 agreement specifies <span className="text-white font-medium">net-30 payment terms</span> with a
                {" "}<span className="text-white font-medium">2% early payment discount</span> if settled within 10 days.
                Late payments incur a <span className="text-amber-400 font-medium">1.5% monthly penalty</span>.
              </div>

              {/* Source citations */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  <FileSearch className="w-3 h-3" />
                  Q3_Partnership_Agreement.pdf · §4.2
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                  <FileSearch className="w-3 h-3" />
                  Addendum_July2024.pdf · §1
                </div>
              </div>
            </div>
          </div>

          {/* Typing indicator */}
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Auditor mode · sources verified · 0 hallucinations</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-32 px-6 text-center overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-4xl space-y-8">
          <HeroBadge />

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            <span className="text-white">ChatGPT knows </span>
            <span className="italic text-zinc-500">the world.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Vectrieve knows you.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-400 leading-relaxed">
            Upload your documents once. Vectrieve builds a permanent, private knowledge base and
            answers every question with{" "}
            <span className="text-white">exact source citations</span> — not hallucinations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/register"
              id="hero-cta-register"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-full transition-all hover:shadow-lg hover:shadow-violet-500/30 hover:scale-105 active:scale-95"
            >
              Start for free
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              id="hero-cta-login"
              className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white px-8 py-3.5 rounded-full transition-all hover:bg-white/5"
            >
              Sign in
            </Link>
          </div>

          <p className="text-xs text-zinc-600">
            No credit card required · Works with local Ollama · Your data stays yours
          </p>
        </div>

        {/* Chat mockup */}
        <div className="relative mt-20 mx-auto max-w-2xl">
          <HeroChatMockup />
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ────────────────────────────────────────────── */}
      <section className="py-12 px-6 border-y border-white/5">
        <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-zinc-600">
          <span className="text-zinc-500 font-medium">Built with</span>
          <span className="text-zinc-400 font-semibold">FastAPI</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-400 font-semibold">Next.js 16</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-400 font-semibold">Qdrant</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-400 font-semibold">Groq / Ollama</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-400 font-semibold">PostgreSQL</span>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center space-y-3 mb-16">
            <p className="text-sm font-medium text-violet-400 tracking-widest uppercase">How it works</p>
            <h2 className="text-4xl font-bold">From files to answers in minutes</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="relative group">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(100%+0px)] w-8 h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-black text-zinc-800 group-hover:text-violet-800 transition-colors">{step.num}</span>
                    <div className="w-10 h-10 rounded-xl border border-white/10 bg-zinc-900 flex items-center justify-center group-hover:border-violet-500/40 transition-colors">
                      <step.icon className="w-5 h-5 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center space-y-3 mb-16">
            <p className="text-sm font-medium text-violet-400 tracking-widest uppercase">Features</p>
            <h2 className="text-4xl font-bold">What makes Vectrieve different</h2>
            <p className="text-zinc-500 max-w-xl mx-auto">
              These aren't AI gimmicks. These are the exact capabilities enterprises need but couldn't get from generic AI assistants.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/70 backdrop-blur-sm p-8 overflow-hidden transition-all hover:border-white/10"
              >
                {/* Background glow on hover */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${f.color} blur-3xl scale-150 -z-10`} style={{ opacity: 0.04 }} />

                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg ${f.glow}`}>
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                      <span className="text-xs font-medium text-violet-300 bg-violet-500/15 border border-violet-500/25 px-2.5 py-0.5 rounded-full">
                        {f.badge}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-sm leading-relaxed">{f.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ──────────────────────────────────────────────── */}
      <section id="compare" className="py-24 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center space-y-3 mb-12">
            <p className="text-sm font-medium text-violet-400 tracking-widest uppercase">Compare</p>
            <h2 className="text-4xl font-bold">What you can't get elsewhere</h2>
          </div>

          <div className="rounded-2xl border border-white/8 overflow-hidden bg-zinc-900/40">
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                {/* Header */}
                <div className="grid grid-cols-4 border-b border-white/8 bg-zinc-900/60">
                  <div className="col-span-1 px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Feature</div>
                  <div className="px-4 py-4 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">ChatGPT</div>
                  <div className="px-4 py-4 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">Gemini</div>
                  <div className="px-4 py-4 text-center">
                    <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Vectrieve</span>
                  </div>
                </div>

                {COMPARISON.map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-4 border-b border-white/5 last:border-0 transition-colors hover:bg-white/2 ${row.core ? '' : 'opacity-70'}`}
                  >
                    <div className="col-span-1 px-6 py-4 text-sm text-zinc-300">{row.feature}</div>
                    <div className="px-4 py-4 flex items-center justify-center">
                      {row.gpt
                        ? <Check className="w-4 h-4 text-emerald-400" />
                        : <X className="w-4 h-4 text-zinc-700" />}
                    </div>
                    <div className="px-4 py-4 flex items-center justify-center">
                      {row.gemini
                        ? <Check className="w-4 h-4 text-emerald-400" />
                        : <X className="w-4 h-4 text-zinc-700" />}
                    </div>
                    <div className="px-4 py-4 flex items-center justify-center">
                      {row.core
                        ? <Check className="w-5 h-5 text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
                        : <X className="w-4 h-4 text-zinc-700" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-2xl text-center space-y-8">
          <Quote className="w-10 h-10 text-zinc-700 mx-auto" />
          <blockquote className="text-2xl font-medium text-white leading-relaxed">
            "I stopped copy-pasting contract clauses into ChatGPT and praying it would remember context.
            Vectrieve just knows our entire deal room — and it shows me exactly where it found the answer."
          </blockquote>
          <div className="space-y-1">
            <p className="text-white font-semibold">Early Adopter</p>
            <p className="text-zinc-500 text-sm">Startup founder, Legal Tech</p>
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-950/30 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-violet-500/40" />

        <div className="relative mx-auto max-w-2xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 text-sm text-violet-300">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Free during beta
          </div>
          <h2 className="text-5xl font-bold">
            Ready to build your
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              second brain?
            </span>
          </h2>
          <p className="text-zinc-400 text-lg">
            Create your free account. Upload your first document.
            Get an answer with a source citation in under a minute.
          </p>
          <Link
            href="/register"
            id="footer-cta-register"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-10 py-4 rounded-full transition-all hover:shadow-2xl hover:shadow-violet-500/40 hover:scale-105 active:scale-95 text-lg"
          >
            Start building for free
            <ChevronRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center gap-6 text-sm text-zinc-600">
            <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-zinc-700" />No credit card</span>
            <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-zinc-700" />Free forever plan</span>
            <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-zinc-700" />Local or cloud AI</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
              <BrainCircuit className="w-3 h-3 text-white" />
            </div>
            <span className="text-zinc-500 font-medium">Vectrieve</span>
          </div>
          <p>Built by <span className="text-zinc-400">Stanislav Pepryk</span></p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-zinc-400 transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-zinc-400 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
