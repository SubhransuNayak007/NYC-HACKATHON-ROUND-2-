"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useUIStore } from "@/frontend/store";
import { motion, AnimatePresence } from "framer-motion";
import LiveTimer from "@/frontend/components/ui/LiveTimer";
import {
  Send,
  XOctagon,
  UserMinus,
  Edit3,
  CheckCircle,
  Clock,
  RefreshCw,
  Youtube,
  Video,
  Zap,
  Wifi,
  WifiOff,
  Sparkles,
  Loader2,
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
  fetchedAt?: string;
  confidence?: number;
}

const statusConfig = {
  replied: { label: "Auto-replied", icon: CheckCircle, bg: "bg-mint-50", text: "text-mint-600", border: "border-mint-200/60", accent: "border-l-mint-500" },
  matched: { label: "Queued reply", icon: Clock, bg: "bg-navy-500/6", text: "text-navy-600", border: "border-navy-200/30", accent: "border-l-navy-500" },
  review: { label: "Flagged for Review", icon: Clock, bg: "bg-volt-50", text: "text-volt-700", border: "border-volt-200/60", accent: "border-l-volt-500" },
  skipped: { label: "Skipped", icon: Clock, bg: "bg-surface-100", text: "text-ink-500", border: "border-surface-200/60", accent: "border-l-surface-300" },
  failed: { label: "Failed", icon: Clock, bg: "bg-coral-50", text: "text-coral-600", border: "border-coral-200/60", accent: "border-l-coral-500" },
};

export default function LiveCommentFeed() {
  const activeChannelId = useUIStore((state) => state.activeChannelId);
  const selectedCommentId = useUIStore((state) => state.selectedCommentId);
  const setSelectedCommentId = useUIStore((state) => state.setSelectedCommentId);
  const showToast = useUIStore((state) => state.showToast);
  const refreshTrigger = useUIStore((state) => state.refreshTrigger);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);

  const [comments, setComments] = useState<Comment[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "matched" | "review">("all");
  const [loading, setLoading] = useState(true);

  const [aiReplyLoading, setAiReplyLoading] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState<string | null>(null);

  const [processedToday, setProcessedToday] = useState(0);
  const [repliedCount, setRepliedCount] = useState(0);

  const [connectionStatus, setConnectionStatus] = useState<"sse" | "polling" | "disconnected">("disconnected");
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const sseRetryRef = useRef(0);

  useEffect(() => {
    async function fetchComments() {
      try {
        let url = `/api/comments`;
        // Only add channelId filter if one is selected
        if (activeChannelId) url += `?channelId=${activeChannelId}`;
        if (activeTab === "matched") url += activeChannelId ? "&status=matched" : "?status=matched";
        else if (activeTab === "review") url += activeChannelId ? "&status=review" : "?status=review";

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // If a channel is selected, filter by it; otherwise show all
          const filtered = activeChannelId
            ? data.filter((c: Comment) => c.channelId === activeChannelId)
            : data;
          setComments(filtered);
        }
      } catch (err) {
        console.error("Error fetching comments in feed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchComments();
  }, [activeChannelId, activeTab, refreshTrigger]);

  useEffect(() => {
    async function calculateStats() {
      try {
        const res = await fetch("/api/comments");
        if (res.ok) {
          const allComments = await res.json();
          // If a channel is selected, filter by it; otherwise show all stats
          const channelComments = activeChannelId
            ? allComments.filter((c: Comment) => c.channelId === activeChannelId)
            : allComments;
          setRepliedCount(channelComments.filter((c: Comment) => c.status === "replied").length);
          setProcessedToday(channelComments.length);
        }
      } catch (err) {
        console.error("Error calculating stats:", err);
      }
    }
    calculateStats();
  }, [activeChannelId, refreshTrigger]);

  // --- Real-time Connection: SSE (Server-Sent Events) with polling fallback ---
  const handleRealtimeEvent = useCallback((data: any) => {
    if (data.type === "poll_complete") { setLastPollTime(new Date()); triggerRefresh(); return; }
    if (data.type === "new" || data.type === "replied" || data.type === "rag_match") triggerRefresh();
    if (data.type === "review") { showToast("Comment flagged for review (negative keywords detected)", "warning"); triggerRefresh(); }
    if (data.type === "rag_match" && data.comment) showToast(`RAG auto-reply sent to ${data.comment.author}`, "success");
  }, [triggerRefresh, showToast]);

  // SSE connection — primary real-time channel
  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    try {
      const eventSource = new EventSource("/api/comments/stream");
      sseRef.current = eventSource;
      eventSource.onopen = () => {
        sseRetryRef.current = 0;
        setConnectionStatus("sse");
        console.log("[LiveFeed] SSE connected");
      };
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeEvent(data);
        } catch { /* heartbeat comment */ }
      };
      eventSource.onerror = () => {
        console.log("[LiveFeed] SSE error, falling back to polling");
        setConnectionStatus("polling");
        // Retry SSE after 5 seconds, but give up after repeated failures
        // (e.g. unauthenticated session) and rely on the 30s poll timer.
        sseRetryRef.current += 1;
        if (sseRetryRef.current <= 3) {
          setTimeout(() => connectSSE(), 5000);
        } else {
          console.log("[LiveFeed] SSE retries exhausted, staying on polling");
        }
      };
    } catch {
      console.log("[LiveFeed] SSE not available, using polling");
      setConnectionStatus("polling");
    }
  }, [handleRealtimeEvent]);

  useEffect(() => {
    connectSSE();
    return () => {
      if (sseRef.current) sseRef.current.close();
    };
  }, [connectSSE]);

  useEffect(() => {
    const pollTimer = setInterval(async () => {
      try {
        // Trigger backend to poll YouTube for new comments
        const res = await fetch("/api/youtube/poll");
        if (res.ok) {
          const data = await res.json();
          setLastPollTime(new Date());
          // If backend found new comments, refresh the feed
          if (data.summary?.checkedCount > 0 || data.summary?.repliedCount > 0) {
            triggerRefresh();
          }
        }
      } catch (err) {
        console.error("Auto-polling failed", err);
      }
    }, 30000);
    return () => clearInterval(pollTimer);
  }, [triggerRefresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      setComments((prev) => prev.map((comment) => {
        if (comment.status === "matched" && comment.delayRemainingSeconds > 0) {
          const nextVal = comment.delayRemainingSeconds - 1;
          if (nextVal <= 0) { setTimeout(() => triggerRefresh(), 100); return { ...comment, delayRemainingSeconds: 0 }; }
          return { ...comment, delayRemainingSeconds: nextVal };
        }
        return comment;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [triggerRefresh]);

  const handleSendNow = async (commentId: string, replyText: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoReplyText: replyText })
      });
      if (res.ok) { showToast("Auto-reply sent successfully!", "success"); triggerRefresh(); }
    } catch (err) { console.error("Error sending reply now:", err); }
  };

  const handleSkip = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/skip`, { method: "POST" });
      if (res.ok) { showToast("Auto-reply skipped.", "warning"); triggerRefresh(); }
    } catch (err) { console.error("Error skipping comment:", err); }
  };

  const handleAIReply = async (comment: Comment) => {
    setAiReplyLoading(comment.id);
    try {
      const res = await fetch("/api/ai/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentText: comment.text,
          author: comment.author,
          videoTitle: comment.videoTitle,
          channelName: "My Channel",
          tone: "friendly",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (window.confirm(`AI Generated Reply:\n\n"${data.reply}"\n\nSend this reply?`)) {
          await handleSendNow(comment.id, data.reply);
        }
      } else {
        showToast("AI reply generation failed. Check ANTHROPIC_API_KEY.", "error");
      }
    } catch (err) {
      showToast("Network error generating AI reply", "error");
    } finally {
      setAiReplyLoading(null);
    }
  };

  const handleBlock = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/block`, { method: "POST" });
      if (res.ok) { showToast("User blocked and pending actions cancelled.", "error"); triggerRefresh(); }
    } catch (err) { console.error("Error blocking commenter:", err); }
  };

  const handleManualReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    setReplySending(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoReplyText: replyText.trim() })
      });
      if (res.ok) {
        showToast("Reply sent successfully!", "success");
        setReplyingTo(null);
        setReplyText("");
        triggerRefresh();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to send reply", "error");
      }
    } catch (err) {
      showToast("Network error sending reply", "error");
    } finally {
      setReplySending(null);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  // A comment is "golden hour" when the engine fetched it within 60 min of publish
  const isGoldenHour = (c: Comment): boolean => {
    if (!c.fetchedAt) return false;
    const publishMs = new Date(c.publishedAt).getTime();
    const fetchMs = new Date(c.fetchedAt).getTime();
    const diff = fetchMs - publishMs;
    return diff >= 0 && diff <= 60 * 60 * 1000;
  };

  const tabs = [
    { key: "all" as const, label: "All Activity", count: null },
    { key: "matched" as const, label: "Queued & Sent", count: comments.filter(c => c.status === "matched" || c.status === "replied").length },
    { key: "review" as const, label: "Review Queue", count: comments.filter(c => c.status === "review").length },
  ];

  const goldenHourCount = comments.filter(isGoldenHour).length;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Real-time Ticker & Header */}
      <div className="card-premium glass-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-coral-500/8 border border-coral-200/40 px-3 py-1 font-semibold text-coral-600 text-xs">
            <span className="h-2 w-2 rounded-full bg-coral-500 dot-pulse" />
            <span>LIVE</span>
          </div>
          <div className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
            connectionStatus === "sse"
              ? "bg-mint-50 border-mint-200/60 text-mint-600"
              : "bg-surface-100 border-surface-200/60 text-ink-400"
          }`}>
            {connectionStatus === "sse" ? (
              <><Wifi className="h-3 w-3" /> Live</>
            ) : (
              <><WifiOff className="h-3 w-3" /> Polling 30s</>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] font-semibold text-ink-500 bg-surface-100/80 border border-surface-200/60 px-3.5 py-1.5 rounded-xl">
            {processedToday} processed <span className="text-surface-300 mx-1">·</span> {repliedCount} replied <span className="text-surface-300 mx-1">·</span> <Zap className="h-3 w-3 inline text-volt-600" /> 24/7
          </div>
          {goldenHourCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-volt-500/10 border border-volt-200/50 px-3 py-1.5 font-bold text-volt-700 text-[11px] golden-hour-badge">
              <Zap className="h-3 w-3" /> {goldenHourCount} golden-hour
            </div>
          )}
          {lastPollTime && (
            <span className="text-[10px] text-ink-400 font-medium hidden lg:inline">
              Last poll: {lastPollTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-surface-200/60">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-xs font-semibold transition-all rounded-t-xl ${
                activeTab === tab.key
                  ? "text-navy-600 bg-navy-500/6"
                  : "text-ink-400 hover:text-ink-600 hover:bg-surface-50"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? "bg-navy-500/10 text-navy-600" : "bg-surface-100 text-ink-400"
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <motion.div layoutId="feedTab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-brand rounded-full" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={triggerRefresh}
          className="rounded-xl p-2 text-ink-400 hover:bg-surface-100 hover:text-navy-500 transition-all active:scale-95"
          title="Refresh Feed"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[400px]">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-premium glass-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full shimmer" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-24 shimmer rounded-full" />
                    <div className="h-3 w-full shimmer rounded-full" />
                  </div>
                </div>
                <div className="h-12 shimmer rounded-xl" />
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="card-premium glass-card p-12 text-center">
            <div className="h-14 w-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
              <Youtube className="h-6 w-6 text-ink-400" />
            </div>
            <h4 className="font-display text-sm font-bold text-ink-700">No comments yet</h4>
            <p className="text-xs text-ink-400 mt-1 max-w-[320px] mx-auto leading-relaxed">
              The 24/7 background worker is polling every 30 seconds. Comments will appear here automatically once your connected YouTube channel receives new comments.
            </p>
            <p className="text-[10px] text-ink-400 mt-3 max-w-[320px] mx-auto">
              Make sure your channel is connected via Google OAuth in Settings → Platforms, and that you have FAQs in the Knowledge Base for auto-replies.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {comments.map((comment, index) => {
              const isSelected = selectedCommentId === comment.id;
              const cfg = statusConfig[comment.status] || statusConfig.failed;
              const StatusIcon = cfg.icon;
              const golden = isGoldenHour(comment);

              return (
                <motion.div
                  key={comment.id}
                  layoutId={`comment-card-${comment.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setSelectedCommentId(comment.id)}
                  className={`card-premium glass-card p-4 cursor-pointer select-none border-l-[3px] transition-all duration-200 glow-on-hover hover-lift ${
                    cfg.accent
                  } ${golden ? "feed-flash" : ""} ${isSelected ? "!ring-2 !ring-navy-500/15 !border-navy-300/60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* User profile */}
                    <div className="flex items-start gap-3">
                      {comment.authorAvatar ? (
                        <img
                          src={comment.authorAvatar}
                          alt={comment.author}
                          className="h-9 w-9 rounded-full border-2 border-surface-200/80 object-cover mt-0.5 shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full border-2 border-surface-200/80 bg-surface-100 flex items-center justify-center text-[10px] font-bold text-ink-500 mt-0.5 shrink-0">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-ink-800">{comment.author}</span>
                          <span className="text-[10px] text-ink-400 font-medium">
                            {new Date(comment.publishedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-xs text-ink-600 leading-relaxed font-medium mt-1 pr-4">
                          {comment.text}
                        </p>
                      </div>
                    </div>

                    {/* Video thumbnail */}
                    <div className="flex gap-2 items-center bg-surface-50/80 rounded-xl p-1.5 border border-surface-200/60 max-w-[150px] shrink-0 hidden md:flex">
                      {comment.videoThumbnail ? (
                        <img
                          src={comment.videoThumbnail}
                          alt={comment.videoTitle}
                          className="h-7 w-7 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-surface-100 border border-surface-200/60 flex items-center justify-center text-ink-400 shrink-0">
                          <Video className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <span className="text-[9px] text-ink-400 font-semibold line-clamp-2 leading-tight">
                        {comment.videoTitle}
                      </span>
                    </div>
                  </div>

                  {/* Reply preview & status */}
                  <div className="mt-3 bg-surface-50/80 border border-surface-200/60 rounded-xl p-3 space-y-2 text-left">
                    <div className="flex items-center justify-between text-[10px] flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        {comment.status === "replied" ? (
                          <span className="celebrate inline-flex">
                            <span className={`inline-flex items-center gap-1 font-bold ${cfg.text} ${cfg.bg} px-2 py-0.5 border ${cfg.border} rounded-lg`}>
                              <StatusIcon className="h-3 w-3" />
                              {cfg.label}
                            </span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 font-bold ${cfg.text} ${cfg.bg} px-2 py-0.5 border ${cfg.border} rounded-lg`}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        )}
                        {golden && (
                          <span className="golden-hour-badge inline-flex items-center gap-1 font-bold px-2 py-0.5 border rounded-lg text-[10px] bg-volt-50 text-volt-700 border-volt-200/60" title="Comment arrived within 60 minutes of video publish">
                            <Zap className="h-3 w-3" /> Golden Hour
                          </span>
                        )}
                        {comment.sentiment && (
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 border rounded-lg text-[10px] ${
                            comment.sentiment === "positive" ? "bg-mint-50 text-mint-600 border-mint-200/60" :
                            comment.sentiment === "negative" ? "bg-coral-50 text-coral-600 border-coral-200/60" :
                            comment.sentiment === "question" ? "bg-volt-50 text-volt-700 border-volt-200/60" :
                            comment.sentiment === "spam" ? "bg-surface-100 text-ink-400 border-surface-200/60" :
                            "bg-navy-500/6 text-navy-600 border-navy-200/30"
                          }`}>
                            {comment.sentiment === "positive" ? "😊" :
                             comment.sentiment === "negative" ? "😞" :
                             comment.sentiment === "question" ? "❓" :
                             comment.sentiment === "spam" ? "🚫" : "😐"}
                            {comment.sentiment.charAt(0).toUpperCase() + comment.sentiment.slice(1)}
                          </span>
                        )}
                        {typeof comment.confidence === "number" && comment.confidence > 0 && (
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 border rounded-lg text-[10px] ${
                            comment.confidence >= 0.7 ? "bg-green-50 text-green-600 border-green-200/60" :
                            comment.confidence >= 0.4 ? "bg-amber-50 text-amber-600 border-amber-200/60" :
                            "bg-red-50 text-red-600 border-red-200/60"
                          }`}>
                            🎯 {(comment.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                        {comment.replySource && comment.replySource !== "rule" && (
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 border rounded-lg text-[10px] ${
                            comment.replySource === "ai" ? "bg-purple-50 text-purple-600 border-purple-200/60" :
                            comment.replySource === "rag" ? "bg-volt-50 text-volt-700 border-volt-200/60" :
                            "bg-surface-100 text-ink-400 border-surface-200/60"
                          }`}>
                            {comment.replySource === "ai" ? "✨ AI" :
                             comment.replySource === "rag" ? "🧠 RAG" : "🌐 Global"}
                          </span>
                        )}
                        {comment.language && comment.language !== "en" && (
                          <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 border rounded-lg text-[10px] bg-navy-500/6 text-navy-600 border-navy-200/30">
                            🌐 {comment.language.toUpperCase()}
                            {comment.wasTranslated && <span className="text-purple-500 ml-0.5">translated</span>}
                          </span>
                        )}
                        {comment.fetchedAt && (comment.status === "review" || comment.status === "matched") && (
                          <LiveTimer startedAt={comment.fetchedAt} className="text-ink-400" />
                        )}
                      </div>

                      {comment.status === "matched" && comment.delayRemainingSeconds > 0 && (
                        <div className="flex items-center gap-1 font-bold text-coral-600 bg-coral-500/6 border border-coral-200/40 rounded-lg px-2 py-0.5">
                          <Clock className="h-3 w-3 text-coral-500 dot-pulse" />
                          <span>Dispatching in {formatTimer(comment.delayRemainingSeconds)}</span>
                        </div>
                      )}

                      {comment.status === "replied" && comment.replyFiredAt && (
                        <span className="text-ink-400 font-semibold">
                          Sent at {new Date(comment.replyFiredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      )}
                    </div>

                    {comment.autoReplyText && (
                      <p className="text-[11px] text-ink-600 line-clamp-2 leading-relaxed border-t border-surface-200/60 pt-2">
                        <span className="font-bold text-ink-500 block mb-0.5">Response:</span>
                        <span className="italic">&ldquo;{comment.autoReplyText}&rdquo;</span>
                      </p>
                    )}
                  </div>

                  {/* Manual Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 p-3 bg-surface-50/80 border border-surface-200/60 rounded-xl" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && replyText.trim()) handleManualReply(comment.id); }}
                          placeholder="Type your reply..."
                          className="flex-1 bg-white border border-surface-200/60 rounded-lg px-3 py-2 text-xs text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                          autoFocus
                        />
                        <button
                          onClick={() => handleManualReply(comment.id)}
                          disabled={!replyText.trim() || replySending === comment.id}
                          className="btn-primary !rounded-lg !text-[11px] !py-2 !px-3 disabled:opacity-50"
                        >
                          {replySending === comment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          className="rounded-lg p-2 text-ink-400 hover:bg-surface-100 hover:text-ink-600 transition-all"
                        >
                          <XOctagon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div
                    className="flex justify-end items-center gap-2 mt-3 pt-3 border-t border-surface-200/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedCommentId(comment.id)}
                      className="rounded-xl p-2 text-ink-400 hover:bg-surface-100 hover:text-navy-500 transition-all"
                      title="Inspect Details"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    {comment.status !== "replied" && (
                      <>
                        {/* Reply button — available on ALL unreplied comments */}
                        <button
                          onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(""); }}
                          className={`inline-flex items-center gap-1.5 !rounded-xl !text-[11px] !py-1.5 !px-3 ${
                            replyingTo === comment.id
                              ? "!bg-navy-500/10 !text-navy-600 !border-navy-200/60"
                              : "btn-primary"
                          }`}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Reply
                        </button>

                        <button
                          onClick={() => handleAIReply(comment)}
                          className="btn-glass inline-flex items-center gap-1.5 !rounded-xl !text-[11px] !py-1.5 !px-3 !border-purple-200/60 !text-purple-600 hover:!bg-purple-50"
                        >
                          {aiReplyLoading === comment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          AI Reply
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleBlock(comment.id)}
                      className="inline-flex items-center gap-1 text-ink-400 hover:text-coral-500 px-2 py-1 rounded-xl text-[11px] font-semibold transition-all hover:bg-coral-500/6"
                      title="Block Commenter"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Block</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
