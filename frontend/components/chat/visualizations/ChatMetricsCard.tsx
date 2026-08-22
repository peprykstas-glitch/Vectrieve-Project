"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

export interface MetricItem {
  label: string;
  value: string | number;
  change?: string;
  trend?: "positive" | "negative" | "neutral";
  subtitle?: string;
}

interface ChatMetricsProps {
  jsonString: string;
}

export default function ChatMetricsCard({ jsonString }: ChatMetricsProps) {
  const metrics = useMemo<MetricItem[]>(() => {
    try {
      let cleaned = jsonString.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```[a-z0-9_-]*\s*/i, "").replace(/```$/i, "").trim();
      }
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.metrics && Array.isArray(parsed.metrics)) return parsed.metrics;
      return [];
    } catch {
      return [];
    }
  }, [jsonString]);

  if (!metrics || metrics.length === 0) {
    return null;
  }

  return (
    <div className="my-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {metrics.map((item, idx) => {
        const isPos = item.trend === "positive" || (item.change && item.change.startsWith("+"));
        const isNeg = item.trend === "negative" || (item.change && item.change.startsWith("-"));

        return (
          <div
            key={idx}
            className="p-3.5 rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-2 hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider truncate">
                {item.label}
              </span>
              <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-mono">
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>

              {item.change && (
                <div
                  className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isPos
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : isNeg
                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                  }`}
                >
                  {isPos && <TrendingUp className="w-3 h-3" />}
                  {isNeg && <TrendingDown className="w-3 h-3" />}
                  {!isPos && !isNeg && <Minus className="w-3 h-3" />}
                  <span>{item.change}</span>
                </div>
              )}
            </div>

            {item.subtitle && (
              <p className="text-[10px] text-zinc-500 border-t border-white/5 pt-1.5 line-clamp-1">
                {item.subtitle}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
