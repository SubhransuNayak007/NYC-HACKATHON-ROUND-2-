/**
 * types.ts
 * Core types, data schemas, and bidirectional converters for the Visual Workflow Canvas.
 */

import type { Node, Edge } from "@xyflow/react";

export type CustomNodeType =
  | "triggerNode"
  | "actionNode"
  | "conditionNode"
  | "loopNode"
  | "aiNode"
  | "customScriptNode";

export type ExecutionNodeStatus =
  | "IDLE"
  | "QUEUED"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED";

export type SafetyTier =
  | "SAFE_READ"
  | "REVERSIBLE"
  | "EXTERNAL_COMMUNICATION"
  | "FINANCIAL"
  | "DESTRUCTIVE";

export interface NodeRetryPolicy {
  maxAttempts: number;
  initialIntervalMs: number;
  backoffFactor: number;
}

export interface CanvasNodeData {
  [key: string]: unknown;
  label: string;
  nodeType: "trigger" | "action" | "condition" | "loop" | "ai" | "script";
  service?: string;
  operation?: string;
  appId?: string;
  actionId?: string;
  parameters: Record<string, any>;
  credentialRef?: string;
  status?: ExecutionNodeStatus;
  durationMs?: number;
  errorMessage?: string;
  lastInput?: any;
  lastOutput?: any;
  sideEffect?: SafetyTier;
  approvalRequired?: boolean;
  approvalCondition?: string;
  retryPolicy?: NodeRetryPolicy;

  // Trigger Node specifics
  triggerType?: "webhook" | "cron" | "manual" | "app_event";
  cronExpression?: string;
  webhookPath?: string;

  // Condition Node specifics
  expression?: string;

  // Loop Node specifics
  collectionPath?: string;
  batchSize?: number;

  // AI Node specifics
  model?: string;
  prompt?: string;
  taskType?: "classify" | "summarize" | "extract" | "transform";
  temperature?: number;

  // Script Node specifics
  code?: string;
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export type AppNode = Node<CanvasNodeData, CustomNodeType>;
export type AppEdge = Edge;

// =========================================================================
// Backend Executable Workflow Definition V3 Contract
// =========================================================================

export interface ExecutableWorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition" | "loop" | "ai" | "script";
  service?: string;
  operation?: string;
  label: string;
  parameters: Record<string, any>;
  credentialRef?: string;
  position?: { x: number; y: number };
  retryPolicy?: NodeRetryPolicy;
  sideEffect?: SafetyTier;
  approvalRequired?: boolean;
  approvalCondition?: string;
  expression?: string;
  code?: string;
  model?: string;
  prompt?: string;
}

export interface ExecutableWorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface WorkflowDefinitionV3 {
  id: string;
  version: number;
  name: string;
  tenantId: string;
  workspaceId: string;
  nodes: ExecutableWorkflowNode[];
  edges: ExecutableWorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
  description?: string;
}

// =========================================================================
// Bidirectional Converters
// =========================================================================

export function toExecutableWorkflow(
  nodes: AppNode[],
  edges: AppEdge[],
  meta?: Partial<WorkflowDefinitionV3>
): WorkflowDefinitionV3 {
  const executableNodes: ExecutableWorkflowNode[] = nodes.map((n) => {
    const data = n.data || ({} as CanvasNodeData);
    let type: "trigger" | "action" | "condition" | "loop" | "ai" | "script" = "action";

    if (n.type === "triggerNode") type = "trigger";
    else if (n.type === "conditionNode") type = "condition";
    else if (n.type === "loopNode") type = "loop";
    else if (n.type === "aiNode") type = "ai";
    else if (n.type === "customScriptNode") type = "script";

    return {
      id: n.id,
      type,
      service: data.service || data.appId || "generic",
      operation: data.operation || data.actionId || "execute",
      label: data.label || n.id,
      parameters: data.parameters || {},
      credentialRef: data.credentialRef,
      position: { x: n.position.x, y: n.position.y },
      retryPolicy: data.retryPolicy,
      sideEffect: data.sideEffect || "SAFE_READ",
      approvalRequired: data.approvalRequired,
      approvalCondition: data.approvalCondition,
      expression: data.expression,
      code: data.code,
      model: data.model,
      prompt: data.prompt,
    };
  });

  const executableEdges: ExecutableWorkflowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || undefined,
    targetHandle: e.targetHandle || undefined,
  }));

  return {
    id: meta?.id || `wf_${Date.now()}`,
    version: meta?.version || 1,
    name: meta?.name || "Untitled Workflow",
    tenantId: meta?.tenantId || "tenant_default",
    workspaceId: meta?.workspaceId || "ws_default",
    nodes: executableNodes,
    edges: executableEdges,
    createdAt: meta?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: meta?.description || "",
  };
}

export function fromExecutableWorkflow(def: WorkflowDefinitionV3): {
  nodes: AppNode[];
  edges: AppEdge[];
} {
  const nodes: AppNode[] = (def.nodes || []).map((n, idx) => {
    let customType: CustomNodeType = "actionNode";
    if (n.type === "trigger") customType = "triggerNode";
    else if (n.type === "condition") customType = "conditionNode";
    else if (n.type === "loop") customType = "loopNode";
    else if (n.type === "ai") customType = "aiNode";
    else if (n.type === "script") customType = "customScriptNode";

    const pos = n.position || { x: 100 + idx * 260, y: 150 };

    return {
      id: n.id,
      type: customType,
      position: pos,
      data: {
        label: n.label || n.id,
        nodeType: n.type,
        service: n.service,
        operation: n.operation,
        appId: n.service,
        actionId: n.operation,
        parameters: n.parameters || {},
        credentialRef: n.credentialRef,
        status: "IDLE",
        sideEffect: n.sideEffect || "SAFE_READ",
        approvalRequired: n.approvalRequired,
        approvalCondition: n.approvalCondition,
        retryPolicy: n.retryPolicy,
        expression: n.expression,
        code: n.code,
        model: n.model,
        prompt: n.prompt,
      },
    };
  });

  const edges: AppEdge[] = (def.edges || []).map((e) => ({
    id: e.id || `e_${e.source}_${e.target}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || undefined,
    targetHandle: e.targetHandle || undefined,
    type: "smoothstep",
    animated: false,
    style: { strokeWidth: 2, stroke: "#64748B" },
  }));

  return { nodes, edges };
}
