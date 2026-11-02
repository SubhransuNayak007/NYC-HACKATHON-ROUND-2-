"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Check,
  X,
  ExternalLink,
  Bot,
  Zap,
} from "lucide-react";
import { useUIStore } from "@/frontend/store";

interface ApprovalRequest {
  id: string;
  actionType: string;
  riskScore: number;
  reason: string;
  customerContext?: {
    actorName?: string;
    platform?: string;
    inboundText?: string;
  };
  suggestedAction: {
    platform?: string;
    replyText?: string;
    [key: string]: any;
  };
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  expiresAt: string;
}

export default function ApprovalsPage() {
  const showToast = useUIStore((s) => s.showToast);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [editedReply, setEditedReply] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const loadApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
        if (data.approvals?.length > 0 && !selectedRequest) {
          setSelectedRequest(data.approvals[0]);
          setEditedReply(data.approvals[0].suggestedAction?.replyText || "");
        }
      }
    } catch {
      showToast("Failed to load approval requests", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRequest, showToast]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          modifiedAction: editedReply ? { replyText: editedReply } : undefined,
        }),
      });

      if (res.ok) {
        showToast("Action approved & dispatched to platform", "success");
        setApprovals((prev) => prev.filter((a) => a.id !== id));
        setSelectedRequest(null);
        await loadApprovals();
      } else {
        const err = await res.json();
        showToast(err.error || "Approval failed", "error");
      }
    } catch {
      showToast("Error processing approval", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionReason: rejectionReason || "Rejected by reviewer",
        }),
      });

      if (res.ok) {
        showToast("Action rejected & execution cancelled", "info");
        setApprovals((prev) => prev.filter((a) => a.id !== id));
        setSelectedRequest(null);
        await loadApprovals();
      } else {
        const err = await res.json();
        showToast(err.error || "Rejection failed", "error");
      }
    } catch {
      showToast("Error rejecting request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-900">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Human Review &amp; Safety Queue
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {approvals.length} Pending
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
              Centralized authorization gate for AI-flagged complaints, legal queries, and high-risk triggers.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            loadApprovals();
          }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-amber-600" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Main Review Window */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200 shadow-sm space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-500" />
          <p className="text-xs font-bold text-slate-700">Loading pending approvals...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center text-slate-500 border border-slate-200 shadow-sm space-y-3">
          <div className="h-16 w-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-base font-black text-slate-900">Review Queue Clear</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            All autonomous automations have passed policy checks. High-risk topics, prompt injection attempts, and legal inquiries will appear here for operator sign-off.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
          
          {/* Left: Pending Requests List (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
              Pending Interceptions ({approvals.length})
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
              {approvals.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <button
                    key={req.id}
                    onClick={() => {
                      setSelectedRequest(req);
                      setEditedReply(req.suggestedAction?.replyText || "");
                    }}
                    className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20"
                        : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Risk: {Math.round(req.riskScore * 100)}%
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 capitalize font-mono">
                          {req.customerContext?.platform || "Platform"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 truncate">
                      {req.customerContext?.actorName || "Inbound User"}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 font-medium">
                      &ldquo;{req.customerContext?.inboundText || req.reason}&rdquo;
                    </p>

                    <div className="text-[10px] text-amber-800 font-medium pt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span className="truncate">{req.reason}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Inspection & Action Sandbox (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
            {selectedRequest ? (
              <>
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Interception Review #{selectedRequest.id}
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">
                        Triggered {new Date(selectedRequest.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                      Risk Score: {Math.round(selectedRequest.riskScore * 100)} / 100
                    </span>
                  </div>

                  {/* Interception Reason */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
                    <strong className="font-bold flex items-center gap-1.5 text-amber-900">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      Policy Interception Reason:
                    </strong>
                    <p className="leading-relaxed font-medium">{selectedRequest.reason}</p>
                  </div>

                  {/* Inbound Customer Inquiry */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Inbound Customer Content
                    </label>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium leading-relaxed">
                      {selectedRequest.customerContext?.inboundText || "No inbound text provided"}
                    </div>
                  </div>

                  {/* Proposed / Editable AI Action */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                      <span>Proposed Reply Action (Editable by Reviewer)</span>
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">RAG Grounded</span>
                    </label>
                    <textarea
                      rows={4}
                      value={editedReply}
                      onChange={(e) => setEditedReply(e.target.value)}
                      className="w-full p-3.5 rounded-2xl text-xs bg-white border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:outline-none leading-relaxed"
                      placeholder="Type or modify approved reply text..."
                    />
                  </div>
                </div>

                {/* Operator Actions */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={processingId === selectedRequest.id}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject &amp; Cancel</span>
                  </button>

                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={processingId === selectedRequest.id}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {processingId === selectedRequest.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>Authorize &amp; Dispatch Reply</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <ShieldAlert className="h-10 w-10 opacity-30 text-amber-500 mb-2" />
                <p className="text-xs font-bold text-slate-700">Select an approval request to inspect</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
