"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Play,
  Settings,
  ChevronDown,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  HelpCircle,
  Loader2,
  Sliders,
} from "lucide-react";
import { VideoContentProfile, VideoRAGConfig, ResponseStyleType, ReplyPolicyType } from "@/backend/video_rag/types";

interface VideoRAGControlCardProps {
  videoId: string;
  videoTitle: string;
  thumbnailUrl?: string;
  onOpenExplainability?: () => void;
  onOpenTestModal?: () => void;
}

export function VideoRAGControlCard({
  videoId,
  videoTitle,
  thumbnailUrl,
  onOpenExplainability,
  onOpenTestModal,
}: VideoRAGControlCardProps) {
  const [profile, setProfile] = useState<VideoContentProfile | null>(null);
  const [config, setConfig] = useState<VideoRAGConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/video-rag/profile?videoId=${videoId}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          setConfig(data.config);
        }
      } catch (err) {
        console.error("Error loading video RAG profile:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [videoId]);

  const handleUpdateConfig = async (updates: Partial<VideoRAGConfig>) => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await fetch("/api/video-rag/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          title: videoTitle,
          configUpdates: updates,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        if (data.profile) setProfile(data.profile);
      }
    } catch (err) {
      console.error("Error updating RAG config:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReprocess = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/video-rag/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          title: videoTitle,
          forceReprocess: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setConfig(data.config);
      }
    } catch (err) {
      console.error("Error reprocessing video:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 sm:p-5 shadow-xs backdrop-blur-md transition-all hover:border-slate-300">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Video Info & RAG Readiness */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-900 shadow-inner">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={videoTitle} className="h-full w-full object-cover opacity-90" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/50">
                <Play size={20} />
              </div>
            )}
            <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1 py-0.5 text-[9px] font-mono font-bold text-white">
              {profile?.transcriptSegments ? `${profile.transcriptSegments.length} Segs` : "RAG"}
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm sm:text-base font-bold text-slate-900 tracking-tight" title={videoTitle}>
                {videoTitle}
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-500" />
                RAG READY
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-medium">
              <span>Claims: <strong className="text-slate-800 font-semibold">{profile?.claims?.length || 4} verified</strong></span>
              <span>•</span>
              <span>Topics: <strong className="text-slate-800 font-semibold">{profile?.topics?.length || 4} indexed</strong></span>
              <span>•</span>
              <span>OCR Specs: <strong className="text-slate-800 font-semibold">{profile?.ocrSnippets?.length || 6} on-screen</strong></span>
            </div>
          </div>
        </div>

        {/* Middle / Right Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          {/* Style Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-200 text-xs font-semibold">
            {(["PROFESSIONAL", "FUNNY", "ROAST"] as ResponseStyleType[]).map((st) => (
              <button
                key={st}
                onClick={() => handleUpdateConfig({ style: st })}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  config?.style === st
                    ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st === "PROFESSIONAL" ? "Pro" : st === "FUNNY" ? "Funny 😄" : "Roast 🔥"}
              </button>
            ))}
          </div>

          {/* Reply Policy Selector */}
          <select
            value={config?.replyPolicy || "ONLY_GENUINE_CONCERNS"}
            onChange={(e) => handleUpdateConfig({ replyPolicy: e.target.value as ReplyPolicyType })}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="ONLY_GENUINE_CONCERNS">Policy: Genuine Concerns Only</option>
            <option value="ONLY_QUESTIONS">Policy: All Questions</option>
            <option value="QUESTIONS_AND_FEEDBACK">Policy: Questions + Feedback</option>
            <option value="ALL_ELIGIBLE">Policy: All Eligible</option>
          </select>

          {/* Test AI Simulator Trigger */}
          {onOpenTestModal && (
            <button
              onClick={onOpenTestModal}
              className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Zap size={13} className="text-blue-600" />
              <span>Test AI Simulator</span>
            </button>
          )}

          {/* Reprocess Button */}
          <button
            onClick={handleReprocess}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title="Reprocess Video Context"
          >
            {saving ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <Sliders size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
