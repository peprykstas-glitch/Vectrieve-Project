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

import { usePathname } from "next/navigation"
import { useLanguage } from "@/lib/i18n/LanguageContext"

// Extracted header to use context
function DashboardHeader() {
  const { computeMode, setComputeMode, aiPersona, setAiPersona, isComputeModeLocked, headerRightAction } = useGlobalSettings()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isChat = pathname === "/"
  
  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none flex shrink-0 items-center justify-between px-5 pt-3.5 pb-8 bg-gradient-to-b from-zinc-950/90 via-zinc-950/40 to-transparent transition-all duration-300">
      {/* Left side: Mobile trigger + Cloud Enterprise + Persona selector (only in chat) */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-visible pointer-events-auto">
        <div className="flex items-center gap-3 md:hidden">
          <SidebarTrigger className="text-zinc-400 hover:text-white cursor-pointer" />
        </div>

        {mounted && isChat && (
          <>
            <div className="flex items-center gap-1.5 h-8 px-3.5 bg-blue-500/10 hover:bg-blue-500/15 backdrop-blur-2xl border border-blue-500/25 text-blue-400 text-xs font-medium rounded-full shrink-0 select-none shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.header.cloudEnterprise}</span>
            </div>

            <Select value={aiPersona} onValueChange={setAiPersona}>
              <SelectTrigger 
                aria-label="Select Persona" 
                className="h-8 w-auto min-w-[120px] sm:min-w-[135px] px-3.5 bg-zinc-900/60 hover:bg-zinc-800/80 backdrop-blur-2xl border-white/10 hover:border-white/20 active:scale-[0.97] text-zinc-300 hover:text-white text-xs font-medium focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none rounded-full shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-200"
              >
                <SelectValue placeholder={t.header.personaSelect} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900/95 backdrop-blur-2xl border-white/10 rounded-2xl shadow-2xl p-1">
                <SelectItem value="mentor" className="text-xs text-zinc-300 hover:text-white focus:bg-white/10 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-400" /> {t.header.personaMentor}
                  </div>
                </SelectItem>
                <SelectItem value="auditor" className="text-xs text-zinc-300 hover:text-white focus:bg-white/10 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> {t.header.personaAuditor}
                  </div>
                </SelectItem>
                <SelectItem value="architect" className="text-xs text-zinc-300 hover:text-white focus:bg-white/10 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-fuchsia-400" /> {t.header.personaArchitect}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Right side: Dynamic Frosted Glass Action Pills (Audio Briefing, MD, PDF) */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {mounted && isChat && headerRightAction}
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
      <Suspense fallback={<div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">Loading Neurach...</div>}>
        <SidebarProvider>
          {/* The Sidebar component automatically handles its own width transitions */}
          <AppSidebar />
          
          {/* 
            SidebarInset acts as the flexible container that reacts to the Sidebar's state. 
            It is structured as a strict column to manage vertical real estate perfectly.
          */}
          <SidebarInset className="flex flex-col h-screen min-w-0 bg-zinc-950 relative">
            
            <DashboardHeader />

            {/* 
              MAIN CONTENT AREA
              Takes up remaining height (flex-1). Overflows internally to prevent the global 
              window from scrolling. This is the exact container where Analytics, Settings, 
              and the ChatArea will render.
            */}
            <main className="flex-1 h-full overflow-hidden relative">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </Suspense>
    </GlobalSettingsProvider>
  )
}