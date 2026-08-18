"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Users, UserPlus, Shield, Trash2, Check, AlertCircle, Loader2, User, ChevronDown
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface SpaceMember {
  id: number;
  space_id: string;
  user_id: number;
  username: string;
  role: "OWNER" | "EDITOR" | "VIEWER" | "Owner" | "Editor" | "Viewer";
}

interface SpaceMembersModalProps {
  spaceId: string | null;
  spaceName: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: number;
}

export function SpaceMembersModal({
  spaceId,
  spaceName,
  isOpen,
  onClose,
  currentUserId,
}: SpaceMembersModalProps) {
  const { t } = useLanguage();
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [inviteInput, setInviteInput] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<"VIEWER" | "EDITOR" | "OWNER">("VIEWER");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient<SpaceMember[]>(`/spaces/${spaceId}/members`);
      setMembers(data);
    } catch (err: any) {
      console.error("Failed to load members", err);
      setErrorMsg(err.message || "Failed to load space members");
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (isOpen && spaceId) {
      fetchMembers();
    } else {
      setMembers([]);
      setInviteInput("");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, spaceId, fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim() || !spaceId) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const newMember = await apiClient<SpaceMember>(`/spaces/${spaceId}/members`, {
        method: "POST",
        body: JSON.stringify({
          username_or_email: inviteInput.trim(),
          role: inviteRole,
        }),
      });

      setMembers((prev) => [...prev, newMember]);
      setInviteInput("");
      setSuccessMsg(`Successfully added ${newMember.username} as ${newMember.role}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Invite error", err);
      setErrorMsg(err.message || "Failed to add user. Ensure user exists and isn't already a member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: number, targetUserId: number, newRole: "VIEWER" | "EDITOR" | "OWNER") => {
    if (!spaceId) return;
    setErrorMsg(null);
    try {
      const updated = await apiClient<SpaceMember>(`/spaces/${spaceId}/members/${targetUserId}`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });

      setMembers((prev) =>
        prev.map((m) => (m.user_id === targetUserId ? { ...m, role: updated.role } : m))
      );
    } catch (err: any) {
      console.error("Failed to update role", err);
      setErrorMsg(err.message || "Failed to update member role");
    }
  };

  const handleRemoveMember = async (targetUserId: number, username: string) => {
    if (!spaceId) return;
    if (!confirm(`Are you sure you want to remove ${username} from ${spaceName}?`)) return;

    setErrorMsg(null);
    try {
      await apiClient(`/spaces/${spaceId}/members/${targetUserId}`, {
        method: "DELETE",
      });

      setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
      setSuccessMsg(`Removed ${username} from space`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Failed to remove member", err);
      setErrorMsg(err.message || "Failed to remove member");
    }
  };

  if (!isOpen) return null;

  const getRoleBadgeStyle = (role: string) => {
    const r = role.toUpperCase();
    if (r === "OWNER") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (r === "EDITOR") return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    return "bg-zinc-800 text-zinc-400 border-zinc-700/50";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Users size={18} className="text-indigo-400" />
                {t.spaces.membersTitle}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {spaceName}
              </p>
            </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            {/* Invite Form */}
            <form onSubmit={handleInvite} className="space-y-3">
              <label className="block text-xs font-medium text-zinc-300">
                {t.spaces.addMember}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder={t.spaces.emailPlaceholder}
                    className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="h-full px-3 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                  >
                    <option value="VIEWER">{t.spaces.roleViewer}</option>
                    <option value="EDITOR">{t.spaces.roleEditor}</option>
                    <option value="OWNER">{t.spaces.roleOwner}</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !inviteInput.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>{t.spaces.addMember}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Notification Messages */}
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <Check size={14} className="flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Current Members ({members.length})
              </h3>

              {loading ? (
                <div className="py-8 flex justify-center items-center text-zinc-500 gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">Loading members...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No members found in this space.
                </div>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const ownerMembers = members.filter((m) => m.role.toUpperCase() === "OWNER");
                    const soleOwner = ownerMembers.length === 1 ? ownerMembers[0] : null;

                    return members.map((member) => {
                      const roleUpper = member.role.toUpperCase();
                      const isSoleOwnerMember = Boolean(soleOwner && member.user_id === soleOwner.user_id);

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl hover:border-zinc-700/60 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-medium text-xs">
                              {member.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-zinc-200">
                                {member.username} {member.user_id === currentUserId && "(You)"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={roleUpper}
                              disabled={isSoleOwnerMember}
                              title={
                                isSoleOwnerMember
                                  ? "Sole Owner cannot demote self"
                                  : "Change member role"
                              }
                              onChange={(e) =>
                                handleRoleChange(
                                  member.id,
                                  member.user_id,
                                  e.target.value as any
                                )
                              }
                              className={`px-2.5 py-1 text-[11px] font-medium border rounded-lg bg-zinc-950 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getRoleBadgeStyle(
                                roleUpper
                              )}`}
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EDITOR">Editor</option>
                              <option value="OWNER">Owner</option>
                            </select>

                            <button
                              onClick={() =>
                                handleRemoveMember(member.user_id, member.username)
                              }
                              disabled={isSoleOwnerMember}
                              title={
                                isSoleOwnerMember
                                  ? "Sole Owner cannot remove self"
                                  : "Remove member"
                              }
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
