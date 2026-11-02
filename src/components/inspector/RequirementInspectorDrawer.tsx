"use client";

import React from "react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  Link2,
} from "lucide-react";
import type { RequirementDocument, AutomationPlan, DiscoveryState } from "@/backend/automation/types";

export interface RequirementInspectorDrawerProps {
  requirementDoc?: RequirementDocument;
  plan?: AutomationPlan;
  discoveryState?: DiscoveryState;
  connectedApps?: string[];
  activeNodeParams?: { label: string; parameters: Record<string, any> } | null;
}

export const RequirementInspectorDrawer: React.FC<RequirementInspectorDrawerProps> = ({
  requirementDoc,
  plan,
  discoveryState = "DISCOVERY",
  connectedApps = [],
  activeNodeParams,
}) => {
  return (
    <div className="h-full w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col text-slate-200 overflow-y-auto text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-400" />
          <h3 className="font-bold text-white text-sm">Requirements & State</h3>
        </div>
        <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono text-indigo-400 border border-indigo-500/20">
          {discoveryState}
        </span>
      </div>

      {/* Node Inspector (if node selected) */}
      {activeNodeParams && (
        <div className="mb-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30 p-3">
          <div className="font-semibold text-indigo-300 text-xs mb-1 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Selected Node: {activeNodeParams.label}
          </div>
          <div className="mt-2 space-y-1 font-mono text-[10px] text-slate-300 bg-slate-950/60 p-2 rounded">
            {Object.entries(activeNodeParams.parameters || {}).map(([k, v]) => (
              <div key={k} className="truncate">
                <span className="text-indigo-400">{k}:</span> {JSON.stringify(v)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirement Slots */}
      <div className="mb-4 space-y-3">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          Extracted Slots
        </div>

        {requirementDoc ? (
          <div className="space-y-2">
            {/* Trigger Slot */}
            <div className="rounded-lg bg-slate-800/40 p-2.5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">Trigger</span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Resolved
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                {requirementDoc.trigger.type} via{" "}
                <span className="text-slate-200">{requirementDoc.trigger.source}</span>
              </p>
            </div>

            {/* Recipient Slot */}
            <div className="rounded-lg bg-slate-800/40 p-2.5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">Recipient / Target</span>
                {requirementDoc.recipient.resolved ? (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Resolved
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Required
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px] font-mono truncate">
                {requirementDoc.recipient.value || "Awaiting user input..."}
              </p>
            </div>

            {/* Actions Slot */}
            <div className="rounded-lg bg-slate-800/40 p-2.5 border border-slate-700/50">
              <div className="font-semibold text-slate-300 mb-1">Operations</div>
              <div className="space-y-1">
                {requirementDoc.actions.map((a, i) => (
                  <div key={i} className="text-slate-300 text-[11px] flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                    <span>{a.service}: {a.operation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-slate-800/20 p-4 text-center text-slate-500 text-xs">
            No active requirements extracted yet. Describe your automation in chat.
          </div>
        )}
      </div>

      {/* Connected Services */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-2">
          Connected Services
        </div>
        <div className="space-y-1.5">
          {["whatsapp", "telegram", "gmail", "google_sheets", "slack"].map((service) => {
            const isConn = connectedApps.includes(service);
            return (
              <div
                key={service}
                className="flex items-center justify-between p-2 rounded bg-slate-800/40 border border-slate-800 text-[11px]"
              >
                <span className="capitalize text-slate-300">{service.replace("_", " ")}</span>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    isConn
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-slate-500 bg-slate-800"
                  }`}
                >
                  {isConn ? "Connected" : "Disconnected"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Policy */}
      <div className="mt-auto pt-3 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
          <ShieldCheck className="h-4 w-4" /> Non-Negotiable Invariants
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Workflows are never constructed until explicit plan approval. Production side-effects require secondary activation authorization.
        </p>
      </div>
    </div>
  );
};
