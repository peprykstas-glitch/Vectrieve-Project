"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useGlobalSettings, Space } from "@/components/global-settings"
import { 
  BrainCircuit, 
  MessageSquare, 
  Database, 
  BarChart3, 
  Settings, 
  LogOut,
  PanelLeft,
  Trash2,
  Check,
  X,
  ChevronDown,
  Plus
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
  useSidebar
} from "@/components/ui/sidebar"
import { apiClient } from "@/lib/api/client"

const navItems = [
  { title: "RAG Workspace", url: "/", icon: MessageSquare },
  { title: "Knowledge Base", url: "/files", icon: Database },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
]

function ChatHistoryList() {
  const [sessions, setSessions] = React.useState<{id: string, title: string}[]>([])
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const spaceId = searchParams.get('space')
  const currentSessionId = searchParams.get('session')

  const fetchSessions = React.useCallback(async () => {
    try {
      const query = spaceId ? `?space_id=${encodeURIComponent(spaceId)}` : ''
      const data = await apiClient<{id: string, title: string}[]>(`/sessions${query}`)
      setSessions(data)
    } catch (e: any) {
      console.error("Failed to load sessions:", e)
    }
  }, [spaceId])

  // Refresh only when pathname, active session, or space changes
  React.useEffect(() => {
    fetchSessions()
  }, [pathname, currentSessionId, spaceId, fetchSessions])

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(id)
  }

  const handleConfirmDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await apiClient(`/sessions/${id}`, { method: 'DELETE' })
      if (id === currentSessionId && pathname === '/') {
        window.location.href = '/'
      } else {
        setDeletingId(null)
        fetchSessions()
      }
    } catch (err) {
      console.error("Failed to delete session", err)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(null)
  }

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
        const url = spaceId ? `/?session=${s.id}&space=${spaceId}` : `/?session=${s.id}`
        const isActive = pathname === '/' && s.id === currentSessionId

        if (deletingId === s.id) {
          return (
            <SidebarMenuItem key={s.id} className="group/session-item relative">
              <div className="flex items-center justify-between w-full px-3 py-2 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-md">
                <span className="font-semibold truncate">Delete Chat?</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleConfirmDelete(s.id, e)}
                    className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors cursor-pointer border-0 bg-transparent"
                    title="Yes, delete"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="p-1 hover:bg-zinc-850 text-zinc-400 rounded transition-colors cursor-pointer border-0 bg-transparent"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </SidebarMenuItem>
          )
        }

        return (
          <SidebarMenuItem key={s.id} className="group/session-item relative">
            <SidebarMenuButton 
              asChild 
              isActive={isActive}
              tooltip={s.title}
              className={`transition-all duration-200 rounded-md pr-8 ${
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
            <button
              onClick={(e) => handleDeleteClick(s.id, e)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-200 opacity-0 group-hover/session-item:opacity-100 focus:opacity-100 group-data-[collapsible=icon]:hidden cursor-pointer border-0 bg-transparent"
              title="Delete chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
    apiClient<{ email: string }>('/auth/me')
      .then(data => { if (data?.email) setEmail(data.email) })
      .catch(() => {})
  }, [])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      await apiClient('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error("Failed to sign out on backend, proceeding with local logout", e)
    }
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

function SpaceSwitcher() {
  const { spaces, fetchSpaces, activeSpace: currentSpace } = useGlobalSettings()
  const [isOpen, setIsOpen] = React.useState(false)
  const [newSpaceName, setNewSpaceName] = React.useState("")
  const [newSpacePrompt, setNewSpacePrompt] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const currentSpaceId = searchParams.get('space')
  
  const handleSelectSpace = (id: string | null) => {
    setIsOpen(false)
    const params = new URLSearchParams(window.location.search)
    if (id) {
      params.set('space', id)
    } else {
      params.delete('space')
    }
    params.delete('session') // Always clear active chat session when switching space
    window.location.href = `${pathname}?${params.toString()}`
  }
  
  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return
    try {
      const newSpace = await apiClient<Space>('/spaces', {
        method: 'POST',
        body: JSON.stringify({ name: newSpaceName.trim(), system_prompt: newSpacePrompt.trim() || undefined })
      })
      setNewSpaceName("")
      setNewSpacePrompt("")
      setIsCreating(false)
      fetchSpaces()
      handleSelectSpace(newSpace.id)
    } catch (err) {
      console.error("Failed to create space", err)
    }
  }
  
  return (
    <div className="px-2 mb-4 group-data-[collapsible=icon]:hidden relative">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2 px-1">
        Current Workspace
      </div>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-zinc-200 border border-white/5 bg-zinc-900/60 hover:bg-zinc-900 rounded-lg shadow-sm transition-all duration-200 cursor-pointer select-none text-left"
      >
        <span className="truncate font-semibold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-indigo-200">
          {currentSpace ? currentSpace.name : "Global Workspace"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0 ml-1 transition-transform" />
      </button>
      
      {isOpen && (
        <div className="absolute left-2 right-2 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="max-h-40 overflow-y-auto mb-1.5 scrollbar-thin">
            <button
              onClick={() => handleSelectSpace(null)}
              className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors cursor-pointer border-0 bg-transparent ${
                !currentSpaceId ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              Global Workspace
            </button>
            {spaces.map(s => (
              <div
                key={s.id}
                className={`group/space flex items-center justify-between rounded-md transition-colors ${
                  s.id === currentSpaceId ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                }`}
              >
                <button
                  onClick={() => handleSelectSpace(s.id)}
                  className={`flex-1 text-left px-3 py-2 text-xs rounded-md transition-colors truncate cursor-pointer border-0 bg-transparent ${
                    s.id === currentSpaceId ? "text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {s.name}
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${s.name}"? This will delete all documents and chats in this space.`)) {
                      try {
                        await apiClient(`/spaces/${s.id}`, { method: 'DELETE' });
                        if (s.id === currentSpaceId) {
                          handleSelectSpace(null);
                        }
                        fetchSpaces();
                      } catch (err) {
                        console.error("Failed to delete space", err);
                      }
                    }
                  }}
                  className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover/space:opacity-100 transition-opacity mr-2 cursor-pointer bg-transparent border-0"
                  title="Delete Space"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="border-t border-zinc-800/80 pt-1.5 mt-1.5 px-1.5">
            {isCreating ? (
              <form onSubmit={handleCreateSpace} className="flex flex-col gap-1.5 animate-in zoom-in-95 duration-150">
                <input
                  type="text"
                  placeholder="Space name..."
                  value={newSpaceName}
                  onChange={e => setNewSpaceName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
                <textarea
                  placeholder="System instruction (optional)..."
                  value={newSpacePrompt}
                  onChange={e => setNewSpacePrompt(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none h-12"
                />
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800 rounded cursor-pointer border-0 bg-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer border-0"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-all cursor-pointer border-0 bg-transparent"
              >
                <Plus className="w-3 h-3" />
                Create New Space
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const spaceId = searchParams.get('space')
  const { toggleSidebar } = useSidebar()
  const [hovered, setHovered] = React.useState(false)

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-zinc-950 z-40">
      <SidebarHeader className="h-16 flex justify-center p-2 border-b border-white/5">
        <button 
          onClick={toggleSidebar}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="flex items-center w-full gap-3 px-2 overflow-hidden group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center cursor-pointer select-none border-0 bg-transparent text-left focus:outline-none"
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all duration-200 hover:scale-105 active:scale-95">
            {hovered ? (
              <PanelLeft className="h-4 w-4 text-white drop-shadow-md animate-in fade-in duration-200" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo-icon.png" alt="Vectrieve" className="h-5 w-5 object-contain drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]" />
            )}
          </div>
          {/* Brand text beside icon — hidden when sidebar is collapsed */}
          <div className="flex items-center gap-1.5 font-bold tracking-tight group-data-[collapsible=icon]:hidden transition-opacity duration-200">
            <span className="text-[15px] font-bold tracking-tight text-white font-sans">
              Vectrieve
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              AI
            </span>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="p-2 pt-4">
        <SpaceSwitcher />
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
                    <Link href={spaceId ? `${item.url}?space=${spaceId}` : item.url}>
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
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="New Chat"
                className="text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 rounded-md transition-all duration-200 mb-1"
              >
                <Link href={spaceId ? `/?space=${spaceId}` : "/"}>
                  <MessageSquare strokeWidth={1.5} className="shrink-0" />
                  <span className="font-medium group-data-[collapsible=icon]:hidden">+ New Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
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