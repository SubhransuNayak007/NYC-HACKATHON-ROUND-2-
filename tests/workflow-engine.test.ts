/**
 * Unit & Integration Tests: DAG Workflow Engine & Node Registry
 */

import { NodeRegistry } from "../src/backend/workflows/NodeRegistry";
import { WorkflowEngine, WorkflowDefinition } from "../src/backend/workflows/WorkflowEngine";
import { EventNormalizer } from "../src/backend/events/EventNormalizer";

async function runTests() {
  console.log("▶ Running WorkflowEngine Test Suite...");

  // 1. Test Node Registry Registration
  const triggerDef = NodeRegistry.get("trigger.event");
  if (!triggerDef) throw new Error("FAIL: trigger.event node not registered");
  const conditionDef = NodeRegistry.get("logic.condition");
  if (!conditionDef) throw new Error("FAIL: logic.condition node not registered");
  console.log("✓ NodeRegistry registered built-in nodes successfully.");

  // 2. Test DAG Graph Validation - Valid Linear Graph
  const validWorkflow: WorkflowDefinition = {
    id: "wf_test_valid",
    tenantId: "test_tenant",
    workspaceId: "ws_test",
    name: "VIP Comment Responder",
    status: "PUBLISHED",
    version: 1,
    nodes: [
      { id: "n1", type: "trigger.event", label: "Inbound Comment", config: { platform: "all" } },
      { id: "n2", type: "logic.condition", label: "Check VIP Keyword", config: { operator: "contains", value: "PRICE" } },
      { id: "n3", type: "action.dispatch_reply", label: "Send Reply", config: { templateText: "Here is the VIP pricing!" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3", sourceHandle: "true" },
    ],
    createdBy: "tester@quickreply.ai",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validRes = WorkflowEngine.validateGraph(validWorkflow);
  if (!validRes.isValid) throw new Error(`FAIL: Valid workflow failed validation: ${validRes.errors.join(", ")}`);
  console.log("✓ Valid DAG graph passes validation.");

  // 3. Test DAG Graph Validation - Cycle Detection
  const cyclicWorkflow: WorkflowDefinition = {
    ...validWorkflow,
    id: "wf_test_cycle",
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n1" }, // Cycle!
    ],
  };

  const cycleRes = WorkflowEngine.validateGraph(cyclicWorkflow);
  if (cycleRes.isValid) throw new Error("FAIL: Cyclic graph was incorrectly marked valid!");
  console.log("✓ Illegal cycle correctly detected and rejected.");

  // 4. Test End-to-End Workflow Execution
  const normalizedEvent = EventNormalizer.fromYouTubeComment({
    tenantId: "test_tenant",
    workspaceId: "ws_test",
    commentId: "c_test_99",
    author: "Alex Morgan",
    text: "Can you send the PRICE for Enterprise plan?",
    videoId: "vid_101",
    channelId: "chan_202",
  });

  const execution = await WorkflowEngine.execute(validWorkflow, normalizedEvent);
  if (execution.status !== "COMPLETED") {
    throw new Error(`FAIL: Execution ended with status: ${execution.status} (error: ${execution.error})`);
  }
  if (execution.steps.length !== 3) {
    throw new Error(`FAIL: Expected 3 steps executed, got ${execution.steps.length}`);
  }
  console.log("✓ End-to-end DAG execution succeeded with COMPLETED state.");
  console.log("🎉 All WorkflowEngine tests passed!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
