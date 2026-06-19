"use client";

import React, { useState } from "react";
import { Settings, Save, Server, ShieldCheck, Key, Cloud, Eye, EyeOff, Database, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function SettingsPage() {
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showQdrantKey, setShowQdrantKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 800);
  };

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
            className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 border border-indigo-500/50 transition-all w-32"
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
                    defaultValue="gsk_l7****************"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-10 text-sm text-zinc-300 focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
                  />
                  <button 
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    aria-label={showGroqKey ? "Hide Groq API Key" : "Show Groq API Key"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
                  defaultValue="https://cluster.qdrant.tech"
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
                    defaultValue="qd_sk_**************"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-10 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors font-mono"
                  />
                  <button 
                    onClick={() => setShowQdrantKey(!showQdrantKey)}
                    aria-label={showQdrantKey ? "Hide Qdrant API Key" : "Show Qdrant API Key"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
                    defaultValue="http://127.0.0.1:11434"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none transition-colors font-mono"
                  />
                  <p className="text-[10px] text-zinc-600 mt-2">Make sure the local Ollama daemon is running.</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/50">
                <span className="text-xs font-medium text-zinc-400">Embedding Fallback</span>
                <Switch aria-label="Toggle Embedding Fallback" defaultChecked className="data-[state=checked]:bg-emerald-600 h-5 w-9" />
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
                <Switch aria-label="Toggle Strict Content Filtering" defaultChecked className="data-[state=checked]:bg-zinc-500 h-5 w-9" />
              </div>
              <div className="h-px w-full bg-zinc-800 my-1" />
              <div className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium text-zinc-200">Session Logs</h4>
                  <p className="text-[10px] text-zinc-500">Keep interaction history on Postgres.</p>
                </div>
                <Switch aria-label="Toggle Session Logs" defaultChecked className="data-[state=checked]:bg-zinc-500 h-5 w-9" />
              </div>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
