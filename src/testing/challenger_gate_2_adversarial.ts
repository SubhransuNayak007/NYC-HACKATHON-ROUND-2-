/**
 * challenger_gate_2_adversarial.ts
 *
 * Hardened Adversarial Stress Tests for Gate 2:
 * 1. Path Traversal & Exotic Tenant Partitioning
 * 2. Unknown Role Lockdown & Case Insensitivity Fuzzing
 * 3. Genesis Block Cryptographic Tampering
 * 4. Deep Nested Array & Multi-Token Redaction Fuzzing
 * 5. Multi-Node True/False Branching & Bridge-Removal in AST Patch Engine
 * 6. Self-referential loop rejection (edge.source === edge.target)
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { TenantGuard, ForbiddenError } from "../backend/security/TenantGuard";
import { AuditLogChainer } from "../backend/security/AuditLogChainer";
import { CredentialVault } from "../backend/credentials/CredentialVault";
import { WorkflowPatchEngine, GraphPatchOperation } from "../backend/compiler/WorkflowPatchEngine";
import { DAGValidator } from "./TestHarnessModels";

async function runAdversarialSuite() {
  console.log("\n================================================================================");
  console.log("  CHALLENGER GATE 2: Hardened Adversarial Stress Harness");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  async function test(id: string, name: string, fn: () => void | Promise<void>) {
    total++;
    process.stdout.write(`  [${id}] ${name}... `);
    try {
      await fn();
      passed++;
      console.log("PASSED");
    } catch (err: any) {
      console.log(`FAILED\n    Error: ${err.message}`);
      throw err;
    }
  }

  // 1. Path traversal / hostile tenant strings
  await test("ADV-SEC-01", "Hostile path traversal tenant strings are strictly isolated by identity comparison", () => {
    const maliciousTenant = "../../../etc/shadow";
    const realTenant = "tenant_valid";

    assert.throws(() => {
      TenantGuard.assertTenantOwnership(realTenant, maliciousTenant, "workflow", "wf_1");
    }, ForbiddenError);

    assert.throws(() => {
      TenantGuard.assertWorkspaceIsolation("ws_valid", "ws_valid/../other");
    });
  });

  // 2. Unknown role lockdown & case normalization
  await test("ADV-SEC-02", "Unknown roles or unauthorized privileges are denied by default", () => {
    const rogueRoles = ["SUPER_ADMIN", "ROOT", "GUEST", "", "NULL", "undefined", "HACKER"];
    for (const role of rogueRoles) {
      assert.equal(TenantGuard.hasPermission(role as any, "workflows.create_edit"), false);
      assert.equal(TenantGuard.hasPermission(role as any, "credentials.create_update"), false);
      assert.equal(TenantGuard.hasPermission(role as any, "workflows.deploy_production"), false);
      assert.throws(() => TenantGuard.assertPermission(role as any, "workflows.create_edit"), ForbiddenError);
    }

    // Role casing test: "viewer" vs "VIEWER" vs "Viewer"
    assert.ok(TenantGuard.hasPermission("viewer", "executions.view_logs"));
    assert.ok(TenantGuard.hasPermission("Viewer", "executions.view_logs"));
    assert.equal(TenantGuard.hasPermission("viewer", "workflows.create_edit"), false);
  });

  // 3. Genesis block tampering
  await test("ADV-SEC-03", "Tampering with Genesis Block (index 0) breaks cryptographic chain", () => {
    const chainer = new AuditLogChainer();
    chainer.recordEvent("tenant_x", "EVENT_A", { v: 1 });
    chainer.recordEvent("tenant_x", "EVENT_B", { v: 2 });

    const chain = chainer.exportChain();
    // Tamper with Genesis block hash
    chain[0].hash = crypto.createHash("sha256").update("FORGED_GENESIS_HASH").digest("hex");

    const result = chainer.verifyIntegrity();
    assert.equal(result.valid, false, "Chain must be invalid when Genesis is altered");
    assert.equal(result.tamperedIndex, 1, "Block 1 must detect broken previousHash link to genesis");
  });

  // 4. Exotic secret redaction & multi-token structures
  await test("ADV-SEC-04", "Deep array structures and multi-format tokens are 100% sanitized", () => {
    const exoticData = [
      { id: 1, headers: ["Bearer token_1111111111111111111", "Custom Header"] },
      { id: 2, keys: { primary: "sk-ant-api03-secret12345678901234567890", secondary: "xoxb-999-888-777-666" } },
      { id: 3, url: "https://api.service.com/data?apiKey=secret_api_key_query_param&normal=1" },
    ];

    const sanitized = CredentialVault.redactObject(exoticData);
    const jsonStr = JSON.stringify(sanitized);

    assert.doesNotMatch(jsonStr, /token_1111111111111111111/);
    assert.doesNotMatch(jsonStr, /secret12345678901234567890/);
    assert.doesNotMatch(jsonStr, /xoxb-999-888-777-666/);
    assert.doesNotMatch(jsonStr, /secret_api_key_query_param/);
    assert.match(jsonStr, /REDACTED/);
  });

  // 5. Multi-node branching and bridging in AST Patch Engine
  await test("ADV-SEC-05", "AST Patch Engine handles sequential multi-nodes in branches and bridge removal", () => {
    const workflow = {
      id: "wf_complex_patch",
      version: 1,
      nodes: [
        { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 } },
        { id: "middle", type: "action", label: "Middle Step", position: { x: 200, y: 0 } },
        { id: "end", type: "action", label: "End Step", position: { x: 400, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "middle" },
        { id: "e2", source: "middle", target: "end" },
      ],
    };

    // Remove middle node with bridge
    const removePatch: GraphPatchOperation[] = [
      {
        op: "REMOVE_NODE",
        nodeId: "middle",
        reconnectStrategy: "bridge",
      },
    ];

    const bridgedFlow = WorkflowPatchEngine.applyPatch(workflow, removePatch);
    assert.equal(bridgedFlow.nodes.length, 2);
    assert.equal(bridgedFlow.edges.length, 1);
    assert.equal(bridgedFlow.edges[0].source, "start");
    assert.equal(bridgedFlow.edges[0].target, "end");

    // Add multi-node branch
    const branchPatch: GraphPatchOperation[] = [
      {
        op: "INSERT_BRANCH",
        splitAfterNodeId: "start",
        conditionNode: { id: "cond_check", expression: "{{ $json.isVip }}" },
        trueBranchNodes: [
          { id: "vip_step_1", type: "action", label: "VIP Step 1" },
          { id: "vip_step_2", type: "action", label: "VIP Step 2" },
        ],
        falseBranchNodes: [],
      },
    ];

    const branchedFlow = WorkflowPatchEngine.applyPatch(bridgedFlow, branchPatch);
    assert.equal(branchedFlow.nodes.length, 5); // start, end, cond_check, vip_step_1, vip_step_2
    const val = DAGValidator.validate(branchedFlow.nodes, branchedFlow.edges);
    assert.ok(val.valid, "Branched flow must be strictly acyclic DAG");
  });

  // 6. Self-referential loop rejection
  await test("ADV-SEC-06", "Self-referential edge (edge.source === edge.target) is detected and rejected", () => {
    const selfLoopFlow = {
      id: "wf_self_loop",
      version: 1,
      nodes: [
        { id: "loop_node", type: "action", label: "Self Loop" },
      ],
      edges: [
        { id: "e_self", source: "loop_node", target: "loop_node" },
      ],
    };

    assert.throws(
      () => WorkflowPatchEngine.validateAcyclicDAG(selfLoopFlow),
      /Self-referential cyclic edge detected on node: 'loop_node'/
    );
  });

  console.log("\n================================================================================");
  console.log(`  ADVERSARIAL STRESS SUITE: ${passed}/${total} PASSED (100%)`);
  console.log("================================================================================\n");
}

runAdversarialSuite().catch((err) => {
  console.error("Adversarial suite failure:", err);
  process.exit(1);
});
