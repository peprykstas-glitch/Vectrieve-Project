"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGlobalSettings } from "@/components/global-settings";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Sparkles, Activity, Database, ShieldCheck, Download, Printer, Plus, Radio, Zap, ExternalLink, Settings2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import AudioBrief from "./AudioBrief";

interface ChatAreaProps {
  initialSessionId?: string | null;
  initialSpaceId?: string | null;
}

function getFollowUpPrompts(lastMessageText: string, persona: string): string[] {
  const text = lastMessageText.toLowerCase();
  
  if (persona === "auditor" || text.includes("audit") || text.includes("risk") || text.includes("legal")) {
    return [
      "What are the most critical legal risks in these documents?",
      "Provide a detailed audit of the parties' obligations.",
      "Are there any hidden penalties or liabilities in the contracts?"
    ];
  }
  
  if (persona === "architect" || text.includes("database") || text.includes("schema") || text.includes("code")) {
    return [
      "How is the Qdrant database structured in this project?",
      "Explain the inner workings of the RRF merge algorithm.",
      "How can we integrate this service into our internal CRM?"
    ];
  }

  if (text.includes("internship") || text.includes("practice") || text.includes("student") || text.includes("animafest")) {
    return [
      "How can we automate CV screening for incoming students?",
      "Create an onboarding checklist template for new interns.",
      "Which documents typically cause delays during visa/contract processing?"
    ];
  }
  
  if (text.includes("file") || text.includes("document") || text.includes("upload") || text.includes("segment")) {
    return [
      "Show me the status of my recently uploaded documents.",
      "What is the maximum vector capacity of our Qdrant instance?",
      "How do I purge old or outdated files from the database?"
    ];
  }
  
  return [
    "Provide an Executive Summary of your findings.",
    "What are the concrete next steps we should take?",
    "How can this help optimize our team's daily workflow?"
  ];
}

export function ChatArea({ initialSessionId, initialSpaceId }: ChatAreaProps) {
  const { computeMode, aiPersona, setHeaderRightAction } = useGlobalSettings();
  const { messages, isLoading, isProcessingFiles, submitQuery, sessionId, trialRemaining, trialExpired, setTrialExpired } = useChat(computeMode, aiPersona, initialSessionId, initialSpaceId);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [showAudioBrief, setShowAudioBrief] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const showWelcomeHero = messages.length === 0 || (messages.length === 1 && messages[0].id === "welcome");

  const quickActions = [
    {
      title: "Analyze Workspace",
      desc: "Verify uploaded document statuses and indexes",
      prompt: "Show me a status report of my uploaded files.",
      icon: Database,
      color: "text-blue-400 group-hover:text-blue-300",
      border: "hover:border-blue-500/30",
    },
    {
      title: "Executive Audit",
      desc: "Detect compliance risks or contractual anomalies",
      prompt: "Perform a deep risk audit across all knowledge base files.",
      icon: ShieldCheck,
      color: "text-amber-400 group-hover:text-amber-300",
      border: "hover:border-amber-500/30",
    },
    {
      title: "Semantic Synthesis",
      desc: "Uncover hidden insights across connected files",
      prompt: "Synthesize key strategic takeaways from all uploaded documents.",
      icon: Sparkles,
      color: "text-purple-400 group-hover:text-purple-300",
      border: "hover:border-purple-500/30",
    },
    {
      title: "Audio Briefing",
      desc: "Generate conversational overview podcast with hosts",
      prompt: "Create an executive audio briefing summary.",
      icon: Radio,
      color: "text-emerald-400 group-hover:text-emerald-300",
      border: "hover:border-emerald-500/30",
    },
  ];

  // Helper to safely export the session transcript as a Markdown file
  const exportAsMarkdown = useCallback(() => {
    if (!messages.length) return;
    let md = `# Vectrieve Chat Session: ${sessionId || "Export"}\n`;
    md += `*Exported on: ${new Date().toLocaleString()}*\n\n---\n\n`;
    
    messages.forEach((msg) => {
      const roleName = msg.role === "user" ? "### User" : "### Vectrieve Core";
      md += `${roleName}\n\n${msg.content}\n\n`;
      if (msg.sources && msg.sources.length > 0) {
        md += `**Sources Cited:**\n`;
        msg.sources.forEach((src) => {
          md += `- **${src.filename}** (Score: ${src.score.toFixed(2)}): "${src.content.trim()}"\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vectrieve-chat-${sessionId ? sessionId.slice(0, 8) : "export"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [messages, sessionId]);

  // Helper to export as a formatted printable PDF
  const exportAsPDF = useCallback(() => {
    if (!messages.length) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export the PDF.");
      return;
    }

    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vectrieve Intelligence Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 40px; line-height: 1.6; }
            h1 { font-size: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
            .msg { margin-bottom: 24px; padding: 16px; border-radius: 8px; }
            .user { background: #f3f4f6; border-left: 4px solid #6b7280; }
            .assistant { background: #eff6ff; border-left: 4px solid #3b82f6; }
            .role { font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
            .user .role { color: #4b5563; }
            .assistant .role { color: #1d4ed8; }
            .content { font-size: 14px; white-space: pre-wrap; }
            .citations { margin-top: 12px; padding-top: 12px; border-top: 1px solid #dbeafe; font-size: 11px; color: #475569; }
            .citation-title { font-weight: 600; margin-bottom: 4px; }
            .citation-item { margin-bottom: 4px; background: #fff; padding: 6px; border-radius: 4px; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>Vectrieve Intelligence Report</h1>
          <div class="meta">Session ID: ${escapeHtml(sessionId || "Ad-hoc")} &bull; Generated: ${new Date().toLocaleString()}</div>
    `;
    
    messages.forEach((msg) => {
      const isUser = msg.role === "user";
      html += `
        <div class="msg ${isUser ? 'user' : 'assistant'}">
          <div class="role">${isUser ? 'User Query' : 'Vectrieve Core Analysis'}</div>
          <div class="content">${escapeHtml(msg.content)}</div>
      `;
      
      if (msg.sources && msg.sources.length > 0) {
        html += `<div class="citations"><div class="citation-title">Sources Cited:</div>`;
        msg.sources.forEach((src) => {
          html += `
            <div class="citation-item">
              <strong>${escapeHtml(src.filename)}</strong> (Similarity Score: ${src.score.toFixed(2)})<br/>
              "${escapeHtml(src.content.trim())}"
            </div>
          `;
        });
        html += `</div>`;
      }
      
      html += `</div>`;
    });
    
    html += `
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }, [messages, sessionId]);

  // Sync action buttons with the top unified header
  useEffect(() => {
    if (showWelcomeHero) {
      setHeaderRightAction(null);
      return;
    }

    setHeaderRightAction(
      <div className="flex items-center gap-2 animate-in fade-in duration-200">
        {trialRemaining !== null && (
          <div className={`hidden sm:flex items-center gap-1.5 h-7.5 px-3 rounded-full text-[11px] font-medium tracking-wide backdrop-blur-xl border shadow-sm transition-all ${
            trialRemaining <= 3
              ? "bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
              : trialRemaining <= 8
              ? "bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
              : "bg-zinc-900/40 text-zinc-400 border-white/10"
          }`}>
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{trialRemaining} trial left</span>
          </div>
        )}

        {sessionId && messages.length > 1 && (
          <button 
            onClick={() => setShowAudioBrief(true)}
            className="h-7.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/25 text-emerald-400 hover:text-emerald-300 text-[11px] font-medium rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)] active:scale-95"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Audio Briefing</span>
          </button>
        )}

        <button 
          onClick={exportAsMarkdown}
          className="h-7.5 px-3 bg-zinc-900/40 hover:bg-zinc-800/60 backdrop-blur-xl border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-[11px] font-medium rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          title="Export as Markdown"
        >
          <Download className="w-3 h-3 text-zinc-400" />
          <span>MD</span>
        </button>

        <button 
          onClick={exportAsPDF}
          className="h-7.5 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 backdrop-blur-xl border border-indigo-500/25 text-indigo-400 hover:text-indigo-300 text-[11px] font-medium rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.15)] active:scale-95"
          title="Export / Print PDF"
        >
          <Printer className="w-3 h-3 text-indigo-400" />
          <span>PDF</span>
        </button>
      </div>
    );

    return () => setHeaderRightAction(null);
  }, [showWelcomeHero, sessionId, messages.length, trialRemaining, exportAsMarkdown, exportAsPDF, setHeaderRightAction]);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 relative overflow-hidden">

      {/* Trial Expired Modal */}
      <AnimatePresence>
        {trialExpired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-lg font-bold text-white">Free Trial Complete</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  You&apos;ve used all 20 free queries. To keep using Vectrieve, add your own
                  <span className="text-indigo-400 font-semibold"> Groq API key</span> — it&apos;s free and takes 30 seconds.
                </p>
              </div>

              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">How to get your key</p>
                {[
                  { step: "1", text: "Open console.groq.com" },
                  { step: "2", text: "Sign up for free (no card needed)" },
                  { step: "3", text: "Go to API Keys → Create API Key" },
                  { step: "4", text: 'Paste it in Settings → Save' },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3 text-xs text-zinc-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">{item.step}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  Open Groq Console
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => { setTrialExpired(false); router.push("/settings"); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl border border-zinc-700 transition-all cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Go to Settings
                </button>
              </div>

              <button
                onClick={() => setTrialExpired(false)}
                className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
              >
                Dismiss (you won&apos;t be able to send messages)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* CENTRALIZED MESSAGE FEED */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-16 pb-36 scroll-smooth custom-scrollbar relative z-10">
        <div className="flex flex-col items-center w-full min-h-full">
          <div className="w-full max-w-4xl flex flex-col gap-6 pb-6 flex-1 justify-center">
            {showWelcomeHero ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center justify-center text-center my-auto py-8"
              >
                {/* Floating Vectrieve Brand Mark with Ambient Glow (no box/tile) */}
                <div className="relative mb-6 group flex items-center justify-center">
                  {/* Soft radial glow aura */}
                  <div className="absolute w-28 h-28 bg-gradient-to-tr from-cyan-500/25 via-violet-500/30 to-indigo-500/20 rounded-full blur-2xl pointer-events-none transition-all duration-700 group-hover:scale-125 group-hover:opacity-100" />
                  
                  {/* Floating Logo Icon */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-icon.png"
                    alt="Vectrieve Core"
                    className="relative w-14 h-14 object-contain drop-shadow-[0_0_20px_rgba(0,212,255,0.45)] transition-transform duration-300 group-hover:scale-110 select-none pointer-events-none"
                  />
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                  Unlock your enterprise intelligence.
                </h2>
                <p className="text-zinc-500 text-sm max-w-md mb-10 leading-relaxed">
                  Welcome to Vectrieve Core. Ask questions, search vector segments, or audit files with high precision.
                </p>

                {/* Quick Action Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-2">
                  {quickActions.map((action, idx) => (
                    <motion.button
                      key={action.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 + 0.2, type: "spring", stiffness: 200 }}
                      onClick={() => submitQuery(action.prompt, [])}
                      className={`group flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-zinc-900/30 backdrop-blur-sm text-left transition-all duration-300 ${action.border} hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer`}
                    >
                      <div className={`p-2.5 rounded-xl bg-zinc-950 border border-white/5 ${action.color} transition-colors`}>
                        <action.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">{action.title}</h4>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{action.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-6 mt-auto">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <ChatMessage 
                      key={msg.id} 
                      msg={msg} 
                      ref={idx === messages.length - 1 ? lastMessageRef : undefined}
                    />
                  ))}
                </AnimatePresence>

                {/* Context-aware suggestions */}
                {!isLoading && messages.length > 1 && messages[messages.length - 1].role === "assistant" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 flex flex-col gap-3 w-full"
                  >
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-3">
                      <span>Suggested Follow-ups</span>
                      <div className="h-px bg-white/5 flex-1" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(messages[messages.length - 1].suggestions || getFollowUpPrompts(messages[messages.length - 1].content, aiPersona)).map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => submitQuery(prompt, [])}
                          className="text-xs bg-zinc-900/40 hover:bg-indigo-600/10 hover:text-indigo-400 border border-white/5 hover:border-indigo-500/20 px-3.5 py-2.5 rounded-2xl transition-all duration-300 text-left text-zinc-400 cursor-pointer shadow-sm active:scale-[0.98]"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} className="h-8" />
          </div>
        </div>
      </div>

      {/* FLOATING ADAPTIVE INPUT CAPSULE (ChatGPT / Claude Floating Design) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pt-10 pb-4 px-4 flex justify-center">
        <div className="w-full max-w-4xl pointer-events-auto">
          <ChatInput isLoading={isLoading} isProcessingFiles={isProcessingFiles} onSubmit={submitQuery} />
        </div>
      </div>

      {/* Mobile Floating New Chat FAB — visible only on small screens when inside a session */}
      {!showWelcomeHero && (
        <button
          onClick={() => router.push('/')}
          className="md:hidden fixed bottom-24 right-4 z-50 h-12 w-12 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/30 flex items-center justify-center hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
          aria-label="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}

      {/* Audio Briefing Floating Overlay Modal */}
      {showAudioBrief && sessionId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 shadow-2xl relative bg-zinc-900">
            <AudioBrief 
              sessionId={sessionId}
              filename="Active Chat Session" 
              onClose={() => setShowAudioBrief(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}