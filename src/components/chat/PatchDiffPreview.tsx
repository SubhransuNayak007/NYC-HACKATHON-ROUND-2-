"use client";

import React from "react";
import {
  GitPullRequest,
  Check,
  X,
  Split,
  PlusCircle,
  Sliders,
  Trash2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export interface GraphPatchOperation {
  op: "INSERT_NODE" | "INSERT_BRANCH" | "UPDATE_PARAMETERS" | "REMOVE_NODE" | "REPLACE_NODE" | "UPDATE_TRIGGER";
  node?: any;
  position?: { relativeToNodeId?: string; relativeTo?: string; placement: "before" | "after" };
  splitAfterNodeId?: string;
  splitAfterStepId?: string;
  conditionNode?: any;
  trueBranchNodes?: any[];
  falseBranchNodes?: any[];
  nodeId?: string;
  stepId?: string;
  parameters?: Record<string, any>;
  reconnectStrategy?: "bridge" | "orphan";
  config?: Record<string, any>;
}

export interface PatchDiffPreviewProps {
  isOpen: boolean;
  patch: {
    workflowId: string;
    explanation: string;
    operations: GraphPatchOperation[];
  } | null;
  onApply: () => void;
  onReject: () => void;
}

export const PatchDiffPreview: React.FC<PatchDiffPreviewProps> = ({
  isOpen,
  patch,
  onApply,
  onReject,
}) => {
  if (!isOpen || !patch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 leading-tight">
                Non-Destructive Graph Patch Review
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                {patch.operations.length} atomic AST mutation{patch.operations.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onReject}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* AI Explanation Banner */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-zinc-300 space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-orange-400 tracking-wider">
              Reasoning & Topology Impact
            </span>
            <p className="text-xs leading-relaxed text-zinc-300">
              {patch.explanation}
            </p>
          </div>

          {/* List of Graph Patch Operations */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Pending Graph Mutations
            </span>

            {patch.operations.map((op, idx) => {
              if (op.op === "INSERT_NODE") {
                const nodeName = op.node?.label || op.node?.name || "New Step";
                const targetAnchor = op.position?.relativeToNodeId || op.position?.relativeTo || "root";
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/50 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <PlusCircle className="w-3 h-3" />
                        INSERT NODE
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Placed {op.position?.placement || "after"} <code>{targetAnchor}</code>
                      </span>
                    </div>
                    <div className="text-zinc-200 font-semibold text-xs pt-1">
                      {nodeName} ({op.node?.appId || op.node?.service || "action"})
                    </div>
                  </div>
                );
              }

              if (op.op === "INSERT_BRANCH") {
                const condExpr =
                  op.conditionNode?.expression ||
                  op.conditionNode?.parameters?.condition ||
                  "condition === true";
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Split className="w-3 h-3" />
                        INSERT CONDITIONAL BRANCH
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        After <code>{op.splitAfterNodeId || op.splitAfterStepId}</code>
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-amber-300 bg-zinc-950 p-1.5 rounded border border-zinc-800">
                      Expression: {condExpr}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-zinc-400 pt-0.5">
                      <span className="text-emerald-400">
                        True branch: {op.trueBranchNodes?.length || 1} step(s)
                      </span>
                      <span className="text-rose-400">
                        False branch: {op.falseBranchNodes?.length || 1} step(s)
                      </span>
                    </div>
                  </div>
                );
              }

              if (op.op === "UPDATE_PARAMETERS") {
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-sky-950/20 border border-sky-800/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        <Sliders className="w-3 h-3" />
                        UPDATE PARAMETERS
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Node: <code>{op.nodeId || op.stepId}</code>
                      </span>
                    </div>
                    <pre className="p-1.5 rounded bg-zinc-950 font-mono text-[10px] text-sky-300 overflow-x-auto">
                      {JSON.stringify(op.parameters, null, 2)}
                    </pre>
                  </div>
                );
              }

              if (op.op === "REMOVE_NODE") {
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-rose-950/20 border border-rose-800/50 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <Trash2 className="w-3 h-3" />
                        REMOVE NODE
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Reconnect Strategy: <code>{op.reconnectStrategy || "bridge"}</code>
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      Deleting node <code>{op.nodeId || op.stepId}</code> while preserving upstream and downstream topology.
                    </p>
                  </div>
                );
              }

              return (
                <div key={idx} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px]">
                  <span className="font-mono text-zinc-400">{op.op}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-end gap-3">
          <button
            onClick={onReject}
            className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
          >
            Discard
          </button>
          <button
            onClick={onApply}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-lg shadow-orange-950/50 transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Apply Patch to Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
