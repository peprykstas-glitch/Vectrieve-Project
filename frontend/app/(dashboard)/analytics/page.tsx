"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer,
} from "recharts";
import {
  Activity, Database, Users, Zap, Loader2, Clock,
  BarChart2, Server, Download, RefreshCw, CheckCircle2,
  UserCheck, UserX, Trash2, ShieldCheck, AlertCircle,
  Lightbulb, Bug, MessageSquare, Check, Sparkles
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { apiClient } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/* ─── types ────────────────────────────────────────────────────────────────── */
type Period = "7d" | "30d" | "90d" | "all";

interface AdminUser {
  id: number;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  is_approved: boolean;
  documents_count: number;
}

interface FeedbackItem {
  id: number;
  user_id: number;
  user_email: string | null;
  type: "IDEA" | "BUG";
  message: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED";
  created_at: string;
}

interface AnalyticsData {
  period: string;
  kpi: {
    total_queries: number;
    active_users: number;
    total_users: number;
    indexed_documents: number;
    avg_queries_per_session: number;
    total_storage_mb: number;
    total_vectors: number;
  };
  daily_series: { date: string; queries: number; docs: number }[];
  telemetry: {
    dense_avg_sec: number;
    sparse_avg_sec: number;
    rerank_avg_sec: number;
    llm_avg_sec: number;
    total_avg_sec: number;
    tokens_per_second_avg: number;
    tokens_generated_total: number;
    pool: { size: number; checked_in: number; checked_out: number; overflow: number };
  };
  server: { uptime_seconds: number; started_at: string };
}

/* ─── helpers ───────────────────────────────────────────────────────────────── */
function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function exportMarkdown(data: AnalyticsData, period: Period) {
  const now = new Date().toLocaleString();
  const label = period === "all" ? "All time" : period.toUpperCase();
  const lines = [
    `# Vectrieve Analytics Report`,
    `**Generated:** ${now}  |  **Period:** ${label}`,
    `**Server uptime:** ${fmtUptime(data.server.uptime_seconds)}`,
    ``,
    `## Key Performance Indicators`,
    `| Metric | Value |`,
    `|---|---|`,
    `| Total Queries | ${data.kpi.total_queries} |`,
    `| Active Users | ${data.kpi.active_users} |`,
    `| Total Users | ${data.kpi.total_users} |`,
    `| Indexed Documents | ${data.kpi.indexed_documents} |`,
    `| Avg Queries / Session | ${data.kpi.avg_queries_per_session} |`,
    `| Storage Used | ${data.kpi.total_storage_mb} MB |`,
    `| Vector Count | ${data.kpi.total_vectors} |`,
    ``,
    `## RAG Pipeline Latency`,
    `| Stage | Avg Latency |`,
    `|---|---|`,
    `| Dense Search | ${(data.telemetry.dense_avg_sec * 1000).toFixed(0)} ms |`,
    `| Sparse Search | ${(data.telemetry.sparse_avg_sec * 1000).toFixed(0)} ms |`,
    `| Reranker | ${(data.telemetry.rerank_avg_sec * 1000).toFixed(0)} ms |`,
    `| LLM Generation | ${data.telemetry.llm_avg_sec.toFixed(2)} s |`,
    `| Total Response | ${data.telemetry.total_avg_sec.toFixed(2)} s |`,
    `| Token Speed | ${data.telemetry.tokens_per_second_avg.toFixed(1)} t/s |`,
    `| Tokens Generated | ${data.telemetry.tokens_generated_total} |`,
    ``,
    `## Daily Usage (${label})`,
    `| Date | Queries | Docs Indexed |`,
    `|---|---|---|`,
    ...data.daily_series.map(d => `| ${d.date} | ${d.queries} | ${d.docs} |`),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vectrieve-analytics-${period}-${new Date().toISOString().split("T")[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

const chartConfig = {
  queries: { label: "Queries", color: "#6366f1" },
  docs: { label: "Docs Indexed", color: "#8b5cf6" },
};

/* ─── component ─────────────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient<{ users: AdminUser[] }>("/analytics/users");
      if (res?.users) {
        setUsers(res.users);
      }
    } catch (e) {
      console.error("Failed to load users for admin:", e);
    }
  }, []);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await apiClient<{ feedback: FeedbackItem[] }>("/analytics/feedback");
      if (res?.feedback) {
        setFeedbackList(res.feedback);
      }
    } catch (e) {
      console.error("Failed to load feedback for admin:", e);
    }
  }, []);

  const fetchData = useCallback(async (p: Period) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<AnalyticsData>(`/analytics/stats?period=${p}`);
      setData(res);
      setIsAdmin(true);
      setLastRefresh(new Date());
      await fetchUsers();
      await fetchFeedback();
    } catch (e: any) {
      if (e?.status === 403 || e?.status === 401) {
        setIsAdmin(false);
      } else {
        setError(e?.message || "Failed to load telemetry.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchUsers, fetchFeedback]);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      await apiClient(`/analytics/users/${userId}/approve`, { method: "POST" });
      await fetchUsers();
    } catch (e) {
      console.error("Approval failed:", e);
      alert("Failed to approve user.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (userId: number) => {
    setActionLoading(userId);
    try {
      await apiClient(`/analytics/users/${userId}/toggle-active`, { method: "POST" });
      await fetchUsers();
    } catch (e) {
      console.error("Toggle active state failed:", e);
      alert("Failed to toggle user status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ${username}?`)) {
      return;
    }
    setActionLoading(userId);
    try {
      await apiClient(`/analytics/users/${userId}`, { method: "DELETE" });
      await fetchUsers();
    } catch (e) {
      console.error("Delete user failed:", e);
      alert("Failed to delete user.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateFeedbackStatus = async (id: number, status: "NEW" | "IN_PROGRESS" | "RESOLVED") => {
    try {
      await apiClient(`/analytics/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await fetchFeedback();
    } catch (e) {
      console.error("Update feedback status failed:", e);
      alert("Failed to update status.");
    }
  };

  const handleDeleteFeedback = async (id: number) => {
    if (!window.confirm("Delete this feedback item?")) return;
    try {
      await apiClient(`/analytics/feedback/${id}`, { method: "DELETE" });
      await fetchFeedback();
    } catch (e) {
      console.error("Delete feedback failed:", e);
      alert("Failed to delete feedback entry.");
    }
  };

  if (isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Restricted Area</h2>
        <p className="text-zinc-500 text-sm max-w-sm mb-6">
          Analytics and user administration are restricted to system administrators.
        </p>
      </div>
    );
  }

  const periods: { label: string; value: Period }[] = [
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "90D", value: "90d" },
    { label: "ALL", value: "all" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 pb-16 overflow-y-auto">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            {t.analytics.title}
          </h1>
          {lastRefresh && (
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Updated {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-zinc-900 border border-white/5 rounded-lg p-0.5 gap-0.5">
            {periods.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  period === p.value
                    ? "bg-indigo-600 text-white shadow"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchData(period)}
            disabled={isLoading}
            title="Refresh"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5 transition-all cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Export MD */}
          {data && (
            <button
              onClick={() => exportMarkdown(data, period)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-white/5 transition-all cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Export .md
            </button>
          )}
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
            <p className="text-zinc-500 text-xs">Loading metrics...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-red-950/20 border border-red-900/30 text-center max-w-md mx-auto space-y-4">
            <p className="text-sm text-red-400 font-medium">{error}</p>
            <button onClick={() => fetchData(period)} className="px-5 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all cursor-pointer">
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            {/* ── KPI CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                {
                  label: t.analytics.totalQueries,
                  value: data.kpi.total_queries.toLocaleString(),
                  icon: Activity, color: "text-indigo-400", bg: "bg-indigo-500/10",
                  sub: `${data.kpi.avg_queries_per_session} avg / session`,
                },
                {
                  label: t.analytics.activeUsers,
                  value: data.kpi.active_users.toLocaleString(),
                  icon: Users, color: "text-sky-400", bg: "bg-sky-500/10",
                  sub: `of ${data.kpi.total_users} total registered`,
                },
                {
                  label: t.analytics.indexedDocs,
                  value: data.kpi.indexed_documents.toLocaleString(),
                  icon: Database, color: "text-purple-400", bg: "bg-purple-500/10",
                  sub: `${data.kpi.total_storage_mb} MB storage`,
                },
                {
                  label: t.analytics.totalVectors,
                  value: data.kpi.total_vectors.toLocaleString(),
                  icon: Sparkles, color: "text-amber-400", bg: "bg-amber-500/10",
                  sub: "Dense + Sparse Embeddings",
                },
                {
                  label: "Total Latency",
                  value: `${data.telemetry.total_avg_sec.toFixed(2)}s`,
                  icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10",
                  sub: `LLM: ${data.telemetry.llm_avg_sec.toFixed(2)}s avg`,
                },
                {
                  label: "Token Speed",
                  value: `${data.telemetry.tokens_per_second_avg.toFixed(1)} t/s`,
                  icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10",
                  sub: `${data.telemetry.tokens_generated_total.toLocaleString()} total tokens`,
                },
                {
                  label: "DB Pool",
                  value: `${data.telemetry.pool.checked_out} / ${data.telemetry.pool.size}`,
                  icon: Server, color: "text-emerald-400", bg: "bg-emerald-500/10",
                  sub: `${data.telemetry.pool.checked_in} idle connections`,
                },
                {
                  label: t.analytics.serverUptime,
                  value: fmtUptime(data.server.uptime_seconds),
                  icon: CheckCircle2, color: "text-teal-400", bg: "bg-teal-500/10",
                  sub: `since ${new Date(data.server.started_at).toLocaleDateString()}`,
                },
              ].map((card, i) => (
                <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 hover:bg-zinc-900/70 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{card.label}</span>
                    <div className={`w-7 h-7 ${card.bg} rounded-lg flex items-center justify-center`}>
                      <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-white tracking-tight">{card.value}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* ── DAILY AREA CHART ── */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[14px] font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Daily Usage Trend
                  </h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Queries and indexed documents per day</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-medium">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />Queries
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />Docs
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.daily_series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="queriesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="docsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="queries" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#queriesGrad)" />
                      <Area type="monotone" dataKey="docs" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#docsGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>

            {/* ── LATENCY BREAKDOWN & SYSTEM THROUGHPUT ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-zinc-900/30 border border-white/5 rounded-3xl p-6">
                <h3 className="text-[14px] font-semibold text-white flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-orange-400" />
                  RAG Pipeline Latency Breakdown
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Dense Embedding (FastEmbed BGE)", val: data.telemetry.dense_avg_sec, color: "from-blue-500 to-indigo-500", ms: true },
                    { label: "Sparse Vector (BM25 / SPLADE)", val: data.telemetry.sparse_avg_sec, color: "from-sky-500 to-cyan-500", ms: true },
                    { label: "Cross-Encoder Reranker", val: data.telemetry.rerank_avg_sec, color: "from-purple-500 to-pink-500", ms: true },
                    { label: "Groq Cloud LLM Inference", val: data.telemetry.llm_avg_sec, color: "from-orange-500 to-amber-500", ms: false },
                  ].map((item, idx) => {
                    const total = data.telemetry.total_avg_sec || 1;
                    const pct = Math.min((item.val / total) * 100, 100);
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">{item.label}</span>
                          <span className="font-mono font-medium text-zinc-200">
                            {item.ms ? `${(item.val * 1000).toFixed(0)} ms` : `${item.val.toFixed(2)} s`}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DB Pool + LLM Throughput */}
              <div className="flex flex-col gap-4">
                <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 flex-1">
                  <h3 className="text-[13px] font-semibold text-white flex items-center gap-2 mb-4">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    Database Connection Pool
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { label: "Active connections", val: data.telemetry.pool.checked_out },
                      { label: "Idle connections", val: data.telemetry.pool.checked_in },
                      { label: "Pool size limit", val: data.telemetry.pool.size },
                      { label: "Overflow", val: Math.max(0, data.telemetry.pool.overflow ?? 0) },
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-zinc-400">{r.label}</span>
                        <span className="font-semibold text-white">{r.val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min((data.telemetry.pool.checked_out / (data.telemetry.pool.size || 10)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 flex-1">
                  <h3 className="text-[13px] font-semibold text-white flex items-center gap-2 mb-4">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    LLM Throughput
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Avg Generation Speed</p>
                      <p className="text-2xl font-bold text-white">
                        {data.telemetry.tokens_per_second_avg.toFixed(1)}
                        <span className="text-sm font-medium text-zinc-400 ml-1">t/s</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Total Tokens Generated</p>
                      <p className="text-lg font-bold text-white">{data.telemetry.tokens_generated_total.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── USER ONBOARDING & ACCESS CONTROL ───────────────────────────── */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    {t.analytics.userManagement}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Review and approve registered accounts before they gain workspace access.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                    Total Registered: {users.length}
                  </span>
                  {users.filter(u => !u.is_approved).length > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium animate-pulse">
                      {users.filter(u => !u.is_approved).length} Pending Approval
                    </span>
                  )}
                </div>
              </div>

              {users.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No registered users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                        <th className="pb-3 pl-2">User Email</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3">Approval Status</th>
                        <th className="pb-3">Account State</th>
                        <th className="pb-3 text-center">Indexed Docs</th>
                        <th className="pb-3 text-right pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3.5 pl-2 font-mono text-zinc-200">
                            {u.username}
                          </td>
                          <td className="py-3.5">
                            {u.is_admin ? (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold text-[10px]">
                                Admin
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                                User
                              </span>
                            )}
                          </td>
                          <td className="py-3.5">
                            {u.is_approved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                {t.analytics.approved}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                                <AlertCircle className="w-3 h-3" />
                                Pending Approval
                              </span>
                            )}
                          </td>
                          <td className="py-3.5">
                            {u.is_active ? (
                              <span className="text-zinc-300">Active</span>
                            ) : (
                              <span className="text-red-400 font-medium">Suspended</span>
                            )}
                          </td>
                          <td className="py-3.5 text-center text-zinc-400 font-mono">
                            {u.documents_count}
                          </td>
                          <td className="py-3.5 text-right pr-2 space-x-2">
                            {!u.is_approved && (
                              <button
                                onClick={() => handleApprove(u.id)}
                                disabled={actionLoading === u.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-semibold text-[11px] border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <UserCheck className="w-3 h-3" />
                                {t.analytics.approve}
                              </button>
                            )}
                            {!u.is_admin && (
                              <>
                                <button
                                  onClick={() => handleToggleActive(u.id)}
                                  disabled={actionLoading === u.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                                  title={u.is_active ? "Suspend account" : "Re-activate account"}
                                >
                                  {u.is_active ? <UserX className="w-3 h-3 text-amber-400" /> : <UserCheck className="w-3 h-3 text-emerald-400" />}
                                  {u.is_active ? t.analytics.suspend : t.analytics.activate}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  disabled={actionLoading === u.id}
                                  className="inline-flex items-center p-1 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── USER FEEDBACK & FEATURE REQUESTS BOARD ──────────────────────── */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    {t.analytics.feedbackBoard}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    User-submitted feature suggestions, optimization ideas, and bug reports.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                    Total: {feedbackList.length}
                  </span>
                </div>
              </div>

              {feedbackList.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">{t.analytics.noFeedback}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                        <th className="pb-3 pl-2">Type</th>
                        <th className="pb-3">User</th>
                        <th className="pb-3">Message</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {feedbackList.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3.5 pl-2">
                            {item.type === "IDEA" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-[10px]">
                                <Lightbulb className="w-3 h-3" /> Idea
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-[10px]">
                                <Bug className="w-3 h-3" /> Bug
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 font-mono text-zinc-300">
                            {item.user_email || `User #${item.user_id}`}
                          </td>
                          <td className="py-3.5 text-zinc-200 max-w-md break-words">
                            {item.message}
                          </td>
                          <td className="py-3.5 text-zinc-500 whitespace-nowrap">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5">
                            {item.status === "RESOLVED" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                                <Check className="w-3 h-3" /> {t.analytics.markResolved}
                              </span>
                            ) : item.status === "IN_PROGRESS" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-medium">
                                <Clock className="w-3 h-3" /> {t.analytics.markInProgress}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[11px]">
                                New
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-right pr-2 space-x-2 whitespace-nowrap">
                            {item.status !== "IN_PROGRESS" && item.status !== "RESOLVED" && (
                              <button
                                onClick={() => handleUpdateFeedbackStatus(item.id, "IN_PROGRESS")}
                                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-indigo-300 text-[11px] transition-colors cursor-pointer"
                              >
                                {t.analytics.markInProgress}
                              </button>
                            )}
                            {item.status !== "RESOLVED" && (
                              <button
                                onClick={() => handleUpdateFeedbackStatus(item.id, "RESOLVED")}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] transition-colors cursor-pointer"
                              >
                                {t.analytics.markResolved}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteFeedback(item.id)}
                              className="p-1 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </>
        ) : null}
      </div>
    </div>
  );
}