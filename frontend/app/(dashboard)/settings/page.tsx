"use client";

import React, { useState, useEffect } from "react";
import {
  Settings, Key, Cloud, Eye, EyeOff,
  Database, Check, Globe, Type, ExternalLink, Zap, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SupportedLanguage, FontSizeOption } from "@/lib/i18n/translations";

interface SettingsData {
  groq_api_key: string;
  trial_queries_used: number;
  trial_remaining: number;
  trial_limit: number;
  qdrant_url: string;
  qdrant_api_key: string;
}

export default function SettingsPage() {
  const { language, setLanguage, fontSize, setFontSize, t } = useLanguage();
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showQdrantKey, setShowQdrantKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Settings States
  const [groqApiKey, setGroqApiKey] = useState("");
  const [qdrantUrl, setQdrantUrl] = useState("");
  const [qdrantApiKey, setQdrantApiKey] = useState("");

  // Trial info
  const [trialUsed, setTrialUsed] = useState(0);
  const [trialLimit, setTrialLimit] = useState(20);
  const [trialRemaining, setTrialRemaining] = useState(20);

  useEffect(() => {
    apiClient<SettingsData>("/settings")
      .then((data) => {
        setGroqApiKey(data.groq_api_key || "");
        setQdrantUrl(data.qdrant_url || "");
        setQdrantApiKey(data.qdrant_api_key || "");
        setTrialUsed(data.trial_queries_used ?? 0);
        setTrialRemaining(data.trial_remaining ?? 20);
        setTrialLimit(data.trial_limit ?? 20);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await apiClient("/settings", {
        method: "POST",
        body: JSON.stringify({
          groq_api_key: groqApiKey,
          qdrant_url: qdrantUrl,
          qdrant_api_key: qdrantApiKey,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save settings to backend:", err);
      alert("Failed to save settings to server.");
    } finally {
      setIsSaving(false);
    }
  };

  const trialPct = Math.min((trialUsed / trialLimit) * 100, 100);
  const hasOwnKey = groqApiKey.trim().length > 0;

  const languagesList: { code: SupportedLanguage; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "EN" },
    { code: "uk", label: "Українська", flag: "UA" },
    { code: "pl", label: "Polski", flag: "PL" },
    { code: "es", label: "Español", flag: "ES" },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans pt-16 px-8 pb-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-10">

        {/* Page Header */}
        <div className="flex items-start justify-between border-b border-zinc-900 pb-6 w-full">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
              <Settings className="w-6 h-6 text-zinc-400" />
              {t.settings.title}
            </h1>
            <p className="text-zinc-500 text-sm">
              {t.settings.subtitle}
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Save all system settings"
            className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 border border-indigo-500/50 transition-all w-32 cursor-pointer"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 mr-2 text-emerald-300" />
                {t.common.saved}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t.common.save}
              </>
            )}
          </Button>
        </div>

        {/* Cloud-only banner */}
        <div className="flex items-start gap-3 px-4 py-3.5 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl">
          <Zap className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] font-semibold text-indigo-300">{t.settings.cloudBannerTitle}</p>
            <p className="text-[11px] text-indigo-400/70 mt-0.5 leading-relaxed">
              {t.settings.cloudBannerDesc}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Cloud AI Engine */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Cloud className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">{t.settings.aiEngine}</h3>
            </div>
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-xl">

              {/* Personal Key Connected Banner vs Trial Quota */}
              {hasOwnKey ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t.settings.personalKeyActive}</span>
                  </div>
                  <p className="text-[11px] text-emerald-400/80 leading-relaxed pl-6">
                    {t.settings.personalKeyActiveDesc}
                  </p>
                  <p className="text-[10px] text-zinc-500 pl-6 pt-0.5 border-t border-emerald-500/20 mt-2">
                    {t.settings.groqTierInfo}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300">{t.settings.trialQuota}</span>
                    <span className="font-mono font-bold text-indigo-200">
                      {trialRemaining} / {trialLimit} {t.settings.trialRemaining}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        trialRemaining === 0 ? "bg-red-500" : trialPct > 70 ? "bg-amber-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${trialPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Personal Groq API Key Input */}
              <div>
                <label htmlFor="groq-api-key" className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  {t.settings.groqApiKey}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="groq-api-key"
                    aria-label="Groq API Key"
                    type={showGroqKey ? "text" : "password"}
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder={t.settings.groqPlaceholder}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-10 text-sm text-zinc-300 focus:border-indigo-500/50 focus:outline-none transition-colors font-mono placeholder:text-zinc-700"
                  />
                  <button
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    aria-label={showGroqKey ? "Hide key" : "Show key"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <p className="text-[10px] text-zinc-600">
                    {hasOwnKey ? "✓ Direct key active — unrestricted requests." : "Using shared trial quota."}
                  </p>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    Get API key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Quick instructions */}
              <div className="border-t border-zinc-800/50 pt-4 space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t.settings.setupGuideTitle}</p>
                {[
                  t.settings.step1,
                  t.settings.step2,
                  t.settings.step3,
                  t.settings.step4,
                ].map((step, i) => (
                  <p key={i} className="text-[10px] text-zinc-600">{step}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Preferences & Vector DB */}
          <div className="flex flex-col space-y-6">

            {/* Interface Preferences (Language & Typography Scale) */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">{t.settings.preferences}</h3>
              </div>
              <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-5 shadow-xl">
                
                {/* Language Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">{t.settings.language}</h4>
                      <p className="text-[10px] text-zinc-500">{t.settings.languageDesc}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {languagesList.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setLanguage(item.code)}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          language === item.code
                            ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 shadow-sm"
                            : "bg-zinc-950 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                        }`}
                      >
                        <span className="font-mono text-[10px] font-bold text-zinc-500">{item.flag}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px w-full bg-zinc-800/80" />

                {/* Typography Scale */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-zinc-400" />
                        {t.settings.fontSize}
                      </h4>
                      <p className="text-[10px] text-zinc-500">{t.settings.fontSizeDesc}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { key: "compact" as FontSizeOption, label: t.settings.fontCompact },
                      { key: "default" as FontSizeOption, label: t.settings.fontDefault },
                      { key: "large" as FontSizeOption, label: t.settings.fontLarge },
                    ].map((sz) => (
                      <button
                        key={sz.key}
                        type="button"
                        onClick={() => setFontSize(sz.key)}
                        className={`py-2 px-2 text-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          fontSize === sz.key
                            ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 shadow-sm"
                            : "bg-zinc-950 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Vector Database */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Database className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">{t.settings.vectorDb}</h3>
              </div>
              <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-xl">
                
                {/* Built-in Status Indicator */}
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-300">{t.settings.builtInVector}</p>
                      <p className="text-[11px] text-emerald-400/80 mt-0.5">
                        Qdrant Core (768-dim FastEmbed ONNX) • Active & Indexed
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {t.settings.vectorOnline}
                  </span>
                </div>

                <div className="border-t border-zinc-800/80 pt-3 space-y-3">
                  <p className="text-[11px] font-medium text-zinc-400">
                    External Cloud Cluster <span className="text-zinc-600">(Optional Override)</span>
                  </p>
                  <div>
                    <label htmlFor="qdrant-url" className="text-xs font-medium text-zinc-500 mb-1.5 block">
                      {t.settings.qdrantUrl}
                    </label>
                    <input
                      id="qdrant-url"
                      aria-label="Qdrant Cloud URL"
                      type="text"
                      value={qdrantUrl}
                      onChange={(e) => setQdrantUrl(e.target.value)}
                      placeholder="https://…qdrant.io"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors font-mono placeholder:text-zinc-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="qdrant-api-key" className="text-xs font-medium text-zinc-500 mb-1.5 block">
                      {t.settings.qdrantApiKey}
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="qdrant-api-key"
                        aria-label="Qdrant API Key"
                        type={showQdrantKey ? "text" : "password"}
                        value={qdrantApiKey}
                        onChange={(e) => setQdrantApiKey(e.target.value)}
                        placeholder="qd_sk_…"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-10 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors font-mono placeholder:text-zinc-700"
                      />
                      <button
                        onClick={() => setShowQdrantKey(!showQdrantKey)}
                        aria-label={showQdrantKey ? "Hide Qdrant API Key" : "Show Qdrant API Key"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors border-0 bg-transparent cursor-pointer"
                      >
                        {showQdrantKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
