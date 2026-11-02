"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Copy,
  Download,
  Settings,
  Layers,
  Palette,
  FileCode,
  Check,
} from "lucide-react";
import { MySamparkHeader } from "@/frontend/components/landing/MySamparkHeader";
import { Footer } from "@/frontend/components/landing/Footer";
import dynamic from "next/dynamic";

const WorkflowCanvas = dynamic(
  () => import("@/components/canvas/WorkflowCanvas").then((mod) => mod.WorkflowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    ),
  }
);
import { AutomationChatPanel } from "@/components/chat/AutomationChatPanel";
import { WorkflowShowcaseModal } from "@/components/showcase/WorkflowShowcaseModal";
import { CanvaExportModal } from "@/components/showcase/CanvaExportModal";
import type {
  WorkflowDefinitionV3,
  ExecutionNodeStatus,
} from "@/components/canvas/types";

const INITIAL_PUBLIC_WORKFLOW: WorkflowDefinitionV3 = {
  id: "wf_public_showcase",
  version: 1,
  name: "Lead Qualification & Conditional CRM Sync",
  tenantId: "tenant_public",
  workspaceId: "ws_demo",
  description:
    "End-to-end automated lead intake: Webhook -> Google Sheets -> AI Claude Intent Classifier -> High-Urgency Condition Split -> HubSpot Priority Contact / Slack Notification.",
  nodes: [
    {
      id: "trigger_webhook",
      type: "trigger",
      service: "webhook",
      label: "Webhook Inbound Lead",
      parameters: { path: "/api/v1/inbound-leads" },
      position: { x: 80, y: 160 },
    },
    {
      id: "step_sheets",
      type: "action",
      service: "google_sheets",
      label: "Google Sheets: Append Lead Row",
      parameters: { spreadsheetId: "sheet_leads_q4", range: "Leads!A:E" },
      credentialRef: "cred_google_workspace_main",
      position: { x: 380, y: 160 },
    },
    {
      id: "step_ai_classifier",
      type: "ai",
      service: "anthropic",
      label: "Claude 3.5: Urgency & Tier Classifier",
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
      id: "step_hubspot_priority",
      type: "action",
      service: "hubspot",
      label: "HubSpot CRM: Create Priority Deal",
      parameters: { pipeline: "Enterprise Sales", dealValue: 25000 },
      credentialRef: "cred_hubspot_crm_sales",
      sideEffect: "EXTERNAL_COMMUNICATION",
      position: { x: 1280, y: 80 },
    },
    {
      id: "step_slack_alert",
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
    { id: "e1", source: "trigger_webhook", target: "step_sheets" },
    { id: "e2", source: "step_sheets", target: "step_ai_classifier" },
    { id: "e3", source: "step_ai_classifier", target: "step_condition_urgency" },
    {
      id: "e4",
      source: "step_condition_urgency",
      sourceHandle: "true",
      target: "step_hubspot_priority",
    },
    {
      id: "e5",
      source: "step_condition_urgency",
      sourceHandle: "false",
      target: "step_slack_alert",
    },
  ],
};

export default function AutomationFeaturePage() {
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowDefinitionV3>(
    INITIAL_PUBLIC_WORKFLOW
  );
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isCanvaModalOpen, setIsCanvaModalOpen] = useState(false);
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<
    Record<string, { status: ExecutionNodeStatus; durationMs?: number; error?: string }>
  >({});

  const handleWorkflowChange = React.useCallback((wf: WorkflowDefinitionV3) => {
    setActiveWorkflow((prev) => {
      if (
        prev.id === wf.id &&
        prev.version === wf.version &&
        prev.nodes.length === wf.nodes.length &&
        prev.edges.length === wf.edges.length
      ) {
        return prev;
      }
      return wf;
    });
  }, []);

  // Sandbox Test Runner: Simulates end-to-end execution across the graph
  const handleRunSandboxTest = async () => {
    if (isExecutingTest) return;
    setIsExecutingTest(true);

    const nodes = activeWorkflow.nodes;
    const newStatus: Record<
      string,
      { status: ExecutionNodeStatus; durationMs?: number; error?: string }
    > = {};

    // Queue all nodes
    nodes.forEach((n) => {
      newStatus[n.id] = { status: "QUEUED" };
    });
    setExecutionStatus({ ...newStatus });

    // Animate sequential/conditional traversal
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      newStatus[node.id] = { status: "RUNNING" };
      setExecutionStatus({ ...newStatus });

      await new Promise((r) => setTimeout(r, 450));

      const duration = 120 + Math.floor(Math.random() * 200);
      newStatus[node.id] = { status: "SUCCESS", durationMs: duration };
      setExecutionStatus({ ...newStatus });
    }

    setIsExecutingTest(false);
  };

  const handleCopyN8nJson = () => {
    const n8nPayload = {
      name: activeWorkflow.name,
      nodes: activeWorkflow.nodes.map((n, idx) => ({
        id: n.id,
        name: n.label,
        type: n.service || "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [100 + idx * 260, 200],
        parameters: n.parameters,
      })),
      connections: {},
      active: false,
      settings: { executionOrder: "v1" },
    };
    navigator.clipboard.writeText(JSON.stringify(n8nPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleApplyPatch = (operations: any[]) => {
    // Non-destructively apply patch
    let updatedNodes = [...activeWorkflow.nodes];
    let updatedEdges = [...activeWorkflow.edges];

    for (const op of operations) {
      if (op.op === "INSERT_BRANCH") {
        const anchorId = op.splitAfterNodeId;
        const condId = op.conditionNode?.id || `cond_${Date.now()}`;
        const condNode = {
          id: condId,
          type: "condition" as const,
          service: "condition",
          label: op.conditionNode?.name || "Conditional Branch",
          expression: op.conditionNode?.expression || "$json.score > 80",
          parameters: { condition: op.conditionNode?.expression || "$json.score > 80" },
          position: { x: 800, y: 160 },
        };

        updatedNodes.push(condNode);

        // Reconnect anchor to condition
        if (anchorId) {
          updatedEdges.push({
            id: `e_${anchorId}_${condId}`,
            source: anchorId,
            target: condId,
          });
        }

        // Add true branch nodes
        if (op.trueBranchNodes?.length) {
          const tNode = op.trueBranchNodes[0];
          updatedNodes.push({
            id: tNode.id,
            type: "action",
            service: tNode.appId || "hubspot",
            label: tNode.label,
            parameters: {},
            position: { x: 1100, y: 80 },
          });
          updatedEdges.push({
            id: `e_${condId}_true_${tNode.id}`,
            source: condId,
            sourceHandle: "true",
            target: tNode.id,
          });
        }

        // Add false branch nodes
        if (op.falseBranchNodes?.length) {
          const fNode = op.falseBranchNodes[0];
          updatedNodes.push({
            id: fNode.id,
            type: "action",
            service: fNode.appId || "slack",
            label: fNode.label,
            parameters: {},
            position: { x: 1100, y: 260 },
          });
          updatedEdges.push({
            id: `e_${condId}_false_${fNode.id}`,
            source: condId,
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
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100 font-sans selection:bg-orange-500/20">
      {/* 1. Header Navigation */}
      <MySamparkHeader />

      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Top Studio Hero & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-950/50">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-zinc-100 leading-tight">
                  Visual Automation Studio & Canvas
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 font-bold uppercase">
                  v{activeWorkflow.version}.0 Active
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Natural-Language Builder · React Flow 2D Canvas · Canva Connect Integration
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsShowcaseOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition"
              title="Open Executive Presentation Mode"
            >
              <Layers className="w-4 h-4 text-orange-400" />
              <span>Showcase Mode</span>
            </button>

            <button
              onClick={() => setIsCanvaModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition"
              title="Export to Canva Connect API"
            >
              <Palette className="w-4 h-4" />
              <span>Canva Presentation ↗</span>
            </button>

            <button
              onClick={handleRunSandboxTest}
              disabled={isExecutingTest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              {isExecutingTest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isExecutingTest ? "Running..." : "Sandbox Test"}</span>
            </button>

            <button
              onClick={handleCopyN8nJson}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition"
              title="Copy Workflow for n8n (Ctrl+V)"
            >
              {copiedJson ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-400" />
              )}
              <span>{copiedJson ? "Copied!" : "n8n JSON"}</span>
            </button>
          </div>
        </div>

        {/* Master Studio Viewport: Split Screen */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[720px] rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
          {/* Left Column: Conversational AI Planner Assistant */}
          <div className="lg:col-span-5 h-[720px] flex flex-col">
            <AutomationChatPanel
              currentWorkflow={activeWorkflow}
              onWorkflowConstructed={(wf) => setActiveWorkflow(wf)}
              onApplyPatch={handleApplyPatch}
              onRunTest={handleRunSandboxTest}
            />
          </div>

          {/* Right Column: Interactive Visual Workflow Canvas */}
          <div className="lg:col-span-7 h-[720px] relative flex flex-col">
            <WorkflowCanvas
              initialWorkflow={activeWorkflow}
              onWorkflowChange={handleWorkflowChange}
              executionStatus={executionStatus}
              isExecuting={isExecutingTest}
              onRunTest={handleRunSandboxTest}
            />
          </div>
        </div>
      </main>

      {/* Presentation Showcase Modal */}
      <WorkflowShowcaseModal
        isOpen={isShowcaseOpen}
        onClose={() => setIsShowcaseOpen(false)}
        workflow={activeWorkflow}
        onOpenCanvaExport={() => {
          setIsShowcaseOpen(false);
          setIsCanvaModalOpen(true);
        }}
      />

      {/* Canva Connect API Modal */}
      <CanvaExportModal
        isOpen={isCanvaModalOpen}
        onClose={() => setIsCanvaModalOpen(false)}
        workflow={activeWorkflow}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
