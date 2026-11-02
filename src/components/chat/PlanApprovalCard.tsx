"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { AutomationPlan } from "@/backend/automation/types";

export interface PlanApprovalCardProps {
  plan: AutomationPlan;
  onApprove: (planId: string) => void;
  onModify: (planId: string) => void;
  onCancel: (planId: string) => void;
  onAskQuestion: (question: string) => void;
  isProcessing?: boolean;
}

export const PlanApprovalCard: React.FC<PlanApprovalCardProps> = ({
  plan,
  onApprove,
  onModify,
  onCancel,
  onAskQuestion,
  isProcessing = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"steps" | "connections" | "mapping" | "safety">("steps");

  return (
    <div className="my-4 rounded-xl border border-indigo-500/30 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 px-5 py-4 border-b border-indigo-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-indigo-400">
                Implementation Plan (v{plan.version})
              </span>
              {plan.isApproved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" /> Approved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/30">
                  <AlertCircle className="h-3 w-3" /> Awaiting Approval
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">{plan.title}</h3>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          title="Toggle view"
        >
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-4 text-xs">
          {/* Plain Language Objective */}
          <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/50">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Objective
            </div>
            <p className="text-slate-200 leading-relaxed">{plan.objective}</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-1 pb-1">
            <button
              onClick={() => setActiveTab("steps")}
              className={`px-3 py-1.5 font-medium rounded-t-md transition-colors ${
                activeTab === "steps"
                  ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Steps ({plan.steps.length})
            </button>
            <button
              onClick={() => setActiveTab("connections")}
              className={`px-3 py-1.5 font-medium rounded-t-md transition-colors ${
                activeTab === "connections"
                  ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Connections ({plan.connectors.length})
            </button>
            <button
              onClick={() => setActiveTab("mapping")}
              className={`px-3 py-1.5 font-medium rounded-t-md transition-colors ${
                activeTab === "mapping"
                  ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Data Mapping ({plan.dataMappings.length})
            </button>
            <button
              onClick={() => setActiveTab("safety")}
              className={`px-3 py-1.5 font-medium rounded-t-md transition-colors ${
                activeTab === "safety"
                  ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Safety & Governance
            </button>
          </div>

          {/* Tab 1: Execution Steps */}
          {activeTab === "steps" && (
            <div className="space-y-2">
              {plan.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="flex items-start gap-3 rounded-lg bg-slate-800/40 p-3 border border-slate-700/40"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{step.label}</span>
                      <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                        {step.appId}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5 text-[11px]">{step.description}</p>
                    {step.parameters && Object.keys(step.parameters).length > 0 && (
                      <div className="mt-2 text-[10px] text-slate-400 font-mono bg-slate-900/60 p-2 rounded border border-slate-800">
                        {Object.entries(step.parameters).map(([k, v]) => (
                          <div key={k} className="truncate">
                            <span className="text-indigo-400">{k}:</span> {JSON.stringify(v)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Connections & Auth Status */}
          {activeTab === "connections" && (
            <div className="space-y-2">
              {plan.connectors.map((c) => (
                <div
                  key={c.connectorId}
                  className="flex items-center justify-between rounded-lg bg-slate-800/40 p-3 border border-slate-700/40"
                >
                  <div className="flex items-center gap-2.5">
                    {c.connectionStatus === "connected" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-100">{c.name}</div>
                      <div className="text-slate-400 text-[10px]">
                        Operation: <span className="text-slate-300 font-mono">{c.operation}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        c.connectionStatus === "connected"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {c.connectionStatus === "connected" ? "Connected" : "Requires Authorization"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Data Mapping */}
          {activeTab === "mapping" && (
            <div className="space-y-2">
              {plan.dataMappings.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-slate-800/40 p-2.5 border border-slate-700/40 font-mono text-[11px]"
                >
                  <span className="text-indigo-400 font-semibold">{m.targetField}</span>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <ArrowRight className="h-3 w-3" />
                    <span className="text-emerald-400">{m.expression}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Safety & Consequence Disclosure */}
          {activeTab === "safety" && (
            <div className="space-y-3 rounded-lg bg-slate-800/40 p-3 border border-slate-700/40">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                <ShieldCheck className="h-4 w-4" /> Policy Disclosure
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                <li>
                  <strong>External Outbound Side-Effects:</strong>{" "}
                  {plan.safety.externalSideEffects ? "Yes (Sends actual messages/alerts)" : "No"}
                </li>
                <li>
                  <strong>External Destinations:</strong>{" "}
                  {plan.safety.externalDestinations.join(", ") || "None"}
                </li>
                <li>
                  <strong>Execution Frequency:</strong>{" "}
                  {plan.executionBehavior === "event_driven" ? "Real-time Event-Driven" : plan.executionBehavior}
                </li>
                <li>
                  <strong>Retry Policy:</strong> Max {plan.reliability.maxRetries} attempts with {plan.reliability.retryBackoffMs}ms backoff
                </li>
                <li>
                  <strong>Approval Policy:</strong> Approving this plan builds the draft on your canvas. Production activation requires explicit secondary confirmation.
                </li>
              </ul>
            </div>
          )}

          {/* Outstanding Requirements Warning */}
          {plan.outstandingRequirements.length > 0 && (
            <div className="rounded-lg bg-amber-950/40 border border-amber-600/40 p-3 text-amber-200">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1 text-[11px]">
                <AlertCircle className="h-3.5 w-3.5" /> Prerequisites to Finalize:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                {plan.outstandingRequirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Approval Controls */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onApprove(plan.id)}
                disabled={isProcessing || plan.isApproved}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all text-xs"
              >
                <Zap className="h-3.5 w-3.5" /> Approve & Build Workflow
              </button>

              <button
                onClick={() => onModify(plan.id)}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 font-medium text-slate-300 transition-colors text-xs border border-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Modify Plan
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onAskQuestion("Explain the failure handling and data mapping logic in detail.")}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded text-xs flex items-center gap-1"
              >
                <HelpCircle className="h-3.5 w-3.5" /> Ask a Question
              </button>

              <button
                onClick={() => onCancel(plan.id)}
                className="text-rose-400 hover:text-rose-300 p-1.5 rounded text-xs flex items-center gap-1"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
