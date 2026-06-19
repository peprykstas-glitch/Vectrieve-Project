"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  BrainCircuit, 
  MessageSquare, 
  Database, 
  BarChart3, 
  Settings, 
  LogOut 
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
const navItems = [
  { title: "RAG Workspace", url: "/", icon: MessageSquare },
  { title: "Knowledge Base", url: "/files", icon: Database },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
]

function ChatHistoryList() {
  const [sessions, setSessions] = React.useState<{id: string, title: string}[]>([])
  const pathname = usePathname()

  React.useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/proxy/sessions')
        if (res.ok) {
          const data = await res.json()
          setSessions(data)
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchSessions()
  }, [])

  if (sessions.length === 0) {
    return (
      <div className="px-2 text-xs text-zinc-600 group-data-[collapsible=icon]:hidden">
        No recent chats
      </div>
    )
  }

  return (
    <>
      {sessions.map(s => {
        const url = `/?session=${s.id}`
        const isActive = pathname === '/' && typeof window !== 'undefined' && window.location.search.includes(s.id)
        return (
          <SidebarMenuItem key={s.id}>
            <SidebarMenuButton 
              asChild 
              isActive={isActive}
              tooltip={s.title}
              className={`transition-all duration-200 rounded-md ${
                isActive 
                 ? "bg-zinc-800/80 text-white shadow-sm" 
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
              }`}
            >
              <Link href={url}>
                <MessageSquare className="shrink-0 w-4 h-4 opacity-70" />
                <span className="font-medium group-data-[collapsible=icon]:hidden truncate">
                  {s.title}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </>
  )
}

function UserCard() {
  const [email, setEmail] = React.useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/proxy/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.email) setEmail(data.email) })
      .catch(() => {})
  }, [])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const initials = email ? email[0].toUpperCase() : '?'

  return (
    <div className="group flex items-center gap-3 px-2 py-2 rounded-xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-md">
        {initials}
      </div>

      {/* Email + Sign Out */}
      <div className="flex flex-1 min-w-0 flex-col group-data-[collapsible=icon]:hidden">
        <span className="text-[11px] text-zinc-500 font-medium">Signed in as</span>
        <span className="text-[12px] text-zinc-300 font-semibold truncate">{email ?? '...'}</span>
      </div>

      <button
        onClick={handleSignOut}
        disabled={isLoggingOut}
        title="Sign out"
        className="group-data-[collapsible=icon]:hidden shrink-0 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-800 bg-zinc-950 z-40">
      <SidebarHeader className="h-16 flex justify-center p-2">
        <div className="flex items-center w-full gap-3 px-2 overflow-hidden group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-300/30">
            <BrainCircuit className="h-4 w-4 text-white drop-shadow-md" />
          </div>
          <span className="truncate text-[15px] font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 group-data-[collapsible=icon]:hidden transition-opacity duration-200">
            Vectrieve Core
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 group-data-[collapsible=icon]:hidden">
            Platform Operations
          </SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive}
                    tooltip={item.title}
                    className={`transition-all duration-200 rounded-md ${
                      isActive 
                       ? "bg-zinc-800/80 text-white shadow-sm" 
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                    }`}
                  >
                    <Link href={item.url}>
                      <item.icon 
                        strokeWidth={isActive ? 2 : 1.5} 
                        className={`shrink-0 ${isActive ? "text-indigo-400" : ""}`} 
                      />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 group-data-[collapsible=icon]:hidden">
            Recent Chats
          </SidebarGroupLabel>
          <SidebarMenu>
            <ChatHistoryList />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5 p-2">
        <UserCard />
      </SidebarFooter>
    </Sidebar>
  )
}