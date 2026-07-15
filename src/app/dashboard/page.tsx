"use client";

import React, { useEffect, useState, useId } from "react";
import { useUIStore } from "@/frontend/store";
import {
  Activity,
  Target,
  Clock,
  CheckCircle,
  Smile,
  Sliders,
  History,
  Save,
  Sparkles,
  Zap,
  TrendingUp,
  ArrowUpRight,
  BarChart3,
  Database,
  Plus,
  Inbox,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import SectionHeader from "@/frontend/components/ui/SectionHeader";
import AnimatedCounter from "@/frontend/components/ui/AnimatedCounter";
import SkeletonCard from "@/frontend/components/ui/SkeletonCard";

interface UserSession {
  email: string;
  name: string;
  tier: "free" | "premium" | "pro";
  repliesToday: number;
  lastResetDate: string;
}

interface Kpis {
  commentsProcessed?: string;
  matchAccuracy?: string;
  hoursSaved?: string;
  repliesSent?: string;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

interface GoldenHourStats {
  total?: number;
  replied?: number;
  rate?: number | string;
  replyRate?: number | string;
  goldenHourReplyRate?: number | string;
  firstHourAnswerRate?: number | string;
  commentsLastHour?: number | string;
  commentsInLastHour?: number | string;
  avgReplyLatencySeconds?: number;
  activeRules?: number;
  knowledgeBaseSize?: number;
}

interface RagStats {
  totalFAQs?: number;
  ragReplies?: number;
  ragCategories?: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

/** SVG ring chart showing the golden-hour reply rate as a percentage. */
function GoldenHourRing({ rate }: { rate: number }) {
  const gradientId = useId().replace(/:/g, "");
  const size = 108;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, rate));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative h-[108px] w-[108px] shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8B931" />
            <stop offset="100%" stopColor="#FF6B35" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold text-white tabular-nums">{pct.toFixed(0)}%</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#8A8A8A" }}>
          reply rate
        </span>
      </div>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const activeChannelId = useUIStore((state) => state.activeChannelId);
  const refreshTrigger = useUIStore((state) => state.refreshTrigger);
  const showToast = useUIStore((state) => state.showToast);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [goldenHourStats, setGoldenHourStats] = useState<GoldenHourStats | null>(null);
  const [avgReplyLatencySeconds, setAvgReplyLatencySeconds] = useState<number | null>(null);
  const [ragStats, setRagStats] = useState<RagStats | null>(null);
  const [ruleCount, setRuleCount] = useState<number>(0);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [dailyReplyQuota, setDailyReplyQuota] = useState<number>(500);
  const [globalConfig, setGlobalConfig] = useState({
    replyToAll: false,
    tags: "",
    template: "Thank you for commenting!",
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [analRes, setRes] = await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/settings"),
        ]);

        if (analRes.ok && setRes.ok) {
          const analData = await analRes.json();
          const setData = await setRes.json();

          setKpis(analData.kpis);
          setGoldenHourStats(analData.goldenHourStats || null);
          if (typeof analData.avgReplyLatencySeconds === "number") {
            setAvgReplyLatencySeconds(analData.avgReplyLatencySeconds);
          } else if (typeof analData.avgReplyLatencySeconds === "string") {
            const parsedLatency = parseFloat(analData.avgReplyLatencySeconds);
            if (!Number.isNaN(parsedLatency)) setAvgReplyLatencySeconds(parsedLatency);
          }
          setRagStats(analData.ragStats || null);
          setRuleCount(analData.rulePerformance?.length || 0);
          setLogs(setData.activityLogs?.slice(0, 5) || []);
          setUserSession(setData.userSession || null);

          if (setData.workspace?.settings?.dailyReplyQuota) {
            setDailyReplyQuota(setData.workspace.settings.dailyReplyQuota);
          }
          if (setData.workspace?.settings?.globalReplyConfig) {
            setGlobalConfig(setData.workspace.settings.globalReplyConfig);
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [activeChannelId, refreshTrigger]);

  /** Tracks the cursor over a stat card and exposes --mouse-x/--mouse-y
   *  so the stat-card-premium radial spotlight follows the pointer. */
  const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { globalReplyConfig: globalConfig } }),
      });
      if (res.ok) {
        showToast("Configuration saved successfully", "success");
      } else {
        showToast("Failed to save configuration", "error");
      }
    } catch {
      showToast("Network error saving config", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    try {
      const res = await fetch("/api/demo/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 3 }),
      });
      if (res.ok) {
        showToast("Demo comments injected — watch the pipeline!", "success");
        triggerRefresh();
      } else {
        showToast("Failed to inject demo comments", "error");
      }
    } catch {
      showToast("Network error seeding demo data", "error");
    } finally {
      setSeedingDemo(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-1/3 skeleton skeleton-premium rounded-xl" />
        <SkeletonCard lines={0} hasIcon />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} lines={1} hasIcon />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  const maxQuota = dailyReplyQuota;
  const usagePercentage = Math.min(100, Math.round(((userSession?.repliesToday || 0) / maxQuota) * 100));

  // Golden Hour derived values (with defensive fallbacks for pre-B5 API responses)
  const gh = goldenHourStats || {};
  const toPercent = (v: unknown): number => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0;
    return n > 0 && n <= 1 ? Math.round(n * 100) : Math.round(n);
  };
  const goldenHourRate = toPercent(gh.rate ?? gh.replyRate ?? gh.goldenHourReplyRate ?? 0);
  const firstHourRate = toPercent(gh.firstHourAnswerRate ?? 0);
  const commentsLastHour = parseInt(String(gh.commentsLastHour ?? gh.commentsInLastHour ?? "0"), 10) || 0;
  const avgLatency = avgReplyLatencySeconds ?? gh.avgReplyLatencySeconds ?? 0;
  const latencyLabel = avgLatency > 0 ? `${Number(Number(avgLatency).toFixed(1))}s` : "—";

  const totalReplies = parseInt(String(kpis?.repliesSent ?? "0").replace(/,/g, ""), 10) || 0;
  const activeRules = gh.activeRules ?? ruleCount ?? 0;
  const kbSize = ragStats?.totalFAQs ?? gh.knowledgeBaseSize ?? 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 text-left"
    >
      {/* Page Header */}
      <SectionHeader
        icon={BarChart3}
        title="Workspace Overview"
        subtitle="Real-time metrics, active rules, and team activity."
        iconBg="bg-navy-500/8"
        iconColor="text-navy-500"
      />

      {/* ═══ GOLDEN HOUR HERO CARD ═══ */}
      <motion.div variants={item}>
        <div
          className="rounded-2xl glass-dark-card p-6 lg:p-8 flex flex-col lg:flex-row items-center gap-8 overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #0d1322 0%, #070A12 100%)", color: "#FAF8F5" }}
        >
          <div className="absolute top-0 right-0 w-72 h-72 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, #E8B931 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div className="absolute bottom-0 left-1/3 w-56 h-56 opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, #FF6B35 0%, transparent 70%)", filter: "blur(50px)" }} />

          {/* Left: headline + stats */}
          <div className="relative z-10 flex-1 w-full space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(232, 185, 49, 0.15)" }}>
                <Sparkles className="h-5 w-5" style={{ color: "#E8B931" }} />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight">Golden Hour</h2>
                <p className="text-[11px] flex items-center gap-1.5" style={{ color: "#8A8A8A" }}>
                  <TrendingUp className="h-3 w-3" style={{ color: "#34d399" }} />
                  Comments answered in the first hour — when reach is highest
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Clock className="h-3 w-3" style={{ color: "#E8B931" }} />
                  <span className="text-[9px] uppercase tracking-[0.12em] font-bold" style={{ color: "#8A8A8A" }}>Avg Reply Latency</span>
                </div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: "#FFFFFF" }}>{latencyLabel}</div>
              </div>
              <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Smile className="h-3 w-3" style={{ color: "#34d399" }} />
                  <span className="text-[9px] uppercase tracking-[0.12em] font-bold" style={{ color: "#8A8A8A" }}>1st-Hour Rate</span>
                </div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: "#FFFFFF" }}>{firstHourRate}%</div>
              </div>
              <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Activity className="h-3 w-3" style={{ color: "#38BDF8" }} />
                  <span className="text-[9px] uppercase tracking-[0.12em] font-bold" style={{ color: "#8A8A8A" }}>Comments / Hour</span>
                </div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: "#FFFFFF" }}>
                  <AnimatedCounter end={commentsLastHour} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: ring chart + engine badge */}
          <div className="relative z-10 flex flex-col items-center gap-4 shrink-0">
            <GoldenHourRing rate={goldenHourRate} />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(232,185,49,0.1)", border: "1px solid rgba(232,185,49,0.25)" }}>
              <span className="h-2 w-2 rounded-full dot-pulse" style={{ background: "#22c55e" }} />
              <span className="text-[10px] font-bold" style={{ color: "#E8B931" }}>Engine Active</span>
              <Zap className="h-3 w-3" style={{ color: "#FF6B35" }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* User Session Banner */}
      {userSession && (
        <motion.div variants={item} className="card-premium glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-lg shrink-0" style={{ background: "linear-gradient(135deg, #E8B931, #FF6B35)" }}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink-800 text-sm">{userSession.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-volt-600 bg-volt-500/10 border border-volt-200/30">
                  {userSession.tier}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-500 font-medium">
                  {userSession.repliesToday} / {maxQuota} replies today
                </span>
                <div className="w-24 bg-surface-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${usagePercentage}%`,
                      background: usagePercentage >= 90 ? "#e0002b" : usagePercentage >= 70 ? "#FFD60A" : "linear-gradient(90deg, #0038FF, #4170ff)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ QUICK STATS ROW ═══ */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Replies", value: totalReplies, icon: CheckCircle, iconBg: "bg-mint-500/8", iconColor: "text-mint-500", sub: "All-time auto-replies" },
          { label: "Active Rules", value: activeRules, icon: Target, iconBg: "bg-volt-500/8", iconColor: "text-volt-600", sub: "Keyword triggers live" },
          { label: "Knowledge Base", value: kbSize, icon: Database, iconBg: "bg-navy-500/8", iconColor: "text-navy-500", sub: "FAQ entries for RAG" },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={item}
            whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
            onMouseMove={handleSpotlight}
            className="card-premium glass-card stat-card-premium p-5 relative overflow-hidden group cursor-default"
          >
            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em] block">
                  {kpi.label}
                </span>
                <span className="font-display text-2xl font-bold text-ink-800 tracking-tight">
                  <AnimatedCounter end={kpi.value} />
                </span>
                <span className="text-[10px] text-ink-400 block">{kpi.sub}</span>
              </div>
              <div className={`h-10 w-10 rounded-xl ${kpi.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ BOTTOM GRID: Config + Activity + Quick Actions ═══ */}
      <motion.div variants={item} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Global Config */}
        <div className="card-premium glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between border-b border-surface-200/60 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-navy-500/8 flex items-center justify-center">
                <Sliders className="h-4 w-4 text-navy-500" />
              </div>
              <h4 className="font-display text-sm font-bold text-ink-800">Global Reply Config</h4>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <label className="flex items-center gap-3 text-sm text-ink-700 cursor-pointer group">
              <div
                role="switch"
                aria-checked={globalConfig.replyToAll}
                aria-label="Reply to all comments"
                onClick={() => setGlobalConfig({ ...globalConfig, replyToAll: !globalConfig.replyToAll })}
                className={`toggle-apple ${globalConfig.replyToAll ? "active" : ""}`}
              />
              <span className="font-medium group-hover:text-ink-800 transition-colors">Reply to All Comments</span>
            </label>

            {!globalConfig.replyToAll && (
              <div className="space-y-1.5 animate-[page-enter_0.3s_ease-out]">
                <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Tags / Keywords</label>
                <input
                  type="text"
                  value={globalConfig.tags}
                  onChange={(e) => setGlobalConfig({ ...globalConfig, tags: e.target.value })}
                  placeholder="awesome, love it, thanks"
                  className="input-glass"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.12em]">Auto-Reply Template</label>
              <textarea
                value={globalConfig.template}
                onChange={(e) => setGlobalConfig({ ...globalConfig, template: e.target.value })}
                placeholder="Thank you for commenting!"
                rows={3}
                className="input-glass resize-none"
              />
              <p className="text-[10px] text-ink-400">
                Tokens: {"{{commenter_name}}"}, {"{{video_title}}"}, {"{{reply_date}}"}
              </p>
            </div>
          </div>

          <div className="border-t border-surface-200/60 pt-4 mt-5">
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm !rounded-xl"
            >
              <Save className="h-4 w-4" />
              {savingConfig ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="card-premium glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between border-b border-surface-200/60 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-volt-500/8 flex items-center justify-center">
                <History className="h-4 w-4 text-volt-600" />
              </div>
              <h4 className="font-display text-sm font-bold text-ink-800">Recent Activity</h4>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {logs.length > 0 ? (
              logs.map((log, idx) => (
                <div key={log.id} className="table-row-premium flex gap-3 text-xs items-start group rounded-lg px-1.5 -mx-1.5">
                  <div className="relative mt-1.5">
                    <div className="h-2 w-2 rounded-full bg-surface-300 group-hover:bg-navy-500 transition-colors" />
                    {idx < logs.length - 1 && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-px h-6 bg-surface-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-700 leading-relaxed">
                      <span className="font-bold text-ink-800">{log.user}</span>{" "}
                      <span className="text-ink-500">{log.action}</span>
                    </p>
                    <span className="text-[10px] text-ink-400 block mt-0.5">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-2xl bg-surface-100 flex items-center justify-center mb-3">
                  <History className="h-5 w-5 text-ink-400" />
                </div>
                <p className="text-sm text-ink-500 font-medium">No recent activity</p>
                <p className="text-xs text-ink-400 mt-1">Activity will appear here as you work</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-premium glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between border-b border-surface-200/60 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-mint-500/8 flex items-center justify-center">
                <Zap className="h-4 w-4 text-mint-500" />
              </div>
              <h4 className="font-display text-sm font-bold text-ink-800">Quick Actions</h4>
            </div>
          </div>

          <div className="space-y-2.5 flex-1">
            <Link
              href="/dashboard/rules/new"
              className="group flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-navy-500/40 transition-all"
            >
              <div className="h-8 w-8 rounded-lg bg-navy-500/8 flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-navy-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-800">Add Rule</p>
                <p className="text-[10px] text-ink-400">Configure a keyword auto-reply</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-ink-400 group-hover:text-navy-500 transition-colors shrink-0" />
            </Link>

            <Link
              href="/dashboard/feed/review"
              className="group flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-volt-500/40 transition-all"
            >
              <div className="h-8 w-8 rounded-lg bg-volt-500/8 flex items-center justify-center shrink-0">
                <Inbox className="h-4 w-4 text-volt-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-800">Review Queue</p>
                <p className="text-[10px] text-ink-400">Approve comments held for humans</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-ink-400 group-hover:text-volt-600 transition-colors shrink-0" />
            </Link>

            <button
              onClick={handleSeedDemo}
              disabled={seedingDemo}
              className="group flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-mint-500/40 transition-all w-full text-left disabled:opacity-60"
            >
              <div className="h-8 w-8 rounded-lg bg-mint-500/8 flex items-center justify-center shrink-0">
                {seedingDemo ? (
                  <Loader2 className="h-4 w-4 text-mint-500 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-mint-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-800">Seed Demo</p>
                <p className="text-[10px] text-ink-400">Inject 3 synthetic comments</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-ink-400 group-hover:text-mint-500 transition-colors shrink-0" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
