"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Space } from "@/components/global-settings";

interface SpaceSettingsModalProps {
  space: Space | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SpaceSettingsModal({
  space,
  isOpen,
  onClose,
  onSaved,
}: SpaceSettingsModalProps) {
  const [name, setName] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (space && isOpen) {
      setName(space.name || "");
      setSystemPrompt(space.system_prompt || "");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [space, isOpen]);

  if (!isOpen || !space) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Space name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiClient(`/spaces/${space.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          system_prompt: systemPrompt.trim() || undefined,
        }),
      });

      setSuccessMsg("Space settings updated successfully!");
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Failed to update space", err);
      setErrorMsg(err.message || "Failed to update space settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5 bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Workspace Settings
                </h3>
                <p className="text-xs text-zinc-400">
                  Configure instructions, persona and behavior for this space
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-xs text-emerald-400">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Space Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Workspace Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Student Support & Operations"
                className="w-full bg-zinc-900/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            {/* System Instructions / Prompt */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Custom System Instructions / AI Persona
                </label>
                <span className="text-[10px] text-zinc-500">
                  Applied to all queries in this space
                </span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Define how the AI should reason, analyze policies, and draft replies for students or employees..."
                rows={7}
                className="w-full bg-zinc-900/70 border border-white/10 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 leading-relaxed custom-scrollbar resize-none font-mono"
              />
              <p className="text-[11px] text-zinc-500 leading-normal">
                💡 Tip: You can instruct the AI to provide a 2-tier briefing (Coordinator summary in English + Ready-to-copy student reply in WhatsApp format).
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-950/50 transition-all flex items-center gap-1.5 cursor-pointer border-0 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
