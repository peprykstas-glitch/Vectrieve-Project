"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGlobalSettings } from "@/components/global-settings";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Sparkles, Activity, Database, ShieldCheck, BrainCircuit, Download, Printer, Plus, Radio } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import AudioBrief from "./AudioBrief";

interface ChatAreaProps {
  initialSessionId?: string | null;
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

export function ChatArea({ initialSessionId }: ChatAreaProps) {
  const { computeMode, aiPersona } = useGlobalSettings();
  const { messages, isLoading, submitQuery } = useChat(computeMode, aiPersona, initialSessionId);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [latestDoc, setLatestDoc] = React.useState<{ id: number; filename: string } | null>(null);
  const [showAudioBrief, setShowAudioBrief] = React.useState(false);

  useEffect(() => {
    apiClient<any[]>('/upload')
      .then((data) => {
        if (data && data.length > 0) {
          const completed = data.filter((f: any) => f.status === 'COMPLETED');
          if (completed.length > 0) {
            completed.sort((a, b) => new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime());
            setLatestDoc({ id: completed[0].id, filename: completed[0].filename });
          }
        }
      })
      .catch(e => console.error("Error loading files for audio brief:", e));
  }, []);

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
      border: "hover:border-blue-500/30 hover:bg-blue-500/5",
    },
    {
      title: "Audit System Activity",
      desc: "Query total counts and RAG performance stats",
      prompt: "Show system analytics summary and recent usage statistics.",
      icon: Activity,
      color: "text-pink-400 group-hover:text-pink-300",
      border: "hover:border-pink-500/30 hover:bg-pink-500/5",
    },
    {
      title: "Search Knowledge Base",
      desc: "Retrieve semantically relevant chunks",
      prompt: "Perform semantic query for 'enterprise terms' and explain sources.",
      icon: Sparkles,
      color: "text-purple-400 group-hover:text-purple-300",
      border: "hover:border-purple-500/30 hover:bg-purple-500/5",
    },
    {
      title: "Security & Filtering",
      desc: "Check strict content filter and guard status",
      prompt: "Is strict content filtering active? Explain safety policies.",
      icon: ShieldCheck,
      color: "text-emerald-400 group-hover:text-emerald-300",
      border: "hover:border-emerald-500/30 hover:bg-emerald-500/5",
    },
  ];

  const exportAsMarkdown = () => {
    let md = `# Vectrieve Chat Session Report\n`;
    md += `*Generated on: ${new Date().toLocaleString()}*\n`;
    md += `*Persona Mode: ${aiPersona.toUpperCase()}*\n`;
    md += `*Compute Mode: ${computeMode.toUpperCase()}*\n\n`;
    md += `---\n\n`;
    
    messages.forEach((msg) => {
      if (msg.id === "welcome") return;
      const roleName = msg.role === "user" ? "USER" : "VECTRIEVE CORE AI";
      md += `### 👤 ${roleName}\n`;
      md += `${msg.content}\n\n`;
      if (msg.sources && msg.sources.length > 0) {
        md += `**Sources Cited:**\n`;
        msg.sources.forEach((src) => {
          md += `- *[Score: ${src.score.toFixed(2)}] ${src.filename}*: "${src.content.trim()}"\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    });
    
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Vectrieve_Report_${new Date().getTime()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAsPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    let html = `
      <html>
        <head>
          <title>Vectrieve Intelligence Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            h1 { font-size: 28px; color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 5px; }
            .meta { font-size: 12px; color: #6b7280; margin-bottom: 30px; }
            .message { margin-bottom: 25px; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; }
            .user { background-color: #f3f4f6; border-left: 4px solid #4f46e5; }
            .assistant { background-color: #ffffff; border-left: 4px solid #10b981; }
            .role { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #4b5563; margin-bottom: 10px; }
            .content { font-size: 14px; white-space: pre-wrap; }
            .citations { margin-top: 15px; border-top: 1px dashed #d1d5db; padding-top: 10px; }
            .citation-title { font-weight: bold; font-size: 11px; color: #4f46e5; margin-bottom: 5px; }
            .citation-item { font-size: 11px; color: #4b5563; margin-bottom: 8px; background: #f9fafb; padding: 8px; border-radius: 6px; }
            @media print {
              body { padding: 0; }
              .message { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Vectrieve Intelligence Report</h1>
          <div class="meta">
            Generated: ${new Date().toLocaleString()} | Persona: ${aiPersona.toUpperCase()} | Compute: ${computeMode.toUpperCase()}
          </div>
    `;
    
    messages.forEach((msg) => {
      if (msg.id === "welcome") return;
      const roleName = msg.role === "user" ? "User Query" : "Vectrieve Intelligence Response";
      const roleClass = msg.role === "user" ? "user" : "assistant";
      
      html += `
        <div class="message ${roleClass}">
          <div class="role">${roleName}</div>
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
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 relative overflow-hidden">
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Premium Frosted Floating Header */}
      <div className="shrink-0 h-14 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 relative z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Vectrieve Core Node
            </span>
          </div>

          <div className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
            computeMode === "local" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]" 
              : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.1)]"
          }`}>
            <ShieldCheck className="w-3 h-3" />
            {computeMode === "local" ? "GDPR Air-Gap Shield Active" : "Secure Encrypted Cloud Tunnel"}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {latestDoc && (
            <button 
              onClick={() => setShowAudioBrief(true)}
              className="px-3 py-1.5 text-[10px] font-semibold bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.05)]"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400 group-hover:text-white" />
              Audio Briefing
            </button>
          )}

          {!showWelcomeHero && (
            <>
              <button 
                onClick={exportAsMarkdown}
                className="px-3 py-1.5 text-[10px] font-semibold bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export MD
              </button>
              <button 
                onClick={exportAsPDF}
                className="px-3 py-1.5 text-[10px] font-semibold bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* CENTRALIZED MESSAGE FEED */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar relative z-10">
        <div className="flex flex-col items-center w-full min-h-full">
          <div className="w-full max-w-3xl flex flex-col gap-6 pb-6 flex-1 justify-center">
            {showWelcomeHero ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center justify-center text-center my-auto py-8"
              >
                {/* Glowing Brain Core Badge */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-md animate-pulse" />
                  <div className="relative flex h-14 w-14 rounded-2xl items-center justify-center bg-zinc-900 border border-zinc-800 shadow-xl text-indigo-400">
                    <BrainCircuit className="w-7 h-7 animate-pulse" />
                  </div>
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
                      key={idx}
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
                    className="mt-6 flex flex-col gap-3 w-full pl-0 sm:pl-12"
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

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* ADAPTIVE INPUT MECHANISM */}
      <ChatInput isLoading={isLoading} onSubmit={submitQuery} />

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
      {showAudioBrief && latestDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 shadow-2xl relative bg-zinc-900">
            <AudioBrief 
              documentId={latestDoc.id} 
              filename={latestDoc.filename} 
              onClose={() => setShowAudioBrief(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}