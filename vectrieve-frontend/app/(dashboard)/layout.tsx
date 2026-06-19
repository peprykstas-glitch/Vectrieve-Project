"use client"

import React from "react"
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
import { Cpu, Cloud, GraduationCap, ShieldCheck } from "lucide-react"

// Extracted header to use context
function DashboardHeader() {
  const { computeMode, setComputeMode, aiPersona, setAiPersona } = useGlobalSettings()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  return (
    <header className="flex shrink-0 items-center justify-between pr-4 lg:pr-8 pl-3 py-3 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl z-30 transition-all duration-300">
      <div className="flex items-center gap-4">
        {/* The trigger seamlessly toggles the sidebar without z-index clipping */}
        <SidebarTrigger className="text-zinc-400 hover:text-zinc-100 transition-colors" />
      </div>

      {/* Relocated Global Controls: Cloud/Local and Mentor/Auditor */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar min-h-[32px]">
        {mounted && (
          <>
            <Select value={computeMode} onValueChange={setComputeMode}>
              <SelectTrigger aria-label="Select Environment" className="h-8 w-auto min-w-[120px] sm:min-w-[145px] px-3 sm:px-4 bg-zinc-900/50 border-white/10 text-xs focus:ring-1 focus:ring-zinc-700 rounded-full shrink-0">
                <SelectValue placeholder="Environment" />
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
              <SelectTrigger aria-label="Select Persona" className="h-8 w-auto min-w-[120px] sm:min-w-[145px] px-3 sm:px-4 bg-zinc-900/50 border-white/10 text-xs focus:ring-1 focus:ring-zinc-700 rounded-full shrink-0">
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
    </GlobalSettingsProvider>
  )
}