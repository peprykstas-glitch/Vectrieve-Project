"use client";

import React, { useState, useEffect } from "react";
import { X, Settings, Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Space } from "@/components/global-settings";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
  const { t } = useLanguage();
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

      setSuccessMsg(t.common.saved);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 600);
    } catch (err: any) {
      console.error("Failed to update space", err);
      setErrorMsg(err.message || "Failed to update space settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl sm:max-w-3xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                {t.nav.spaceSettings}
              </h3>
              <p className="text-xs text-muted-foreground">
                {space.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Space Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/80">
              {t.spaces.createTitle}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.spaces.namePlaceholder}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>

          {/* System Instructions / Prompt */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                {t.spaces.promptTitle}
              </label>
              <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                {systemPrompt.length} chars
              </span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t.spaces.promptPlaceholder}
              rows={10}
              className="w-full min-h-[220px] bg-background border border-border rounded-xl p-4 text-xs text-foreground/90 focus:outline-none focus:border-primary leading-relaxed custom-scrollbar resize-y font-mono"
            />
            <p className="text-[11px] text-muted-foreground leading-normal">
              {t.spaces.promptTip}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-4 py-2 text-xs font-semibold bg-primary hover:opacity-90 text-primary-foreground rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border-0 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.common.saving}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.common.save}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
