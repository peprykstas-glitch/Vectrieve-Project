"use client"

import React, { useState, useEffect, useRef } from "react"
import { X, Upload, Check, Sparkles, RotateCcw } from "lucide-react"

interface AvatarModalProps {
  isOpen: boolean
  onClose: () => void
  currentAvatar: string | null
  userEmail: string | null
  onSaveAvatar: (newAvatarUrl: string | null) => void
}

const PRESET_AVATARS = [
  { id: "pro", name: "Corporate Pro", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  { id: "exec", name: "Executive", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { id: "tech", name: "Lead Engineer", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
  { id: "ai-synth", name: "Neurach", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" },
  { id: "bot-1", name: "Neural Bot", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Neurach" },
  { id: "bot-2", name: "Cyber Avatar", url: "https://api.dicebear.com/7.x/shapes/svg?seed=Enterprise" },
]

export function AvatarModal({ isOpen, onClose, currentAvatar, userEmail, onSaveAvatar }: AvatarModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar)
  const [customUrl, setCustomUrl] = useState("")
  const [activeTab, setActiveTab] = useState<"presets" | "upload" | "url">("presets")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelectedAvatar(currentAvatar)
  }, [currentAvatar, isOpen])

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB")
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setSelectedAvatar(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    onSaveAvatar(selectedAvatar)
    onClose()
  }

  const handleReset = () => {
    setSelectedAvatar(null)
    onSaveAvatar(null)
    onClose()
  }

  const gravatarFallback = userEmail 
    ? `https://unavatar.io/${encodeURIComponent(userEmail)}?fallback=https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userEmail)}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-wide">Customize Profile Avatar</h2>
              <p className="text-[11px] text-muted-foreground">Personalize how your account appears in Neurach</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Preview */}
        <div className="flex items-center justify-center gap-4 py-5 bg-muted/20 border-b border-border">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/50 shadow-md bg-card flex items-center justify-center">
              {selectedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : gravatarFallback ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gravatarFallback} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
                  {userEmail ? userEmail[0].toUpperCase() : "U"}
                </div>
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">{userEmail ?? "User"}</span>
            <span className="text-[10px] text-muted-foreground">Active Workspace Profile</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-4 pt-3 gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab("presets")}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors border-0 cursor-pointer ${
              activeTab === "presets" 
                ? "bg-accent text-accent-foreground border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground bg-transparent"
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors border-0 cursor-pointer ${
              activeTab === "upload" 
                ? "bg-accent text-accent-foreground border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground bg-transparent"
            }`}
          >
            Upload Photo
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors border-0 cursor-pointer ${
              activeTab === "url" 
                ? "bg-accent text-accent-foreground border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground bg-transparent"
            }`}
          >
            Image Link / Gravatar
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 space-y-4 min-h-[160px]">
          {activeTab === "presets" && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-3">Choose a curated corporate or neural avatar preset:</p>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = selectedAvatar === preset.url
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedAvatar(preset.url)}
                      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary text-foreground"
                          : "bg-card border-border hover:border-primary/40 hover:bg-accent/40 text-muted-foreground"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-medium truncate w-full text-center text-foreground">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 p-0.5 rounded-full bg-primary text-primary-foreground">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-xl bg-muted/20 hover:bg-accent/30 transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-2 border border-primary/20">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs text-foreground font-medium mb-1">Click to choose an image from your computer</p>
              <p className="text-[10px] text-muted-foreground mb-3">PNG, JPG, WEBP up to 2MB</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-sm transition-all border-0 cursor-pointer"
              >
                Select File
              </button>
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-foreground block mb-1">
                  Direct Image URL (Google Photo, LinkedIn, or Web Link)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrl.trim()) setSelectedAvatar(customUrl.trim())
                    }}
                    className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium rounded-lg border-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {gravatarFallback && (
                <div className="p-2.5 rounded-lg border border-border bg-card/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gravatarFallback} alt="Auto" className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <p className="text-xs text-foreground font-medium">Automatic Gravatar / Unavatar</p>
                      <p className="text-[10px] text-muted-foreground">Auto-resolved from your email</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAvatar(gravatarFallback)}
                    className="px-2.5 py-1 text-[11px] bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-md transition-colors border border-primary/30 cursor-pointer"
                  >
                    Use Auto
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors border-0 bg-transparent cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Initials
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-sm shadow-primary/20 transition-all border-0 cursor-pointer"
            >
              Save Avatar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
