"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Trophy,
  AlertTriangle,
  Flag,
  CheckCircle,
  Inbox,
  Loader2,
  Trash2,
  Check,
  Zap,
  Mail,
  Slack,
  MessageSquare
} from "lucide-react";
import { useUIStore } from "@/frontend/store";

interface NotificationLog {
  id: string;
  channel: "slack" | "discord" | "email" | "sms" | "whatsapp" | "in_app";
  type: "flagged_comment" | "daily_summary" | "milestone" | "quota_warning" | "approval_needed" | "assignment";
  title: string;
  message: string;
  sentAt: string;
  success: boolean;
  recipient?: string;
}

interface Milestone {
  id: string;
  type: string;
  value: number;
  label: string;
  celebratedAt: string;
  notified: boolean;
}

interface QuotaWarning {
  id: string;
  type: string;
  threshold: number;
  current: number;
  warnedAt: string;
  acknowledged: boolean;
}

export default function NotificationsPage() {
  const showToast = useUIStore((state) => state.showToast);
  const [loading, setLoading] = useState(false);

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [warnings, setWarnings] = useState<QuotaWarning[]>([]);

  // Filter state
  const [activeTab, setActiveTab] = useState<"all" | "alerts" | "milestones" | "logs">("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        // Sort newest first
        setLogs(data.logs?.sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()) || []);
        setMilestones(data.milestones?.sort((a: any, b: any) => new Date(b.celebratedAt).getTime() - new Date(a.celebratedAt).getTime()) || []);
        setWarnings(data.quotaWarnings?.sort((a: any, b: any) => new Date(b.warnedAt).getTime() - new Date(a.warnedAt).getTime()) || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissLog = async (id: string) => {
    try {
      setLogs((prev) => prev.filter((l) => l.id !== id));
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", ids: [id], type: "logs" }),
      });
      showToast("Notification dismissed", "success");
    } catch (err) {}
  };

  const handleAcknowledgeWarning = async (id: string) => {
    try {
      setWarnings((prev) => prev.map((w) => w.id === id ? { ...w, acknowledged: true } : w));
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", ids: [id], type: "warnings" }),
      });
      showToast("Alert acknowledged", "success");
    } catch (err) {}
  };

  const handleAcknowledgeMilestone = async (id: string) => {
    try {
      setMilestones((prev) => prev.map((m) => m.id === id ? { ...m, notified: true } : m));
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", ids: [id], type: "milestones" }),
      });
    } catch (err) {}
  };

  const unackedWarnings = warnings.filter(w => !w.acknowledged).length;
  const unackedMilestones = milestones.filter(m => !m.notified).length;
  const unreadCount = unackedWarnings + unackedMilestones + logs.length;

  return (
    <div className="space-y-6 text-left max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 border border-orange-200 relative">
              <Bell className="h-5 w-5 text-orange-600" />
              {unreadCount > 0 && (
                <span className="badge-pulse absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-ink-800 md:text-xl">
                Smart Notifications
              </h1>
              <p className="text-xs text-ink-500 mt-0.5">
                Stay on top of quota alerts, algorithmic milestones, and flagged comments requiring review.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === "all" ? "bg-slate-800 text-white shadow-sm" : "text-ink-600 hover:bg-surface-100"
          }`}
        >
          All Inbox
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "alerts" ? "bg-coral-500 text-white shadow-sm" : "text-ink-600 hover:bg-surface-100"
          }`}
        >
          {unackedWarnings > 0 && <span className="h-2 w-2 rounded-full bg-coral-500 block" />}
          Quota Alerts
        </button>
        <button
          onClick={() => setActiveTab("milestones")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "milestones" ? "bg-yellow-500 text-white shadow-sm" : "text-ink-600 hover:bg-surface-100"
          }`}
        >
          {unackedMilestones > 0 && <span className="h-2 w-2 rounded-full bg-yellow-500 block" />}
          Milestones
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "logs" ? "bg-navy-500 text-white shadow-sm" : "text-ink-600 hover:bg-surface-100"
          }`}
        >
          System Logs
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-xs font-medium text-ink-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading inbox...
        </div>
      ) : (
        <div className="card-premium glass-card rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          
          {/* Empty State */}
          {((activeTab === "all" && warnings.length === 0 && milestones.length === 0 && logs.length === 0) ||
            (activeTab === "alerts" && warnings.length === 0) ||
            (activeTab === "milestones" && milestones.length === 0) ||
            (activeTab === "logs" && logs.length === 0)) && (
            <div className="flex flex-col h-64 items-center justify-center text-center p-6">
              <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <Inbox className="h-6 w-6 text-slate-300" />
              </div>
              <h4 className="text-sm font-bold text-ink-700">You're all caught up!</h4>
              <p className="text-xs text-ink-500 mt-1 max-w-[250px]">
                No new notifications in this view. Check back later when automation runs.
              </p>
            </div>
          )}

          <div className="divide-y divide-surface-200">
            
            {/* Quota Alerts */}
            {(activeTab === "all" || activeTab === "alerts") && warnings.map((warning) => (
              <motion.div
                layout
                key={warning.id}
                className={`p-4 transition-colors ${warning.acknowledged ? "bg-white" : "bg-coral-50/50"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${warning.acknowledged ? "bg-slate-100" : "bg-coral-100 text-coral-600"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-bold ${warning.acknowledged ? "text-ink-700" : "text-coral-900"}`}>
                        {warning.type === "api_limit" ? "API Limit Reached" : "Quota Approaching"}
                      </h4>
                      <span className="text-[10px] text-ink-400 font-medium whitespace-nowrap ml-2">
                        {new Date(warning.warnedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-ink-600">
                      You have reached <span className="font-bold">{warning.current} / {warning.threshold}</span> of your limit. 
                      Automations may be paused if you exceed the limit.
                    </p>
                    
                    {!warning.acknowledged && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleAcknowledgeWarning(warning.id)}
                          className="inline-flex items-center gap-1.5 bg-coral-50 text-coral-700 border border-coral-200 px-3 py-1 rounded-lg text-[11px] font-bold hover:bg-coral-100 transition"
                        >
                          <Check className="h-3 w-3" /> Acknowledge Alert
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Milestones */}
            {(activeTab === "all" || activeTab === "milestones") && milestones.map((milestone) => (
              <motion.div
                layout
                key={milestone.id}
                className={`p-4 transition-colors ${milestone.notified ? "bg-white" : "bg-yellow-50/50"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${milestone.notified ? "bg-slate-100" : "bg-yellow-100 text-yellow-600"}`}>
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-bold ${milestone.notified ? "text-ink-700" : "text-yellow-900"}`}>
                        {milestone.label}
                      </h4>
                      <span className="text-[10px] text-ink-400 font-medium whitespace-nowrap ml-2">
                        {new Date(milestone.celebratedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-ink-600">
                      Congratulations! You've reached a new milestone: <span className="font-bold">{milestone.value}</span>.
                      The algorithm loves high engagement, keep it up! 🚀
                    </p>
                    
                    {!milestone.notified && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleAcknowledgeMilestone(milestone.id)}
                          className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-lg text-[11px] font-bold hover:bg-yellow-200 transition"
                        >
                          <Check className="h-3 w-3" /> Celebrate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* System Logs */}
            {(activeTab === "all" || activeTab === "logs") && logs.map((log) => (
              <motion.div
                layout
                key={log.id}
                className="p-4 bg-white hover:bg-surface-50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-ink-500 border border-slate-200">
                    {log.type === "flagged_comment" ? <Flag className="h-3.5 w-3.5 text-orange-500" /> :
                     log.type === "assignment" ? <MessageSquare className="h-3.5 w-3.5 text-navy-500" /> :
                     log.channel === "slack" ? <Slack className="h-3.5 w-3.5" /> : 
                     <Mail className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-bold text-ink-800">
                        {log.title}
                      </h4>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-[10px] text-ink-400 font-medium whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDismissLog(log.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-ink-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50"
                          title="Dismiss"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-ink-600 mb-2">
                      {log.message}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider
                        ${log.success ? "bg-mint-50 text-mint-700 border border-mint-200" : "bg-red-50 text-red-600 border border-red-200"}
                      `}>
                        {log.success ? <CheckCircle className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                        {log.success ? "Delivered" : "Failed"}
                      </span>
                      <span className="text-[10px] font-semibold text-ink-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        Via {log.channel} {log.recipient && `to ${log.recipient}`}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

          </div>
        </div>
      )}
    </div>
  );
}
