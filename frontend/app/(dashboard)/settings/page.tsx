"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, Server, ShieldCheck, Key, Cloud, Eye, EyeOff, Database, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { apiClient } from "@/lib/api/client";

export default function SettingsPage() {
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showQdrantKey, setShowQdrantKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Settings States
  const [selectedLocalModel, setSelectedLocalModel] = useState("qwen2.5-coder:7b");
  const [groqApiKey, setGroqApiKey] = useState("gsk_l7****************");
  const [qdrantUrl, setQdrantUrl] = useState("https://cluster.qdrant.tech");
  const [qdrantApiKey, setQdrantApiKey] = useState("qd_sk_**************");
  const [ollamaUrl, setOllamaUrl] = useState("http://127.0.0.1:11434");
  const [embeddingFallback, setEmbeddingFallback] = useState(true);
  const [strictContentFiltering, setStrictContentFiltering] = useState(true);
  const [sessionLogs, setSessionLogs] = useState(true);

  // Model Manager States
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullStatus, setPullStatus] = useState("");

  const fetchLocalModels = async () => {
    try {
      const res = await fetch("/api/proxy/models/local");
      if (res.ok) {
        const data = await res.json();
        setLocalModels(data.models || []);
      }
    } catch (e) {
      console.error("Failed to load local models:", e);
    }
  };

  useEffect(() => {
    // Load config from backend first
    apiClient<any>("/settings")
      .then((data) => {
        if (data.selected_local_model) setSelectedLocalModel(data.selected_local_model);
        if (data.groq_api_key) setGroqApiKey(data.groq_api_key);
        if (data.qdrant_url) setQdrantUrl(data.qdrant_url);
        if (data.qdrant_api_key) setQdrantApiKey(data.qdrant_api_key);
        if (data.ollama_url) setOllamaUrl(data.ollama_url);
      })
      .catch((err) => {
        console.error("Failed to load settings from backend, falling back to localStorage:", err);
        const savedLocalModel = localStorage.getItem("selected_local_model");
        if (savedLocalModel) setSelectedLocalModel(savedLocalModel);

        const savedGroq = localStorage.getItem("settings_groq_api_key");
        if (savedGroq) setGroqApiKey(savedGroq);

        const savedQdrantUrl = localStorage.getItem("settings_qdrant_url");
        if (savedQdrantUrl) setQdrantUrl(savedQdrantUrl);

        const savedQdrantKey = localStorage.getItem("settings_qdrant_api_key");
        if (savedQdrantKey) setQdrantApiKey(savedQdrantKey);

        const savedOllamaUrl = localStorage.getItem("settings_ollama_url");
        if (savedOllamaUrl) setOllamaUrl(savedOllamaUrl);
      });

    const savedFallback = localStorage.getItem("settings_embedding_fallback");
    if (savedFallback !== null) setEmbeddingFallback(savedFallback === "true");

    const savedFiltering = localStorage.getItem("settings_strict_filtering");
    if (savedFiltering !== null) setStrictContentFiltering(savedFiltering === "true");

    const savedLogs = localStorage.getItem("settings_session_logs");
    if (savedLogs !== null) setSessionLogs(savedLogs === "true");

    fetchLocalModels();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save to local storage for frontend-only switches and backup
    localStorage.setItem("selected_local_model", selectedLocalModel);
    localStorage.setItem("settings_groq_api_key", groqApiKey);
    localStorage.setItem("settings_qdrant_url", qdrantUrl);
    localStorage.setItem("settings_qdrant_api_key", qdrantApiKey);
    localStorage.setItem("settings_ollama_url", ollamaUrl);
    localStorage.setItem("settings_embedding_fallback", embeddingFallback.toString());
    localStorage.setItem("settings_strict_filtering", strictContentFiltering.toString());
    localStorage.setItem("settings_session_logs", sessionLogs.toString());
    
    try {
      // Save to backend configuration
      await apiClient("/settings", {
        method: "POST",
        body: JSON.stringify({
          selected_local_model: selectedLocalModel,
          groq_api_key: groqApiKey,
          qdrant_url: qdrantUrl,
          qdrant_api_key: qdrantApiKey,
          ollama_url: ollamaUrl,
        }),
      });
    } catch (err) {
      console.error("Failed to save settings to backend:", err);
      alert("Failed to save settings to server. Stored locally in browser instead.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePullModel = () => {
    setIsPulling(true);
    setPullProgress(0);
    setPullStatus("Connecting to Ollama...");

    const eventSource = new EventSource(
      `/api/proxy/models/pull-stream?model=${selectedLocalModel}`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "success" || data.status === "done") {
          setPullProgress(100);
          setPullStatus("Pull completed!");
          eventSource.close();
          fetchLocalModels();
          setTimeout(() => setIsPulling(false), 1500);
        } else if (data.status === "error") {
          setPullStatus(`Error: ${data.message}`);
          eventSource.close();
          setTimeout(() => setIsPulling(false), 4000);
        } else {
          setPullStatus(data.status || "Pulling model layers...");
          setPullProgress(data.percentage || 0);
        }
      } catch (err) {
        console.error("Error parsing model pull stream:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error pulling model:", err);
      setPullStatus("Error establishing model connection.");
      eventSource.close();
      setTimeout(() => setIsPulling(false), 3000);
    };
  };

  const isInstalled = localModels.some(
    (m) => m.startsWith(selectedLocalModel) || selectedLocalModel.startsWith(m)
  );

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-10">
        
        {/* Page Header */}
        <div className="flex items-start justify-between border-b border-zinc-900 pb-6 w-full">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
              <Settings className="w-6 h-6 text-zinc-400" />
              System Settings
            </h1>
            <p className="text-zinc-500 text-sm">
              Configure AI engines, vector databases, and system preferences.
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
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save All
              </>
            )}
          </Button>
        </div>

        {/* Configurations grid - Flattened for valid CSS subgrid/masonry consistency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Node Engine Config */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex items-center gap-2 px-1">
              <Cloud className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">Cloud AI Engine</h3>
            </div>
            <div className="flex-1 bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-xl">
              <div>
                <label htmlFor="groq-api-key" className="text-xs font-medium text-zinc-500 mb-1.5 block">Groq API Key</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    id="groq-api-key"
                    aria-label="Groq API Key"
                    type={showGroqKey ? "text" : "password"} 
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-10 text-sm text-zinc-300 focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
                  />
                  <button 
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    aria-label={showGroqKey ? "Hide Groq API Key" : "Show Groq API Key"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">Required for the Cloud LPU mode.</p>
              </div>
            </div>
          </div>

          {/* Database Config */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex items-center gap-2 px-1">
              <Database className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">Vector Database</h3>
            </div>
            <div className="flex-1 bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-xl">
              <div>
                <label htmlFor="qdrant-url" className="text-xs font-medium text-zinc-500 mb-1.5 block">Qdrant Cloud URL</label>
                <input 
                  id="qdrant-url"
                  aria-label="Qdrant Cloud URL"
                  type="text" 
                  value={qdrantUrl}
                  onChange={(e) => setQdrantUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors font-mono"
                />
              </div>
              <div className="mt-4">
                <label htmlFor="qdrant-api-key" className="text-xs font-medium text-zinc-500 mb-1.5 block">Qdrant API Key</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    id="qdrant-api-key"
                    aria-label="Qdrant API Key"
                    type={showQdrantKey ? "text" : "password"} 
                    value={qdrantApiKey}
                    onChange={(e) => setQdrantApiKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-10 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors font-mono"
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

          {/* Local Engine Config */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex items-center gap-2 px-1">
              <Server className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">Local AI Engine</h3>
            </div>
            <div className="flex-1 bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-xl flex flex-col">
              <div className="mb-auto space-y-4">
                <div>
                  <label htmlFor="ollama-url" className="text-xs font-medium text-zinc-500 mb-1.5 block">Ollama Endpoint URL</label>
                  <input 
                    id="ollama-url"
                    aria-label="Ollama Endpoint URL"
                    type="text" 
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none transition-colors font-mono"
                  />
                  <p className="text-[10px] text-zinc-600 mt-2">Make sure the local Ollama daemon is running.</p>
                </div>
                <div>
                  <label htmlFor="local-model-select" className="text-xs font-medium text-zinc-500 mb-1.5 block">Ollama Model</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={selectedLocalModel} onValueChange={setSelectedLocalModel} disabled={isPulling}>
                        <SelectTrigger id="local-model-select" className="w-full bg-zinc-950 border border-zinc-800 text-sm rounded-lg text-zinc-300 focus:border-emerald-500/50 focus:outline-none transition-colors">
                          <SelectValue placeholder="Select Local Model" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300 rounded-xl shadow-2xl">
                          <SelectItem value="llama3.2:1b" className="focus:bg-zinc-800 text-zinc-200 cursor-pointer">
                            <div className="flex flex-col py-0.5">
                              <span className="font-semibold text-xs text-white">Llama 3.2 (1B) — Lightweight</span>
                              <span className="text-[10px] text-zinc-500 mt-0.5">Req: 4GB RAM | Thin Laptop or CPU-only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="qwen2.5-coder:7b" className="focus:bg-zinc-800 text-zinc-200 cursor-pointer">
                            <div className="flex flex-col py-0.5">
                              <span className="font-semibold text-xs text-white">Qwen 2.5 Coder (7B) — Balanced</span>
                              <span className="text-[10px] text-zinc-500 mt-0.5">Req: 8GB-16GB RAM | Mid-range GPU / Mac M-Series</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="qwen2.5-coder:14b" className="focus:bg-zinc-800 text-zinc-200 cursor-pointer">
                            <div className="flex flex-col py-0.5">
                              <span className="font-semibold text-xs text-white">Qwen 2.5 Coder (14B) — Powerful</span>
                              <span className="text-[10px] text-zinc-500 mt-0.5">Req: 32GB RAM | High-End GPU with 12GB+ VRAM</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!isInstalled && !isPulling && (
                      <Button
                        onClick={handlePullModel}
                        className="bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/20 px-4 text-xs font-semibold rounded-lg shrink-0 cursor-pointer h-[36px]"
                      >
                        Pull Model
                      </Button>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs px-1">
                    {isPulling ? (
                      <div className="w-full space-y-2">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-emerald-400 font-medium animate-pulse">{pullStatus}</span>
                          <span className="font-mono text-zinc-400">{pullProgress}%</span>
                        </div>
                        <div className="w-full bg-zinc-950 rounded-full h-1 overflow-hidden border border-zinc-800">
                          <div 
                            className="bg-emerald-500 h-1 rounded-full transition-all duration-300 shadow-[0_0_8px_#10b981]" 
                            style={{ width: `${pullProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-zinc-500">Status</span>
                        {isInstalled ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ready
                          </span>
                        ) : (
                          <span className="text-amber-500 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Not Downloaded
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/50">
                <span className="text-xs font-medium text-zinc-400">Embedding Fallback</span>
                <Switch 
                  aria-label="Toggle Embedding Fallback" 
                  checked={embeddingFallback}
                  onCheckedChange={setEmbeddingFallback}
                  className="data-[state=checked]:bg-emerald-600 h-5 w-9" 
                />
              </div>
            </div>
          </div>

          {/* Security Config */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex items-center gap-2 px-1">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">Security</h3>
            </div>
            
            <div className="flex-1 bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-2 shadow-xl">
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
