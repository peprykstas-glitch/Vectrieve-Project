"use client";

import React, { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Activity, Database, Server, Zap, Loader2 } from "lucide-react";
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
}

// Конфігурація кольорів (Використовуємо системні змінні замість HEX)
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
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient<AnalyticsData>("/analytics/stats");
      setData(result);
    } catch (e: any) {
      console.error("Failed to fetch analytics:", e);
      setError(e.message || "Failed to fetch analytics data from server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 overflow-y-auto">
      
      {/* 1. ENTERPRISE HEADER WITH SIDEBAR TRIGGER */}
      <header className="relative w-full h-16 px-6 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl z-30 flex items-center gap-4 shrink-0">
        <div className="flex flex-col justify-center">
          <h1 className="text-[15px] font-semibold text-white tracking-tight flex items-center gap-2">
            System Analytics
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[9px] font-bold uppercase tracking-wider text-zinc-300">
              Live
            </span>
          </h1>
          <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
            Real-time performance metrics and RAG usage
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
              onClick={fetchData}
              className="px-5 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : data ? (
          <>
            {/* KPI Cards (Скляні картки) */}
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

            {/* Main Chart Area */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl animate-in fade-in duration-300">
              <div className="mb-8">
                <h2 className="text-[15px] font-semibold text-white tracking-tight">Usage Overview</h2>
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
                        {/* Скляний Tooltip з Shadcn */}
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