"use client";

import React, { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Activity, Database, Server, Zap, Loader2, Clock, ThumbsUp, ThumbsDown, ShieldAlert, BarChart2 } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { apiClient } from "@/lib/api/client";

interface AnalyticsData {
  kpi: {
    total_queries: number;
    indexed_documents: number;
    total_users: number;
    avg_queries_per_session: number;
    total_storage_mb: number;
    total_vectors: number;
  };
  chart_data: any[];
  telemetry?: {
    dense_avg_sec: number;
    sparse_avg_sec: number;
    rerank_avg_sec: number;
    llm_avg_sec: number;
    total_avg_sec: number;
    tokens_per_second_avg: number;
    tokens_generated_total: number;
    thumbs_up: number;
    thumbs_down: number;
    pool: {
      size: number;
      checked_in: number;
      checked_out: number;
      overflow: number;
    };
  };
}

const chartConfig = {
  queries: {
    label: "RAG Queries",
    color: "hsl(var(--chart-1))", 
  },
  docs: {
    label: "Indexed Docs",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAdminAndFetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Verify user is admin
      const user = await apiClient<{ is_admin: boolean }>("/auth/me");
      if (!user?.is_admin) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      setIsAdmin(true);

      // 2. Fetch stats
      const result = await apiClient<AnalyticsData>("/analytics/stats");
      setData(result);
    } catch (e: any) {
      console.error("Failed to fetch analytics:", e);
      if (e.status === 403) {
        setIsAdmin(false);
      } else {
        setError(e.message || "Failed to fetch analytics data from server.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  if (isAdmin === false) {
    return (
      <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/30 border border-white/5 rounded-3xl p-8 text-center space-y-6 backdrop-blur-sm shadow-xl">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white tracking-tight">Access Denied</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              This panel is restricted to system administrators. Please log in with an administrator account to view performance statistics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 overflow-y-auto">
      
      {/* 1. ENTERPRISE HEADER */}
      <header className="relative w-full h-16 px-6 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl z-30 flex items-center gap-4 shrink-0">
        <div className="flex flex-col justify-center">
          <h1 className="text-[15px] font-semibold text-white tracking-tight flex items-center gap-2">
            System Analytics & Telemetry
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              Live
            </span>
          </h1>
          <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
            Real-time performance metrics, RAG latency, and database pool telemetry
          </p>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-zinc-500 text-xs font-medium">Loading system metrics...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-red-950/20 border border-red-900/30 text-center max-w-md mx-auto space-y-4 my-auto">
            <p className="text-sm text-red-400 font-medium">{error}</p>
            <button 
              onClick={checkAdminAndFetchData}
              className="px-5 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
              {[
                { title: "Total Queries", value: data.kpi.total_queries, icon: Activity, color: "text-blue-400" },
                { title: "Indexed Documents", value: data.kpi.indexed_documents, icon: Database, color: "text-purple-400" },
                { title: "Total Users", value: data.kpi.total_users, icon: Server, color: "text-indigo-400" },
                { title: "Avg Queries/Session", value: data.kpi.avg_queries_per_session, icon: Activity, color: "text-pink-400" },
                { title: "Storage Used (MB)", value: data.kpi.total_storage_mb, icon: Database, color: "text-emerald-400" },
                { title: "Vector Count", value: data.kpi.total_vectors, icon: Zap, color: "text-orange-400" },
              ].map((stat, index) => (
                <div key={index} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md shadow-lg hover:bg-zinc-900/60 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{stat.title}</p>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-white mt-4 tracking-tight">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Advanced Telemetry Section */}
            {data.telemetry && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                {/* RAG & LLM Latency Telemetry */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between">
                  <div className="mb-6">
                    <h3 className="text-[14px] font-semibold text-white tracking-tight flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      RAG & LLM Latency Breakdown
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-1">Average execution durations across query pipelines</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Dense Search Latency", value: `${(data.telemetry.dense_avg_sec * 1000).toFixed(0)} ms`, pct: Math.min((data.telemetry.dense_avg_sec / 1.5) * 100, 100), color: "bg-blue-500" },
                      { label: "Sparse Search Latency", value: `${(data.telemetry.sparse_avg_sec * 1000).toFixed(0)} ms`, pct: Math.min((data.telemetry.sparse_avg_sec / 1.5) * 100, 100), color: "bg-purple-500" },
                      { label: "Reranker Latency", value: `${(data.telemetry.rerank_avg_sec * 1000).toFixed(0)} ms`, pct: Math.min((data.telemetry.rerank_avg_sec / 1.5) * 100, 100), color: "bg-pink-500" },
                      { label: "LLM Generation Latency", value: `${data.telemetry.llm_avg_sec.toFixed(2)} sec`, pct: Math.min((data.telemetry.llm_avg_sec / 8.0) * 100, 100), color: "bg-indigo-500" },
                      { label: "Total Response Latency", value: `${data.telemetry.total_avg_sec.toFixed(2)} sec`, pct: Math.min((data.telemetry.total_avg_sec / 10.0) * 100, 100), color: "bg-emerald-500" },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-zinc-400">{item.label}</span>
                          <span className="text-white font-semibold">{item.value}</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connection Pool & Feedback Health */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Database Pool Connection Status */}
                  <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between bg-zinc-900/40">
                    <div>
                      <h3 className="text-[13px] font-semibold text-white tracking-tight flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-emerald-400" />
                        Database Pool Health
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Active SQLAlchemy connections status</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Checked Out (Active)</span>
                        <span className="text-white font-semibold">{data.telemetry.pool.checked_out}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Checked In (Idle)</span>
                        <span className="text-white font-semibold">{data.telemetry.pool.checked_in}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Pool Size Limit</span>
                        <span className="text-white font-semibold">{data.telemetry.pool.size}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Pool Overflow</span>
                        <span className="text-white font-semibold">{Math.max(0, data.telemetry.pool.overflow ?? 0)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mt-2">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all" 
                        style={{ width: `${Math.min((data.telemetry.pool.checked_out / (data.telemetry.pool.size || 10)) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>

                  {/* Token Throughput & User Feedback */}
                  <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-[13px] font-semibold text-white tracking-tight flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-orange-400" />
                        LLM Token Output
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Token generation performance</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-zinc-400">Avg Generation Speed</div>
                      <div className="text-xl font-bold text-white tracking-tight">{data.telemetry.tokens_per_second_avg.toFixed(1)} <span className="text-xs font-semibold text-zinc-500">t/s</span></div>
                    </div>
                    <div className="border-t border-white/5 pt-3">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-zinc-400 font-medium">User Feedback Ratio</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <div className="flex items-center gap-1 text-emerald-400">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{data.telemetry.thumbs_up}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-400">
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>{data.telemetry.thumbs_down}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Usage Overview Chart */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl animate-in fade-in duration-300">
              <div className="mb-8">
                <h2 className="text-[15px] font-semibold text-white tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-400" />
                  Usage Overview
                </h2>
                <p className="text-[12px] text-zinc-500 mt-1">Query volume vs Indexed documents over the last 6 months</p>
              </div>
              
              <div className="h-[350px] w-full">
                {data.chart_data && (
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#71717a', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#71717a', fontSize: 12 }}
                        />
                        <ChartTooltip 
                          cursor={{ fill: '#ffffff05' }} 
                          content={<ChartTooltipContent className="bg-zinc-950/90 border-white/10 backdrop-blur-xl shadow-2xl text-white" />} 
                        />
                        <Bar dataKey="queries" fill="var(--color-queries)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="docs" fill="var(--color-docs)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </div>
            </div>
          </>
        ) : null}

      </div>
    </div>
  );
}