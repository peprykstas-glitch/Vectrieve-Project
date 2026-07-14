"use client"

import React, { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { GlobalSettingsProvider, useGlobalSettings } from "@/components/global-settings"
import { 
  SidebarProvider, 
  SidebarInset,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Cpu, Cloud, GraduationCap, ShieldCheck, Lock } from "lucide-react"

// Extracted header to use context
function DashboardHeader() {
  const { computeMode, setComputeMode, aiPersona, setAiPersona, isComputeModeLocked } = useGlobalSettings()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  return (
    <header className="flex shrink-0 items-center justify-between px-6 py-3.5 border-b border-white/5 bg-zinc-900/10 backdrop-blur-xl z-30 transition-all duration-300">
      <div className="flex items-center gap-4 md:hidden">
        <SidebarTrigger className="text-zinc-400 hover:text-white cursor-pointer" />
      </div>

      {/* Relocated Global Controls: Cloud/Local and Mentor/Auditor */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-visible py-1">
        {mounted && (
          <>
            <Select value={computeMode} onValueChange={setComputeMode} disabled={isComputeModeLocked}>
              <SelectTrigger 
                aria-label="Select Environment" 
                className={`h-8 w-auto min-w-[120px] sm:min-w-[145px] px-3 sm:px-4 bg-zinc-900/40 hover:bg-zinc-900/80 active:scale-[0.96] border-white/5 hover:border-zinc-800 text-xs focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none rounded-full shrink-0 transition-all duration-200 ${
                  isComputeModeLocked ? "opacity-80 cursor-not-allowed" : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <SelectValue placeholder="Environment" />
                  {isComputeModeLocked && (
                    <Lock className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                  )}
                </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 rounded-xl shadow-2xl">
                <SelectItem value="cloud" className="text-xs text-zinc-300 focus:bg-zinc-800">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-3 h-3 text-blue-400" /> Cloud Compute
                  </div>
                </SelectItem>
                <SelectItem value="local" className="text-xs text-zinc-300 focus:bg-zinc-800">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3 h-3 text-emerald-400" /> Local Neural
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={aiPersona} onValueChange={setAiPersona}>
              <SelectTrigger aria-label="Select Persona" className="h-8 w-auto min-w-[120px] sm:min-w-[145px] px-3 sm:px-4 bg-zinc-900/40 hover:bg-zinc-900/80 active:scale-[0.96] border-white/5 hover:border-zinc-800 text-xs focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none rounded-full shrink-0 transition-all duration-200">
                <SelectValue placeholder="Persona" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 rounded-xl shadow-2xl">
                <SelectItem value="mentor" className="text-xs text-zinc-300 focus:bg-zinc-800">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3 h-3 text-purple-400" /> Mentor Mode
                  </div>
                </SelectItem>
                <SelectItem value="auditor" className="text-xs text-zinc-300 focus:bg-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-amber-400" /> Auditor Mode
                  </div>
                </SelectItem>
                <SelectItem value="architect" className="text-xs text-zinc-300 focus:bg-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-fuchsia-400" /> Architect Mode
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </header>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <GlobalSettingsProvider>
      <Suspense fallback={<div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">Loading Vectrieve...</div>}>
        <SidebarProvider>
          {/* The Sidebar component automatically handles its own width transitions */}
          <AppSidebar />
          
          {/* 
            SidebarInset acts as the flexible container that reacts to the Sidebar's state. 
            It is structured as a strict column to manage vertical real estate perfectly.
          */}
          <SidebarInset className="flex flex-col h-screen min-w-0 bg-zinc-950">
            
            <DashboardHeader />

            {/* 
              MAIN CONTENT AREA
              Takes up remaining height (flex-1). Overflows internally to prevent the global 
              window from scrolling. This is the exact container where Analytics, Settings, 
              and the ChatArea will render.
            */}
            <main className="flex-1 overflow-hidden relative">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </Suspense>
    </GlobalSettingsProvider>
  )
}