"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUIStore } from "@/frontend/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  X,
  Ban,
  Pencil,
  Send,
  Inbox,
  RefreshCw,
  Loader2,
  CheckCheck,
  SkipForward,
  UserMinus,
  Clock,
  ShieldAlert,
  MessageSquareQuote,
  CornerDownRight,
} from "lucide-react";

interface Comment {
  id: string;
  channelId: string;
  author: string;
  authorAvatar: string;
  authorSubscribers: string;
  authorHistoryCount: number;
  text: string;
  videoTitle: string;
  videoThumbnail: string;
  publishedAt: string;
  status: "matched" | "review" | "replied" | "skipped" | "failed";
  matchedRuleId: string | null;
  delayRemainingSeconds: number;
  autoReplyText: string | null;
  replyFiredAt: string | null;
  replySource?: "rule" | "rag" | "ai" | "global";
  sentiment?: "positive" | "neutral" | "negative" | "question" | "spam";
  language?: string;
  wasTranslated?: boolean;
}

type TabKey = "pending" | "approved" | "all";

const sentimentBadge = (sentiment?: Comment["sentiment"]) => {
  switch (sentiment) {
    case "positive":
      return { label: "😊 Positive", cls: "bg-mint-50 text-mint-600 border-mint-200/60" };
    case "negative":
      return { label: "😞 Negative", cls: "bg-coral-50 text-coral-600 border-coral-200/60" };
    case "question":
      return { label: "❓ Question", cls: "bg-volt-50 text-volt-700 border-volt-200/60" };
    case "spam":
      return { label: "🚫 Spam", cls: "bg-surface-100 text-ink-400 border-surface-200/60" };
    default:
      return { label: "😐 Neutral", cls: "bg-navy-500/6 text-navy-600 border-navy-200/30" };
  }
};

const statusLabel = (status: Comment["status"]) => {
  switch (status) {
    case "replied":
      return { label: "Approved · Sent", cls: "bg-mint-50 text-mint-600 border-mint-200/60" };
    case "matched":
      return { label: "Queued", cls: "bg-navy-500/6 text-navy-600 border-navy-200/30" };
    case "review":
      return { label: "Pending Review", cls: "bg-volt-50 text-volt-700 border-volt-200/60" };
    case "skipped":
      return { label: "Skipped", cls: "bg-surface-100 text-ink-500 border-surface-200/60" };
    default:
      return { label: "Failed", cls: "bg-coral-50 text-coral-600 border-coral-200/60" };
  }
};

function isToday(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function ReviewInbox() {
  const showToast = useUIStore((state) => state.showToast);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);
  const refreshTrigger = useUIStore((state) => state.refreshTrigger);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const [ruleMap, setRuleMap] = useState<Record<string, string>>({});
  const [faqMap, setFaqMap] = useState<Record<string, string>>({});

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const selectAllRef = useRef<HTMLInputElement>(null);

  /* ---------- Data loading ---------- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [commentsRes, rulesRes, faqsRes] = await Promise.all([
          fetch("/api/comments"),
          fetch("/api/rules"),
          fetch("/api/faqs"),
        ]);
        if (commentsRes.ok && !cancelled) {
          const data = await commentsRes.json();
          const arr: Comment[] = Array.isArray(data) ? data : [];
          arr.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          setComments(arr);
        }
        if (rulesRes.ok && !cancelled) {
          const rules = await rulesRes.json();
          const map: Record<string, string> = {};
          (Array.isArray(rules) ? rules : []).forEach((r: { id?: string; name?: string }) => {
            if (r.id) map[r.id] = r.name || r.id;
          });
          setRuleMap(map);
        }
        if (faqsRes.ok && !cancelled) {
          const faqs = await faqsRes.json();
          const map: Record<string, string> = {};
          (Array.isArray(faqs) ? faqs : []).forEach((f: { id?: string; question?: string }) => {
            if (f.id) map[f.id] = f.question || f.id;
          });
          setFaqMap(map);
        }
      } catch (err) {
        console.error("Error loading review queue:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  /* ---------- Derived lists ---------- */
  const pending = useMemo(
    () => comments.filter((c) => c.status === "review" || c.status === "matched"),
    [comments]
  );
  const approvedToday = useMemo(
    () => comments.filter((c) => c.status === "replied" && isToday(c.replyFiredAt)),
    [comments]
  );

  const visibleComments = useMemo(() => {
    if (activeTab === "pending") return pending;
    if (activeTab === "approved") return approvedToday;
    return comments;
  }, [activeTab, pending, approvedToday, comments]);

  /* Keep focused card scrolled into view */
  useEffect(() => {
    if (focusedId) {
      document
        .getElementById(`review-card-${focusedId}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedId]);

  /* Indeterminate state for "select all" checkbox */
  useEffect(() => {
    if (selectAllRef.current) {
      const count = visibleComments.length;
      selectAllRef.current.indeterminate = selected.size > 0 && selected.size < count;
    }
  }, [selected, visibleComments.length]);

  /* ---------- Helpers ---------- */
  const markStatus = (id: string, status: Comment["status"]) => {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  const openEditor = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.autoReplyText || "");
  };

  const matchChip = (comment: Comment) => {
    if (comment.matchedRuleId) {
      const ruleName = ruleMap[comment.matchedRuleId];
      const faqName = faqMap[comment.matchedRuleId];
      if (ruleName) {
        return { label: `Rule · ${ruleName}`, cls: "bg-navy-500/6 text-navy-600 border-navy-200/30" };
      }
      if (faqName) {
        return { label: `FAQ · ${faqName}`, cls: "bg-purple-50 text-purple-600 border-purple-200/60" };
      }
      return { label: `Rule #${comment.matchedRuleId.slice(-6)}`, cls: "bg-navy-500/6 text-navy-600 border-navy-200/30" };
    }
    if (comment.replySource) {
      const map = {
        rule: "Rule",
        rag: "🧠 RAG",
        ai: "✨ AI",
        global: "🌐 Global",
      } as const;
      return {
        label: `Source · ${map[comment.replySource] || comment.replySource}`,
        cls: "bg-surface-100 text-ink-500 border-surface-200/60",
      };
    }
    return { label: "No rule match", cls: "bg-surface-100 text-ink-400 border-surface-200/60" };
  };

  /* ---------- Actions ---------- */
  const handleApprove = useCallback(
    async (comment: Comment, overrideText?: string) => {
      const text = (overrideText ?? comment.autoReplyText ?? "").trim();
      setBusyId(comment.id);
      try {
        const res = await fetch(`/api/comments/${comment.id}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autoReplyText: text }),
        });
        if (res.ok) {
          markStatus(comment.id, "replied");
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(comment.id);
            return next;
          });
          setEditingId(null);
          showToast(`Reply sent to ${comment.author}`, "success");
          triggerRefresh();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || "Failed to approve reply", "error");
        }
      } catch {
        showToast("Network error approving reply", "error");
      } finally {
        setBusyId(null);
      }
    },
    [showToast, triggerRefresh]
  );

  const handleSkip = useCallback(
    async (comment: Comment) => {
      setBusyId(comment.id);
      try {
        const res = await fetch(`/api/comments/${comment.id}/skip`, { method: "POST" });
        if (res.ok) {
          markStatus(comment.id, "skipped");
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(comment.id);
            return next;
          });
          setEditingId(null);
          showToast(`Auto-reply skipped for ${comment.author}`, "warning");
          triggerRefresh();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || "Failed to skip comment", "error");
        }
      } catch {
        showToast("Network error skipping comment", "error");
      } finally {
        setBusyId(null);
      }
    },
    [showToast, triggerRefresh]
  );

  const handleBlock = useCallback(
    async (comment: Comment) => {
      setBusyId(comment.id);
      try {
        const res = await fetch(`/api/comments/${comment.id}/block`, { method: "POST" });
        if (res.ok) {
          setComments((prev) => prev.filter((c) => c.id !== comment.id));
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(comment.id);
            return next;
          });
          showToast(`Blocked ${comment.author}`, "error");
          triggerRefresh();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || "Failed to block commenter", "error");
        }
      } catch {
        showToast("Network error blocking commenter", "error");
      } finally {
        setBusyId(null);
      }
    },
    [showToast, triggerRefresh]
  );

  /* ---------- Bulk actions ---------- */
  const toggleSelectAll = () => {
    if (selected.size === visibleComments.length && visibleComments.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleComments.map((c) => c.id)));
    }
  };

  const bulkApprove = async () => {
    const targets = comments.filter((c) => selected.has(c.id));
    if (targets.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        targets.map((c) =>
          fetch(`/api/comments/${c.id}/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ autoReplyText: c.autoReplyText || "" }),
          })
        )
      );
      const okCount = results.filter(
        (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<Response>).value.ok
      ).length;
      showToast(
        okCount === targets.length
          ? `Approved ${okCount} reply${okCount === 1 ? "" : "s"}`
          : `Approved ${okCount} of ${targets.length} (some failed)`,
        okCount === targets.length ? "success" : "warning"
      );
      setSelected(new Set());
      triggerRefresh();
    } catch {
      showToast("Bulk approve failed", "error");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkSkip = async () => {
    const targets = comments.filter((c) => selected.has(c.id));
    if (targets.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        targets.map((c) => fetch(`/api/comments/${c.id}/skip`, { method: "POST" }))
      );
      const okCount = results.filter(
        (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<Response>).value.ok
      ).length;
      showToast(`Skipped ${okCount} of ${targets.length}`, "warning");
      setSelected(new Set());
      triggerRefresh();
    } catch {
      showToast("Bulk skip failed", "error");
    } finally {
      setBulkBusy(false);
    }
  };

  /* ---------- Keyboard shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingId(null);
        setSelected(new Set());
        return;
      }
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping) return;
      if (visibleComments.length === 0) return;

      const idx = visibleComments.findIndex((c) => c.id === focusedId);
      const current = idx >= 0 ? visibleComments[idx] : visibleComments[0];

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedId(visibleComments[Math.min(idx + 1, visibleComments.length - 1)].id);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedId(visibleComments[Math.max(idx - 1, 0)].id);
          break;
        case "a":
        case "A":
          e.preventDefault();
          if (current && current.status !== "replied" && current.status !== "skipped") {
            void handleApprove(current);
          }
          break;
        case "s":
        case "S":
          e.preventDefault();
          if (current && current.status !== "replied" && current.status !== "skipped") {
            void handleSkip(current);
          }
          break;
        case "e":
        case "E":
          e.preventDefault();
          if (current && current.status !== "replied" && current.status !== "skipped") {
            openEditor(current);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleComments, focusedId, handleApprove, handleSkip]);

  /* ---------- Tabs ---------- */
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: pending.length },
    { key: "approved", label: "Approved Today", count: approvedToday.length },
    { key: "all", label: "All", count: comments.length },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="card-premium glass-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-volt-500/10 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-volt-600" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-ink-800 flex items-center gap-2.5">
              Review Queue
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-volt-500/15 text-volt-700 border border-volt-200/60">
                {pending.length} pending
              </span>
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Inspect drafts, edit if needed, then approve — auto-replies won&apos;t fire until you say so.
            </p>
          </div>
        </div>
        <button
          onClick={triggerRefresh}
          className="rounded-xl p-2 text-ink-400 hover:bg-surface-100 hover:text-navy-500 transition-all active:scale-95"
          title="Refresh review queue"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex items-center justify-between border-b border-surface-200/60 flex-wrap gap-2">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelected(new Set());
                setEditingId(null);
                setFocusedId(null);
              }}
              className={`relative px-4 py-2.5 text-xs font-semibold transition-all rounded-t-xl ${
                activeTab === tab.key
                  ? "text-navy-600 bg-navy-500/6"
                  : "text-ink-400 hover:text-ink-600 hover:bg-surface-50"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? "bg-navy-500/10 text-navy-600" : "bg-surface-100 text-ink-400"
                }`}
              >
                {tab.count}
              </span>
              {activeTab === tab.key && (
                <motion.div
                  layoutId="reviewTabUnderline"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-brand rounded-full"
                />
              )}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-ink-400 font-medium hidden lg:inline">
          <kbd className="px-1.5 py-0.5 rounded-md bg-surface-100 border border-surface-200/80 font-mono">A</kbd> approve ·{" "}
          <kbd className="px-1.5 py-0.5 rounded-md bg-surface-100 border border-surface-200/80 font-mono">S</kbd> skip ·{" "}
          <kbd className="px-1.5 py-0.5 rounded-md bg-surface-100 border border-surface-200/80 font-mono">E</kbd> edit ·{" "}
          <kbd className="px-1.5 py-0.5 rounded-md bg-surface-100 border border-surface-200/80 font-mono">Esc</kbd> clear
        </span>
      </div>

      {/* ─── Bulk action bar ─── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="card-premium glass-card p-3 flex flex-wrap items-center gap-3 !border-navy-200/50">
              <span className="text-xs font-bold text-ink-700">
                {selected.size} selected
              </span>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-600 cursor-pointer select-none">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={visibleComments.length > 0 && selected.size === visibleComments.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded accent-[#0038FF]"
                  aria-label="Select all visible comments"
                />
                Select all{visibleComments.length > 0 ? ` (${visibleComments.length})` : ""}
              </label>
              <div className="flex-1" />
              <button
                onClick={bulkSkip}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-500 bg-surface-100 hover:bg-surface-200 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
              >
                {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
                Skip Selected
              </button>
              <button
                onClick={bulkApprove}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-mint-500 hover:bg-mint-600 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 shadow-sm"
              >
                {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Approve Selected
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="p-1.5 text-ink-400 hover:text-ink-600 hover:bg-surface-100 rounded-lg transition-all"
                title="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Comment list ─── */}
      <div className="space-y-3 min-h-[300px]">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="card-premium glass-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full shimmer" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-24 shimmer rounded-full" />
                  <div className="h-3 w-full shimmer rounded-full" />
                </div>
              </div>
              <div className="h-12 shimmer rounded-xl" />
            </div>
          ))
        ) : visibleComments.length === 0 ? (
          <div className="card-premium glass-card p-12 text-center">
            <div className="h-14 w-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
              <Inbox className="h-6 w-6 text-ink-400" />
            </div>
            <h4 className="font-display text-sm font-bold text-ink-700">
              {activeTab === "pending" ? "Review queue is clear" : activeTab === "approved" ? "No replies approved today" : "No comments yet"}
            </h4>
            <p className="text-xs text-ink-400 mt-1 max-w-[320px] mx-auto leading-relaxed">
              {activeTab === "pending"
                ? "Comments flagged for manual review will appear here. Approve drafts to dispatch them as replies."
                : "Once you approve replies, they show up here. Incoming comments appear in the live feed automatically."}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visibleComments.map((comment) => {
              const isFocused = focusedId === comment.id;
              const isSelected = selected.has(comment.id);
              const isBusy = busyId === comment.id;
              const cfg = statusLabel(comment.status);
              const match = matchChip(comment);
              const senti = sentimentBadge(comment.sentiment);
              const isActionable = comment.status !== "replied" && comment.status !== "skipped";

              return (
                <motion.div
                  key={comment.id}
                  id={`review-card-${comment.id}`}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setFocusedId(comment.id)}
                  className={`card-premium glass-card p-4 cursor-pointer select-none border-l-[3px] transition-all duration-200 ${
                    isActionable ? "border-l-volt-500" : comment.status === "replied" ? "border-l-mint-500" : "border-l-surface-300"
                  } ${isFocused ? "!ring-2 !ring-navy-500/15 !border-navy-300/60" : ""} ${
                    isSelected ? "!bg-navy-500/[0.03]" : ""
                  }`}
                >
                  {/* Top row — select + author + status */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(comment.id)) next.delete(comment.id);
                          else next.add(comment.id);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1.5 h-4 w-4 shrink-0 rounded border-surface-300 text-navy-500 focus:ring-navy-500/20 accent-[#0038FF]"
                      aria-label={`Select ${comment.author}`}
                    />
                    {comment.authorAvatar ? (
                      <img
                        src={comment.authorAvatar}
                        alt={comment.author}
                        className="h-10 w-10 rounded-full border-2 border-surface-200/80 object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full border-2 border-surface-200/80 bg-surface-100 flex items-center justify-center text-xs font-bold text-ink-500 shrink-0">
                        {comment.author.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-ink-800">{comment.author}</span>
                        <span className="text-[10px] text-ink-400 font-medium">
                          {new Date(comment.publishedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {comment.authorSubscribers && (
                          <span className="text-[9px] text-ink-400 font-medium">
                            {comment.authorSubscribers} subs · {comment.authorHistoryCount} prior
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-700 leading-relaxed font-medium mt-1.5 pr-2">
                        {comment.text}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 font-bold px-2 py-0.5 border rounded-lg text-[10px] ${cfg.cls}`}>
                      <CheckCircle className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Draft reply preview */}
                  <div className="mt-3 bg-surface-50/80 border border-surface-200/60 rounded-xl p-3 text-left">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CornerDownRight className="h-3 w-3 text-ink-400" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
                        Draft auto-reply
                      </span>
                    </div>
                    {comment.autoReplyText ? (
                      <p className="text-[11px] text-ink-600 leading-relaxed italic">
                        &ldquo;{comment.autoReplyText}&rdquo;
                      </p>
                    ) : (
                      <p className="text-[11px] text-ink-400 italic">
                        No draft yet — use <span className="font-semibold text-navy-600">Edit &amp; Reply</span> to write one.
                      </p>
                    )}
                  </div>

                  {/* Badges row */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 border rounded-lg text-[10px] ${match.cls}`}>
                      <MessageSquareQuote className="h-3 w-3" />
                      {match.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 border rounded-lg text-[10px] ${senti.cls}`}>
                      {senti.label}
                    </span>
                    {comment.status === "matched" && comment.delayRemainingSeconds > 0 && (
                      <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 border rounded-lg text-[10px] bg-coral-50 text-coral-600 border-coral-200/60">
                        <Clock className="h-3 w-3" />
                        Dispatching in {Math.floor(comment.delayRemainingSeconds / 60)}m {comment.delayRemainingSeconds % 60}s
                      </span>
                    )}
                  </div>

                  {/* Inline editor */}
                  {editingId === comment.id && (
                    <div
                      className="mt-3 p-3 bg-surface-50/80 border border-surface-200/60 rounded-xl space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        placeholder="Write or edit the reply before sending..."
                        className="w-full rounded-xl border border-surface-200/60 bg-white px-3 py-2 text-xs text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditingId(null); setEditText(""); }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500 hover:bg-surface-100 px-3 py-1.5 rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void handleApprove(comment, editText)}
                          disabled={!editText.trim() || isBusy}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-mint-500 hover:bg-mint-600 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 shadow-sm"
                        >
                          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Save & Send
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {isActionable && (
                    <div
                      className="flex justify-end items-center gap-2 mt-3 pt-3 border-t border-surface-200/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => void handleBlock(comment)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-400 hover:text-coral-500 px-2 py-1.5 rounded-xl transition-all hover:bg-coral-500/6 disabled:opacity-50"
                        title="Block commenter"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        Block
                      </button>
                      <button
                        onClick={() => void handleSkip(comment)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-500 bg-surface-100 hover:bg-surface-200 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
                        title="Skip (S)"
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
                        Skip
                      </button>
                      <button
                        onClick={() => openEditor(comment)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy-600 bg-navy-500/6 hover:bg-navy-500/12 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
                        title="Edit & Reply (E)"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit & Reply
                      </button>
                      <button
                        onClick={() => void handleApprove(comment)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-mint-500 hover:bg-mint-600 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 shadow-sm"
                        title="Approve (A)"
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                        Approve
                      </button>
                    </div>
                  )}

                  {/* Terminal state footer (replied / skipped) */}
                  {!isActionable && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-surface-200/60">
                      {comment.status === "replied" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-mint-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Reply dispatched{comment.replyFiredAt ? ` at ${new Date(comment.replyFiredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-400">
                          <Ban className="h-3.5 w-3.5" />
                          Auto-reply skipped / dismissed
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
