"use client";

import React, { useState, useEffect } from "react";
import {
  Settings, Save, ShieldCheck, Key, Cloud, Eye, EyeOff,
  Database, Check, Info, ExternalLink, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api/client";

interface SettingsData {
  groq_api_key: string;
  trial_queries_used: number;
  trial_remaining: number;
  trial_limit: number;
  qdrant_url: string;
  qdrant_api_key: string;
}

export default function SettingsPage() {
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showQdrantKey, setShowQdrantKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Settings States
  const [groqApiKey, setGroqApiKey] = useState("");
  const [qdrantUrl, setQdrantUrl] = useState("");
  const [qdrantApiKey, setQdrantApiKey] = useState("");
  const [strictContentFiltering, setStrictContentFiltering] = useState(true);
  const [sessionLogs, setSessionLogs] = useState(true);

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

    const savedFiltering = localStorage.getItem("settings_strict_filtering");
    if (savedFiltering !== null) setStrictContentFiltering(savedFiltering === "true");
    const savedLogs = localStorage.getItem("settings_session_logs");
    if (savedLogs !== null) setSessionLogs(savedLogs === "true");
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    localStorage.setItem("settings_strict_filtering", strictContentFiltering.toString());
    localStorage.setItem("settings_session_logs", sessionLogs.toString());

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
  const hasOwnKey = groqApiKey.length > 0;

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans pt-16 px-8 pb-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-10">

        {/* Page Header */}
        <div className="flex items-start justify-between border-b border-zinc-900 pb-6 w-full">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
              <Settings className="w-6 h-6 text-zinc-400" />
              System Settings
            </h1>
            <p className="text-zinc-500 text-sm">
              Configure your AI engine keys and system preferences.
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
                Saved!
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save All
              </>
            )}
          </Button>
        </div>

        {/* ── Cloud-only banner ── */}
        <div className="flex items-start gap-3 px-4 py-3.5 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl">
          <Zap className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] font-semibold text-indigo-300">Cloud Enterprise Mode</p>
            <p className="text-[11px] text-indigo-400/70 mt-0.5 leading-relaxed">
              This server runs exclusively on Groq Cloud. Local model execution is disabled.
              All AI responses are lightning-fast (~100ms) with zero CPU load on the server.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── Cloud AI Engine ── */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Cloud className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">Cloud AI Engine</h3>
            </div>
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-5 shadow-xl">

              {/* Trial usage bar (shown only when no own key) */}
              {!hasOwnKey && (
                <div className="space-y-2 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Free Trial Usage</span>
                    <span className={`font-bold ${trialRemaining <= 3 ? "text-red-400" : "text-zinc-200"}`}>
                      {trialUsed} / {trialLimit} queries used
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        trialPct >= 100 ? "bg-red-500" :
                        trialPct >= 75  ? "bg-amber-500" :
                                          "bg-indigo-500"
                      }`}
                      style={{ width: `${trialPct}%` }}
                    />
                  </div>
                  {trialRemaining <= 5 && trialRemaining > 0 && (
                    <p className="text-[10px] text-amber-400 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Only {trialRemaining} trial queries left. Add your own Groq key below.
                    </p>
                  )}
                  {trialRemaining === 0 && (
                    <p className="text-[10px] text-red-400 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Trial exhausted. Add your own key to continue.
                    </p>
                  )}
                </div>
              )}

              {/* Groq API Key */}
              <div>
                <label htmlFor="groq-api-key" className="text-xs font-medium text-zinc-500 mb-1.5 block">
                  Your Groq API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="groq-api-key"
                    aria-label="Groq API Key"
                    type={showGroqKey ? "text" : "password"}
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder="gsk_…"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-10 text-sm text-zinc-300 focus:border-blue-500/50 focus:outline-none transition-colors font-mono placeholder:text-zinc-700"
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
                    {hasOwnKey ? "✓ Using your own key — unlimited queries." : "Using shared trial key."}
                  </p>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    Get free key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Quick instructions */}
              <div className="border-t border-zinc-800/50 pt-4 space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">How to get your key (30 sec)</p>
                {[
                  "1. Open console.groq.com",
                  "2. Sign up for free (no card required)",
                  "3. Go to API Keys → Create API Key",
                  '4. Paste your key above and click "Save All"',
                ].map((step, i) => (
                  <p key={i} className="text-[10px] text-zinc-600">{step}</p>
                ))}
              </div>
            </div>
          </div>

            {/* ── Vector Database ── */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Database className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">Vector Database</h3>
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
                      <p className="text-xs font-semibold text-emerald-300">Built-in Vector Engine Connected</p>
                      <p className="text-[11px] text-emerald-400/80 mt-0.5">
                        Qdrant Core (768-dim FastEmbed ONNX) • Active & Indexed
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Online
                  </span>
                </div>

                <div className="border-t border-zinc-800/80 pt-3 space-y-3">
                  <p className="text-[11px] font-medium text-zinc-400">
                    External Cloud Cluster <span className="text-zinc-600">(Optional Override)</span>
                  </p>
                  <div>
                    <label htmlFor="qdrant-url" className="text-xs font-medium text-zinc-500 mb-1.5 block">Qdrant Cloud URL</label>
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
                    <label htmlFor="qdrant-api-key" className="text-xs font-medium text-zinc-500 mb-1.5 block">Qdrant API Key</label>
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
                  <p className="text-[10px] text-zinc-500">
                    No action required. Leave empty to automatically route all embeddings through the server&apos;s high-performance built-in vector instance.
                  </p>
                </div>
              </div>

            {/* ── Security ── */}
            <div className="flex items-center gap-2 px-1 mt-2">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">Security</h3>
            </div>
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-2 shadow-xl">
              <div className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium text-zinc-200">Strict Content Filtering</h4>
                  <p className="text-[10px] text-zinc-500">Block sensitive PII extraction in queries.</p>
                </div>
                <Switch
                  aria-label="Toggle Strict Content Filtering"
                  checked={strictContentFiltering}
                  onCheckedChange={setStrictContentFiltering}
                  className="data-[state=checked]:bg-zinc-500 h-5 w-9"
                />
              </div>
              <div className="h-px w-full bg-zinc-800 my-1" />
              <div className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium text-zinc-200">Session Logs</h4>
                  <p className="text-[10px] text-zinc-500">Keep interaction history on Postgres.</p>
                </div>
                <Switch
                  aria-label="Toggle Session Logs"
                  checked={sessionLogs}
                  onCheckedChange={setSessionLogs}
                  className="data-[state=checked]:bg-zinc-500 h-5 w-9"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
