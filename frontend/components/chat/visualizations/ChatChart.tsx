"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  Table as TableIcon, 
  Copy, 
  Check, 
  Download,
  AlertTriangle
} from "lucide-react";

export interface ChartConfig {
  type?: "bar" | "line" | "area" | "pie";
  title?: string;
  description?: string;
  xAxisKey?: string;
  data: Array<Record<string, any>>;
  series?: Array<{
    key: string;
    label?: string;
    color?: string;
  }>;
}

interface ChatChartProps {
  jsonString: string;
}

const DEFAULT_COLORS = ["#6366f1", "#10b981", "#06b6d4", "#f59e0b", "#ec4899", "#8b5cf6"];

export default function ChatChart({ jsonString }: ChatChartProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [copied, setCopied] = useState(false);

  const parsedConfig = useMemo<ChartConfig | null>(() => {
    try {
      let cleaned = jsonString.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```[a-z0-9_-]*\s*/i, "").replace(/```$/i, "").trim();
      }
      const data = JSON.parse(cleaned);
      if (Array.isArray(data)) {
        // If array of objects was passed directly
        return {
          type: "bar",
          data: data,
          xAxisKey: Object.keys(data[0] || {})[0] || "name",
        };
      }
      return data;
    } catch (err) {
      console.warn("Failed to parse chart JSON:", err);
      return null;
    }
  }, [jsonString]);

  if (!parsedConfig || !Array.isArray(parsedConfig.data) || parsedConfig.data.length === 0) {
    return (
      <div className="my-3 p-3.5 bg-zinc-900/60 border border-white/5 rounded-xl text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <AlertTriangle className="w-4 h-4" />
          <span>Invalid Chart Specification</span>
        </div>
        <pre className="overflow-x-auto text-[11px] text-zinc-300">{jsonString}</pre>
      </div>
    );
  }

  const {
    type = "bar",
    title = "Data Visualization",
    description,
    xAxisKey = Object.keys(parsedConfig.data[0] || {})[0] || "name",
    data,
    series: customSeries,
  } = parsedConfig;

  // Derive series keys if not explicitly defined
  const seriesKeys = useMemo(() => {
    if (customSeries && customSeries.length > 0) return customSeries;
    const firstRow = data[0] || {};
    const numericKeys = Object.keys(firstRow).filter(
      (k) => k !== xAxisKey && typeof firstRow[k] === "number"
    );
    return numericKeys.map((key, idx) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    }));
  }, [customSeries, data, xAxisKey]);

  const handleCopyData = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleExportCsv = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Custom Dark Mode Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950/95 border border-white/15 rounded-xl p-3 shadow-2xl backdrop-blur-xl text-xs space-y-1.5 min-w-[140px]">
          <p className="font-semibold text-white border-b border-white/10 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-3 text-zinc-300">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name || entry.dataKey}:
              </span>
              <span className="font-mono font-bold text-white">
                {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="my-4 rounded-2xl border border-white/10 bg-zinc-950/90 shadow-xl overflow-hidden backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-zinc-900/70 border-b border-white/5">
        <div className="flex items-center gap-2">
          {type === "bar" && <BarChart3 className="w-4 h-4 text-indigo-400" />}
          {type === "line" && <LineChartIcon className="w-4 h-4 text-emerald-400" />}
          {type === "area" && <LineChartIcon className="w-4 h-4 text-cyan-400" />}
          {type === "pie" && <PieChartIcon className="w-4 h-4 text-amber-400" />}
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">{title}</h4>
            {description && <p className="text-[10px] text-zinc-400">{description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
          >
            {viewMode === "chart" ? (
              <>
                <TableIcon className="w-3 h-3 text-indigo-400" />
                <span>Table</span>
              </>
            ) : (
              <>
                <BarChart3 className="w-3 h-3 text-emerald-400" />
                <span>Chart</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyData}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            title="Copy Raw Data"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === "table" ? (
        <div className="p-4 overflow-x-auto max-h-72 custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                {Object.keys(data[0] || {}).map((header) => (
                  <th key={header} className="py-2 px-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] text-zinc-200">
                  {Object.keys(data[0] || {}).map((header) => (
                    <td key={`${idx}-${header}`} className="py-2 px-3 font-mono text-[11px]">
                      {typeof row[header] === "number" ? row[header].toLocaleString() : String(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            {type === "line" ? (
              <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey={xAxisKey} stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                {seriesKeys.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: s.color }}
                    activeDot={{ r: 5, fill: "#ffffff" }}
                  />
                ))}
              </LineChart>
            ) : type === "area" ? (
              <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey={xAxisKey} stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                {seriesKeys.map((s, idx) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            ) : type === "pie" ? (
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Pie
                  data={data}
                  dataKey={seriesKeys[0]?.key || "value"}
                  nameKey={xAxisKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                      stroke="#09090b"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              /* Bar Chart (Default) */
              <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey={xAxisKey} stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                {seriesKeys.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
