"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  Play,
  Layers,
  Palette,
  FileCode,
  Copy,
  Check,
  Loader2,
  Settings,
  ShieldCheck,
  Power,
  SlidersHorizontal,
} from "lucide-react";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { AutomationChatPanel } from "@/components/chat/AutomationChatPanel";
import { RequirementInspectorDrawer } from "@/components/inspector/RequirementInspectorDrawer";
import { WorkflowShowcaseModal } from "@/components/showcase/WorkflowShowcaseModal";
import { CanvaExportModal } from "@/components/showcase/CanvaExportModal";
import type {
  WorkflowDefinitionV3,
  ExecutionNodeStatus,
} from "@/components/canvas/types";
import type {
  AutomationPlan,
  RequirementDocument,
  DiscoveryState,
} from "@/backend/automation/types";

const INITIAL_STUDIO_WORKFLOW: WorkflowDefinitionV3 = {
  id: "wf_studio_prod",
  version: 1,
  name: "Multi-Channel Automated Intelligence Pipeline",
  tenantId: "tenant_default",
  workspaceId: "ws_default",
  description:
    "Production automated workflow pipeline: Inbound Webhook -> Google Sheets Ledger -> AI Claude Classification -> Urgency Condition -> HubSpot CRM / Slack Alerts.",
  nodes: [
    {
      id: "trigger_inbound",
      type: "trigger",
      service: "webhook",
      label: "Webhook Inbound Lead",
      parameters: { path: "/api/v1/inbound-leads" },
      position: { x: 80, y: 160 },
    },
    {
      id: "step_sheets_log",
      type: "action",
      service: "google_sheets",
      label: "Google Sheets: Append Record",
      parameters: { spreadsheetId: "sheet_leads_q4", range: "Leads!A:E" },
      credentialRef: "cred_google_workspace_main",
      position: { x: 380, y: 160 },
    },
    {
      id: "step_ai_classifier",
      type: "ai",
      service: "anthropic",
      label: "Claude 3.5: Intent Classifier",
      parameters: { model: "claude-3-5-sonnet", task: "classify" },
      position: { x: 680, y: 160 },
    },
    {
      id: "step_condition_urgency",
      type: "condition",
      service: "condition",
      label: "Evaluate Enterprise Urgency",
      parameters: { condition: "$json.urgency === 'HIGH'" },
      expression: "$json.urgency === 'HIGH'",
      position: { x: 980, y: 160 },
    },
    {
      id: "step_hubspot_deal",
      type: "action",
      service: "hubspot",
      label: "HubSpot CRM: Create Priority Deal",
      parameters: { pipeline: "Enterprise Sales", dealValue: 25000 },
      credentialRef: "cred_hubspot_crm_sales",
      sideEffect: "EXTERNAL_COMMUNICATION",
      position: { x: 1280, y: 80 },
    },
    {
      id: "step_slack_notification",
      type: "action",
      service: "slack",
      label: "Slack Alert: Standard Digest",
      parameters: { channel: "#sales-leads", message: "Standard lead received" },
      credentialRef: "cred_slack_prod_ops",
      sideEffect: "EXTERNAL_COMMUNICATION",
      position: { x: 1280, y: 280 },
    },
  ],
  edges: [
    { id: "e1", source: "trigger_inbound", target: "step_sheets_log" },
    { id: "e2", source: "step_sheets_log", target: "step_ai_classifier" },
    { id: "e3", source: "step_ai_classifier", target: "step_condition_urgency" },
    {
      id: "e4",
      source: "step_condition_urgency",
      sourceHandle: "true",
      target: "step_hubspot_deal",
    },
    {
      id: "e5",
      source: "step_condition_urgency",
      sourceHandle: "false",
      target: "step_slack_notification",
    },
  ],
};

export function AIAutomationStudio() {
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowDefinitionV3>(
    INITIAL_STUDIO_WORKFLOW
  );
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isCanvaModalOpen, setIsCanvaModalOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [copiedJson, setCopiedJson] = useState(false);

  // Discovery State Machine & Inspector State
  const [requirementDoc, setRequirementDoc] = useState<RequirementDocument | undefined>();
  const [activePlan, setActivePlan] = useState<AutomationPlan | undefined>();
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>("DISCOVERY");
  const [connectedApps, setConnectedApps] = useState<string[]>([]);

  const [executionStatus, setExecutionStatus] = useState<
    Record<string, { status: ExecutionNodeStatus; durationMs?: number; error?: string }>
  >({});

  // Fetch connected apps on mount
  useEffect(() => {
    fetch("/api/automations/engineer/connectors")
      .then((r) => r.json())
      .then((d) => {
        if (d.connectedApps) setConnectedApps(d.connectedApps);
      })
      .catch(() => {});
  }, []);

  const handleRunSandboxTest = async () => {
    setIsTesting(true);
    const nodeIds = activeWorkflow.nodes.map((n) => n.id);

    // Progressive node simulation
    for (let i = 0; i < nodeIds.length; i++) {
      const id = nodeIds[i];
      setExecutionStatus((prev) => ({
        ...prev,
        [id]: { status: "RUNNING" },
      }));
      await new Promise((r) => setTimeout(r, 400));
      setExecutionStatus((prev) => ({
        ...prev,
        [id]: { status: "SUCCESS", durationMs: Math.floor(Math.random() * 80 + 20) },
      }));
    }

    setIsTesting(false);
  };

  const handleActivateWorkflow = async () => {
    setIsActivating(true);
    try {
      const res = await fetch("/api/automations/engineer/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: activeWorkflow.id,
          maxRunsPerHour: 100,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsActivated(true);
        alert(`Workflow activated into production!\n\nRisk Tier: ${data.preflight?.riskTier || "Standard"}\nExecution Limits: 100 runs/hr.`);
      }
    } catch (err: any) {
      alert(`Activation error: ${err.message}`);
    } finally {
      setIsActivating(false);
    }
  };

  const handleCopyN8nJson = () => {
    navigator.clipboard.writeText(JSON.stringify(activeWorkflow, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleApplyPatch = (operations: any[]) => {
    let updatedNodes = [...activeWorkflow.nodes];
    let updatedEdges = [...activeWorkflow.edges];

    for (const op of operations) {
      if (op.op === "INSERT_BRANCH" && op.splitAfterNodeId) {
        const condNode = {
          id: op.conditionNode.id,
          type: "condition" as const,
          service: "condition",
          label: op.conditionNode.name,
          parameters: { condition: op.conditionNode.expression },
          expression: op.conditionNode.expression,
          position: { x: 980, y: 160 },
        };
        updatedNodes.push(condNode);

        const edgeIdx = updatedEdges.findIndex((e) => e.source === op.splitAfterNodeId);
        if (edgeIdx !== -1) updatedEdges.splice(edgeIdx, 1);

        updatedEdges.push({
          id: `e_${op.splitAfterNodeId}_${condNode.id}`,
          source: op.splitAfterNodeId,
          target: condNode.id,
        });

        if (op.trueBranchNodes?.length) {
          const tNode = {
            id: op.trueBranchNodes[0].id,
            type: "action" as const,
            service: op.trueBranchNodes[0].appId,
            operation: op.trueBranchNodes[0].actionId,
            label: op.trueBranchNodes[0].label,
            parameters: {},
            position: { x: 1280, y: 80 },
          };
          updatedNodes.push(tNode);
          updatedEdges.push({
            id: `e_${condNode.id}_${tNode.id}`,
            source: condNode.id,
            sourceHandle: "true",
            target: tNode.id,
          });
        }

        if (op.falseBranchNodes?.length) {
          const fNode = {
            id: op.falseBranchNodes[0].id,
            type: "action" as const,
            service: op.falseBranchNodes[0].appId,
            operation: op.falseBranchNodes[0].actionId,
            label: op.falseBranchNodes[0].label,
            parameters: {},
            position: { x: 1280, y: 280 },
          };
          updatedNodes.push(fNode);
          updatedEdges.push({
            id: `e_${condNode.id}_${fNode.id}`,
            source: condNode.id,
            sourceHandle: "false",
            target: fNode.id,
          });
        }
      }
    }

    setActiveWorkflow({
      ...activeWorkflow,
      nodes: updatedNodes,
      edges: updatedEdges,
      version: activeWorkflow.version + 1,
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full text-zinc-100 select-none">
      {/* Studio Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100">{activeWorkflow.name}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold">
                v{activeWorkflow.version}.0 {isActivated ? "Live Production" : "Draft Blueprint"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              AI Automation Consultant · Visual DAG Canvas · Production Activation Gate
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Production Activation Button (Strict Gate) */}
          <button
            onClick={handleActivateWorkflow}
            disabled={isActivating || isActivated}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50 ${
              isActivated
                ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 cursor-default"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
            }`}
          >
            {isActivating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isActivated ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Power className="w-3.5 h-3.5" />
            )}
            <span>{isActivated ? "Active in Production" : "Activate Workflow"}</span>
          </button>

          <button
            onClick={handleRunSandboxTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isTesting ? "Executing..." : "Sandbox Test"}</span>
          </button>

          <button
            onClick={() => setIsShowcaseOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Showcase</span>
          </button>

          <button
            onClick={() => setIsCanvaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Canva ↗</span>
          </button>

          <button
            onClick={handleCopyN8nJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copiedJson ? "Copied" : "JSON"}</span>
          </button>

          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`p-2 rounded-xl border text-xs font-medium transition ${
              showInspector
                ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40"
                : "bg-zinc-800 text-zinc-400 border-zinc-700"
            }`}
            title="Toggle Requirements & Inspector Drawer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Studio Viewport (3-Panel Architecture) */}
      <div className="flex flex-col lg:flex-row h-[740px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Left Panel: Conversational AI Consultant */}
        <div className="w-full lg:w-[420px] shrink-0 h-full flex flex-col border-r border-zinc-800">
          <AutomationChatPanel
            currentWorkflow={activeWorkflow}
            onWorkflowConstructed={(wf) => setActiveWorkflow(wf)}
            onApplyPatch={handleApplyPatch}
            onRunTest={handleRunSandboxTest}
            onStateChange={(state) => {
              if (state.discoveryState) setDiscoveryState(state.discoveryState);
              if (state.plan) setActivePlan(state.plan);
              if (state.requirementDoc) setRequirementDoc(state.requirementDoc);
            }}
          />
        </div>

        {/* Center Panel: Interactive Visual DAG Canvas */}
        <div className="flex-1 h-full relative flex flex-col overflow-hidden">
          <WorkflowCanvas
            initialWorkflow={activeWorkflow}
            onWorkflowChange={(wf) => setActiveWorkflow(wf)}
            executionStatus={executionStatus}
            isExecuting={isTesting}
            onRunTest={handleRunSandboxTest}
          />
        </div>

        {/* Right Panel: Requirements & Inspector Drawer */}
        {showInspector && (
          <div className="w-full lg:w-80 shrink-0 h-full border-l border-zinc-800">
            <RequirementInspectorDrawer
              requirementDoc={requirementDoc}
              plan={activePlan}
              discoveryState={discoveryState}
              connectedApps={connectedApps}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <WorkflowShowcaseModal
        isOpen={isShowcaseOpen}
        onClose={() => setIsShowcaseOpen(false)}
        workflow={activeWorkflow}
        onOpenCanvaExport={() => {
          setIsShowcaseOpen(false);
          setIsCanvaModalOpen(true);
        }}
      />

      <CanvaExportModal
        isOpen={isCanvaModalOpen}
        onClose={() => setIsCanvaModalOpen(false)}
        workflow={activeWorkflow}
      />
    </div>
  );
}
