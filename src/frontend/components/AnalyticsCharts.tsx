"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/frontend/store";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart as PieIcon,
  Activity,
  ListOrdered,
  Clock,
  Target,
  CheckCircle,
  Smile,
  Users,
  Zap,
  DollarSign,
  Award,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
} from "lucide-react";

interface KPIs {
  commentsProcessed: number;
  matchAccuracy: string;
  hoursSaved: string;
  repliesSent: number;
}

interface RepliesPerDay { date: string; replies: number; }
interface TopKeyword { keyword: string; count: number; }
interface OutcomeEntry { name: string; value: number; color: string; }
interface RulePerformance { id: string; name: string; triggerCount: number; confidence: string; replyRate: string; }

interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  question: number;
  spam: number;
}

interface SentimentTrend {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

interface AnalyticsData {
  kpis: KPIs;
  repliesPerDay: RepliesPerDay[];
  topKeywords: TopKeyword[];
  outcomeBreakdown: OutcomeEntry[];
  rulePerformance: RulePerformance[];
  sentimentBreakdown: SentimentBreakdown;
  sentimentTrend: SentimentTrend[];
  goldenHourStats?: { total: number; replied: number; rate: number };
  avgReplyLatencySeconds?: number;
}

const item: any = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const CHART_COLORS = ["#0038FF", "#FFD60A", "#10b981", "#a855f7", "#e0002b"];

export default function AnalyticsCharts() {
  const activeChannelId = useUIStore((state) => state.activeChannelId);
  const refreshTrigger = useUIStore((state) => state.refreshTrigger);

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "insights" | "roi">("overview");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [analyticsRes, insightsRes] = await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/analytics/insights"),
        ]);
        if (analyticsRes.ok) setData(await analyticsRes.json());
        if (insightsRes.ok) setInsights(await insightsRes.json());
      } catch (err) { console.error("Error fetching analytics:", err); }
      finally { setLoading(false); }
    }
    if (mounted) fetchAnalytics();
  }, [mounted, activeChannelId, refreshTrigger]);

  if (!mounted || loading || !data) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-premium glass-card p-5 space-y-3">
            <div className="h-4 w-1/3 shimmer rounded-full" />
            <div className="h-32 shimmer rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const { kpis, repliesPerDay, topKeywords, outcomeBreakdown, rulePerformance, sentimentBreakdown, sentimentTrend, goldenHourStats, avgReplyLatencySeconds } = data;

  const goldenRate = goldenHourStats?.rate ?? 0;
  const goldenReplied = goldenHourStats?.replied ?? 0;
  const goldenTotal = goldenHourStats?.total ?? 0;
  const latencySeconds = avgReplyLatencySeconds ?? 0;

  const SENTIMENT_COLORS = {
    positive: "#10b981",
    neutral: "#0038FF",
    negative: "#e0002b",
    question: "#FFD60A",
    spam: "#94a3b8",
  };

  const sentimentPieData = [
    { name: "Positive", value: sentimentBreakdown.positive },
    { name: "Neutral", value: sentimentBreakdown.neutral },
    { name: "Negative", value: sentimentBreakdown.negative },
    { name: "Question", value: sentimentBreakdown.question },
    { name: "Spam", value: sentimentBreakdown.spam },
  ];
  const SENTIMENT_PIE_COLORS = [
    SENTIMENT_COLORS.positive,
    SENTIMENT_COLORS.neutral,
    SENTIMENT_COLORS.negative,
    SENTIMENT_COLORS.question,
    SENTIMENT_COLORS.spam,
  ];

  const kpiCards = [
    { label: "Comments Processed", value: kpis.commentsProcessed, icon: Activity, bg: "bg-navy-500/8", iconCls: "text-navy-500" },
    { label: "Match Accuracy", value: kpis.matchAccuracy, icon: Target, bg: "bg-mint-500/10", iconCls: "text-mint-600" },
    { label: "Hours Saved", value: kpis.hoursSaved, icon: Clock, bg: "bg-volt-500/10", iconCls: "text-volt-700" },
    { label: "Replies Sent", value: kpis.repliesSent, icon: CheckCircle, bg: "bg-purple-500/10", iconCls: "text-purple-600" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-strong rounded-xl px-3 py-2 shadow-elevated border border-surface-200/60 text-xs">
        <p className="font-bold text-ink-800">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-ink-600 font-medium">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart2 },
    { id: "insights" as const, label: "Smart Insights", icon: Zap },
    { id: "roi" as const, label: "ROI & Impact", icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-100/80 border border-surface-200/60 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 focus-ring
              ${activeTab === tab.id
                ? "bg-surface-0 text-navy-600 shadow-sm"
                : "text-ink-400 hover:text-ink-700"
              }
            `}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            variants={item}
            initial="hidden"
            animate="show"
            transition={{ delay: idx * 0.05 }}
            className="card-premium glass-card p-4 flex items-center justify-between"
          >
            <div className="text-left space-y-1">
              <span className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block">{kpi.label}</span>
              <span className="font-display text-lg font-bold text-ink-800">{kpi.value}</span>
            </div>
            <div className={`h-10 w-10 ${kpi.bg} rounded-xl flex items-center justify-center`}>
              <kpi.icon className={`h-5 w-5 ${kpi.iconCls}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Golden Hour Momentum — animated energy ring powered by the backend goldenHourStats */}
      <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card relative overflow-hidden p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <div
              className="energy-ring absolute inset-0 rounded-full"
              style={{ "--ring": goldenRate } as React.CSSProperties}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-extrabold text-ink-800">{goldenRate}%</span>
              <span className="text-[9px] font-bold text-ink-400 uppercase tracking-[0.12em]">Reply Rate</span>
            </div>
          </div>

          <div className="flex-1 min-w-[220px] space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-volt-500/15 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-volt-700" />
              </div>
              <h4 className="font-display text-sm font-bold text-ink-800">
                Golden Hour <span className="aurora-text">Momentum</span>
              </h4>
            </div>
            <p className="text-[11px] text-ink-500 leading-relaxed">
              Comments answered within the first 60 minutes of publish — the window where engagement peaks and algorithms amplify.
            </p>
            <div className="flex gap-3 flex-wrap pt-1">
              <div className="rounded-xl bg-surface-50/80 border border-surface-200/60 px-3 py-2">
                <span className="text-[9px] font-bold text-ink-400 uppercase tracking-wider block">Replied</span>
                <span className="font-display text-sm font-bold text-mint-600">
                  {goldenReplied.toLocaleString()}
                  <span className="text-ink-400 text-xs font-semibold"> / {goldenTotal.toLocaleString()}</span>
                </span>
              </div>
              <div className="rounded-xl bg-surface-50/80 border border-surface-200/60 px-3 py-2">
                <span className="text-[9px] font-bold text-ink-400 uppercase tracking-wider block">Avg Reply Latency</span>
                <span className="font-display text-sm font-bold text-navy-600">{latencySeconds.toLocaleString()}s</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-volt-500/10 border border-volt-200/50 px-3 py-1.5 text-[10px] font-bold text-volt-700">
            <Timer className="h-3 w-3" /> First 60 min = peak engagement
          </div>
        </div>
      </motion.div>

      {/* Primary Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line Chart */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-5 lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
            <div className="h-8 w-8 rounded-xl bg-navy-500/8 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-navy-500" />
            </div>
            <h4 className="font-display text-sm font-bold text-ink-800">Replies Sent (Last 30 Days)</h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={repliesPerDay} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="replies" stroke="#0038FF" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#0038FF", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Donut Chart */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-5 flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
            <div className="h-8 w-8 rounded-xl bg-volt-500/10 flex items-center justify-center">
              <PieIcon className="h-4 w-4 text-volt-700" />
            </div>
            <h4 className="font-display text-sm font-bold text-ink-800">Reply Outcomes</h4>
          </div>
          <div className="h-48 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={outcomeBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">
                  {outcomeBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-ink-400 uppercase">Success</span>
              <span className="font-display text-base font-bold text-ink-800">{kpis.matchAccuracy}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-ink-500 mt-2">
            {outcomeBreakdown.map((itm: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                <span className="truncate">{itm.name}: <span className="text-ink-700">{itm.value}</span></span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Keywords + Rule Performance */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Keywords Bar Chart */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-5 flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
            <div className="h-8 w-8 rounded-xl bg-mint-500/10 flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-mint-600" />
            </div>
            <h4 className="font-display text-sm font-bold text-ink-800">Top Triggered Keywords</h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topKeywords} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis dataKey="keyword" type="category" stroke="#94a3b8" width={75} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#0038FF" radius={[0, 6, 6, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Rule Performance Table */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-5 flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <ListOrdered className="h-4 w-4 text-purple-600" />
            </div>
            <h4 className="font-display text-sm font-bold text-ink-800">Rule Trigger Metrics</h4>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-surface-200/60 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  <th className="py-2.5 font-bold">Rule</th>
                  <th className="py-2.5 font-bold text-right">Triggers</th>
                  <th className="py-2.5 font-bold text-right">Confidence</th>
                  <th className="py-2.5 font-bold text-right">Reply Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200/60 text-ink-700">
                {rulePerformance.map((item: any) => (
                  <tr key={item.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="py-3 font-semibold text-ink-800">{item.name}</td>
                    <td className="py-3 text-right font-medium">{item.triggerCount}</td>
                    <td className="py-3 text-right font-medium">{item.confidence}</td>
                    <td className="py-3 text-right">
                      <span className={`px-1.5 py-0.5 rounded-lg font-bold text-[10px] ${
                        item.replyRate !== "0%" ? "bg-mint-50 text-mint-600 border border-mint-200/60" : "bg-surface-100 text-ink-400"
                      }`}>
                        {item.replyRate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-surface-200/60 pt-3 mt-3 text-right">
            <span className="text-[10px] text-ink-400 font-medium italic">
              All stats recalculate dynamically based on active rules.
            </span>
          </div>
        </motion.div>
      </div>
      {/* Sentiment Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sentiment Breakdown Donut */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-5 flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
            <div className="h-8 w-8 rounded-xl bg-mint-500/10 flex items-center justify-center">
              <Smile className="h-4 w-4 text-mint-600" />
            </div>
            <h4 className="font-display text-sm font-bold text-ink-800">Comment Sentiment Distribution</h4>
          </div>
          <div className="h-48 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">
                  {sentimentPieData.map((entry: any, index: number) => (
                    <Cell key={`sentiment-cell-${index}`} fill={SENTIMENT_PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-ink-400 uppercase">Total</span>
              <span className="font-display text-base font-bold text-ink-800">
                {sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.negative + sentimentBreakdown.question + sentimentBreakdown.spam}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-ink-500 mt-2">
            {sentimentPieData.map((itm: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: SENTIMENT_PIE_COLORS[idx] }} />
                <span className="truncate">{itm.name}: <span className="text-ink-700">{itm.value}</span></span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sentiment Trend Stacked Area */}
        <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-5 lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
            <div className="h-8 w-8 rounded-xl bg-coral-500/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-coral-600" />
            </div>
            <h4 className="font-display text-sm font-bold text-ink-800">Sentiment Trend (30 Days)</h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sentimentTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="positive" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
                <Area type="monotone" dataKey="neutral" stackId="1" stroke="#0038FF" fill="#0038FF" fillOpacity={0.25} strokeWidth={2} />
                <Area type="monotone" dataKey="negative" stackId="1" stroke="#e0002b" fill="#e0002b" fillOpacity={0.25} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-semibold text-ink-500 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: "#10b981" }} />
              <span>Positive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: "#0038FF" }} />
              <span>Neutral</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: "#e0002b" }} />
              <span>Negative</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SMART INSIGHTS TAB
         ═══════════════════════════════════════════════════════ */}
      {activeTab === "insights" && insights && (
        <div className="space-y-6">
          {/* Response Time Impact */}
          <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-6">
            <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-5">
              <div className="h-8 w-8 rounded-xl bg-navy-500/8 flex items-center justify-center">
                <Timer className="h-4 w-4 text-navy-500" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-ink-800">Response Time → Algorithmic Impact</h4>
                <p className="text-[10px] text-ink-400 mt-0.5">How faster replies boost your video ranking</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mb-4">
              <div className="rounded-xl bg-surface-50/80 border border-surface-200/40 p-4 text-center">
                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider block">Avg Response</span>
                <span className="font-display text-2xl font-bold text-navy-600 mt-1">{insights.responseTime?.avgResponseTime || 0}m</span>
              </div>
              <div className="rounded-xl bg-mint-50/80 border border-mint-200/40 p-4 text-center">
                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider block">Fast Reply Engagement</span>
                <span className="font-display text-2xl font-bold text-mint-600 mt-1">{insights.responseTime?.fastEngagementRate || 0}%</span>
                <span className="text-[10px] text-mint-500 font-medium">≤5 min replies</span>
              </div>
              <div className="rounded-xl bg-coral-50/80 border border-coral-200/40 p-4 text-center">
                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider block">Slow Reply Engagement</span>
                <span className="font-display text-2xl font-bold text-coral-500 mt-1">{insights.responseTime?.slowEngagementRate || 0}%</span>
                <span className="text-[10px] text-coral-400 font-medium">&gt;5 min replies</span>
              </div>
            </div>

            {/* Algorithmic Boost Score */}
            <div className="rounded-xl bg-gradient-to-r from-navy-500/5 to-purple-500/5 border border-navy-200/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ink-700">Algorithmic Boost Score</span>
                <span className="font-display text-lg font-bold text-navy-600">{insights.responseTime?.algorithmicBoostScore || 0}/100</span>
              </div>
              <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-navy-500 to-purple-500 rounded-full transition-all duration-1000"
                  style={{ width: `${insights.responseTime?.algorithmicBoostScore || 0}%` }}
                />
              </div>
              <p className="text-[10px] text-ink-500 mt-2 leading-relaxed">
                {insights.responseTime?.fastEngagementRate > insights.responseTime?.slowEngagementRate
                  ? `Fast replies get ${(insights.responseTime.fastEngagementRate - insights.responseTime.slowEngagementRate)}% more engagement — your speed directly impacts video ranking.`
                  : "Keep replying quickly to maintain your algorithmic advantage."}
              </p>
            </div>
          </motion.div>

          {/* Top Commenters Leaderboard */}
          <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-6">
            <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
              <div className="h-8 w-8 rounded-xl bg-volt-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-volt-700" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-ink-800">Top Commenters Leaderboard</h4>
                <p className="text-[10px] text-ink-400 mt-0.5">Identify superfans for community building</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-surface-200/60 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    <th className="py-2 font-bold">#</th>
                    <th className="py-2 font-bold">Commenter</th>
                    <th className="py-2 font-bold text-right">Comments</th>
                    <th className="py-2 font-bold text-right">Replies Received</th>
                    <th className="py-2 font-bold text-right">Sentiment</th>
                    <th className="py-2 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/60">
                  {(insights.topCommenters || []).slice(0, 10).map((c: any, idx: number) => (
                    <tr key={c.author} className="hover:bg-surface-50/80 transition-colors">
                      <td className="py-2.5 font-bold text-ink-400">{idx + 1}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          {c.authorAvatar ? (
                            <img src={c.authorAvatar} alt={c.author} className="h-6 w-6 rounded-lg object-cover border border-surface-200" />
                          ) : (
                            <div className="h-6 w-6 rounded-lg bg-navy-500/10 flex items-center justify-center text-[8px] font-bold text-navy-600">
                              {c.author?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                          <span className="font-bold text-ink-800">{c.author}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-medium">{c.commentCount}</td>
                      <td className="py-2.5 text-right font-medium">{c.repliesReceived}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                          c.avgSentiment > 0 ? "bg-mint-50 text-mint-600" :
                          c.avgSentiment < 0 ? "bg-coral-50 text-coral-600" :
                          "bg-surface-100 text-ink-500"
                        }`}>
                          {c.avgSentiment > 0 ? "😊 Positive" : c.avgSentiment < 0 ? "😠 Negative" : "😐 Neutral"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        {c.isSuperfan ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-volt-50 text-volt-700 border border-volt-200/40 text-[9px] font-bold">
                            <Flame className="h-3 w-3" /> Superfan
                          </span>
                        ) : (
                          <span className="text-ink-400 text-[10px]">Regular</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Peak Engagement Hours */}
          <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-6">
            <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
              <div className="h-8 w-8 rounded-xl bg-coral-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-coral-600" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-ink-800">Peak Engagement Hours</h4>
                <p className="text-[10px] text-ink-400 mt-0.5">When most comments arrive — optimize polling & reply timing</p>
              </div>
            </div>

            {/* Hourly bar chart */}
            <div className="h-48 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Array.from({ length: 24 }, (_, h) => {
                  const peak = (insights.peakHours || []).find((p: any) => p.hour === h);
                  return { hour: `${h}:00`, comments: peak?.count || 0 };
                })} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 9 }} interval={2} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="comments" fill="#0038FF" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 hours */}
            <div className="flex flex-wrap gap-2">
              {(insights.peakHours || []).slice(0, 5).map((p: any, idx: number) => (
                <div key={p.hour} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-50/80 border border-surface-200/40">
                  <span className="text-[10px] font-bold text-ink-400">#{idx + 1}</span>
                  <span className="text-xs font-bold text-navy-600">{p.hour}:00</span>
                  <span className="text-[10px] text-ink-500">{p.count} comments</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ROI & IMPACT TAB
         ═══════════════════════════════════════════════════════ */}
      {activeTab === "roi" && insights && (
        <div className="space-y-6">
          {/* ROI Calculator */}
          <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-6">
            <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-5">
              <div className="h-8 w-8 rounded-xl bg-mint-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-mint-600" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-ink-800">ROI Calculator</h4>
                <p className="text-[10px] text-ink-400 mt-0.5">See how much time and money Quick Reply saves you</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mb-5">
              {/* This Week */}
              <div className="rounded-2xl bg-gradient-to-br from-navy-500/8 to-purple-500/5 border border-navy-200/30 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-navy-500/10 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-navy-500" />
                  </div>
                  <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">This Week</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-ink-500">Replies</span>
                    <span className="font-display text-lg font-bold text-ink-800">{insights.roiData?.repliesThisWeek || 0}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-ink-500">Hours saved</span>
                    <span className="font-display text-lg font-bold text-navy-600">{insights.roiData?.hoursSavedThisWeek || 0}h</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-surface-200/60 pt-2">
                    <span className="text-xs text-ink-500">Money saved</span>
                    <span className="font-display text-xl font-bold text-mint-600">${insights.roiData?.moneySavedThisWeek || 0}</span>
                  </div>
                </div>
              </div>

              {/* This Month */}
              <div className="rounded-2xl bg-gradient-to-br from-volt-500/8 to-mint-500/5 border border-volt-200/30 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-volt-500/10 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-volt-700" />
                  </div>
                  <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">This Month</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-ink-500">Replies</span>
                    <span className="font-display text-lg font-bold text-ink-800">{insights.roiData?.repliesThisMonth || 0}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-ink-500">Hours saved</span>
                    <span className="font-display text-lg font-bold text-volt-700">{insights.roiData?.hoursSavedThisMonth || 0}h</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-surface-200/60 pt-2">
                    <span className="text-xs text-ink-500">Money saved</span>
                    <span className="font-display text-xl font-bold text-mint-600">${insights.roiData?.moneySavedThisMonth || 0}</span>
                  </div>
                </div>
              </div>

              {/* All Time */}
              <div className="rounded-2xl bg-gradient-to-br from-coral-500/8 to-purple-500/5 border border-coral-200/30 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-coral-500/10 flex items-center justify-center">
                    <Award className="h-3.5 w-3.5 text-coral-500" />
                  </div>
                  <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">All Time</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-ink-500">Replies</span>
                    <span className="font-display text-lg font-bold text-ink-800">{insights.roiData?.allTimeReplies || 0}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-ink-500">Hours saved</span>
                    <span className="font-display text-lg font-bold text-coral-500">{insights.roiData?.allTimeHoursSaved || 0}h</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-surface-200/60 pt-2">
                    <span className="text-xs text-ink-500">Money saved</span>
                    <span className="font-display text-xl font-bold text-mint-600">${insights.roiData?.allTimeMoneySaved || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hourly Rate Setting */}
            <div className="rounded-xl bg-surface-50/80 border border-surface-200/40 p-4 flex items-center gap-4">
              <div className="flex-1">
                <span className="text-xs font-bold text-ink-700 block">Your Hourly Rate</span>
                <span className="text-[10px] text-ink-400">Used to calculate money saved. Adjust to match your actual rate.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink-600">$</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  defaultValue={insights.roiData?.hourlyRate || 25}
                  onBlur={async (e) => {
                    const rate = parseInt(e.target.value) || 25;
                    await fetch("/api/analytics/roi", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ hourlyRate: rate }),
                    });
                  }}
                  className="input-glass !w-20 !py-1.5 text-sm text-center font-bold"
                />
                <span className="text-xs text-ink-400 font-medium">/hr</span>
              </div>
            </div>
          </motion.div>

          {/* Weekly Digest Summary */}
          {insights.weeklyDigest && (
            <motion.div variants={item} initial="hidden" animate="show" className="card-premium glass-card p-6">
              <div className="flex items-center gap-2.5 border-b border-surface-200/60 pb-3 mb-4">
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold text-ink-800">Weekly Digest</h4>
                  <p className="text-[10px] text-ink-400 mt-0.5">Your performance summary for the past 7 days</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4 mb-4">
                <div className="rounded-xl bg-surface-50/80 border border-surface-200/40 p-3 text-center">
                  <span className="text-[10px] font-bold text-ink-400 uppercase block">Comments</span>
                  <span className="font-display text-xl font-bold text-ink-800">{insights.weeklyDigest.totalComments}</span>
                </div>
                <div className="rounded-xl bg-mint-50/80 border border-mint-200/40 p-3 text-center">
                  <span className="text-[10px] font-bold text-ink-400 uppercase block">Auto-Replies</span>
                  <span className="font-display text-xl font-bold text-mint-600">{insights.weeklyDigest.autoReplies}</span>
                </div>
                <div className="rounded-xl bg-navy-500/5 border border-navy-200/30 p-3 text-center">
                  <span className="text-[10px] font-bold text-ink-400 uppercase block">Hours Saved</span>
                  <span className="font-display text-xl font-bold text-navy-600">{insights.weeklyDigest.hoursSaved}h</span>
                </div>
                <div className="rounded-xl bg-volt-50/80 border border-volt-200/40 p-3 text-center">
                  <span className="text-[10px] font-bold text-ink-400 uppercase block">Money Saved</span>
                  <span className="font-display text-xl font-bold text-mint-600">${insights.weeklyDigest.moneySaved}</span>
                </div>
              </div>

              {/* Milestones */}
              {insights.weeklyDigest.milestones?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">🎉 New Milestones</span>
                  {insights.weeklyDigest.milestones.map((m: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-volt-50/80 to-mint-50/50 border border-volt-200/30">
                      <span className="text-lg">🏆</span>
                      <span className="text-xs font-bold text-ink-700">{m.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
