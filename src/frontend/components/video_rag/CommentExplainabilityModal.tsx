"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Send,
  Loader2,
  FileText,
  Zap,
  Info,
  ChevronRight,
} from "lucide-react";
import { CommentDecisionTrace } from "@/backend/video_rag/types";

interface CommentExplainabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
  initialTrace?: CommentDecisionTrace | null;
}

export function CommentExplainabilityModal({
  isOpen,
  onClose,
  videoId,
  videoTitle,
  initialTrace,
}: CommentExplainabilityModalProps) {
  const [testComment, setTestComment] = useState("");
  const [testAuthor, setTestAuthor] = useState("Viewer_Test");
  const [simulating, setSimulating] = useState(false);
  const [currentTrace, setCurrentTrace] = useState<CommentDecisionTrace | null>(initialTrace || null);

  const sampleComments = [
    { label: "Emoji Only", text: "🔥🔥🔥" },
    { label: "Generic Praise", text: "nice video bro" },
    { label: "Linux Question", text: "Does this actually support Linux out of the box?" },
    { label: "Timestamp Question", text: "At 3:20 you mentioned the battery. Did you test it?" },
    { label: "Real Crash Problem", text: "I tried this and the setup crashes on startup every time." },
    { label: "Spam Bot", text: "Whatsapp me on +1234567 for free crypto signals" },
  ];

  const handleSimulate = async (textToSimulate?: string) => {
    const query = textToSimulate || testComment;
    if (!query.trim()) return;

    try {
      setSimulating(true);
      const res = await fetch("/api/video-rag/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          videoTitle,
          text: query,
          author: testAuthor,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentTrace(data.trace);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md overscroll-contain"
      style={{ touchAction: "pan-y" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Video-Aware RAG Explainability Inspector
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                {videoTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Simulator Input */}
        <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            ⚡ Live Comment Simulator
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testComment}
              onChange={(e) => setTestComment(e.target.value)}
              placeholder="Type any test comment (e.g. 'Does this support Linux?')..."
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleSimulate()}
            />
            <button
              onClick={() => handleSimulate()}
              disabled={simulating || !testComment.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {simulating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              <span>Test AI</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400">Quick Test Cases:</span>
            {sampleComments.map((sc) => (
              <button
                key={sc.label}
                onClick={() => {
                  setTestComment(sc.text);
                  handleSimulate(sc.text);
                }}
                className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Explainability Output */}
        {currentTrace ? (
          <div className="mt-5 space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {/* Top Decision Banner */}
            <div
              className={`rounded-2xl p-4 border flex items-start gap-3.5 ${
                currentTrace.finalDecision === "REPLY"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : currentTrace.finalDecision === "REVIEW"
                  ? "bg-amber-50 border-amber-200 text-amber-950"
                  : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                  currentTrace.finalDecision === "REPLY"
                    ? "bg-emerald-600 text-white"
                    : currentTrace.finalDecision === "REVIEW"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-600 text-white"
                }`}
              >
                {currentTrace.finalDecision === "REPLY" ? "REPLY" : currentTrace.finalDecision === "REVIEW" ? "REV" : "SKIP"}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm">
                    {currentTrace.finalDecision === "REPLY"
                      ? "WHY DID QUICKREPLY REPLY?"
                      : "WHY WAS THIS COMMENT IGNORED?"}
                  </span>
                  <span className="rounded-md bg-black/10 px-2 py-0.5 text-[10px] font-mono font-bold">
                    Reason: {currentTrace.replyWorthiness.reason}
                  </span>
                </div>
                <p className="text-xs font-medium opacity-90 leading-relaxed">
                  {currentTrace.replyWorthiness.explanation}
                </p>
              </div>
            </div>

            {/* Generated Reply Box if replied */}
            {currentTrace.finalResponseText && (
              <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <Sparkles size={13} />
                    Generated AI Reply ({currentTrace.styleEvaluation.effectiveStyle} mode)
                  </span>
                  {currentTrace.styleEvaluation.styleOverridden && (
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                      ⚠️ Overridden from {currentTrace.styleEvaluation.configuredStyle}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  "{currentTrace.finalResponseText}"
                </p>
              </div>
            )}

            {/* 12-Stage Diagnostic Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Box 1: Classification & Intent */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                <span className="font-bold text-slate-700 block">1. Intent Classification</span>
                <div className="flex flex-wrap gap-1">
                  {currentTrace.understanding.classifications.map((c) => (
                    <span key={c} className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-700">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Spam Score: <strong className="text-slate-800">{currentTrace.understanding.spamProbability}</strong> • Sentiment: <strong className="text-slate-800">{currentTrace.understanding.sentiment}</strong>
                </div>
              </div>

              {/* Box 2: Retrieved Grounding Chunks */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                <span className="font-bold text-slate-700 block">2. Knowledge Grounding</span>
                {currentTrace.retrievedKnowledge.length > 0 ? (
                  <div className="space-y-1">
                    {currentTrace.retrievedKnowledge.slice(0, 2).map((k) => (
                      <div key={k.chunkId} className="text-[11px] bg-white p-1.5 rounded-lg border border-slate-200 text-slate-700 truncate">
                        <strong className="text-blue-600 font-mono">[{k.sourceType}]</strong> {k.content}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-[11px]">No specific KB chunks required</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center py-8 text-slate-400 text-xs font-medium">
            Type a comment above or pick a test case to view the 12-stage explainability trace.
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
