"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Bot } from "lucide-react";
import { useGlobalSettings } from "@/components/global-settings";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

interface ChatAreaProps {
  initialSessionId?: string | null;
}

export function ChatArea({ initialSessionId }: ChatAreaProps) {
  const { computeMode, aiPersona } = useGlobalSettings();
  const { messages, isLoading, submitQuery } = useChat(computeMode, aiPersona, initialSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Kinetic Polish: Smooth scrolling to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    // STRICT FLEX COLUMN: This entirely resolves the absolute positioning overlaps.
    <div className="flex flex-col h-full w-full bg-zinc-950 relative overflow-hidden">
      
      {/* CENTRALIZED MESSAGE FEED */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar">
        <div className="flex flex-col items-center w-full">
          <div className="w-full max-w-3xl flex flex-col gap-6 pb-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} />
              ))}
            </AnimatePresence>

            {/* Kinetic Polish: Loading State Micro-animation */}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex gap-4"
              >
                <div className="flex shrink-0 h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="px-5 py-3.5 flex items-center gap-2 text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Synthesizing response...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* ADAPTIVE INPUT MECHANISM */}
      <ChatInput isLoading={isLoading} onSubmit={submitQuery} />
    </div>
  );
}