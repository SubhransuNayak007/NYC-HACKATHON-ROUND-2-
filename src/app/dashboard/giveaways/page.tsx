"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  Trophy,
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Hash,
  User,
  Users,
  Video,
  Dice5,
  X,
} from "lucide-react";
import { useUIStore } from "@/frontend/store";

interface GiveawayCampaign {
  id: string;
  name: string;
  description: string;
  platform: string;
  contentId: string;
  contentTitle: string;
  challengeRequired: boolean;
  expectedAnswer?: string;
  validationType?: string;
  status: "DRAFT" | "ACTIVE" | "DRAWN" | "COMPLETED";
  winnerCount: number;
  participantCount: number;
  eligibleCount: number;
  createdAt: string;
}

interface WinnerRecord {
  selectionId: string;
  campaignId: string;
  campaignName: string;
  winnerUserId: string;
  winnerUsername: string;
  winningCommentId: string;
  winningCommentText: string;
  candidateSnapshotHash: string;
  totalCandidates: number;
  eligibleCandidates: number;
  selectedIndex: number;
  randomnessAlgorithm: string;
  drawTimestamp: string;
  operatorEmail: string;
  status: "CONFIRMED" | "REJECTED_REROLLED";
  rejectionReason?: string;
}

export default function GiveawaysPage() {
  const showToast = useUIStore((s) => s.showToast);
  const [campaigns, setCampaigns] = useState<GiveawayCampaign[]>([]);
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawingId, setDrawingId] = useState<string | null>(null);

  // New Campaign Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [contentTitle, setContentTitle] = useState("");
  const [challengeRequired, setChallengeRequired] = useState(true);
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [validationType, setValidationType] = useState("contains");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/giveaways");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setWinners(data.winners || []);
      }
    } catch {
      showToast("Failed to load giveaway campaigns", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!name.trim()) return showToast("Enter campaign name", "error");
    try {
      const res = await fetch("/api/giveaways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contentTitle: contentTitle || "Community Video Showcase",
          challengeRequired,
          expectedAnswer,
          validationType,
        }),
      });

      if (res.ok) {
        showToast("Giveaway challenge campaign created!", "success");
        setShowModal(false);
        setName("");
        setExpectedAnswer("");
        loadData();
      }
    } catch {
      showToast("Failed to create campaign", "error");
    }
  };

  const handleDrawWinner = async (campaignId: string) => {
    try {
      setDrawingId(campaignId);
      const res = await fetch(`/api/giveaways/${campaignId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`🎉 Winner Drawn: @${data.winner?.winnerUsername}`, "success");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Draw failed", "error");
      }
    } catch {
      showToast("Error during winner draw", "error");
    } finally {
      setDrawingId(null);
    }
  };

  const handleReroll = async (campaignId: string, prevSelectionId: string) => {
    try {
      setDrawingId(campaignId);
      const res = await fetch(`/api/giveaways/${campaignId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isReroll: true,
          previousSelectionId: prevSelectionId,
          rejectionReason: "Winner failed eligibility verification",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`🎲 New Winner Drawn: @${data.winner?.winnerUsername}`, "info");
        loadData();
      }
    } catch {
      showToast("Error during reroll", "error");
    } finally {
      setDrawingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-900">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 shrink-0">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Verifiable Challenge &amp; Giveaway Hub
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> CSPRNG Auditable
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
              Server-side cryptographic random selection (`crypto.randomInt`), candidate snapshots, and verifiable rerolls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-purple-600" : ""}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Main Campaign Cards */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200 shadow-sm space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="text-xs font-bold text-slate-700">Loading giveaway campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center text-slate-500 border border-slate-200 shadow-sm space-y-3">
          <Gift className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-900">No Giveaway Campaigns Active</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create an engagement challenge or contest to automatically collect verified entries from YouTube or Instagram comments.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 inline-flex items-center gap-1.5 cursor-pointer shadow-xs mt-2"
          >
            <Plus className="h-4 w-4" />
            <span>+ Create First Giveaway</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns.map((camp) => {
            const campaignWinners = winners.filter((w) => w.campaignId === camp.id);
            return (
              <div
                key={camp.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 capitalize font-mono">
                      {camp.platform} Campaign
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        camp.status === "DRAWN"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900">{camp.name}</h3>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-mono">Target Content:</span>
                      <span className="font-bold text-slate-900">{camp.contentTitle}</span>
                    </div>
                    {camp.challengeRequired && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 font-mono">Required Answer:</span>
                        <span className="font-bold text-purple-700">&ldquo;{camp.expectedAnswer}&rdquo; ({camp.validationType})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Winner Status / Action */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  {campaignWinners.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase text-slate-400">
                        Winner Record (CSPRNG Verified)
                      </div>
                      {campaignWinners.map((w) => (
                        <div
                          key={w.selectionId}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                            w.status === "CONFIRMED"
                              ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                              : "bg-slate-100 border-slate-200 text-slate-500 line-through"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div>
                              <strong className="font-bold">@{w.winnerUsername}</strong>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Hash: {w.candidateSnapshotHash.substring(0, 10)}... &bull; Index #{w.selectedIndex}
                              </div>
                            </div>
                          </div>

                          {w.status === "CONFIRMED" && (
                            <button
                              onClick={() => handleReroll(camp.id, w.selectionId)}
                              disabled={drawingId === camp.id}
                              className="px-3 py-1 rounded-xl text-[10px] font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shrink-0"
                            >
                              🎲 Reroll
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDrawWinner(camp.id)}
                      disabled={drawingId === camp.id}
                      className="w-full py-3 rounded-2xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {drawingId === camp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Dice5 className="h-4 w-4" />
                      )}
                      <span>Lock Snapshot &amp; Draw Winner</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Create Challenge Giveaway</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Campaign Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Launch Giveaway #1"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Target Video/Post Title</label>
                <input
                  type="text"
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  placeholder="e.g. iPhone 17 Pro Review Video"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Required Challenge Answer</label>
                <input
                  type="text"
                  value={expectedAnswer}
                  onChange={(e) => setExpectedAnswer(e.target.value)}
                  placeholder="e.g. 42 or YES"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Answer Validation Type</label>
                <select
                  value={validationType}
                  onChange={(e) => setValidationType(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 mt-1 focus:outline-none"
                >
                  <option value="contains">Contains phrase / keyword</option>
                  <option value="exact">Exact match only</option>
                  <option value="numeric">Numeric value</option>
                  <option value="regex">Regular expression</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer shadow-md shadow-purple-600/20"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
