/**
 * ============================================================================
 * QuickReply — Production DAG Workflow Execution Engine
 * src/backend/workflows/WorkflowEngine.ts
 *
 * Implements:
 * 1. DAG graph validation & cycle detection.
 * 2. Immutable workflow version execution.
 * 3. Deterministic state machine (QUEUED -> RUNNING -> WAITING_APPROVAL -> COMPLETED | FAILED).
 * 4. Step-by-step execution telemetry and trace recording.
 * ============================================================================
 */

import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB } from "@/database/db";
import { NormalizedEvent } from "@/backend/events/EventNormalizer";
import { NodeRegistry, NodeExecutionContext, NodeExecutionOutput } from "./NodeRegistry";
import { ApprovalService } from "@/backend/approval/ApprovalService";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position?: { x: number; y: number };
  config: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // e.g. "true", "false", "high_confidence", "default"
  targetHandle?: string;
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED";
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ExecutionStepTrace {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  status: "SUCCESS" | "FAILED" | "SKIPPED" | "WAITING_APPROVAL";
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  tenantId: string;
  workspaceId: string;
  workflowId: string;
  workflowVersion: number;
  triggerEvent: NormalizedEvent;
  status: "QUEUED" | "RUNNING" | "WAITING_APPROVAL" | "COMPLETED" | "FAILED" | "CANCELLED";
  startedAt: string;
  completedAt?: string;
  totalLatencyMs?: number;
  steps: ExecutionStepTrace[];
  workflowState: Record<string, any>;
  error?: string;
}

export class WorkflowEngine {
  /**
   * Validate DAG Workflow Graph Integrity
   */
  static validateGraph(workflow: Pick<WorkflowDefinition, "nodes" | "edges">): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const { nodes, edges } = workflow;

    if (!nodes || nodes.length === 0) {
      errors.push("Workflow must contain at least one node.");
      return { isValid: false, errors };
    }

    // 1. Must have exactly one or more trigger nodes
    const triggerNodes = nodes.filter((n) => {
      const def = NodeRegistry.get(n.type);
      return def?.category === "trigger";
    });

    if (triggerNodes.length === 0) {
      errors.push("Workflow must have at least one trigger node.");
    }

    // 2. Validate node configs against schema
    for (const node of nodes) {
      const def = NodeRegistry.get(node.type);
      if (!def) {
        errors.push(`Unrecognized node type "${node.type}" on node "${node.label || node.id}".`);
      } else {
        const val = def.validate(node.config || {});
        if (!val.isValid) {
          errors.push(...val.errors.map((e) => `Node "${node.label || node.id}": ${e}`));
        }
      }
    }

    // 3. Cycle Detection (DFS)
    const adjList = new Map<string, string[]>();
    for (const node of nodes) {
      adjList.set(node.id, []);
    }
    for (const edge of edges || []) {
      const neighbors = adjList.get(edge.source);
      if (neighbors) neighbors.push(edge.target);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          errors.push("Workflow contains an illegal loop/cycle. Workflows must be a Directed Acyclic Graph (DAG).");
          break;
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Execute a Published Workflow against an Inbound Normalized Event
   */
  static async execute(
    workflow: WorkflowDefinition,
    triggerEvent: NormalizedEvent
  ): Promise<WorkflowExecution> {
    const executionId = `exec_${uuidv4()}`;
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const execution: WorkflowExecution = {
      id: executionId,
      tenantId: workflow.tenantId,
      workspaceId: workflow.workspaceId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      triggerEvent,
      status: "RUNNING",
      startedAt,
      steps: [],
      workflowState: {},
    };

    // Find entry trigger node
    const triggerNode = workflow.nodes.find((n) => {
      const def = NodeRegistry.get(n.type);
      return def?.category === "trigger";
    }) || workflow.nodes[0];

    let currentNodeId: string | null = triggerNode.id;
    const nodeMap = new Map<string, WorkflowNode>(workflow.nodes.map((n) => [n.id, n]));
    const executedNodeIds = new Set<string>();

    try {
      while (currentNodeId) {
        if (executedNodeIds.has(currentNodeId)) {
          break; // Avoid re-execution safety
        }
        executedNodeIds.add(currentNodeId);

        const node = nodeMap.get(currentNodeId);
        if (!node) break;

        const def = NodeRegistry.get(node.type);
        if (!def) {
          throw new Error(`Node execution handler missing for type "${node.type}"`);
        }

        const stepStart = Date.now();
        const stepContext: NodeExecutionContext = {
          tenantId: workflow.tenantId,
          workspaceId: workflow.workspaceId,
          executionId,
          nodeId: node.id,
          triggerEvent,
          workflowState: execution.workflowState,
          stepInputs: node.config || {},
        };

        const output: NodeExecutionOutput = await def.execute(stepContext, node.config || {});
        const stepLatency = Date.now() - stepStart;

        const stepTrace: ExecutionStepTrace = {
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.label || def.name,
          startedAt: new Date(stepStart).toISOString(),
          completedAt: new Date().toISOString(),
          latencyMs: stepLatency,
          status: output.status === "REQUIRES_APPROVAL" ? "WAITING_APPROVAL" : output.status,
          inputs: node.config || {},
          outputs: output.data,
          error: output.error,
        };
        execution.steps.push(stepTrace);

        // Handle Human Review Interception
        if (output.status === "REQUIRES_APPROVAL" && output.approvalPayload) {
          execution.status = "WAITING_APPROVAL";
          await ApprovalService.createRequest({
            tenantId: workflow.tenantId,
            workspaceId: workflow.workspaceId,
            executionId,
            workflowId: workflow.id,
            actionType: node.type,
            riskScore: output.approvalPayload.riskScore,
            reason: output.approvalPayload.reason,
            customerContext: {
              actorName: triggerEvent.actor.name || triggerEvent.actor.username,
              platform: triggerEvent.platform,
              inboundText: triggerEvent.content,
            },
            suggestedAction: output.approvalPayload.suggestedAction,
          });
          break; // Halt workflow execution until approved
        }

        if (output.status === "FAILED") {
          execution.status = "FAILED";
          execution.error = output.error || `Step "${node.label}" execution failed.`;
          break;
        }

        // Merge node outputs into workflow state
        if (output.data) {
          execution.workflowState = { ...execution.workflowState, ...output.data };
        }

        // Resolve next edge in graph
        const outgoingEdges = (workflow.edges || []).filter((e) => e.source === node.id);
        if (outgoingEdges.length === 0) {
          currentNodeId = null; // Reached end of branch
        } else if (outgoingEdges.length === 1) {
          currentNodeId = outgoingEdges[0].target;
        } else {
          // Branching edge: match handle (e.g. "true", "false", "high_confidence")
          const targetHandle = output.nextBranch || "default";
          const matchedEdge = outgoingEdges.find((e) => e.sourceHandle === targetHandle) || outgoingEdges[0];
          currentNodeId = matchedEdge.target;
        }
      }

      if (execution.status === "RUNNING") {
        execution.status = "COMPLETED";
      }
    } catch (err: any) {
      execution.status = "FAILED";
      execution.error = err.message || "Unhandled workflow execution error";
    } finally {
      execution.completedAt = new Date().toISOString();
      execution.totalLatencyMs = Date.now() - startTime;

      // Persist Execution record
      await this.saveExecution(execution);
    }

    return execution;
  }

  private static async saveExecution(execution: WorkflowExecution): Promise<void> {
    try {
      const db = await getDB(execution.tenantId);
      if (!db.workflowExecutions) db.workflowExecutions = [];

      db.workflowExecutions.unshift(execution);
      if (db.workflowExecutions.length > 2000) {
        db.workflowExecutions = db.workflowExecutions.slice(0, 2000);
      }
      await saveDB(db, execution.tenantId);
    } catch (err) {
      console.error("[WorkflowEngine] Failed to persist execution record:", err);
    }
  }
}
