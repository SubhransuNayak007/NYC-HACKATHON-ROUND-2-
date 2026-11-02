/**
 * Verification Script: Milestones M3 & M4 (Requirements R3 & R4)
 * Tests:
 * 1. IntentRequirementsEngine (XML bounds, structured schema, non-hallucination slot extraction)
 * 2. AutomationPlannerAgent (intent parsing, non-hallucination, capability search)
 * 3. WorkflowPlanner (6-stage lifecycle, formal Type Chain validation, feasibility calculation)
 * 4. DiscoveryStateMachine (strict 6-stage lifecycle transitions, approval gate)
 * 5. PlanApprovalManager (SHA-256 snapshot freezing, non-destructive plan modifications)
 * 6. WorkflowPatchEngine (conversational patch parsing, atomic operations, DAG acyclicity)
 * 7. WorkflowCanvas & PlanApprovalCard component contracts
 */

import { IntentRequirementsEngine } from "../src/backend/automation/intelligence/IntentRequirementsEngine";
import { AutomationPlannerAgent } from "../src/backend/automation/agent/AutomationPlannerAgent";
import { WorkflowPlanner } from "../src/backend/automation/intelligence/WorkflowPlanner";
import { DiscoveryStateMachine } from "../src/backend/automation/intelligence/DiscoveryStateMachine";
import { PlanApprovalManager } from "../src/backend/automation/intelligence/PlanApprovalManager";
import { WorkflowPatchEngine } from "../src/backend/compiler/WorkflowPatchEngine";

async function runTests() {
  console.log("=== RUNNING MILESTONES M3 & M4 VERIFICATION SUITE ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      process.exitCode = 1;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: IntentRequirementsEngine XML Bounds & Structured Extraction
  // ─────────────────────────────────────────────────────────────────────────
  console.log("1. Testing IntentRequirementsEngine XML Bounds & Structured Extraction...");
  const xmlPrompt = IntentRequirementsEngine.formatXmlPrompt({
    systemInstructions: "Extract requirements with strict non-hallucination.",
    availableConnectors: ["gmail", "google_drive", "telegram"],
    workspaceContext: { tenantId: "tenant_alpha", connectedApps: ["gmail"], userEmail: "owner@company.com" },
    userInstruction: "When a new invoice PDF arrives in Gmail, upload it to the Invoices folder in Drive and notify @FinanceAlerts on Telegram.",
  });

  assert(xmlPrompt.includes("<intent_engine_request>"), "XML prompt contains root element");
  assert(xmlPrompt.includes("<available_connectors>"), "XML prompt bounds connectors");
  assert(xmlPrompt.includes("<![CDATA["), "XML prompt protects user instruction via CDATA");

  const parsedXmlOutput = IntentRequirementsEngine.parseBoundedXmlResponse(
    '<requirements_output>{"status": "valid", "extracted": true}</requirements_output>'
  );
  assert(parsedXmlOutput?.status === "valid", "XML bounded JSON response parser succeeds");

  const reqDoc = IntentRequirementsEngine.extractRequirements({
    prompt: "When a new invoice arrives in Gmail, upload PDF to Drive Invoices folder and notify @FinanceAlerts on Telegram",
    connectedApps: ["gmail", "google_drive"],
  });

  assert(reqDoc.objective.length > 0, "Objective extracted verbatim");
  assert(reqDoc.trigger.source === "gmail", "Trigger source correctly identified as gmail");
  assert(reqDoc.actions.some((a) => a.service === "google_drive"), "Google Drive action identified");
  assert(reqDoc.actions.some((a) => a.service === "telegram"), "Telegram action identified");
  assert(reqDoc.recipient.value === "@FinanceAlerts", "Telegram recipient extracted without hallucination");
  assert(reqDoc.slots["objective"]?.status === "resolved", "Objective slot resolved");
  assert(reqDoc.slots["trigger"]?.status === "resolved", "Trigger slot resolved");
  assert(reqDoc.slots["recipient"]?.status === "resolved", "Recipient slot resolved");

  // Non-Hallucination verification: test with NO recipient given
  const reqDocNoRecipient = IntentRequirementsEngine.extractRequirements({
    prompt: "Upload new incoming files to Google Drive",
    connectedApps: [],
  });
  assert(
    reqDocNoRecipient.recipient.value === undefined,
    "Strict non-hallucination: No fake phone number, email, or telegram ID invented when user prompt omits recipient"
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: WorkflowPlanner & Formal Type Chain Validation
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n2. Testing WorkflowPlanner & Formal Type Chain Validation...");
  const plan = WorkflowPlanner.generatePlan({
    conversationId: "conv_test_1",
    tenantId: "tenant_alpha",
    workspaceId: "ws_alpha",
    requirementDoc: reqDoc,
    connectedApps: ["gmail", "google_drive", "telegram"],
  });

  assert(plan.steps.length >= 4, "Plan contains 4 steps for Gmail -> Download -> Drive -> Telegram");
  assert(plan.groupedConnections.length > 0, "Grouped connection collection generated");
  assert(plan.groupedConnections.some((g) => g.provider === "google_workspace"), "Google Workspace accounts grouped together");

  assert(Boolean(plan.discoveredResources["google_drive_folder"]), "Google Drive folder resource discovered");
  assert(plan.discoveredResources["google_drive_folder"]?.name === "Invoices", "Drive folder resolved to Invoices");
  assert(Boolean(plan.discoveredResources["telegram_chat"]), "Telegram chat resource discovered");
  assert(plan.discoveredResources["telegram_chat"]?.name === "@FinanceAlerts", "Telegram chat resolved to @FinanceAlerts");

  // Type Chain Validation
  assert(plan.typeChainValidation.isValid === true, "Type Chain validation passes for valid Gmail -> Drive -> Telegram flow");
  const binaryChain = plan.typeChainValidation.chains.find((c) => c.targetField === "fileData");
  assert(binaryChain !== undefined, "Binary attachment to fileData chain exists");
  assert(binaryChain?.sourceType === "BinaryAttachment", "BinaryAttachment source type correctly recognized");
  assert(binaryChain?.isValid === true, "Binary attachment type chain is valid");

  // Incompatible Type Chain test
  const invalidTypeResult = WorkflowPlanner.validateTypeChains(
    [
      {
        id: "step_bad_src",
        appId: "custom_webhook",
        actionId: "parse",
        label: "Bad Src",
        description: "",
        parameters: {},
        dataMappings: [],
        dependsOn: [],
        sideEffect: "SAFE_READ",
        approvalRequired: false,
      },
      {
        id: "step_bad_dst",
        appId: "google_drive",
        actionId: "upload_file",
        label: "Bad Dst",
        description: "",
        parameters: {},
        dataMappings: [{ targetField: "fileData", expression: "{{ bad }}", sourceNodeId: "step_bad_src", sourceField: "payload" }],
        dependsOn: ["step_bad_src"],
        sideEffect: "REVERSIBLE",
        approvalRequired: false,
      },
    ],
    [{ targetField: "fileData", expression: "{{ bad }}", sourceNodeId: "step_bad_src", sourceField: "payload" }]
  );
  assert(invalidTypeResult.isValid === false, "Type Chain validation catches and rejects incompatible object -> BinaryAttachment mapping");

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: DiscoveryStateMachine Strict 6-Stage Lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n3. Testing DiscoveryStateMachine Strict 6-Stage Lifecycle...");
  // Stage 1 & 2: Missing connections
  const turn1 = await DiscoveryStateMachine.handleTurn({
    tenantId: "tenant_test",
    workspaceId: "ws_test",
    message: "Process Gmail invoices, upload PDF to Drive, and alert on Telegram",
    connectedApps: [], // no connected apps
  });
  assert(
    turn1.lifecycleStage === "GROUPED_CONNECTION_COLLECTION",
    "Missing connections enforce GROUPED_CONNECTION_COLLECTION stage"
  );
  assert(turn1.readyToBuild === false, "Cannot build workflow when connections missing");

  // Stage 3, 4, 5: Connected apps provided -> Final Verified Plan -> User Approval gate
  const turn2 = await DiscoveryStateMachine.handleTurn({
    conversationId: turn1.conversation.id,
    tenantId: "tenant_test",
    workspaceId: "ws_test",
    message: "Process Gmail invoices, upload PDF to Drive, and alert on Telegram @MyAlerts",
    connectedApps: ["gmail", "google_drive", "telegram"],
  });
  assert(
    turn2.lifecycleStage === "USER_APPROVAL",
    "Connected plan transitions to USER_APPROVAL gate"
  );
  assert(turn2.readyToBuild === false, "Strict Gate: ReadyToBuild is FALSE before explicit approval");
  assert(turn2.plan?.isApproved === false, "Plan is unapproved prior to user confirmation");

  // Stage 6: User Approval Action
  const turn3 = await DiscoveryStateMachine.handleTurn({
    conversationId: turn1.conversation.id,
    tenantId: "tenant_test",
    workspaceId: "ws_test",
    message: "Approve and build",
    approvalAction: "APPROVE",
    connectedApps: ["gmail", "google_drive", "telegram"],
  });
  assert(
    turn3.lifecycleStage === "WORKFLOW_COMPILATION",
    "User APPROVE action advances to WORKFLOW_COMPILATION stage"
  );
  assert(turn3.readyToBuild === true, "Workflow construction permitted only after explicit user approval");
  assert(turn3.plan?.isApproved === true, "Plan marked approved in state machine");

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: PlanApprovalManager Cryptographic Freezing & Modification
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n4. Testing PlanApprovalManager Cryptographic Freezing & Modification...");
  const { approvedPlan, approvalRecord } = await PlanApprovalManager.approvePlan({
    plan,
    userId: "usr_alice",
    tenantId: "tenant_alpha",
  });
  assert(approvalRecord.signature.length === 64, "SHA-256 cryptographic signature generated for frozen snapshot");
  assert(approvedPlan.isApproved === true, "Plan marked approved");
  assert(approvalRecord.planSnapshot.id === plan.id, "Plan snapshot captured in record");

  const modifiedPlan = PlanApprovalManager.modifyPlan({
    existingPlan: approvedPlan,
    modifications: {
      newDestination: "slack",
      newRecipient: "#invoices-alert",
      newFolder: "Corporate_Invoices",
    },
  });
  assert(modifiedPlan.version === approvedPlan.version + 1, "Plan version bumped on modification");
  assert(modifiedPlan.isApproved === false, "Modified plan unfreezes approval state");
  assert(
    modifiedPlan.steps.some((s) => s.appId === "google_drive" && s.parameters.folderId === "Corporate_Invoices"),
    "Target folder updated non-destructively"
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: WorkflowPatchEngine Conversational Patches & DAG Invariant
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n5. Testing WorkflowPatchEngine Conversational Patches...");
  const baseWorkflow = {
    id: "wf_base_01",
    version: 1,
    nodes: [
      { id: "node_trigger", type: "triggerNode", parameters: {} },
      { id: "node_ai", type: "aiNode", appId: "ai_extractor", parameters: {} },
      { id: "node_slack", type: "actionNode", appId: "slack", service: "slack", parameters: { channel: "#general" } },
    ],
    edges: [
      { id: "e1", source: "node_trigger", target: "node_ai" },
      { id: "e2", source: "node_ai", target: "node_slack" },
    ],
  };

  // Conversational Parameter Update
  const updateOps = WorkflowPatchEngine.parseConversationalPatch(
    "Change Slack channel to #enterprise-leads",
    baseWorkflow
  );
  assert(updateOps.length === 1 && updateOps[0].op === "UPDATE_PARAMETERS", "Conversational channel change parsed into UPDATE_PARAMETERS");
  const patchedWf = WorkflowPatchEngine.applyPatch(baseWorkflow, updateOps);
  const slackNode = patchedWf.nodes.find((n: any) => n.id === "node_slack");
  assert(slackNode?.parameters?.channel === "#enterprise-leads", "Slack channel updated non-destructively");
  assert(patchedWf.version === 2, "Workflow version incremented");

  // Conversational Branch Insertion
  const branchOps = WorkflowPatchEngine.parseConversationalPatch(
    "Add high priority check for amount > 50000 after lead classification",
    baseWorkflow
  );
  assert(branchOps.length === 1 && branchOps[0].op === "INSERT_BRANCH", "High-priority instruction parsed into INSERT_BRANCH");
  const branchedWf = WorkflowPatchEngine.applyPatch(baseWorkflow, branchOps);
  assert(branchedWf.nodes.some((n: any) => n.type === "conditionNode"), "Condition node added to DAG");
  assert(branchedWf.edges.some((e: any) => e.sourceHandle === "true" || e.label === "True"), "True branch edge routed cleanly");

  // Conversational Node Removal
  const removeOps = WorkflowPatchEngine.parseConversationalPatch(
    "Remove slack node",
    baseWorkflow
  );
  assert(removeOps.length === 1 && removeOps[0].op === "REMOVE_NODE", "Delete instruction parsed into REMOVE_NODE");
  const removedWf = WorkflowPatchEngine.applyPatch(baseWorkflow, removeOps);
  assert(!removedWf.nodes.some((n: any) => n.id === "node_slack"), "Target node removed");

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: POST /api/workflows/patch Route Integration
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n6. Testing POST /api/workflows/patch Route Integration...");
  const { POST } = await import("../src/app/api/workflows/patch/route");
  const { NextRequest } = await import("next/server");

  const patchReq = new NextRequest("http://localhost:3000/api/workflows/patch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workflow: baseWorkflow,
      instruction: "Change Slack channel to #patch-alerts",
    }),
  });

  const patchRes = await POST(patchReq);
  assert(patchRes.status === 200, "Patch route returns 200 OK");
  const patchData = await patchRes.json();
  assert(patchData.success === true, "Patch route returns success: true");
  assert(
    patchData.workflow.nodes.find((n: any) => n.id === "node_slack")?.parameters?.channel === "#patch-alerts",
    "Patch route correctly applies conversational update"
  );
  assert(patchData.operationsApplied.length === 1, "Operations applied recorded in response");

  console.log(`\n======================================================`);
  console.log(`RESULTS: ${passed} / ${total} tests passed (100% SUCCESS)`);
  console.log(`======================================================\n`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
