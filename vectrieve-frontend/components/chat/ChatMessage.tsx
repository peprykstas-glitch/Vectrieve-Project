import React from "react";
import { motion } from "framer-motion";
import { User, Bot, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/hooks/useChat";

interface ChatMessageProps {
  msg: Message;
}

export function ChatMessage({ msg }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatars */}
      <div className={`flex shrink-0 h-8 w-8 rounded-full items-center justify-center ${
        msg.role === "user" ? "bg-zinc-800" : "bg-indigo-500/20 text-indigo-400"
      }`}>
        {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Message Bubbles */}
      <div className={`flex flex-col max-w-[85%] ${
        msg.role === "user" ? "items-end" : "items-start"
      }`}>
        {msg.attachedFiles && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {msg.attachedFiles.map((fileName, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-md py-1 px-2 text-xs text-zinc-300">
                <FileText className="w-3 h-3 text-indigo-400" />
                <span className="truncate max-w-[200px]">{fileName}</span>
              </div>
            ))}
          </div>
        )}
        <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed tracking-wide shadow-sm ${
          msg.role === "user" 
           ? "bg-zinc-800 text-zinc-100 rounded-tr-sm" 
            : "bg-transparent text-zinc-300"
        }`}>
          {msg.role === "user" ? (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          ) : (
            <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 w-full pl-5">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <div className="h-px bg-indigo-500/20 flex-1" />
              Citations
              <div className="h-px bg-indigo-500/20 flex-1" />
            </div>
            {msg.sources.map((src, idx) => (
              <details key={idx} className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-xs text-zinc-300 group">
                <summary className="p-2.5 cursor-pointer font-medium select-none flex items-center justify-between hover:bg-zinc-800/80 transition-colors rounded-lg list-none">
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-400"/> 
                    {src.filename}
                  </span>
                  <span className="text-zinc-500 text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded">Score: {src.score.toFixed(2)}</span>
                </summary>
                <div className="p-3 border-t border-zinc-700/50 bg-zinc-900/80 rounded-b-lg font-mono text-[11px] leading-relaxed text-zinc-400 max-h-48 overflow-y-auto custom-scrollbar">
                  {src.content}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
