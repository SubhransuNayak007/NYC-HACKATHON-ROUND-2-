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
  Folder,
  MessageSquare,
  Key,
  Repeat,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import type { AutomationPlan } from "@/backend/automation/types";

export interface PlanApprovalCardProps {
  plan: AutomationPlan & {
    lifecycleStage?: string;
    feasibility?: { score: number; status: string; notes: string[] };
    groupedConnections?: Array<{
      provider: string;
      displayName: string;
      services: string[];
      status: "connected" | "missing" | "reauth_needed";
      requiredScopes: string[];
      description: string;
    }>;
    discoveredResources?: Record<
      string,
      {
        resourceType: string;
        service: string;
        name: string;
        id: string;
        resolvedAt: string;
        metadata?: Record<string, any>;
      }
    >;
    typeChainValidation?: {
      isValid: boolean;
      chains: Array<{
        sourceStepId: string;
        targetStepId: string;
        sourceField: string;
        targetField: string;
        sourceType: string;
        targetType: string;
        isValid: boolean;
        notes?: string;
      }>;
      errors: string[];
    };
  };
  onApprove: (planId: string) => void;
  onModify: (planId: string) => void;
  onCancel: (planId: string) => void;
  onAskQuestion?: (question: string) => void;
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
  const [activeTab, setActiveTab] = useState<
    "steps" | "resources" | "connections" | "mapping" | "safety"
  >("steps");

  const discoveredResources = plan.discoveredResources || {};
  const resourceEntries = Object.entries(discoveredResources);
  const typeChains = plan.typeChainValidation?.chains || [];

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
              {plan.lifecycleStage && (
                <span className="rounded bg-indigo-900/50 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 border border-indigo-700/50">
                  {plan.lifecycleStage}
                </span>
              )}
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
          {/* Plain Language Objective & Feasibility */}
          <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Objective
              </div>
              <p className="text-slate-200 leading-relaxed">{plan.objective}</p>
            </div>
            {plan.feasibility && (
              <div className="shrink-0 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700 text-right">
                <div className="text-[10px] text-slate-400 font-medium">Feasibility Score</div>
                <div className="text-emerald-400 font-bold font-mono text-sm">
                  {Math.round(plan.feasibility.score * 100)}% ({plan.feasibility.status})
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-1 pb-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("steps")}
              className={`px-3 py-1.5 font-medium rounded-t-md transition-colors whitespace-nowrap ${
                activeTab === "steps"
                  ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Steps ({plan.steps.length})
            </button>
            <button
              onClick={() => setActiveTab("resources")}
              className={`px-3 py-1.5 font-medium rounded-t-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === "resources"
                  ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Discovered Resources</span>
              {resourceEntries.length > 0 && (
                <span className="rounded-full bg-indigo-500/20 px-1.5 text-[9px] text-indigo-300">
                  {resourceEntries.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("connections")}
              className={`px-3 py-1.5 font-medium rounded-t-md transition-colors whitespace-nowrap ${
                activeTab === "connections"
                  ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Verified Accounts ({plan.connectors.length})
            </button>
            <button
              onClick={() => setActiveTab("mapping")}
              className={`px-3 py-1.5 font-medium rounded-t-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === "mapping"
                  ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Type Chains & Data Flow</span>
              {typeChains.length > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 text-[9px] text-emerald-400">
                  {typeChains.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("safety")}
              className={`px-3 py-1.5 font-medium rounded-t-md transition-colors whitespace-nowrap ${
                activeTab === "safety"
                  ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Failure Policies & Permissions
            </button>
          </div>

          {/* Tab 1: Steps */}
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
                        {step.appId}:{step.actionId}
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

          {/* Tab 2: Discovered Resources */}
          {activeTab === "resources" && (
            <div className="space-y-2">
              {resourceEntries.length === 0 ? (
                <div className="text-center py-4 text-slate-400">
                  No external resources resolved yet. They will be queried from authorized connections during discovery.
                </div>
              ) : (
                resourceEntries.map(([key, res]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3 border border-indigo-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                        {res.resourceType === "folder" ? (
                          <Folder className="h-4 w-4" />
                        ) : res.resourceType === "sheet" ? (
                          <FileSpreadsheet className="h-4 w-4" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100 flex items-center gap-2">
                          <span>{res.name}</span>
                          <span className="rounded bg-indigo-900/40 text-indigo-300 px-1.5 py-0.2 text-[9px] font-mono">
                            {res.resourceType}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: <span className="text-slate-300">{res.id}</span> • Service: {res.service}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20 font-medium">
                        <Check className="h-3 w-3" /> Discovered
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Verified Accounts & Grouped Connections */}
          {activeTab === "connections" && (
            <div className="space-y-3">
              {plan.groupedConnections && plan.groupedConnections.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
                    Grouped Provider Authorizations
                  </div>
                  <div className="space-y-1.5">
                    {plan.groupedConnections.map((group) => (
                      <div
                        key={group.provider}
                        className="rounded-lg bg-slate-800/60 p-2.5 border border-slate-700/60 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{group.displayName}</div>
                          <div className="text-[10px] text-slate-400">
                            Services: {group.services.join(", ")}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                            group.status === "connected"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {group.status === "connected" ? "Authorized" : "Authorization Required"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
                Node Connections & Scopes
              </div>
              <div className="space-y-2">
                {plan.connectors.map((c) => (
                  <div
                    key={c.connectorId}
                    className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {c.connectionStatus === "connected" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-400" />
                        )}
                        <span className="font-semibold text-slate-100">{c.name}</span>
                        {c.accountIdentity && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({c.accountIdentity})
                          </span>
                        )}
                      </div>
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
                    {c.requiredPermissions && c.requiredPermissions.length > 0 && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        <span className="text-slate-500">Required Scopes:</span>{" "}
                        {c.requiredPermissions.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Type Chains & Data Flow */}
          {activeTab === "mapping" && (
            <div className="space-y-3">
              {typeChains.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
                    Formal Type Chain Validation
                  </div>
                  <div className="space-y-1.5">
                    {typeChains.map((tc, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-slate-800/60 p-2.5 border border-slate-700/50 flex items-center justify-between font-mono text-[10px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-300">{tc.sourceField}</span>
                          <span className="text-slate-500">({tc.sourceType})</span>
                          <ArrowRight className="h-3 w-3 text-slate-500" />
                          <span className="text-emerald-300">{tc.targetField}</span>
                          <span className="text-slate-500">({tc.targetType})</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            tc.isValid
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {tc.isValid ? "Type Valid" : "Mismatch"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
                Field Data Mappings
              </div>
              <div className="space-y-2">
                {plan.dataMappings.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-slate-800/40 p-2.5 border border-slate-700/40 font-mono text-[11px]"
                  >
                    <span className="text-indigo-400 font-semibold">{m.targetField}</span>
                    <div className="flex items-center gap-1.5 text-slate-400 truncate max-w-[65%]">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="text-emerald-400 truncate">{m.expression}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Failure Policies & Governance */}
          {activeTab === "safety" && (
            <div className="space-y-3 rounded-lg bg-slate-800/40 p-3 border border-slate-700/40">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                <ShieldCheck className="h-4 w-4" /> Failure Handling & Governance Policies
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px]">
                <li>
                  <strong>Retry Policy:</strong> Max {plan.reliability.maxRetries} attempts with exponential backoff ({plan.reliability.retryBackoffMs}ms initial backoff).
                </li>
                <li>
                  <strong>Failure Strategy:</strong> On terminal failure, execution state is preserved in persistent checkpoint and notification is sent to configured alert channel.
                </li>
                <li>
                  <strong>External Outbound Side-Effects:</strong>{" "}
                  {plan.safety.externalSideEffects ? "Yes (Sends live messages / creates cloud files)" : "No"}
                </li>
                <li>
                  <strong>External Destinations:</strong>{" "}
                  {plan.safety.externalDestinations.join(", ") || "None"}
                </li>
                <li>
                  <strong>Production Activation Policy:</strong> Approving this plan builds the verified workflow definition on your canvas. Production live execution activation requires explicit secondary confirmation.
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
              {onAskQuestion && (
                <button
                  onClick={() =>
                    onAskQuestion("Explain the failure handling and data mapping logic in detail.")
                  }
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded text-xs flex items-center gap-1"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Ask a Question
                </button>
              )}

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
