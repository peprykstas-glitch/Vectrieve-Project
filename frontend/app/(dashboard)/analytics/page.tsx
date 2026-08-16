"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer,
} from "recharts";
import {
  Activity, Database, Users, Zap, Loader2, Clock, ThumbsUp, ThumbsDown,
  ShieldAlert, BarChart2, Server, Download, RefreshCw, CheckCircle2,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { apiClient } from "@/lib/api/client";

/* ─── types ────────────────────────────────────────────────────────────────── */
type Period = "7d" | "30d" | "90d" | "all";

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
    satisfaction_rate: number | null;
    thumbs_up: number;
    thumbs_down: number;
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
    `| Satisfaction Rate | ${data.kpi.satisfaction_rate !== null ? data.kpi.satisfaction_rate + "%" : "No feedback yet"} |`,
    `| 👍 Thumbs Up | ${data.kpi.thumbs_up} |`,
    `| 👎 Thumbs Down | ${data.kpi.thumbs_down} |`,
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
  docs:    { label: "Docs Indexed", color: "#8b5cf6" },
};

/* ─── component ─────────────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async (p: Period) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isAdmin === null) {
        const user = await apiClient<{ is_admin: boolean }>("/auth/me");
        if (!user?.is_admin) { setIsAdmin(false); setIsLoading(false); return; }
        setIsAdmin(true);
      }
      const result = await apiClient<AnalyticsData>(`/analytics/stats?period=${p}`);
      setData(result);
      setLastRefresh(new Date());
    } catch (e: any) {
      if (e.status === 403) { setIsAdmin(false); }
      else { setError(e.message || "Failed to fetch analytics."); }
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchData(period); }, [period]);

  /* ─── access denied ───────────────────────────────────────────────────────── */
  if (isAdmin === false) {
    return (
      <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/30 border border-white/5 rounded-3xl p-8 text-center space-y-6">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-white">Access Denied</h2>
          <p className="text-xs text-zinc-500">Admin access only.</p>
        </div>
      </div>
    );
  }

  const periods: { value: Period; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "all", label: "All Time" },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 overflow-y-auto">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 w-full h-14 px-6 border-b border-white/5 bg-zinc-950/90 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[14px] font-semibold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            Analytics & Telemetry
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold uppercase text-emerald-400">
              Admin
            </span>
          </h1>
          {lastRefresh && (
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Last updated {lastRefresh.toLocaleTimeString()}
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
            <p className="text-zinc-500 text-xs">Loading metrics…</p>
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
                  label: "Total Queries",
                  value: data.kpi.total_queries.toLocaleString(),
                  icon: Activity, color: "text-indigo-400", bg: "bg-indigo-500/10",
                  sub: `${data.kpi.avg_queries_per_session} avg / session`,
                },
                {
                  label: "Active Users",
                  value: data.kpi.active_users.toLocaleString(),
                  icon: Users, color: "text-sky-400", bg: "bg-sky-500/10",
                  sub: `of ${data.kpi.total_users} total users`,
                },
                {
                  label: "Indexed Documents",
                  value: data.kpi.indexed_documents.toLocaleString(),
                  icon: Database, color: "text-purple-400", bg: "bg-purple-500/10",
                  sub: `${data.kpi.total_storage_mb} MB · ${data.kpi.total_vectors.toLocaleString()} vectors`,
                },
                {
                  label: "Satisfaction Rate",
                  value: data.kpi.satisfaction_rate !== null ? `${data.kpi.satisfaction_rate}%` : "–",
                  icon: data.kpi.satisfaction_rate !== null && data.kpi.satisfaction_rate >= 70 ? ThumbsUp : ThumbsDown,
                  color: data.kpi.satisfaction_rate !== null && data.kpi.satisfaction_rate >= 70 ? "text-emerald-400" : "text-amber-400",
                  bg: data.kpi.satisfaction_rate !== null && data.kpi.satisfaction_rate >= 70 ? "bg-emerald-500/10" : "bg-amber-500/10",
                  sub: `${data.kpi.thumbs_up} 👍  ${data.kpi.thumbs_down} 👎`,
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
                  label: "Server Uptime",
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
                    <span className="w-2 h-2 rounded-full bg-violet-500" />Docs
                  </span>
                </div>
              </div>
              <div className="h-[260px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.daily_series} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gQueries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gDocs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#52525b", fontSize: 10 }}
                        dy={8}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#52525b", fontSize: 10 }} />
                      <ChartTooltip
                        cursor={{ stroke: "#ffffff10" }}
                        content={<ChartTooltipContent className="bg-zinc-950/95 border-white/10 text-white text-xs" />}
                      />
                      <Area dataKey="queries" stroke="#6366f1" strokeWidth={2} fill="url(#gQueries)" dot={false} />
                      <Area dataKey="docs"    stroke="#8b5cf6" strokeWidth={2} fill="url(#gDocs)"    dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>

            {/* ── RAG PIPELINE LATENCY ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6">
                <h3 className="text-[13px] font-semibold text-white flex items-center gap-2 mb-5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  RAG Pipeline Latency
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Dense Search",   ms: data.telemetry.dense_avg_sec  * 1000, max: 500,  color: "from-blue-500 to-blue-600" },
                    { label: "Sparse Search",  ms: data.telemetry.sparse_avg_sec * 1000, max: 500,  color: "from-violet-500 to-violet-600" },
                    { label: "Reranker",       ms: data.telemetry.rerank_avg_sec * 1000, max: 1000, color: "from-pink-500 to-pink-600" },
                    { label: "LLM Generation", ms: data.telemetry.llm_avg_sec    * 1000, max: 5000, color: "from-indigo-500 to-indigo-600" },
                    { label: "Total Response", ms: data.telemetry.total_avg_sec  * 1000, max: 8000, color: "from-emerald-500 to-emerald-600" },
                  ].map((item, idx) => {
                    const pct = Math.min((item.ms / item.max) * 100, 100);
                    const display = item.ms >= 1000 ? `${(item.ms / 1000).toFixed(2)}s` : `${item.ms.toFixed(0)}ms`;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">{item.label}</span>
                          <span className="font-semibold text-white font-mono">{display}</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
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

              {/* DB pool + token throughput */}
              <div className="flex flex-col gap-4">
                {/* Pool */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 flex-1">
                  <h3 className="text-[13px] font-semibold text-white flex items-center gap-2 mb-4">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    Database Pool
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { label: "Active connections",  val: data.telemetry.pool.checked_out },
                      { label: "Idle connections",    val: data.telemetry.pool.checked_in  },
                      { label: "Pool size limit",     val: data.telemetry.pool.size        },
                      { label: "Overflow",            val: Math.max(0, data.telemetry.pool.overflow ?? 0) },
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

                {/* Token throughput */}
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
          </>
        ) : null}
      </div>
    </div>
  );
}