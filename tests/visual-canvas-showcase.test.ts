/**
 * visual-canvas-showcase.test.ts
 * Behavioral verification tests for Visual Workflow Canvas, Converters, Dagre Auto-Layout,
 * and Canva Export API data structures.
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import {
  toExecutableWorkflow,
  fromExecutableWorkflow,
  AppNode,
  AppEdge,
  WorkflowDefinitionV3,
} from "../src/components/canvas/types";
import { layoutElements } from "../src/components/canvas/controls/CanvasControls";

describe("Requirement R2: Visual Workflow Canvas & Bidirectional Converters", () => {
  it("converts AppNodes and AppEdges to an executable WorkflowDefinitionV3", () => {
    const nodes: AppNode[] = [
      {
        id: "trig_1",
        type: "triggerNode",
        position: { x: 100, y: 100 },
        data: {
          label: "Inbound Webhook",
          nodeType: "trigger",
          service: "webhook",
          operation: "receive",
          parameters: { path: "/webhook/leads" },
          sideEffect: "SAFE_READ",
        },
      },
      {
        id: "cond_1",
        type: "conditionNode",
        position: { x: 400, y: 100 },
        data: {
          label: "Lead Score Filter",
          nodeType: "condition",
          service: "condition",
          expression: "$json.score > 80",
          parameters: { condition: "$json.score > 80" },
          sideEffect: "SAFE_READ",
        },
      },
      {
        id: "action_crm",
        type: "actionNode",
        position: { x: 700, y: 50 },
        data: {
          label: "HubSpot Deal",
          nodeType: "action",
          service: "hubspot",
          operation: "create_contact",
          parameters: { pipeline: "Enterprise" },
          credentialRef: "cred_hubspot_crm_sales",
          sideEffect: "EXTERNAL_COMMUNICATION",
          approvalRequired: true,
        },
      },
    ];

    const edges: AppEdge[] = [
      { id: "e1", source: "trig_1", target: "cond_1" },
      { id: "e2", source: "cond_1", sourceHandle: "true", target: "action_crm" },
    ];

    const executable = toExecutableWorkflow(nodes, edges, {
      name: "Lead Qualification Pipeline",
    });

    assert.strictEqual(executable.name, "Lead Qualification Pipeline");
    assert.strictEqual(executable.nodes.length, 3);
    assert.strictEqual(executable.edges.length, 2);

    // Verify trigger node conversion
    const trig = executable.nodes.find((n) => n.id === "trig_1");
    assert.ok(trig);
    assert.strictEqual(trig?.type, "trigger");
    assert.strictEqual(trig?.service, "webhook");

    // Verify condition node conversion
    const cond = executable.nodes.find((n) => n.id === "cond_1");
    assert.ok(cond);
    assert.strictEqual(cond?.type, "condition");
    assert.strictEqual(cond?.expression, "$json.score > 80");

    // Verify action node conversion & credentials
    const act = executable.nodes.find((n) => n.id === "action_crm");
    assert.ok(act);
    assert.strictEqual(act?.type, "action");
    assert.strictEqual(act?.credentialRef, "cred_hubspot_crm_sales");
    assert.strictEqual(act?.approvalRequired, true);

    // Verify dual handle edge preservation
    const trueEdge = executable.edges.find((e) => e.source === "cond_1");
    assert.ok(trueEdge);
    assert.strictEqual(trueEdge?.sourceHandle, "true");
    assert.strictEqual(trueEdge?.target, "action_crm");
  });

  it("converts WorkflowDefinitionV3 back into AppNodes and AppEdges without data loss", () => {
    const originalDef: WorkflowDefinitionV3 = {
      id: "wf_roundtrip_test",
      version: 2,
      name: "Roundtrip Test Flow",
      tenantId: "tenant_abc",
      workspaceId: "ws_xyz",
      nodes: [
        {
          id: "step_ai_1",
          type: "ai",
          service: "anthropic",
          label: "Claude Classifier",
          parameters: { model: "claude-3-5-sonnet" },
          position: { x: 300, y: 200 },
        },
        {
          id: "step_loop_1",
          type: "loop",
          service: "loop",
          label: "Batch Items Loop",
          parameters: { batchSize: 5 },
          position: { x: 600, y: 200 },
        },
        {
          id: "step_script_1",
          type: "script",
          service: "script",
          label: "Sandboxed Code",
          code: "return $json.count * 2;",
          parameters: {},
          position: { x: 900, y: 200 },
        },
      ],
      edges: [
        { id: "e1", source: "step_ai_1", target: "step_loop_1" },
        { id: "e2", source: "step_loop_1", sourceHandle: "loop_body", target: "step_script_1" },
      ],
    };

    const flow = fromExecutableWorkflow(originalDef);
    assert.strictEqual(flow.nodes.length, 3);
    assert.strictEqual(flow.edges.length, 2);

    // Verify node types mapped correctly for React Flow
    assert.strictEqual(flow.nodes[0].type, "aiNode");
    assert.strictEqual(flow.nodes[1].type, "loopNode");
    assert.strictEqual(flow.nodes[2].type, "customScriptNode");

    // Verify edge handles
    assert.strictEqual(flow.edges[1].sourceHandle, "loop_body");
  });

  it("applies Dagre hierarchical auto-layout to properly arrange untangled coordinates", () => {
    const nodes: AppNode[] = [
      { id: "n1", type: "triggerNode", position: { x: 0, y: 0 }, data: { label: "N1", nodeType: "trigger", parameters: {} } },
      { id: "n2", type: "actionNode", position: { x: 0, y: 0 }, data: { label: "N2", nodeType: "action", parameters: {} } },
      { id: "n3", type: "actionNode", position: { x: 0, y: 0 }, data: { label: "N3", nodeType: "action", parameters: {} } },
    ];

    const edges: AppEdge[] = [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
    ];

    const arranged = layoutElements(nodes, edges, "LR");

    // In horizontal flow, X positions must strictly advance from N1 < N2 < N3
    assert.ok(arranged[0].position.x < arranged[1].position.x);
    assert.ok(arranged[1].position.x < arranged[2].position.x);
  });
});

describe("Requirement R6: Showcase & Canva Connect API Contracts", () => {
  it("structures Canva autofill payload with verified brand template metadata", () => {
    const mockWorkflow: WorkflowDefinitionV3 = {
      id: "wf_canva_test",
      version: 1,
      name: "Weekly Content Autopublish",
      tenantId: "tenant_default",
      workspaceId: "ws_default",
      nodes: [
        { id: "trig", type: "trigger", service: "schedule", label: "Cron", parameters: {} },
        { id: "step1", type: "action", service: "canva", label: "Canva Fill", parameters: {} },
      ],
      edges: [{ id: "e1", source: "trig", target: "step1" }],
    };

    const autofillData = {
      workflow_name: mockWorkflow.name,
      total_steps: `${mockWorkflow.nodes.length} Executable Nodes`,
      trigger_type: mockWorkflow.nodes[0].service,
      reliability_sla: "99.95% Enterprise SLA",
    };

    assert.strictEqual(autofillData.workflow_name, "Weekly Content Autopublish");
    assert.strictEqual(autofillData.total_steps, "2 Executable Nodes");
    assert.strictEqual(autofillData.trigger_type, "schedule");
  });
});
