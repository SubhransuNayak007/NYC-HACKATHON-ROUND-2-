/**
 * ============================================================================
 * QuickReply AI Automation Operating System — Workflow Compiler & Validator
 * src/backend/automation/compiler/WorkflowCompiler.ts
 *
 * Compiles normalized WorkflowSpec v2.0 into:
 * 1. n8n Workflow JSON (official node types, versions, connections, layout)
 * 2. LangGraph Agentic State Graph specification
 * 3. Native DAG Workflow format for built-in execution
 *
 * Implements strict acyclic validation (DFS), parameter validation, and
 * synthetic edge-case test generation.
 * ============================================================================
 */

import { WorkflowSpec, WorkflowStep, SyntheticTestCase, RuntimeTarget, AutomationPlan } from "../types";
import { IntegrationCatalog } from "../catalog/IntegrationCatalog";
import type { WorkflowDefinitionV3, ExecutableWorkflowNode, ExecutableWorkflowEdge, SafetyTier } from "@/components/canvas/types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface N8nCompiledWorkflow {
  name: string;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, any>;
    credentials?: Record<string, { id: string; name: string }>;
  }>;
  connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }>;
  settings: Record<string, any>;
}

export interface LangGraphCompiledState {
  graphId: string;
  entryPoint: string;
  nodes: Record<string, { type: string; action: string; interruptBeforeApproval: boolean }>;
  edges: Array<{ from: string; to: string; condition?: string }>;
  checkpointer: "mongodb" | "memory";
}

export class WorkflowCompiler {
  /**
   * Compile an approved AutomationPlan blueprint into an executable WorkflowDefinitionV3 & WorkflowSpec
   */
  static compileFromPlan(plan: AutomationPlan): {
    canvasWorkflow: WorkflowDefinitionV3;
    spec: WorkflowSpec;
  } {
    const nodes: ExecutableWorkflowNode[] = [];
    const edges: ExecutableWorkflowEdge[] = [];
    const now = new Date().toISOString();

    let x = 100;
    const y = 200;
    const spacing = 320;

    // Trigger Node
    const triggerNodeId = plan.steps[0]?.id || "step_trigger";
    nodes.push({
      id: triggerNodeId,
      type: "trigger",
      service: plan.trigger.appId,
      operation: plan.trigger.triggerId,
      label: plan.trigger.label,
      parameters: plan.trigger.config,
      position: { x, y },
      sideEffect: "SAFE_READ",
      approvalRequired: false,
    });

    let prevNodeId = triggerNodeId;

    for (let i = 1; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      x += spacing;

      let nodeType: "trigger" | "action" | "condition" | "loop" | "ai" | "script" = "action";
      if (step.appId === "ai_extractor") nodeType = "ai";
      else if (step.appId.includes("condition")) nodeType = "condition";
      else if (step.appId.includes("loop")) nodeType = "loop";

      nodes.push({
        id: step.id,
        type: nodeType,
        service: step.appId,
        operation: step.actionId,
        label: step.label,
        parameters: step.parameters,
        credentialRef: step.credentialRef,
        position: { x, y },
        sideEffect: step.sideEffect as SafetyTier,
        approvalRequired: step.approvalRequired,
        retryPolicy: step.retryPolicy
          ? {
              maxAttempts: step.retryPolicy.maxAttempts,
              initialIntervalMs: step.retryPolicy.backoffMs,
              backoffFactor: 2,
            }
          : undefined,
      });

      edges.push({
        id: `e_${prevNodeId}_${step.id}`,
        source: prevNodeId,
        target: step.id,
      });

      prevNodeId = step.id;
    }

    const canvasWorkflow: WorkflowDefinitionV3 = {
      id: `wf_${plan.id.replace("plan_", "")}`,
      version: plan.version,
      name: plan.title,
      tenantId: plan.tenantId,
      workspaceId: plan.workspaceId,
      nodes,
      edges,
      description: plan.objective,
      createdAt: plan.createdAt,
      updatedAt: now,
    };

    const spec: WorkflowSpec = {
      id: canvasWorkflow.id,
      tenantId: plan.tenantId,
      workspaceId: plan.workspaceId,
      name: plan.title,
      description: plan.objective,
      businessObjective: plan.objective,
      runtimeTarget: "native",
      version: plan.version,
      status: "GENERATED",
      trigger: {
        type: (plan.executionBehavior === "scheduled" ? "schedule" : "webhook") as any,
        appId: plan.trigger.appId,
        triggerId: plan.trigger.triggerId,
        config: plan.trigger.config,
      },
      steps: plan.steps.map((s) => ({
        id: s.id,
        appId: s.appId,
        actionId: s.actionId,
        label: s.label,
        credentialRef: s.credentialRef,
        parameters: s.parameters,
        dependsOn: s.dependsOn,
        sideEffect: s.sideEffect,
        approvalRequired: s.approvalRequired,
      })),
      retryPolicy: {
        maxAttempts: plan.reliability.maxRetries,
        backoffMs: plan.reliability.retryBackoffMs,
        jitter: true,
      },
      createdAt: plan.createdAt,
      updatedAt: now,
    };

    return { canvasWorkflow, spec };
  }

  /**
   * Validate Workflow Graph Integrity & Schema Parameters
   */
  static validate(spec: WorkflowSpec): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!spec.name || !spec.name.trim()) {
      errors.push("Workflow specification must contain a valid name.");
    }

    if (!spec.trigger || !spec.trigger.appId) {
      errors.push("Workflow specification must define a valid trigger.");
    }

    if (!spec.steps || spec.steps.length === 0) {
      errors.push("Workflow specification must contain at least one step.");
    }

    const stepIdSet = new Set<string>();
    const nodeMap = new Map<string, WorkflowStep>();

    for (const step of spec.steps || []) {
      if (!step.id) {
        errors.push("Workflow step missing identifier.");
        continue;
      }
      if (stepIdSet.has(step.id)) {
        errors.push(`Duplicate step ID "${step.id}" detected in workflow.`);
      }
      stepIdSet.add(step.id);
      nodeMap.set(step.id, step);

      // Verify app & action exist in catalog
      const app = IntegrationCatalog.get(step.appId);
      if (!app) {
        errors.push(`Step "${step.label || step.id}": Unrecognized integration "${step.appId}".`);
      } else {
        const action = app.actions.find((a) => a.id === step.actionId);
        if (!action) {
          errors.push(`Step "${step.label || step.id}": Unrecognized action "${step.actionId}" for app "${step.appId}".`);
        } else {
          // Verify required parameters
          for (const [paramName, schema] of Object.entries(action.inputSchema)) {
            if (schema.required && (step.parameters[paramName] === undefined || step.parameters[paramName] === "")) {
              errors.push(`Step "${step.label || step.id}": Missing required parameter "${paramName}".`);
            }
          }
        }
      }
    }

    // Verify dependencies
    for (const step of spec.steps || []) {
      for (const depId of step.dependsOn || []) {
        if (!stepIdSet.has(depId)) {
          errors.push(`Step "${step.id}" depends on non-existent step "${depId}".`);
        }
      }
    }

    // Cycle Detection (DFS)
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const checkCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recStack.add(stepId);

      const step = nodeMap.get(stepId);
      if (step) {
        for (const depId of step.dependsOn) {
          if (!visited.has(depId)) {
            if (checkCycle(depId)) return true;
          } else if (recStack.has(depId)) {
            return true;
          }
        }
      }

      recStack.delete(stepId);
      return false;
    };

    for (const stepId of Array.from(stepIdSet)) {
      if (!visited.has(stepId)) {
        if (checkCycle(stepId)) {
          errors.push("Workflow contains an illegal loop or cycle. It must be a Directed Acyclic Graph (DAG).");
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Compile to Official n8n Workflow JSON
   */
  static compileToN8n(spec: WorkflowSpec): N8nCompiledWorkflow {
    const val = this.validate(spec);
    if (!val.isValid) {
      throw new Error(`Cannot compile invalid workflow: ${val.errors.join("; ")}`);
    }

    const nodes: N8nCompiledWorkflow["nodes"] = [];
    const connections: N8nCompiledWorkflow["connections"] = {};

    let currentX = 250;
    const currentY = 300;

    // 1. Entry Trigger Node
    const triggerApp = IntegrationCatalog.get(spec.trigger.appId);
    const triggerDef = triggerApp?.triggers.find((t) => t.id === spec.trigger.triggerId);
    const triggerNodeType = triggerDef?.n8nNodeMapping?.nodeType || "n8n-nodes-base.cron";
    const triggerTypeVersion = triggerDef?.n8nNodeMapping?.typeVersion || 1;

    const triggerNodeId = "trigger_0";
    let triggerParameters: Record<string, any> = spec.trigger.config || {};
    if (triggerNodeType === "n8n-nodes-base.scheduleTrigger") {
      triggerParameters = {
        rule: {
          interval: [
            {
              field: "cronExpression",
              expression: spec.trigger.config?.cron || "0 9 * * *",
            },
          ],
        },
      };
    } else if (triggerNodeType === "n8n-nodes-base.cron") {
      triggerParameters = {
        triggerTimes: {
          item: [
            {
              mode: "custom",
              cronExpression: spec.trigger.config?.cron || "0 9 * * *",
            },
          ],
        },
      };
    }

    nodes.push({
      id: triggerNodeId,
      name: spec.trigger.type === "schedule" ? "Schedule Trigger" : "Trigger",
      type: triggerNodeType,
      typeVersion: triggerTypeVersion,
      position: [currentX, currentY],
      parameters: triggerParameters,
    });

    connections[spec.trigger.type === "schedule" ? "Schedule Trigger" : "Trigger"] = {
      main: [[]],
    };

    let prevNodeName = spec.trigger.type === "schedule" ? "Schedule Trigger" : "Trigger";

    // 2. Action Step Nodes
    for (let i = 0; i < spec.steps.length; i++) {
      const step = spec.steps[i];
      currentX += 280;

      const app = IntegrationCatalog.get(step.appId);
      const action = app?.actions.find((a) => a.id === step.actionId);
      const nodeType = action?.n8nNodeMapping?.nodeType || "n8n-nodes-base.httpRequest";
      const typeVersion = action?.n8nNodeMapping?.typeVersion || 1;

      const nodeName = `${step.label || step.id} (${i + 1})`;
      const nodeParams: Record<string, any> = {
        ...step.parameters,
        resource: action?.n8nNodeMapping?.resource,
        operation: action?.n8nNodeMapping?.operation,
      };

      // Native n8n parameter formatting
      if (nodeType === "n8n-nodes-base.whatsApp") {
        nodeParams.resource = "message";
        nodeParams.operation = action?.n8nNodeMapping?.operation || "send";
        if (step.parameters.to || step.parameters.recipientPhone) {
          nodeParams.recipientPhoneNumber = step.parameters.to || step.parameters.recipientPhone;
        }
        if (step.parameters.text || step.parameters.body) {
          nodeParams.textBody = step.parameters.text || step.parameters.body;
        }
      } else if (nodeType === "n8n-nodes-base.postgres") {
        nodeParams.operation = "executeQuery";
        nodeParams.query = step.parameters.query;
      } else if (nodeType === "n8n-nodes-base.openAi") {
        nodeParams.resource = "chat";
        nodeParams.operation = "complete";
        nodeParams.model = "gpt-4o-mini";
        nodeParams.prompt = step.parameters.objective || step.parameters.rawContent || "";
      }

      nodes.push({
        id: step.id,
        name: nodeName,
        type: nodeType,
        typeVersion,
        position: [currentX, currentY],
        parameters: nodeParams,
      });

      // Connect from previous or dependencies
      if (i === 0) {
        connections[prevNodeName].main[0].push({
          node: nodeName,
          type: "main",
          index: 0,
        });
      } else {
        if (!connections[prevNodeName]) {
          connections[prevNodeName] = { main: [[]] };
        }
        connections[prevNodeName].main[0].push({
          node: nodeName,
          type: "main",
          index: 0,
        });
      }

      prevNodeName = nodeName;
    }

    return {
      name: spec.name,
      nodes,
      connections,
      settings: {
        executionOrder: "v1",
        timezone: spec.trigger.config?.timezone || "Asia/Kolkata",
      },
    };
  }

  /**
   * Compile to LangGraph Stateful Graph Specification
   */
  static compileToLangGraph(spec: WorkflowSpec): LangGraphCompiledState {
    const val = this.validate(spec);
    if (!val.isValid) {
      throw new Error(`Cannot compile invalid workflow: ${val.errors.join("; ")}`);
    }

    const nodes: LangGraphCompiledState["nodes"] = {};
    const edges: LangGraphCompiledState["edges"] = [];

    // Trigger Node
    nodes["trigger"] = {
      type: spec.trigger.appId,
      action: spec.trigger.triggerId,
      interruptBeforeApproval: false,
    };

    let prevId = "trigger";

    for (const step of spec.steps) {
      nodes[step.id] = {
        type: step.appId,
        action: step.actionId,
        interruptBeforeApproval: step.approvalRequired || step.sideEffect === "FINANCIAL" || step.sideEffect === "EXTERNAL_COMMUNICATION",
      };

      edges.push({
        from: prevId,
        to: step.id,
        condition: step.approvalCondition,
      });

      prevId = step.id;
    }

    return {
      graphId: `lg_${spec.id}`,
      entryPoint: "trigger",
      nodes,
      edges,
      checkpointer: "mongodb",
    };
  }

  /**
   * Synthesize Automated Edge-Case Test Cases
   */
  static generateSyntheticTests(spec: WorkflowSpec): SyntheticTestCase[] {
    const tests: SyntheticTestCase[] = [];

    const isSalesKpi =
      spec.name?.toLowerCase().includes("kpi") ||
      spec.name?.toLowerCase().includes("sales") ||
      spec.description?.toLowerCase().includes("sales") ||
      spec.steps?.some((s) => s.id.includes("sales") || s.label?.toLowerCase().includes("sales"));

    const isStripe =
      spec.trigger?.appId === "stripe" || spec.steps?.some((s) => s.appId === "stripe");

    let standardInput: Record<string, any>;
    let testName = "Happy Path Standard Execution";
    let testDesc = "Validates workflow execution with standard inputs.";

    if (isSalesKpi) {
      testName = "Happy Path Sales KPI Pipeline Execution";
      testDesc = "Validates daily aggregation of sales figures and executive digest synthesis.";
      standardInput = {
        total_revenue: 48500,
        total_orders: 142,
        avg_order_value: 341.5,
        date: "2026-10-31",
        managerPhone: "+1-555-0199",
      };
    } else if (isStripe) {
      testName = "Payment Failure Recovery Execution";
      testDesc = "Validates Stripe customer ingestion and urgent notification.";
      standardInput = {
        customerEmail: "alex.mercer@enterprise.com",
        amount: 14900,
        currency: "usd",
        failureReason: "card_declined",
      };
    } else {
      testName = "Invoice Extraction & Sync Execution";
      testDesc = "Validates workflow execution with standard structured invoice inputs.";
      standardInput = {
        vendor: "Acme Industrial Supplies",
        invoiceNumber: "INV-2026-9041",
        amount: 24500,
        dueDate: "2026-11-15",
        subject: "Invoice #INV-2026-9041 from Acme Industrial",
      };
    }

    // Test Case 1: Happy Path Standard Payload
    tests.push({
      id: `test_happy_${Date.now()}`,
      name: testName,
      description: testDesc,
      inputPayload: standardInput,
      expectedAssertions: spec.steps.map((s) => ({
        stepId: s.id,
        field: "status",
        operator: "equals",
        value: "SUCCESS",
      })),
    });

    // Test Case 2: High-Value Threshold Branch (if notification exists)
    const alertStep = spec.steps.find((s) => s.appId === "telegram" || s.appId === "slack" || s.appId === "whatsapp" || s.approvalCondition);
    if (alertStep) {
      const thresholdPayload = isSalesKpi
        ? {
            total_revenue: 92400,
            total_orders: 285,
            avg_order_value: 324.2,
            date: "2026-10-31",
            managerPhone: "+1-555-0199",
          }
        : isStripe
        ? {
            customerEmail: "vip.client@enterprise.com",
            amount: 85000,
            currency: "usd",
            failureReason: "expired_card",
          }
        : {
            vendor: "Global Cloud Services",
            invoiceNumber: "INV-2026-8821",
            amount: 78500, // Exceeds 50k
            dueDate: "2026-11-20",
            subject: "Invoice #INV-2026-8821 from Global Cloud Services",
          };

      tests.push({
        id: `test_threshold_${Date.now()}`,
        name: isSalesKpi ? "High-Revenue Surge Alert Trigger (> $50,000)" : "High-Value Alert Threshold Trigger (> ₹50,000)",
        description: "Validates that high volume or revenue surges trigger appropriate alerts or approval gates.",
        inputPayload: thresholdPayload,
        expectedAssertions: [
          {
            stepId: alertStep.id,
            field: "status",
            operator: "equals",
            value: "SUCCESS",
          },
        ],
      });
    }

    // Test Case 3: Missing Required Fields / Empty Data Resilience
    tests.push({
      id: `test_empty_${Date.now()}`,
      name: isSalesKpi
        ? "Zero Sales Inactive Day Handling"
        : isStripe
        ? "Missing Customer Details Resilience"
        : "Missing Fields Graceful Handling",
      description: isSalesKpi
        ? "Verifies the workflow handles zero sales days or empty query sets gracefully without unhandled exceptions."
        : isStripe
        ? "Verifies the workflow handles incomplete charge payloads without throwing unhandled errors."
        : "Verifies the workflow handles incomplete email text without unhandled exceptions.",
      inputPayload: isSalesKpi
        ? {
            total_revenue: 0,
            total_orders: 0,
            avg_order_value: 0,
            date: "2026-10-31",
            managerPhone: "+1-555-0199",
          }
        : isStripe
        ? {
            customerEmail: "unknown@example.com",
            amount: 0,
            currency: "usd",
            failureReason: "generic_decline",
          }
        : {
            vendor: "Unknown Sender",
            subject: "No attachment present",
          },
      expectedAssertions: [
        {
          stepId: spec.steps[0].id,
          field: "status",
          operator: "exists",
          value: true,
        },
      ],
    });

    return tests;
  }
}
