"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/frontend/store";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Send,
  Sparkles,
  Clock,
  CheckCircle,
  History,
  Users,
  Video,
  Loader2,
  MessageSquareCode,
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
}

export default function CommentDetailsPanel() {
  const selectedCommentId = useUIStore((state) => state.selectedCommentId);
  const setSelectedCommentId = useUIStore((state) => state.setSelectedCommentId);
  const showToast = useUIStore((state) => state.showToast);
  const triggerRefresh = useUIStore((state) => state.triggerRefresh);
  const refreshTrigger = useUIStore((state) => state.refreshTrigger);

  const [comment, setComment] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    async function loadComment() {
      if (!selectedCommentId) { setComment(null); return; }
      try {
        const res = await fetch("/api/comments");
        if (res.ok) {
          const data = await res.json();
          const found = data.find((c: Comment) => c.id === selectedCommentId);
          if (found) { setComment(found); setReplyText(found.autoReplyText || ""); }
        }
      } catch (err) { console.error("Error loading single comment details:", err); }
    }
    loadComment();
  }, [selectedCommentId, refreshTrigger]);

  const handleSendNow = async () => {
    if (!comment) return;
    try {
      const res = await fetch(`/api/comments/${comment.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoReplyText: replyText })
      });
      if (res.ok) { showToast("Reply sent successfully!", "success"); triggerRefresh(); setSelectedCommentId(null); }
    } catch (err) { console.error("Error replying from detail drawer:", err); }
  };

  const handleSkip = async () => {
    if (!comment) return;
    try {
      const res = await fetch(`/api/comments/${comment.id}/skip`, { method: "POST" });
      if (res.ok) { showToast("Auto-reply skipped.", "warning"); triggerRefresh(); setSelectedCommentId(null); }
    } catch (err) { console.error("Error skipping from detail drawer:", err); }
  };

  const statusLabel = (status: Comment["status"]) => {
    const map: Record<string, { label: string; cls: string }> = {
      replied: { label: "Replied", cls: "bg-mint-50 text-mint-600 border-mint-200/60" },
      matched: { label: "Queued", cls: "bg-navy-500/6 text-navy-600 border-navy-200/30" },
      review: { label: "Review", cls: "bg-volt-50 text-volt-700 border-volt-200/60" },
      skipped: { label: "Skipped", cls: "bg-surface-100 text-ink-500 border-surface-200/60" },
      failed: { label: "Failed", cls: "bg-coral-50 text-coral-600 border-coral-200/60" },
    };
    return map[status] || map.failed;
  };

  return (
    <AnimatePresence>
      {selectedCommentId && comment && (
        <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCommentId(null)}
            className="fixed inset-0 bg-navy-900/10 backdrop-blur-[2px] pointer-events-auto"
          />

          {/* Slide-out panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative flex h-full w-full max-w-[420px] flex-col glass-strong shadow-elevated-lg pointer-events-auto"
          >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-surface-200/60 px-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-brand flex items-center justify-center">
                  <MessageSquareCode className="h-4 w-4 text-white" />
                </div>
                <span className="font-display text-sm font-bold text-ink-800">
                  Comment Inspector
                </span>
              </div>
              <button
                onClick={() => setSelectedCommentId(null)}
                className="rounded-xl p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {/* Profile Card */}
              <div className="card-premium glass-card p-4 flex items-center gap-4">
                {comment.authorAvatar ? (
                  <img
                    src={comment.authorAvatar}
                    alt={comment.author}
                    className="h-12 w-12 rounded-full border-2 border-surface-200/80 object-cover shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full border-2 border-surface-200/80 bg-surface-100 flex items-center justify-center text-xs font-bold text-ink-500 shrink-0">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <h4 className="text-xs font-bold text-ink-800">{comment.author}</h4>
                  <div className="flex items-center gap-3 text-[10px] text-ink-500 font-semibold mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-navy-500" />
                      {comment.authorSubscribers} subscribers
                    </span>
                    <span className="text-surface-300">·</span>
                    <span className="flex items-center gap-1">
                      <History className="h-3.5 w-3.5 text-volt-600" />
                      {comment.authorHistoryCount} prior
                    </span>
                  </div>
                </div>
                <span className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusLabel(comment.status).cls}`}>
                  {statusLabel(comment.status).label}
                </span>
              </div>

              {/* Original Comment */}
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-bold uppercase text-ink-400 tracking-[0.12em] block">
                  Original Comment
                </span>
                <div className="rounded-xl border border-surface-200/60 p-4 bg-surface-50/80 leading-relaxed">
                  <p className="text-xs text-ink-700 font-medium italic">
                    &ldquo;{comment.text}&rdquo;
                  </p>
                  <span className="text-[9px] font-semibold text-ink-400 block mt-2">
                    Published: {new Date(comment.publishedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Video Context */}
              <div className="rounded-xl border border-surface-200/60 p-3 flex items-center justify-between gap-3 bg-surface-50/80">
                <div className="text-left">
                  <span className="text-[8px] font-bold uppercase text-ink-400 tracking-[0.12em] block">Video Context</span>
                  <h5 className="text-[11px] font-bold text-ink-700 line-clamp-1 mt-0.5">{comment.videoTitle}</h5>
                </div>
                {comment.videoThumbnail ? (
                  <img
                    src={comment.videoThumbnail}
                    alt={comment.videoTitle}
                    className="h-8 w-12 rounded-lg object-cover border border-surface-200/60 shrink-0"
                  />
                ) : (
                  <div className="h-8 w-12 rounded-lg bg-surface-100 border border-surface-200/60 flex items-center justify-center text-ink-400 shrink-0">
                    <Video className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Reply Compose */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-bold uppercase text-ink-400 tracking-[0.12em] block">
                  Draft Response
                </span>
                <textarea
                  rows={6}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Enter reply response..."
                  disabled={comment.status === "replied"}
                  className="input-glass resize-none !rounded-xl disabled:bg-surface-100 disabled:text-ink-400"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-surface-200/60 p-4 glass shrink-0 flex items-center justify-between gap-3">
              {comment.status !== "replied" && comment.status !== "skipped" ? (
                <>
                  <button
                    onClick={handleSkip}
                    className="btn-glass inline-flex flex-1 items-center justify-center gap-1.5 !rounded-xl"
                  >
                    Skip Auto-Reply
                  </button>
                  <button
                    disabled={!replyText.trim()}
                    onClick={handleSendNow}
                    className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5 !rounded-xl disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Send Reply
                  </button>
                </>
              ) : (
                <div className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-ink-400 bg-surface-100/80 rounded-xl border border-surface-200/60">
                  {comment.status === "replied" ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-mint-500" />
                      Reply has been dispatched successfully
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-ink-400" />
                      Auto-reply was skipped / dismissed
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
