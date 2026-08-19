import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot, FileText, ChevronDown, BrainCircuit, Copy, Check, MessageSquare, Send, Play } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message, Source } from "@/hooks/useChat";

interface ChatMessageProps {
  msg: Message;
}

function CodeBlock({ node, inline, className, children, ...props }: any) {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1].toLowerCase() : "";
  const textContent = String(children).replace(/\n$/, "");
  const [copied, setCopied] = React.useState(false);

  if (inline) {
    return (
      <code className="text-indigo-300 bg-zinc-900 border border-white/5 px-1.5 py-0.5 rounded font-mono text-xs" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textContent);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textContent;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const isStudentReply = lang === "student-reply" || lang === "whatsapp" || lang === "reply";

  if (isStudentReply) {
    return (
      <div className="relative my-4 rounded-2xl overflow-hidden border border-emerald-500/30 bg-emerald-950/10 shadow-lg shadow-emerald-950/20 transition-all duration-200 hover:border-emerald-500/50">
        {/* WhatsApp Ready Reply Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-950/40 border-b border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
              <Send className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-emerald-300 text-xs tracking-wide">
              Ready-to-Send Reply (WhatsApp / Email)
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-zinc-950 border border-emerald-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Copy ready message for student"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Message</span>
              </>
            )}
          </button>
        </div>

        {/* Message body */}
        <div className="p-4 font-sans text-sm leading-relaxed text-emerald-100/95 whitespace-pre-wrap select-text">
          {textContent}
        </div>
      </div>
    );
  }

  // Standard code block
  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-white/10 bg-zinc-950/80 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900/60 border-b border-white/5 text-xs text-zinc-400">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          {lang || "Code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border-0 bg-transparent"
        >
          {copied ? (
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
      <div className="p-3.5 overflow-x-auto custom-scrollbar font-mono text-xs leading-relaxed text-zinc-200">
        {textContent}
      </div>
    </div>
  );
}

function Citation({ src }: { src: Source }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-xl text-xs text-zinc-300 overflow-hidden transition-all duration-200 hover:border-zinc-700/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 text-left font-medium select-none flex items-center justify-between hover:bg-zinc-800/30 transition-colors border-0 bg-transparent cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate">
          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> 
          <span className="truncate max-w-[220px] sm:max-w-sm text-zinc-300 text-xs">{src.filename}</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-zinc-500 text-[10px] bg-zinc-950 border border-white/5 px-2 py-0.5 rounded-full font-semibold">
            Score: {src.score.toFixed(2)}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/5 bg-zinc-950/60"
          >
            <div className="p-3 font-mono text-[11px] leading-relaxed text-zinc-400 max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
              {src.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ msg }, ref) => {
    const isThinking = msg.isStreaming && !msg.content;
    const [showAllSources, setShowAllSources] = React.useState(false);

    // DeepSeek reasoning block parser
    const rawContent = msg.content || "";
    let reasoning = "";
    let markdownContent = rawContent;

    const thinkStart = rawContent.indexOf("<think>");
    if (thinkStart !== -1) {
      const thinkEnd = rawContent.indexOf("</think>");
      if (thinkEnd !== -1) {
        reasoning = rawContent.substring(thinkStart + 7, thinkEnd).trim();
        markdownContent = rawContent.substring(0, thinkStart) + rawContent.substring(thinkEnd + 8);
      } else {
        reasoning = rawContent.substring(thinkStart + 7).trim();
        markdownContent = rawContent.substring(0, thinkStart);
      }
    }

    // Strip inline parenthetical document references like (Official_Communication_Templates_and_Triggers.md, Segment 1)
    markdownContent = markdownContent.replace(/\s*\([A-Za-z0-9_\-]+\.(?:md|pdf|json|csv|txt|docx|pptx|xlsx)[^)]*\)/gi, "");

    // Convert timestamps like [01:23] or [01:23:45] into interactive seeker links
    markdownContent = markdownContent.replace(/(?<=\s|^|[(])\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, "[$1](#seek-ts-$1)");

    // Clean up excessive multi-newline gaps from LLM streaming
    markdownContent = markdownContent.replace(/\n{3,}/g, "\n\n");

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
      >
        {/* Message Content Body */}
        <div className={`flex flex-col ${
          msg.role === "user" 
            ? "max-w-[85%] sm:max-w-[75%] items-end" 
            : "w-full min-w-0 items-start"
        }`}>
          {/* User Message: Clean bubble on the right */}
          {msg.role === "user" ? (
            <div className="bg-zinc-800/90 border border-zinc-700/50 text-zinc-100 rounded-2xl rounded-tr-md px-4 py-2.5 text-sm leading-relaxed shadow-md">
              <div className="whitespace-pre-wrap font-normal">{msg.content}</div>
            </div>
          ) : (
            /* Assistant Message: Clean, open, transparent page flow */
            <div className="w-full text-zinc-200 leading-relaxed">
              {isThinking ? (
                /* Bouncing Dots Thinking State */
                <div className="flex gap-2 items-center justify-start py-2.5 px-0.5">
                  {[0, 1, 2].map((idx) => (
                    <motion.div
                      key={idx}
                      className="w-2.5 h-2.5 rounded-full bg-zinc-400/80 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                      animate={{ y: ["0px", "-6px", "0px"], opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 0.75,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: idx * 0.18,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {reasoning && (
                    <details className="mb-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden group/think" open={msg.isStreaming}>
                      <summary className="px-3.5 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer select-none flex items-center gap-2 outline-none bg-zinc-900/20">
                        <BrainCircuit className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                        <span>{msg.isStreaming && !rawContent.includes("</think>") ? "Thinking..." : "Thought Process"}</span>
                      </summary>
                      <div className="px-3.5 pb-3 pt-2 text-xs leading-relaxed text-zinc-400 font-mono italic whitespace-pre-wrap border-t border-zinc-800/30">
                        {reasoning}
                      </div>
                    </details>
                  )}

                  {/* Chat Prose — powered by globals.css .chat-prose */}
                  <div className="chat-prose max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: CodeBlock,
                        a: ({ href, children, ...props }: any) => {
                          if (href && href.startsWith("#seek-ts-")) {
                            const ts = href.replace("#seek-ts-", "");
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  const parts = ts.split(":").map(Number);
                                  const secs = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
                                  window.dispatchEvent(new CustomEvent("seek-audio-timestamp", { detail: { seconds: secs, timestamp: ts } }));
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-100 border border-indigo-500/30 transition-all cursor-pointer shadow-sm active:scale-95 not-prose align-middle"
                                title={`Click to seek audio to ${ts}`}
                              >
                                <Play className="w-2.5 h-2.5 fill-indigo-400 text-indigo-400" />
                                <span>{ts}</span>
                              </button>
                            );
                          }
                          return (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline" {...props}>
                              {children}
                            </a>
                          );
                        }
                      }}
                    >
                      {markdownContent}
                    </ReactMarkdown>
                  </div>

                  {/* Glowing cursor while streaming */}
                  {msg.isStreaming && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                      className="inline-block w-1.5 h-4 bg-indigo-500 rounded-sm ml-1 align-middle shadow-[0_0_8px_#6366f1]"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* RAG Citations (Subtle chips at the bottom) */}
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-3.5 flex flex-col gap-2 w-full pt-2 border-t border-white/5">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
                <span>Verified Sources ({msg.sources.length})</span>
                {msg.sources.length > 2 && (
                  <button 
                    onClick={() => setShowAllSources(!showAllSources)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    {showAllSources ? "Show less" : `+${msg.sources.length - 2} more`}
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {msg.sources.slice(0, showAllSources ? msg.sources.length : 2).map((src, idx) => (
                  <Citation key={idx} src={src} />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";
