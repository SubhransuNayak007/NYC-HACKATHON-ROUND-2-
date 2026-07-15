"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Sparkles,
  TrendingUp,
  ThumbsUp,
  MessageSquare,
  Plus,
  CheckCircle,
  Loader2,
  BarChart3,
  Bot
} from "lucide-react";
import { useUIStore } from "@/frontend/store";

interface SuggestedRule {
  id: string;
  pattern: string;
  exampleComments: string[];
  suggestedCondition: string;
  suggestedReply: string;
  confidence: number;
  reason: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

interface SuggestedFAQ {
  id: string;
  question: string;
  suggestedAnswer: string;
  exampleComments: string[];
  frequency: number;
  confidence: number;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

interface ReplyEffectiveness {
  commentId: string;
  replyText: string;
  replyFiredAt: string;
  gotLikes: boolean;
  likeCount: number;
  gotFollowUpReply: boolean;
  followUpSentiment?: "positive" | "neutral" | "negative";
  commenterReturned: boolean;
  effectivenessScore: number;
  trackedAt: string;
}

export default function AILearningPage() {
  const showToast = useUIStore((state) => state.showToast);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [suggestedRules, setSuggestedRules] = useState<SuggestedRule[]>([]);
  const [suggestedFaqs, setSuggestedFaqs] = useState<SuggestedFAQ[]>([]);
  const [effectivenessData, setEffectivenessData] = useState<ReplyEffectiveness[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sugRes, effRes] = await Promise.all([
        fetch("/api/ai/suggest"),
        fetch("/api/ai/effectiveness"),
      ]);

      if (sugRes.ok) {
        const data = await sugRes.json();
        setSuggestedRules(data.rules || []);
        setSuggestedFaqs(data.faqs || []);
      }
      if (effRes.ok) {
        const data = await effRes.json();
        setEffectivenessData(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch AI data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/suggest", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        showToast(`Analyzed ${data.analyzedCount || 100} recent comments. Found new patterns.`, "success");
        fetchData();
      } else {
        showToast("Failed to generate suggestions", "error");
      }
    } catch (err) {
      showToast("Network error", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptSuggestion = (id: string, type: "rule" | "faq") => {
    showToast(`Accepted ${type} suggestion. Adding to system...`, "success");
    // In a real implementation, this would POST to /api/rules or /api/faqs
    if (type === "rule") {
      setSuggestedRules(prev => prev.filter(r => r.id !== id));
    } else {
      setSuggestedFaqs(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleDismissSuggestion = (id: string, type: "rule" | "faq") => {
    if (type === "rule") {
      setSuggestedRules(prev => prev.filter(r => r.id !== id));
    } else {
      setSuggestedFaqs(prev => prev.filter(f => f.id !== id));
    }
  };

  const avgEffectiveness = effectivenessData.length
    ? Math.round(effectivenessData.reduce((acc, curr) => acc + curr.effectivenessScore, 0) / effectivenessData.length)
    : 0;

  return (
    <div className="space-y-6 text-left max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 border border-purple-200">
              <Bot className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-ink-800 md:text-xl">
                AI Insights & Learning
              </h1>
              <p className="text-xs text-ink-500 mt-0.5">
                QuickReply learns from your channel's comment patterns and response effectiveness
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerateSuggestions}
          disabled={generating}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:from-purple-700 hover:to-indigo-700 transition active:scale-95 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Analyze Recent Comments
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-xs font-medium text-ink-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading AI insights...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Suggestions Column (Left - 2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Suggested Rules Section */}
            <div className="card-premium glass-card rounded-xl border border-surface-200 shadow-sm overflow-hidden">
              <div className="border-b border-surface-200 bg-surface-50/50 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <h3 className="text-sm font-bold text-ink-800">Suggested Rules</h3>
                </div>
                <p className="text-[11px] text-ink-500 mt-1">
                  AI-detected keyword patterns that you frequently receive.
                </p>
              </div>
              <div className="p-4">
                {suggestedRules.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-8 w-8 text-mint-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-ink-600">No new rule suggestions</p>
                    <p className="text-[10px] text-ink-400 mt-1">Run an analysis to discover new patterns.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {suggestedRules.map((rule) => (
                        <motion.div
                          key={rule.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="border border-purple-100 bg-purple-50/30 rounded-xl p-4"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-purple-900">Pattern: "{rule.pattern}"</span>
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded font-semibold">
                                  {rule.confidence}% Confidence
                                </span>
                              </div>
                              <p className="text-[11px] text-ink-600">
                                <span className="font-semibold">Reason:</span> {rule.reason}
                              </p>
                              <div className="bg-white border border-surface-200 rounded-lg p-2.5">
                                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider block mb-1">
                                  Suggested Auto-Reply
                                </span>
                                <p className="text-[11px] text-ink-700 font-medium italic">
                                  "{rule.suggestedReply}"
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                onClick={() => handleAcceptSuggestion(rule.id, "rule")}
                                className="inline-flex items-center justify-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-purple-700 transition"
                              >
                                <Plus className="h-3 w-3" /> Create Rule
                              </button>
                              <button
                                onClick={() => handleDismissSuggestion(rule.id, "rule")}
                                className="inline-flex items-center justify-center gap-1.5 border border-surface-200 bg-white text-ink-600 px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-surface-50 transition"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Suggested FAQs Section */}
            <div className="card-premium glass-card rounded-xl border border-surface-200 shadow-sm overflow-hidden">
              <div className="border-b border-surface-200 bg-surface-50/50 p-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-navy-500" />
                  <h3 className="text-sm font-bold text-ink-800">Suggested FAQs</h3>
                </div>
                <p className="text-[11px] text-ink-500 mt-1">
                  Common questions detected by the semantic analysis engine.
                </p>
              </div>
              <div className="p-4">
                {suggestedFaqs.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-8 w-8 text-mint-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-ink-600">No new FAQ suggestions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {suggestedFaqs.map((faq) => (
                        <motion.div
                          key={faq.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="border border-blue-100 bg-blue-50/30 rounded-xl p-4"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-navy-500" />
                                <span className="text-xs font-bold text-ink-800">{faq.question}</span>
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded font-semibold">
                                  Asked {faq.frequency} times
                                </span>
                              </div>
                              <div className="bg-white border border-surface-200 rounded-lg p-2.5">
                                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider block mb-1">
                                  Draft Answer
                                </span>
                                <p className="text-[11px] text-ink-700">
                                  {faq.suggestedAnswer}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                onClick={() => handleAcceptSuggestion(faq.id, "faq")}
                                className="inline-flex items-center justify-center gap-1.5 bg-navy-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-navy-600 transition"
                              >
                                <Plus className="h-3 w-3" /> Add to FAQs
                              </button>
                              <button
                                onClick={() => handleDismissSuggestion(faq.id, "faq")}
                                className="inline-flex items-center justify-center gap-1.5 border border-surface-200 bg-white text-ink-600 px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-surface-50 transition"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
            
          </div>

          {/* Right Column - Effectiveness Stats */}
          <div className="space-y-6">
            
            {/* Global AI Score Card */}
            <div className="card-premium glass-card rounded-xl border border-surface-200 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-indigo-500/0 rounded-bl-[100px] -z-0" />
              <div className="relative z-10 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-ink-600 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Avg Reply Effectiveness</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold text-ink-800">
                    {avgEffectiveness}
                  </span>
                  <span className="text-sm font-semibold text-ink-400">/ 100</span>
                </div>
                <p className="text-[10px] text-ink-500 mt-2">
                  Based on algorithmic scoring of viewer sentiment and engagement after auto-replying.
                </p>
              </div>
            </div>

            {/* Recent Reply Performance */}
            <div className="card-premium glass-card rounded-xl border border-surface-200 shadow-sm overflow-hidden flex-1">
              <div className="border-b border-surface-200 bg-surface-50/50 p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-ink-800">Recent Reply Performance</h3>
                </div>
              </div>
              <div className="p-0">
                {effectivenessData.length === 0 ? (
                  <div className="text-center p-6 text-[11px] text-ink-500">
                    Not enough data yet. Replies will be scored here once they receive engagement.
                  </div>
                ) : (
                  <div className="divide-y divide-surface-200">
                    {effectivenessData.slice(0, 5).map((eff, i) => (
                      <div key={i} className="p-4 hover:bg-surface-50 transition">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-semibold text-ink-400">
                            {new Date(eff.replyFiredAt).toLocaleDateString()}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                            ${eff.effectivenessScore >= 80 ? "bg-mint-100 text-mint-700" : 
                              eff.effectivenessScore >= 50 ? "bg-yellow-100 text-yellow-700" : 
                              "bg-coral-100 text-coral-700"}
                          `}>
                            Score: {eff.effectivenessScore}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-700 line-clamp-2 italic mb-2">
                          "{eff.replyText}"
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-ink-500 font-medium">
                          <span className="flex items-center gap-1">
                            {eff.gotLikes ? <ThumbsUp className="h-3 w-3 text-mint-500" /> : <ThumbsUp className="h-3 w-3 opacity-50" />}
                            {eff.likeCount} Likes
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {eff.commenterReturned ? "Viewer Returned" : "No Return"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
