"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  Database,
  Brain,
  RefreshCw,
  TrendingUp,
  Zap,
  Shield,
  Timer,
  Eye,
} from "lucide-react";

interface SystemStatus {
  healthy: boolean;
  lastHeartbeatAt: string | null;
  uptime: string;
  polling: {
    lastPollRunAt: string | null;
    lastDiscoveryRunAt: string | null;
  };
  quota: {
    usedToday: number;
    remaining: number;
    budget: number;
  };
  videoQueue: {
    total: number;
    pending: number;
    active: number;
    stale: number;
    error: number;
  };
  today: {
    repliesPosted: number;
    repliesFailed: number;
    commentsSkipped: number;
    commentsProcessed: number;
  };
  channels: {
    total: number;
    active: number;
    quotaError: number;
  };
  faqs: number;
}

interface SystemEvent {
  id: string;
  type: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return "Never";
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function EventTypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    video_discovered: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: "🔍" },
    poll_tick: { bg: "bg-slate-50 border-slate-200", text: "text-ink-600", icon: "🔄" },
    reply_posted: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: "✅" },
    reply_failed: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: "❌" },
    rag_match: { bg: "bg-purple-50 border-purple-200", text: "text-purple-700", icon: "🧠" },
    rag_miss: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: "⏭️" },
    faq_fallback: { bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-700", icon: "📚" },
    cron_tick: { bg: "bg-green-50 border-green-200", text: "text-green-700", icon: "💓" },
    error: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: "⚠️" },
  };

  const c = config[type] || { bg: "bg-slate-50 border-slate-200", text: "text-ink-600", icon: "📝" };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${c.bg} ${c.text}`}>
      {c.icon} {type.replace(/_/g, " ")}
    </span>
  );
}

export default function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const [statusRes, eventsRes] = await Promise.all([
        fetch("/api/system/status"),
        fetch("/api/system/events?limit=30"),
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Failed to fetch system status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 15_000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-ink-400 mr-2" />
        <span className="text-sm text-ink-500">Loading system status...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-10 text-ink-500 text-sm">
        Failed to load system status
      </div>
    );
  }

  const quotaPercent = Math.round((status.quota.usedToday / status.quota.budget) * 100);
  const uptimeMs = Date.now() - new Date(status.uptime).getTime();
  const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
  const uptimeDays = Math.floor(uptimeHours / 24);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-5xl"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.healthy ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            {status.healthy ? (
              <Wifi className="h-5 w-5 text-emerald-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-ink-800 md:text-xl">
              System Status
            </h1>
            <p className="text-xs text-ink-500 mt-0.5">
              24/7 auto-reply engine health and monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              autoRefresh
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-50 text-ink-500 border border-slate-200"
            }`}
          >
            {autoRefresh ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </button>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-surface-200 text-ink-600 hover:bg-surface-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </motion.div>

      {/* Health Status Banner */}
      <motion.div
        variants={item}
        className={`rounded-xl border p-4 ${
          status.healthy
            ? "border-emerald-200 bg-emerald-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${status.healthy ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
          <div>
            <p className={`text-sm font-bold ${status.healthy ? "text-emerald-900" : "text-red-900"}`}>
              {status.healthy ? "System Online — 24/7 Auto-Reply Active" : "System Offline — No Recent Heartbeat"}
            </p>
            <p className={`text-xs mt-0.5 ${status.healthy ? "text-emerald-700" : "text-red-700"}`}>
              Last heartbeat: {formatTimeAgo(status.lastHeartbeatAt)}
              {" · "}Uptime: {uptimeDays > 0 ? `${uptimeDays}d ` : ""}{uptimeHours % 24}h
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* YouTube Quota */}
        <div className="card-premium glass-card rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-semibold text-ink-500 uppercase">YouTube Quota</span>
          </div>
          <p className="text-lg font-bold text-ink-800">
            {status.quota.remaining.toLocaleString()}
          </p>
          <p className="text-[10px] text-ink-400">remaining of {status.quota.budget.toLocaleString()}</p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                quotaPercent > 80 ? "bg-red-500" : quotaPercent > 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(quotaPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Video Queue */}
        <div className="card-premium glass-card rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Play className="h-4 w-4 text-blue-500" />
            <span className="text-[10px] font-semibold text-ink-500 uppercase">Video Queue</span>
          </div>
          <p className="text-lg font-bold text-ink-800">{status.videoQueue.total}</p>
          <p className="text-[10px] text-ink-400">
            {status.videoQueue.active} active · {status.videoQueue.pending} pending
            {status.videoQueue.error > 0 && (
              <span className="text-red-500"> · {status.videoQueue.error} errors</span>
            )}
          </p>
        </div>

        {/* Today's Replies */}
        <div className="card-premium glass-card rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] font-semibold text-ink-500 uppercase">Replies Today</span>
          </div>
          <p className="text-lg font-bold text-ink-800">{status.today.repliesPosted}</p>
          <p className="text-[10px] text-ink-400">
            {status.today.commentsSkipped} skipped
            {status.today.repliesFailed > 0 && (
              <span className="text-red-500"> · {status.today.repliesFailed} failed</span>
            )}
          </p>
        </div>

        {/* Knowledge Base */}
        <div className="card-premium glass-card rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <span className="text-[10px] font-semibold text-ink-500 uppercase">Knowledge Base</span>
          </div>
          <p className="text-lg font-bold text-ink-800">{status.faqs}</p>
          <p className="text-[10px] text-ink-400">FAQs indexed for RAG</p>
        </div>
      </motion.div>

      {/* Polling & Discovery Status */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="card-premium glass-card rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold text-ink-800">Polling Status</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Last poll</span>
              <span className="font-medium text-ink-800">{formatTimeAgo(status.polling.lastPollRunAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Last discovery</span>
              <span className="font-medium text-ink-800">{formatTimeAgo(status.polling.lastDiscoveryRunAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Channels</span>
              <span className="font-medium text-ink-800">
                {status.channels.active}/{status.channels.total} active
                {status.channels.quotaError > 0 && (
                  <span className="text-red-500"> · {status.channels.quotaError} quota error</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="card-premium glass-card rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-bold text-ink-800">Reply Strategy</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Mode</span>
              <span className="font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">KB-Only</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500">RAG Pipeline</span>
              <span className="font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">Multi-Query + Re-rank</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Intent Filter</span>
              <span className="font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Questions Only</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent System Events */}
      <motion.div variants={item} className="card-premium glass-card rounded-xl border border-surface-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-ink-500" />
            <span className="text-xs font-bold text-ink-800">Recent System Events</span>
          </div>
          <span className="text-[10px] text-ink-400">{events.length} events loaded</span>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-400">
              No system events yet. Events will appear here once the system starts processing.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {events.map((event) => (
                <div key={event.id} className="table-row-premium px-4 py-2.5 flex items-start gap-3 hover:bg-surface-50/50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <EventTypeBadge type={event.type} />
                    </div>
                    <p className="text-[11px] text-ink-600 line-clamp-1">{event.message}</p>
                  </div>
                  <span className="text-[9px] text-ink-400 whitespace-nowrap shrink-0">
                    {formatTimeAgo(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
