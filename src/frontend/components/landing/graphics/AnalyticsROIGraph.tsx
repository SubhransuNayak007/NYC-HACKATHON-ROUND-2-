"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Clock,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Users,
} from "lucide-react";

interface AnalyticsROIGraphProps {
  className?: string;
}

interface DataPoint {
  day: string;
  revenue: number;
  orders: number;
  leads: number;
}

const DATA_7D: DataPoint[] = [
  { day: "Mon", revenue: 28400, orders: 18, leads: 92 },
  { day: "Tue", revenue: 39500, orders: 26, leads: 134 },
  { day: "Wed", revenue: 34100, orders: 22, leads: 110 },
  { day: "Thu", revenue: 52800, orders: 38, leads: 185 },
  { day: "Fri", revenue: 64900, orders: 46, leads: 220 },
  { day: "Sat", revenue: 78300, orders: 58, leads: 290 },
  { day: "Sun", revenue: 94200, orders: 72, leads: 340 },
];

const DATA_30D: DataPoint[] = [
  { day: "W1", revenue: 142000, orders: 98, leads: 510 },
  { day: "W2", revenue: 218000, orders: 154, leads: 760 },
  { day: "W3", revenue: 305000, orders: 212, leads: 1040 },
  { day: "W4", revenue: 412000, orders: 289, leads: 1380 },
];

export function AnalyticsROIGraph({ className = "" }: AnalyticsROIGraphProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const activeData = timeRange === "7d" ? DATA_7D : DATA_30D;
  const maxRevenue = Math.max(...activeData.map((d) => d.revenue));

  // Compute SVG curve points for crisp vector path
  const svgWidth = 500;
  const svgHeight = 160;
  const paddingX = 30;
  const paddingY = 20;

  const points = activeData.map((d, i) => {
    const x = paddingX + (i / (activeData.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (d.revenue / maxRevenue) * (svgHeight - paddingY * 2);
    return { x, y, ...d };
  });

  // Build SVG path
  const pathD = points.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cx1 = prev.x + (curr.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) / 2;
    const cy2 = curr.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;

  return (
    <div className={`w-full rounded-2xl bg-white text-[#161616] p-4 sm:p-6 shadow-xl border border-black/10 overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-black/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#161616] uppercase tracking-wide flex items-center gap-2">
              <span>Conversion &amp; Revenue Analytics</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.2 rounded-full">
                +68.4% MoM
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Direct Sales Attributed to Automated DM &amp; Comment Flows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTimeRange("7d")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              timeRange === "7d"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-slate-600 hover:text-[#161616]"
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("30d")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              timeRange === "30d"
                ? "bg-white text-[#161616] shadow-xs"
                : "text-slate-600 hover:text-[#161616]"
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-black/5">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Automated Sales
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-600 font-mono mt-0.5">
            {timeRange === "7d" ? "₹3,92,200" : "₹10,77,000"}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> +42.8% vs Manual
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-black/5">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Response Speed
          </span>
          <div className="text-base sm:text-lg font-black text-blue-600 font-mono mt-0.5">
            1.4s
          </div>
          <span className="text-[10px] text-blue-700 font-semibold mt-0.5 block">
            (Was 4.2h manual)
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-black/5">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Lead Conversion
          </span>
          <div className="text-base sm:text-lg font-black text-[#EE7D60] font-mono mt-0.5">
            34.2%
          </div>
          <span className="text-[10px] text-[#EE7D60] font-semibold mt-0.5 block">
            3.8x Industry Avg
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-black/5">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">
            Hours Saved
          </span>
          <div className="text-base sm:text-lg font-black text-purple-600 font-mono mt-0.5">
            184 hrs/mo
          </div>
          <span className="text-[10px] text-purple-700 font-semibold mt-0.5 block">
            ₹92,000 Payroll Saved
          </span>
        </div>
      </div>

      {/* Main Vector SVG Revenue Growth Curve */}
      <div className="mt-4 bg-[#FAF8F5] p-4 rounded-xl border border-black/5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#161616] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#EE7D60]" />
            Revenue Growth Curve (Automated Social Checkouts)
          </span>
          {hoveredPoint ? (
            <span className="font-mono text-emerald-600 font-black text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {hoveredPoint.day}: ₹{hoveredPoint.revenue.toLocaleString("en-IN")} ({hoveredPoint.orders} Orders)
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">
              Hover datapoints for metrics
            </span>
          )}
        </div>

        {/* SVG Chart Container */}
        <div className="relative w-full h-44">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EE7D60" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#EE7D60" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            {[0.25, 0.5, 0.75].map((pct, i) => (
              <line
                key={i}
                x1={paddingX}
                y1={paddingY + pct * (svgHeight - paddingY * 2)}
                x2={svgWidth - paddingX}
                y2={paddingY + pct * (svgHeight - paddingY * 2)}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            ))}

            {/* Area Fill */}
            <path d={areaD} fill="url(#roiGradient)" />

            {/* Main Smooth Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#EE7D60"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Data Points */}
            {points.map((pt, idx) => (
              <g
                key={idx}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  className="fill-white stroke-[#EE7D60] stroke-[3] group-hover:scale-150 transition-transform origin-center"
                />
                <text
                  x={pt.x}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 font-mono font-bold"
                >
                  {pt.day}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Speed Benchmark Comparison Strip: 1.4s vs 4.2h */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Benchmark 1 */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-black/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-blue-700">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Response Speed Benchmark
            </span>
            <span className="text-[10px] text-emerald-600 font-mono font-bold">
              99.9% Faster
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 pb-0.5">
                <span>QuickReply AI Automation</span>
                <span className="font-bold text-emerald-600 font-mono">1.4 Seconds</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[99%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-500 pb-0.5">
                <span>Traditional Human Agent Support</span>
                <span className="font-mono text-slate-600">4.2 Hours</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full w-[8%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Channel Distribution Histogram */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-black/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-800">
              <BarChart3 className="w-3.5 h-3.5 text-[#EE7D60]" />
              Inbound Conversation Channel Split
            </span>
            <span className="text-[10px] text-slate-400 font-mono">14.2k Messages</span>
          </div>

          <div className="flex items-end gap-2 h-14 pt-2 text-[10px]">
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-[#E1306C] rounded-t-sm h-12" title="Instagram: 48%" />
              <span className="font-bold text-slate-600">IG (48%)</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-[#25D366] rounded-t-sm h-8" title="WhatsApp: 28%" />
              <span className="font-bold text-slate-600">WA (28%)</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-[#229ED9] rounded-t-sm h-5" title="Telegram: 12%" />
              <span className="font-bold text-slate-600">TG (12%)</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-[#0A66C2] rounded-t-sm h-3.5" title="LinkedIn: 8%" />
              <span className="font-bold text-slate-600">LI (8%)</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-[#1DA1F2] rounded-t-sm h-2" title="X: 4%" />
              <span className="font-bold text-slate-600">X (4%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
