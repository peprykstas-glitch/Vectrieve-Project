import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot, FileText, ChevronDown, BrainCircuit, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message, Source } from "@/hooks/useChat";

interface ChatMessageProps {
  msg: Message;
}

function CodeBlock({ node, inline, className, children, ...props }: any) {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const textContent = String(children).replace(/\n$/, '');
  const [copied, setCopied] = React.useState(false);

  if (inline) {
    return (
      <code className="text-indigo-300 bg-zinc-950/80 px-1.5 py-0.5 rounded-md font-mono text-xs" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isStudentReply = lang === 'student-reply' || lang === 'markdown' || lang === 'text' || lang === 'message';

  return (
    <div className="relative my-4 rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/90 shadow-xl group/code">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-white/5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500/80" />
          <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[10px]">
            {isStudentReply ? "Ready-to-Send Reply" : (lang || "Message Block")}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500 transition-all cursor-pointer shadow-sm"
          title="Copy message to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy Reply</span>
            </>
          )}
        </button>
      </div>

      {/* Code / Text content */}
      <div className="p-4 overflow-x-auto custom-scrollbar font-sans text-[13px] leading-relaxed text-zinc-200 whitespace-pre-wrap select-text">
        {textContent}
      </div>
    </div>
  );
}

function Citation({ src }: { src: Source }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-xl text-xs text-zinc-300 overflow-hidden transition-all duration-300 hover:border-zinc-800/80">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 text-left font-medium select-none flex items-center justify-between hover:bg-zinc-800/40 transition-colors border-0 bg-transparent cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-emerald-400"/> 
          <span className="truncate max-w-[200px] sm:max-w-xs">{src.filename}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-[10px] bg-zinc-950/80 border border-white/5 px-2 py-0.5 rounded-full font-semibold">
            Score: {src.score.toFixed(2)}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/5 bg-zinc-950/40"
          >
            <div className="p-3 font-mono text-[11px] leading-relaxed text-zinc-400 max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
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

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className={`flex gap-4 w-full ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
      >
      {/* Premium Avatars with Hover glows */}
      <div className={`relative flex shrink-0 h-9 w-9 rounded-xl items-center justify-center border shadow-lg transition-transform duration-300 hover:scale-105 ${
        msg.role === "user" 
          ? "bg-zinc-900 border-zinc-800 text-zinc-300" 
          : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
      }`}>
        {msg.role === "assistant" && msg.isStreaming && (
          <div className="absolute inset-0 rounded-xl bg-indigo-500/10 animate-ping pointer-events-none" />
        )}
        {msg.role === "user" ? <User size={16} /> : <Bot size={16} className={msg.isStreaming ? "animate-pulse" : ""} />}
      </div>

      {/* Message Bubbles */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
        msg.role === "user" ? "items-end" : "items-start"
      }`}>
        {/* Attached Files Previews */}
        {msg.attachedFiles && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {msg.attachedFiles.map((fileName, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg py-1.5 px-3 text-xs text-zinc-300 shadow-md">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate max-w-[150px] font-medium">{fileName}</span>
              </div>
            ))}
          </div>
        )}

        {/* The Text Bubble */}
        <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed tracking-wide shadow-xl transition-all duration-300 ${
          msg.role === "user" 
            ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm border border-indigo-500/10" 
            : "bg-zinc-900/60 text-zinc-200 rounded-tl-sm border border-white/5 backdrop-blur-md hover:border-zinc-800/80"
        }`}>
          {msg.role === "user" ? (
            <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
          ) : (
            <div className="prose prose-invert prose-zinc max-w-none text-zinc-300/95 leading-relaxed whitespace-pre-wrap prose-p:leading-relaxed prose-p:text-zinc-300/95 prose-p:mb-4 last:prose-p:mb-0 prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight prose-headings:mt-6 prose-headings:mb-3 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:text-zinc-300/95 prose-li:my-1.5 prose-code:text-indigo-300 prose-code:bg-zinc-950/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-950/50 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-2xl prose-pre:p-4 prose-th:text-white prose-th:font-semibold prose-th:border-b prose-th:border-zinc-800 prose-th:pb-2 prose-td:border-b prose-td:border-zinc-900 prose-td:py-2.5 prose-td:text-zinc-300 prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-400">
              {isThinking ? (
                /* Bouncing Dots Thinking State */
                <div className="flex gap-1.5 items-center justify-start py-2 px-1">
                  {[0, 1, 2].map((idx) => (
                    <motion.div
                      key={idx}
                      className="w-2 h-2 rounded-full bg-indigo-400/80 shadow-[0_0_8px_#818cf8]"
                      animate={{ y: ["0px", "-6px", "0px"] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: idx * 0.15,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {reasoning && (
                    <details className="mb-4 bg-zinc-950/40 border border-zinc-800/40 rounded-xl overflow-hidden group/think" open={msg.isStreaming}>
                      <summary className="px-4 py-2 text-[11px] font-bold text-zinc-500 hover:text-zinc-300 cursor-pointer select-none flex items-center gap-2 outline-none border-b border-transparent group-open/think:border-zinc-900/60 bg-zinc-950/20">
                        <BrainCircuit className="w-3.5 h-3.5 text-indigo-400 group-open/think:text-indigo-400 animate-pulse" />
                        <span>{msg.isStreaming && !rawContent.includes("</think>") ? "Thinking Process..." : "Thought Process"}</span>
                      </summary>
                      <div className="px-4 pb-3 pt-2.5 text-[13px] leading-relaxed text-zinc-400 font-mono italic whitespace-pre-wrap border-t border-zinc-900/30">
                        {reasoning}
                      </div>
                    </details>
                  )}
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: CodeBlock
                    }}
                  >
                    {markdownContent}
                  </ReactMarkdown>
                  {/* Glowing, fading cursor while typing */}
                  {msg.isStreaming && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                      className="inline-block w-1.5 h-4 bg-indigo-500 rounded-sm ml-1.5 align-middle shadow-[0_0_8px_#6366f1]"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* RAG Citations */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5 w-full pl-2 sm:pl-4">
            <div className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest flex items-center gap-3">
              <div className="h-px bg-indigo-500/10 flex-1" />
              Citations
              <div className="h-px bg-indigo-500/10 flex-1" />
            </div>
            {msg.sources.slice(0, showAllSources ? msg.sources.length : 3).map((src, idx) => (
              <Citation key={idx} src={src} />
            ))}
            {msg.sources.length > 3 && (
              <button
                onClick={() => setShowAllSources(!showAllSources)}
                className="mt-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/10 border border-indigo-500/20 hover:border-indigo-500/35 py-2 px-4 rounded-xl transition-all duration-200 cursor-pointer text-center bg-transparent focus:outline-none flex items-center justify-center gap-1.5 self-center"
              >
                {showAllSources ? "Show Less" : `Show ${msg.sources.length - 3} More Citations`}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = "ChatMessage";
