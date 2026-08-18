"use client";

import React, { useState } from "react";
import { Lightbulb, Bug, Send, CheckCircle2, Loader2, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t } = useLanguage();
  const [feedbackType, setFeedbackType] = useState<"IDEA" | "BUG">("IDEA");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await apiClient("/analytics/feedback", {
        method: "POST",
        body: JSON.stringify({
          type: feedbackType,
          message: message.trim(),
        }),
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setMessage("");
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Failed to submit feedback:", err);
      setErrorMessage(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5"
        role="dialog" 
        aria-modal="true"
      >
        {/* Header with Close */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              {t.feedback.modalTitle}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t.feedback.modalSubtitle}
            </p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-200">
              {t.feedback.successToast}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <button
                type="button"
                onClick={() => setFeedbackType("IDEA")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  feedbackType === "IDEA"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>{t.feedback.tabIdea}</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType("BUG")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  feedbackType === "BUG"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Bug className="w-4 h-4 text-red-400" />
                <span>{t.feedback.tabBug}</span>
              </button>
            </div>

            {/* Input Area */}
            <div className="space-y-1.5">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={feedbackType === "IDEA" ? t.feedback.ideaPlaceholder : t.feedback.bugPlaceholder}
                rows={4}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none font-sans"
              />
            </div>

            {/* Value Proposition Note (Marketing Touch) */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/60 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {t.feedback.valueNotice}
              </p>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-400">{errorMessage}</p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-5 cursor-pointer shadow-lg shadow-indigo-900/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    {t.feedback.submitting}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {t.feedback.submit}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
