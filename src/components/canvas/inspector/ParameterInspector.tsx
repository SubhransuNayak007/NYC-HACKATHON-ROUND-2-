"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Lock,
  Plus,
  ShieldAlert,
  Clock,
  Code2,
  Sparkles,
  Check,
  Copy,
  ChevronDown,
  Info,
} from "lucide-react";
import type { AppNode, CanvasNodeData, SafetyTier } from "../types";

export interface ParameterInspectorProps {
  selectedNode: AppNode | null;
  onClose: () => void;
  onUpdateNodeData: (id: string, partialData: Partial<CanvasNodeData>) => void;
  availableVariables?: string[];
  availableCredentials?: Array<{ id: string; name: string; appId: string }>;
}

const DEFAULT_VARIABLES = [
  "{{ $json.lead.email }}",
  "{{ $json.lead.name }}",
  "{{ $json.lead.company }}",
  "{{ $json.invoice.amount }}",
  "{{ $json.invoice.vendor }}",
  "{{ $json.classification.intent }}",
  "{{ $json.items }}",
  "{{ $json.status }}",
];

const DEFAULT_CREDENTIALS = [
  { id: "cred_google_workspace_main", name: "Acme Google Workspace (Sheets/Gmail)", appId: "google" },
  { id: "cred_slack_prod_ops", name: "Slack Production Bot (#ops-alerts)", appId: "slack" },
  { id: "cred_hubspot_crm_sales", name: "HubSpot Sales Pipeline", appId: "hubspot" },
  { id: "cred_canva_enterprise_brand", name: "Canva Brand Kit Pro", appId: "canva" },
  { id: "cred_openai_platform_gpt4o", name: "OpenAI GPT-4o Production Tier", appId: "openai" },
];

export const ParameterInspector: React.FC<ParameterInspectorProps> = ({
  selectedNode,
  onClose,
  onUpdateNodeData,
  availableVariables = DEFAULT_VARIABLES,
  availableCredentials = DEFAULT_CREDENTIALS,
}) => {
  const [activeTab, setActiveTab] = useState<"params" | "safety" | "json">("params");
  const [showVarDropdown, setShowVarDropdown] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!selectedNode) return null;

  const data = selectedNode.data as CanvasNodeData;
  const params = data.parameters || {};

  const handleParamChange = (key: string, value: any) => {
    onUpdateNodeData(selectedNode.id, {
      parameters: {
        ...params,
        [key]: value,
      },
    });
  };

  const handleLabelChange = (newLabel: string) => {
    onUpdateNodeData(selectedNode.id, { label: newLabel });
  };

  const handleCredentialChange = (credId: string) => {
    onUpdateNodeData(selectedNode.id, { credentialRef: credId || undefined });
  };

  const handleSafetyChange = (sideEffect: SafetyTier) => {
    onUpdateNodeData(selectedNode.id, { sideEffect });
  };

  const handleApprovalToggle = (required: boolean) => {
    onUpdateNodeData(selectedNode.id, { approvalRequired: required });
  };

  const handleConditionExprChange = (expr: string) => {
    onUpdateNodeData(selectedNode.id, {
      expression: expr,
      parameters: { ...params, condition: expr },
    });
  };

  const handleCodeChange = (codeStr: string) => {
    onUpdateNodeData(selectedNode.id, {
      code: codeStr,
      parameters: { ...params, code: codeStr },
    });
  };

  const insertVariableIntoParam = (key: string, variableText: string) => {
    const currentVal = String(params[key] || "");
    const updated = currentVal ? `${currentVal} ${variableText}` : variableText;
    handleParamChange(key, updated);
    setShowVarDropdown(null);
  };

  const copyRawJson = () => {
    navigator.clipboard.writeText(JSON.stringify(selectedNode, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <aside className="w-96 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full shadow-2xl z-30 select-none overflow-hidden">
      {/* Inspector Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 leading-tight">
              Node Inspector
            </h3>
            <p className="text-[10px] font-mono text-zinc-500 truncate max-w-[180px]">
              {selectedNode.id} ({selectedNode.type})
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-800 px-4 bg-zinc-950/30 text-xs font-medium">
        <button
          onClick={() => setActiveTab("params")}
          className={`py-2.5 px-3 border-b-2 transition ${
            activeTab === "params"
              ? "border-orange-500 text-orange-400 font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Parameters
        </button>
        <button
          onClick={() => setActiveTab("safety")}
          className={`py-2.5 px-3 border-b-2 transition ${
            activeTab === "safety"
              ? "border-orange-500 text-orange-400 font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Governance & SLA
        </button>
        <button
          onClick={() => setActiveTab("json")}
          className={`py-2.5 px-3 border-b-2 transition ${
            activeTab === "json"
              ? "border-orange-500 text-orange-400 font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Raw AST
        </button>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-zinc-300">
        {activeTab === "params" && (
          <>
            {/* Node Label Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Node Name / Label
              </label>
              <input
                type="text"
                value={data.label || ""}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-orange-500 transition text-xs"
              />
            </div>

            {/* Credential Selector */}
            {selectedNode.type !== "conditionNode" && selectedNode.type !== "loopNode" && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-orange-400" />
                    Credential Vault Binding
                  </label>
                </div>
                <select
                  value={data.credentialRef || ""}
                  onChange={(e) => handleCredentialChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-orange-500 transition text-xs"
                >
                  <option value="">(No Credential / Default Workspace)</option>
                  {availableCredentials.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} [{c.id.substring(0, 14)}...]
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500 italic">
                  Tokens remain encrypted at rest via AES-256-GCM and are resolved at runtime.
                </p>
              </div>
            )}

            {/* Condition Expression Editor (Specialized for ConditionNode) */}
            {selectedNode.type === "conditionNode" && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <label className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                  Condition Logic Expression
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={data.expression || params.condition || ""}
                    onChange={(e) => handleConditionExprChange(e.target.value)}
                    placeholder="$json.amount > 50000"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-300 font-mono focus:outline-none focus:border-amber-500 transition text-xs"
                  />
                  <button
                    onClick={() => setShowVarDropdown(showVarDropdown === "condition" ? null : "condition")}
                    className="absolute right-2 top-2 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] flex items-center gap-1"
                    title="Insert Variable"
                  >
                    <Plus className="w-2.5 h-2.5" /> Variable
                  </button>
                </div>

                {showVarDropdown === "condition" && (
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 shadow-xl space-y-1">
                    <p className="text-[10px] text-zinc-400 font-semibold mb-1">Select Variable:</p>
                    {availableVariables.map((v) => (
                      <button
                        key={v}
                        onClick={() => insertVariableIntoParam("condition", v)}
                        className="w-full text-left px-2 py-1 rounded hover:bg-zinc-800 text-[10px] font-mono text-orange-400 truncate block"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-zinc-500">
                  Evaluated in sandboxed AST runtime. True routes to upper port, False to lower port.
                </p>
              </div>
            )}

            {/* Custom Script Editor (Specialized for CustomScriptNode) */}
            {selectedNode.type === "customScriptNode" && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <label className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" /> Sandboxed JavaScript Code
                </label>
                <textarea
                  rows={6}
                  value={data.code || params.code || ""}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="return { transformed: $json.items.map(i => i.id) };"
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-rose-300 font-mono focus:outline-none focus:border-rose-500 transition text-xs leading-relaxed"
                />
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="text-zinc-500 block">Timeout (ms):</label>
                    <input
                      type="number"
                      value={data.timeoutMs || 2000}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { timeoutMs: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 block">Memory Bound (MB):</label>
                    <input
                      type="number"
                      value={data.memoryLimitMb || 64}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { memoryLimitMb: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Schema Parameter Inputs */}
            <div className="space-y-3 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Configured Parameters
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {Object.keys(params).length} bindings
                </span>
              </div>

              {Object.keys(params).length === 0 ? (
                <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/60 text-center text-zinc-500 text-[11px]">
                  No parameters defined. Add a custom binding below.
                </div>
              ) : (
                Object.entries(params).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-zinc-400">{key}</span>
                      <button
                        onClick={() => setShowVarDropdown(showVarDropdown === key ? null : key)}
                        className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" /> Add Var
                      </button>
                    </div>

                    <input
                      type="text"
                      value={typeof val === "object" ? JSON.stringify(val) : String(val)}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-orange-500 transition text-xs"
                    />

                    {showVarDropdown === key && (
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 shadow-xl space-y-1">
                        <p className="text-[10px] text-zinc-400 font-semibold mb-1">Insert Variable:</p>
                        {availableVariables.map((v) => (
                          <button
                            key={v}
                            onClick={() => insertVariableIntoParam(key, v)}
                            className="w-full text-left px-2 py-1 rounded hover:bg-zinc-800 text-[10px] font-mono text-orange-400 truncate block"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Safety & SLA Tab */}
        {activeTab === "safety" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Side-Effect Classification Tier
              </label>
              <div className="space-y-1.5">
                {(
                  [
                    "SAFE_READ",
                    "REVERSIBLE",
                    "EXTERNAL_COMMUNICATION",
                    "FINANCIAL",
                    "DESTRUCTIVE",
                  ] as SafetyTier[]
                ).map((tier) => (
                  <label
                    key={tier}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      data.sideEffect === tier
                        ? "bg-zinc-800 border-orange-500 text-orange-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="sideEffectTier"
                        checked={data.sideEffect === tier}
                        onChange={() => handleSafetyChange(tier)}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <span className="font-mono text-xs">{tier}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Human Approval Checkpoint */}
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-200">
                  Require Human Approval
                </label>
                <input
                  type="checkbox"
                  checked={Boolean(data.approvalRequired)}
                  onChange={(e) => handleApprovalToggle(e.target.checked)}
                  className="rounded border-zinc-700 text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                If enabled, execution transitions to <code>WAITING_APPROVAL</code> before this node fires.
              </p>
            </div>

            {/* Retry Policy Configuration */}
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                Retry & Exponential Backoff Policy
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <label className="text-zinc-500 block mb-1">Max Attempts:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={data.retryPolicy?.maxAttempts || 3}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, {
                        retryPolicy: {
                          maxAttempts: Number(e.target.value),
                          initialIntervalMs: data.retryPolicy?.initialIntervalMs || 1000,
                          backoffFactor: data.retryPolicy?.backoffFactor || 2,
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Backoff Factor:</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={data.retryPolicy?.backoffFactor || 2}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, {
                        retryPolicy: {
                          maxAttempts: data.retryPolicy?.maxAttempts || 3,
                          initialIntervalMs: data.retryPolicy?.initialIntervalMs || 1000,
                          backoffFactor: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Raw AST Tab */}
        {activeTab === "json" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500">ReactFlow Node Spec</span>
              <button
                onClick={copyRawJson}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded transition"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedJson ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-96">
              {JSON.stringify(selectedNode, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
};
