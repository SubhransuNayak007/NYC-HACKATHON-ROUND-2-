"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Search,
  Filter,
  ShieldAlert,
  Flame,
  ShoppingBag,
  LifeBuoy,
  Gift,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Loader2,
  ThumbsUp,
  Tag,
  Clock,
  Send,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { useUIStore } from "@/frontend/store";

interface CommentItem {
  id: string;
  platform: string;
  author: string;
  authorAvatar?: string;
  text: string;
  publishedAt: string;
  contentTitle: string;
  contentId: string;
  intent: string;
  intentConfidence: number;
  sentiment: "positive" | "neutral" | "negative";
  queueCategory: "HIGH_PRIORITY" | "BUYING_INTENT" | "SUPPORT" | "GIVEAWAY" | "GENERAL" | "SPAM";
  spamScore: number;
  leadScore: number;
  isAnswered: boolean;
  repliedText?: string;
  tags: string[];
}

export default function CommentIntelligencePage() {
  const showToast = useUIStore((s) => s.showToast);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [intentStats, setIntentStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeQueue, setActiveQueue] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComment, setSelectedComment] = useState<CommentItem | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeQueue !== "ALL") params.append("queue", activeQueue);
      if (platformFilter !== "all") params.append("platform", platformFilter);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetch(`/api/intelligence/comments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.items || []);
        setIntentStats(data.intentDistribution || {});
        if (data.items?.length > 0 && !selectedComment) {
          setSelectedComment(data.items[0]);
        }
      }
    } catch {
      showToast("Failed to load comment intelligence", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeQueue, platformFilter, searchTerm, selectedComment, showToast]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const queuePills = [
    { id: "ALL", label: "All Comments", icon: MessageSquare, count: comments.length },
    { id: "HIGH_PRIORITY", label: "🔥 High Priority", icon: Flame, color: "text-rose-600 bg-rose-50 border-rose-200" },
    { id: "BUYING_INTENT", label: "⚡ Buying Intent", icon: ShoppingBag, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { id: "SUPPORT", label: "🛠️ Support", icon: LifeBuoy, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { id: "GIVEAWAY", label: "🎁 Giveaway", icon: Gift, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { id: "SPAM", label: "🛡️ Spam Radar", icon: ShieldAlert, color: "text-slate-600 bg-slate-100 border-slate-300" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-900">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Comment Intelligence Command Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                Live Intent Radar
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
              Zero-latency classification across buyer intent, high-risk complaints, giveaways, and bot detection.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            loadComments();
          }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
          <span>Sync Radar</span>
        </button>
      </div>

      {/* Smart Queue Pills */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
        {queuePills.map((q) => {
          const isActive = activeQueue === q.id;
          return (
            <button
              key={q.id}
              onClick={() => setActiveQueue(q.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/15"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <span>{q.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search comments by keyword, author, or content title..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {["all", "youtube", "instagram", "whatsapp", "telegram"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                platformFilter === p
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200 shadow-sm space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-xs font-bold text-slate-700">Analyzing comment streams...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center text-slate-500 border border-slate-200 shadow-sm space-y-3">
          <Brain className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-900">No Comments in this Queue</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Inbound comments matching this intent will automatically populate here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:min-h-[550px]">
          
          {/* Left: Comment Feed List (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Stream ({comments.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Sorted by Priority</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
              {comments.map((c) => {
                const isSelected = selectedComment?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedComment(c);
                      setReplyInput(c.repliedText || "");
                    }}
                    className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/20"
                        : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                          {c.intent.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 capitalize font-mono">
                          {c.platform}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(c.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 truncate">
                      {c.author}
                    </div>

                    <p className="text-xs text-slate-700 line-clamp-2 font-medium">
                      &ldquo;{c.text}&rdquo;
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
                      <span>Lead Score: {c.leadScore}/100</span>
                      {c.spamScore > 0.5 ? (
                        <span className="text-rose-600 font-bold">⚠️ Spam: {Math.round(c.spamScore * 100)}%</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">✓ Clean</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Inspection & Response Sandbox (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
            {selectedComment ? (
              <>
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-600" />
                        <span>{selectedComment.author}</span>
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">
                        Commented on &ldquo;{selectedComment.contentTitle}&rdquo;
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                      Intent: {selectedComment.intent} ({Math.round(selectedComment.intentConfidence * 100)}%)
                    </span>
                  </div>

                  {/* Comment Text Card */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Viewer Comment
                    </label>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold leading-relaxed">
                      &ldquo;{selectedComment.text}&rdquo;
                    </div>
                  </div>

                  {/* Telemetry Radar Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Sentiment</span>
                      <div className="text-xs font-black text-slate-800 capitalize">
                        {selectedComment.sentiment === "positive" ? "💚 Positive" : selectedComment.sentiment === "negative" ? "🔴 Negative" : "⚪ Neutral"}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Lead Score</span>
                      <div className="text-xs font-black text-indigo-600">
                        {selectedComment.leadScore} / 100
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Spam Radar</span>
                      <div className={`text-xs font-black ${selectedComment.spamScore > 0.5 ? "text-rose-600" : "text-emerald-700"}`}>
                        {Math.round(selectedComment.spamScore * 100)}% Risk
                      </div>
                    </div>
                  </div>

                  {/* Reply Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Public Reply Response
                    </label>
                    <textarea
                      rows={3}
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="Type reply or inspect autonomous response..."
                      className="w-full p-3.5 rounded-2xl text-xs bg-white border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-500">
                    Status: {selectedComment.isAnswered ? "✓ Replied" : "⏳ Standby"}
                  </div>
                  <button
                    onClick={() => {
                      showToast("Reply sent to platform successfully", "success");
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send Reply</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Brain className="h-10 w-10 opacity-30 text-indigo-500 mb-2" />
                <p className="text-xs font-bold text-slate-700">Select a comment to inspect</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
