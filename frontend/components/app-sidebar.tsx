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
  Plus,
  ShieldCheck,
  Users
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
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { FeedbackModal } from "@/components/feedback/FeedbackModal"
import { Sparkles } from "lucide-react"

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

  // Listen for custom 'session-created' event (fired by useChat after replaceState)
  React.useEffect(() => {
    const handleSessionCreated = () => {
      // Immediate re-fetch: will show "New Chat..." placeholder title
      fetchSessions()
      // Delayed re-fetch: gives the backend time to auto-generate the real title
      const timer = setTimeout(() => fetchSessions(), 3500)
      return () => clearTimeout(timer)
    }
    window.addEventListener("session-created", handleSessionCreated)
    return () => window.removeEventListener("session-created", handleSessionCreated)
  }, [fetchSessions])

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

import { AvatarModal } from "@/components/user/AvatarModal"
import { Camera } from "lucide-react"

function UserCard() {
  const [email, setEmail] = React.useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Load local stored avatar
    const saved = localStorage.getItem("vectrieve_user_avatar")
    if (saved) {
      setAvatarUrl(saved)
    }

    apiClient<{ email: string }>('/auth/me')
      .then(data => { 
        if (data?.email) {
          setEmail(data.email)
          if (!saved) {
            // Auto fallback unavatar
            setAvatarUrl(`https://unavatar.io/${encodeURIComponent(data.email)}?fallback=https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.email)}`)
          }
        } 
      })
      .catch(() => {})
  }, [])

  const handleSaveAvatar = (newAvatar: string | null) => {
    setAvatarUrl(newAvatar)
    if (newAvatar) {
      localStorage.setItem("vectrieve_user_avatar", newAvatar)
    } else {
      localStorage.removeItem("vectrieve_user_avatar")
      if (email) {
        setAvatarUrl(`https://unavatar.io/${encodeURIComponent(email)}?fallback=https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`)
      }
    }
  }

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      await apiClient('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error("Failed to sign out on backend, proceeding with local logout", e)
    }
    window.location.href = '/login'
  }

  const initials = email ? email[0].toUpperCase() : 'U'

  return (
    <>
      <div className="group flex items-center gap-3 px-2 py-2 rounded-xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:w-full">
        {/* Avatar with click to customize */}
        <button
          type="button"
          onClick={() => setIsAvatarModalOpen(true)}
          title="Change profile avatar"
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-md cursor-pointer border-0 p-0 group/avatar"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              onError={() => {
                // If remote image fails to load, fallback to initials
                setAvatarUrl(null)
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white">
            <Camera className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Email + Sign Out */}
        <div 
          onClick={() => setIsAvatarModalOpen(true)}
          className="flex flex-1 min-w-0 flex-col cursor-pointer group-data-[collapsible=icon]:hidden"
        >
          <span className="text-[11px] text-zinc-500 font-medium">Signed in as</span>
          <span className="text-[12px] text-zinc-300 font-semibold truncate hover:text-indigo-400 transition-colors">
            {email ?? '...'}
          </span>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isLoggingOut}
          title="Sign out"
          className="group-data-[collapsible=icon]:hidden shrink-0 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50 border-0 bg-transparent cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      <AvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={avatarUrl}
        userEmail={email}
        onSaveAvatar={handleSaveAvatar}
      />
    </>
  )
}

import { SpaceSettingsModal } from "@/components/spaces/SpaceSettingsModal"
import { SpaceMembersModal } from "@/components/spaces/SpaceMembersModal"

function SpaceSwitcher() {
  const { spaces, fetchSpaces, activeSpace: currentSpace } = useGlobalSettings()
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = React.useState(false)
  const [newSpaceName, setNewSpaceName] = React.useState("")
  const [newSpacePrompt, setNewSpacePrompt] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)
  const [editingSpace, setEditingSpace] = React.useState<Space | null>(null)
  const [membersModalSpace, setMembersModalSpace] = React.useState<Space | null>(null)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const currentSpaceId = searchParams.get('space')
  
  // Auto-redirect to first space ONLY on initial load (when URL has no space param at all)
  // If user explicitly selects Global Workspace, we set space=global to prevent re-redirect
  React.useEffect(() => {
    if (spaces.length > 0 && !searchParams.has('space')) {
      const params = new URLSearchParams(window.location.search)
      params.set('space', spaces[0].id)
      window.location.href = `${pathname}?${params.toString()}`
    }
  }, [spaces, pathname, searchParams])

  const handleSelectSpace = (id: string | null) => {
    setIsOpen(false)
    const params = new URLSearchParams(window.location.search)
    if (id) {
      params.set('space', id)
    } else {
      // Set explicit 'global' value so auto-redirect doesn't re-fire
      params.set('space', 'global')
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
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2 px-1">
        <span>Current Workspace</span>
        {currentSpace && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMembersModalSpace(currentSpace)}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-300 rounded transition-colors cursor-pointer border-0 bg-transparent"
              title="Manage Workspace Members & Share"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditingSpace(currentSpace)}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-300 rounded transition-colors cursor-pointer border-0 bg-transparent"
              title="Edit Workspace Instructions & Name"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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

      {editingSpace && (
        <SpaceSettingsModal
          space={editingSpace}
          isOpen={Boolean(editingSpace)}
          onClose={() => setEditingSpace(null)}
          onSaved={() => fetchSpaces()}
        />
      )}

      {membersModalSpace && (
        <SpaceMembersModal
          spaceId={membersModalSpace.id}
          spaceName={membersModalSpace.name}
          isOpen={Boolean(membersModalSpace)}
          onClose={() => setMembersModalSpace(null)}
        />
      )}
      
      {isOpen && (
        <div className="absolute left-2 right-2 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="max-h-40 overflow-y-auto mb-1.5 scrollbar-thin">
            <button
              onClick={() => handleSelectSpace(null)}
              className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors cursor-pointer border-0 bg-transparent ${
                !currentSpaceId ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              {t.nav.allSpaces}
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
                <div className="flex items-center gap-1 opacity-0 group-hover/space:opacity-100 transition-opacity mr-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMembersModalSpace(s);
                      setIsOpen(false);
                    }}
                    className="p-1 text-zinc-500 hover:text-indigo-300 hover:bg-zinc-700/50 rounded transition-colors cursor-pointer bg-transparent border-0"
                    title="Manage Members & Share"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSpace(s);
                      setIsOpen(false);
                    }}
                    className="p-1 text-zinc-500 hover:text-indigo-300 hover:bg-zinc-700/50 rounded transition-colors cursor-pointer bg-transparent border-0"
                    title={t.nav.spaceSettings}
                  >
                    <Settings className="w-3.5 h-3.5" />
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
                    className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer bg-transparent border-0"
                    title={t.common.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-zinc-800/80 pt-1.5 mt-1.5 px-1.5">
            {isCreating ? (
              <form onSubmit={handleCreateSpace} className="flex flex-col gap-1.5 animate-in zoom-in-95 duration-150">
                <input
                  type="text"
                  placeholder={t.spaces.namePlaceholder}
                  value={newSpaceName}
                  onChange={e => setNewSpaceName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
                <textarea
                  placeholder={t.spaces.promptPlaceholder}
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
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer border-0"
                  >
                    {t.common.save}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-all cursor-pointer border-0 bg-transparent"
              >
                <Plus className="w-3 h-3" />
                {t.nav.createSpace}
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
  const { t } = useLanguage()
  const [hovered, setHovered] = React.useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false)

  const localizedNavItems = [
    { title: t.nav.chat, url: "/", icon: MessageSquare },
    { title: t.nav.knowledgeBase, url: "/files", icon: Database },
    { title: t.nav.analytics, url: "/analytics", icon: ShieldCheck },
    { title: t.nav.settings, url: "/settings", icon: Settings },
  ]

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-white/5 bg-zinc-950 z-40">
        <SidebarHeader className="h-16 flex items-center justify-center p-2 border-b border-white/5 group-data-[collapsible=icon]:p-0">
          <button 
            onClick={toggleSidebar}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-center w-full gap-2.5 px-2 overflow-hidden group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full cursor-pointer select-none border-0 bg-transparent text-left focus:outline-none"
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95">
              {hovered ? (
                <PanelLeft className="h-5 w-5 text-indigo-400 drop-shadow-md animate-in fade-in duration-200" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logo-icon.png" alt="Vectrieve" className="h-6 w-6 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
              )}
            </div>
            {/* Brand text beside icon — hidden when sidebar is collapsed */}
            <div className="flex items-center group-data-[collapsible=icon]:hidden transition-opacity duration-200">
              <span className="text-[16px] font-bold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-indigo-300 bg-clip-text text-transparent font-sans">
                Vectrieve
              </span>
            </div>
          </button>
        </SidebarHeader>

        <SidebarContent className="p-2 pt-4 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:pt-2">
          <SpaceSwitcher />
          <SidebarGroup className="group-data-[collapsible=icon]:px-0">
            <SidebarGroupLabel className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 group-data-[collapsible=icon]:hidden">
              {t.nav.platformOps}
            </SidebarGroupLabel>
            <SidebarMenu>
              {localizedNavItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.url}>
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

              {/* Feedback & Bug Reporting Trigger Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsFeedbackOpen(true)}
                  tooltip={t.nav.feedback}
                  className="text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-300 rounded-md transition-all duration-200 cursor-pointer"
                >
                  <Sparkles strokeWidth={1.5} className="shrink-0 text-amber-400/80" />
                  <span className="font-medium group-data-[collapsible=icon]:hidden">
                    {t.nav.feedback}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="mt-4 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:px-0">
            <SidebarGroupLabel className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              {t.nav.recentChats}
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={t.nav.newChat}
                  className="text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 rounded-md transition-all duration-200 mb-1"
                >
                  <Link href={spaceId ? `/?space=${spaceId}` : "/"}>
                    <MessageSquare strokeWidth={1.5} className="shrink-0" />
                    <span className="font-medium">+ {t.nav.newChat}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <ChatHistoryList />
            </SidebarMenu>
          </SidebarGroup>

          {/* Collapsed mode: only show New Chat icon */}
          <SidebarGroup className="mt-4 hidden group-data-[collapsible=icon]:block group-data-[collapsible=icon]:px-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="New Chat"
                  className="text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 rounded-md transition-all duration-200"
                >
                  <Link href={spaceId ? `/?space=${spaceId}` : "/"}>
                    <Plus strokeWidth={2} className="shrink-0" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-white/5 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <UserCard />
        </SidebarFooter>
      </Sidebar>

      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </>
  )
}