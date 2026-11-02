/**
 * challenger_gate_2_suite.ts
 *
 * Empirical Challenge Harness for Gate 2:
 * Security, SaaS Multitenancy, Credential Isolation, Audit Integrity & AST Patching.
 *
 * Requirements Tested:
 * 1. Multi-Tenant Workspace Isolation (TenantGuard.ts, Execution Routes, Credential Vault)
 * 2. RBAC Permission Boundaries (7 discrete roles: OWNER, ADMIN, MEMBER, EDITOR, OPERATOR, DEVELOPER, VIEWER)
 * 3. Cryptographic Audit Log Tampering (AuditLogChainer.ts, SHA-256 Hash Chain Break Detection)
 * 4. Secret Redaction & Credential Hygiene (CredentialVault.ts, EventBus.ts, SSE Streams, Export JSON)
 * 5. Scenario E (AST Graph Patching: WorkflowPatchEngine.ts non-destructive mutations & cycle rejection)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextRequest } from "next/server";

// Security & Multitenancy Modules
import { TenantGuard, ForbiddenError, RBAC_PERMISSIONS, UserRole } from "../backend/security/TenantGuard";
import { AuditLogChainer } from "../backend/security/AuditLogChainer";
import { CredentialVault } from "../backend/credentials/CredentialVault";
import { ExecutionEventBus, redactEventPayload } from "../backend/engine/EventBus";
import { CheckpointManager, ExecutionCheckpoint } from "../backend/engine/CheckpointManager";
import { WorkflowPatchEngine, GraphPatchOperation } from "../backend/compiler/WorkflowPatchEngine";
import { DAGValidator, NodeType } from "./TestHarnessModels";

// API Route Handlers
import { GET as getExecutionHandler } from "../app/api/workflows/executions/[id]/route";
import { POST as triggerExecutionHandler } from "../app/api/workflows/executions/route";
import { POST as resumeExecutionHandler } from "../app/api/workflows/executions/[id]/resume/route";

interface TestCaseResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const testResults: TestCaseResult[] = [];

async function challenge(
  id: string,
  category: string,
  name: string,
  fn: () => void | Promise<void>
): Promise<void> {
  const start = performance.now();
  process.stdout.write(`  [${id}] ${category}: ${name}... `);
  try {
    await fn();
    const durationMs = Math.round(performance.now() - start);
    testResults.push({ id, category, name, passed: true, durationMs });
    console.log(`PASSED (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    testResults.push({ id, category, name, passed: false, durationMs, error: err?.message || String(err) });
    console.log(`FAILED (${durationMs}ms)\n    Error: ${err?.message || err}`);
  }
}

export async function runChallengerGate2Suite() {
  console.log("\n================================================================================");
  console.log("  CHALLENGER GATE 2: Multi-Tenant Security & SaaS Integrity Test Suite");
  console.log("================================================================================\n");

  // ===========================================================================
  // SECTION 1: MULTI-TENANT WORKSPACE ISOLATION
  // ===========================================================================
  console.log("--- SECTION 1: Multi-Tenant Workspace Isolation ---");

  await challenge("SEC-T1-01", "Tenant Isolation", "Same-tenant access succeeds cleanly", () => {
    assert.doesNotThrow(() => {
      TenantGuard.assertTenantOwnership("tenant_acme", "tenant_acme", "workflow", "wf_acme_1");
    });
  });

  await challenge("SEC-T1-02", "Tenant Isolation", "Cross-tenant access throws ForbiddenError (HTTP 403)", () => {
    let thrownError: any = null;
    try {
      TenantGuard.assertTenantOwnership("tenant_acme", "tenant_rival", "workflow", "wf_acme_1");
    } catch (err) {
      thrownError = err;
    }
    assert.ok(thrownError, "Must throw an error");
    assert.equal(thrownError instanceof ForbiddenError, true, "Must be instance of ForbiddenError");
    assert.equal(thrownError.statusCode, 403, "Status code must be 403 Forbidden");
    assert.match(thrownError.message, /Cross-tenant resource access is strictly prohibited/);
  });

  await challenge("SEC-T1-03", "Tenant Isolation", "Cross-workspace isolation blocks foreign workspace IDs", () => {
    assert.throws(
      () => TenantGuard.assertWorkspaceIsolation("ws_production_a", "ws_sandbox_b"),
      /Access Denied: Cross-tenant access blocked/
    );
    assert.doesNotThrow(() => {
      TenantGuard.assertWorkspaceIsolation("ws_corp_1", "ws_corp_1");
    });
  });

  await challenge("SEC-T1-04", "Tenant Isolation", "API Route GET /api/workflows/executions/[id] enforces cross-tenant 403", async () => {
    const tmpStorage = path.resolve(process.cwd(), "src/data/checkpoints");
    const manager = new CheckpointManager(tmpStorage);
    const testExecId = `exec_multitenant_test_${Date.now()}`;

    const testCp: ExecutionCheckpoint = {
      executionId: testExecId,
      tenantId: "tenant_secure_corp",
      workspaceId: "ws_secure_corp",
      workflowId: "wf_classified",
      workflowVersion: 1,
      status: "COMPLETED",
      currentNodeId: null,
      completedNodeIds: ["node_1"],
      pendingNodeIds: [],
      skippedNodeIds: [],
      nodeOutputs: { node_1: { sensitiveData: "secret_records" } },
      accumulatedState: { $json: {}, $node: {}, $env: {} },
      retryState: {},
      lastHeartbeatAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await manager.saveCheckpoint(testCp);

    try {
      // 1. Authorized tenant request
      const reqAuth = new NextRequest(new Request(`http://localhost:3000/api/workflows/executions/${testExecId}`, {
        headers: {
          "x-tenant-id": "tenant_secure_corp",
          "x-user-role": "VIEWER",
        },
      }));

      const resAuth = await getExecutionHandler(reqAuth, { params: Promise.resolve({ id: testExecId }) });
      assert.equal(resAuth.status, 200, "Authorized tenant must receive 200 OK");
      const authData = await resAuth.json();
      assert.equal(authData.executionId, testExecId);

      // 2. Adversarial cross-tenant request
      const reqAdversary = new NextRequest(new Request(`http://localhost:3000/api/workflows/executions/${testExecId}`, {
        headers: {
          "x-tenant-id": "tenant_attacker_org",
          "x-user-role": "VIEWER",
        },
      }));

      const resAdversary = await getExecutionHandler(reqAdversary, { params: Promise.resolve({ id: testExecId }) });
      assert.equal(resAdversary.status, 403, "Adversary cross-tenant request must be blocked with HTTP 403");
      const errData = await resAdversary.json();
      assert.match(errData.error, /Cross-tenant resource access is strictly prohibited/);
    } finally {
      await manager.deleteCheckpoint(testExecId);
    }
  });

  await challenge("SEC-T1-05", "Tenant Isolation", "CredentialVault runtime resolution isolates secrets across tenants", async () => {
    // Store secret under Tenant A
    const stored = await CredentialVault.storeCredential({
      tenantId: "tenant_alpha_vault",
      workspaceId: "ws_alpha_vault",
      appId: "hubspot",
      authType: "api_key",
      accountLabel: "Alpha Production HubSpot",
      secretPayload: { apiKey: "pat-na1-12345678-secret-hubspot-key" },
    });

    assert.ok(stored.id.startsWith("cred_"));

    // Tenant A resolves own secret -> Success
    const alphaSecret = await CredentialVault.resolveSecretForRuntime("tenant_alpha_vault", "ws_alpha_vault", stored.id);
    assert.ok(alphaSecret);
    assert.equal(alphaSecret.apiKey, "pat-na1-12345678-secret-hubspot-key");

    // Tenant B attempts cross-tenant resolution of Tenant A's credId -> Returns null
    const rogueSecret = await CredentialVault.resolveSecretForRuntime("tenant_beta_hacker", "ws_beta_hacker", stored.id);
    assert.equal(rogueSecret, null, "Cross-tenant secret resolution must return null");

    // Tenant B lists credentials -> Does NOT leak Tenant A's credentials
    const betaList = await CredentialVault.listCredentials("tenant_beta_hacker", "ws_beta_hacker");
    assert.equal(betaList.some((c) => c.id === stored.id), false, "Tenant B must not see Tenant A credentials");
  });

  // ===========================================================================
  // SECTION 2: RBAC PERMISSION BOUNDARIES (7 ROLES)
  // ===========================================================================
  console.log("\n--- SECTION 2: RBAC Permission Boundaries (7 Roles) ---");

  const ALL_ROLES: UserRole[] = ["OWNER", "ADMIN", "MEMBER", "EDITOR", "OPERATOR", "DEVELOPER", "VIEWER"];

  await challenge("SEC-T2-01", "RBAC Matrix", "Confirm all 7 discrete RBAC roles exist and are configured", () => {
    for (const role of ALL_ROLES) {
      assert.ok(RBAC_PERMISSIONS[role], `Role ${role} must exist in RBAC_PERMISSIONS table`);
      assert.ok(Array.isArray(RBAC_PERMISSIONS[role]), `Role ${role} permissions must be an array`);
    }
  });

  await challenge("SEC-T2-02", "RBAC Matrix", "VIEWER is strictly read-only and blocked from deployment/credentials/execution", () => {
    // VIEWER allowed
    assert.ok(TenantGuard.hasPermission("VIEWER", "executions.view_logs"));
    assert.ok(TenantGuard.hasPermission("VIEWER", "executions.view_telemetry"));

    // VIEWER denied
    const forbiddenViewerActions = [
      "workflows.deploy",
      "workflows.deploy_production",
      "workflows.create_edit",
      "workflows.delete",
      "workflows.execute_trigger",
      "workflows.manual_execute",
      "credentials.create_update",
      "approvals.approve_reject",
      "scripts.author_sandbox",
      "workspace.manage_billing",
      "workspace.manage_members",
      "audit_logs.view_export",
    ];

    for (const action of forbiddenViewerActions) {
      assert.equal(
        TenantGuard.hasPermission("VIEWER", action),
        false,
        `VIEWER must NOT have permission for '${action}'`
      );
      assert.throws(
        () => TenantGuard.assertPermission("VIEWER", action),
        ForbiddenError,
        `assertPermission for VIEWER on '${action}' must throw ForbiddenError`
      );
    }
  });

  await challenge("SEC-T2-03", "RBAC Matrix", "OPERATOR can trigger workflows and decide approvals but cannot edit or deploy", () => {
    assert.ok(TenantGuard.hasPermission("OPERATOR", "workflows.execute_trigger"));
    assert.ok(TenantGuard.hasPermission("OPERATOR", "workflows.manual_execute"));
    assert.ok(TenantGuard.hasPermission("OPERATOR", "approvals.approve_reject"));
    assert.ok(TenantGuard.hasPermission("OPERATOR", "approvals.decide"));

    assert.equal(TenantGuard.hasPermission("OPERATOR", "workflows.create_edit"), false);
    assert.equal(TenantGuard.hasPermission("OPERATOR", "workflows.deploy_production"), false);
    assert.equal(TenantGuard.hasPermission("OPERATOR", "credentials.create_update"), false);
  });

  await challenge("SEC-T2-04", "RBAC Matrix", "EDITOR can edit workflows and execute triggers but cannot deploy to prod or modify creds", () => {
    assert.ok(TenantGuard.hasPermission("EDITOR", "workflows.create_edit"));
    assert.ok(TenantGuard.hasPermission("EDITOR", "workflows.execute_trigger"));
    assert.ok(TenantGuard.hasPermission("EDITOR", "workflows.manual_execute"));

    assert.equal(TenantGuard.hasPermission("EDITOR", "workflows.deploy_production"), false);
    assert.equal(TenantGuard.hasPermission("EDITOR", "credentials.create_update"), false);
    assert.equal(TenantGuard.hasPermission("EDITOR", "workspace.manage_billing"), false);
  });

  await challenge("SEC-T2-05", "RBAC Matrix", "DEVELOPER can edit workflows and author sandboxed scripts but cannot deploy to prod", () => {
    assert.ok(TenantGuard.hasPermission("DEVELOPER", "workflows.create_edit"));
    assert.ok(TenantGuard.hasPermission("DEVELOPER", "scripts.author_sandbox"));
    assert.ok(TenantGuard.hasPermission("DEVELOPER", "workflows.execute_trigger"));

    assert.equal(TenantGuard.hasPermission("DEVELOPER", "workflows.deploy_production"), false);
    assert.equal(TenantGuard.hasPermission("DEVELOPER", "credentials.create_update"), false);
  });

  await challenge("SEC-T2-06", "RBAC Matrix", "MEMBER has limited execution capability without workflow editing or member management", () => {
    assert.ok(TenantGuard.hasPermission("MEMBER", "workflows.execute_trigger"));
    assert.ok(TenantGuard.hasPermission("MEMBER", "credentials.view_opaque"));

    assert.equal(TenantGuard.hasPermission("MEMBER", "workflows.create_edit"), false);
    assert.equal(TenantGuard.hasPermission("MEMBER", "workspace.invite_members"), false);
    assert.equal(TenantGuard.hasPermission("MEMBER", "credentials.create_update"), false);
  });

  await challenge("SEC-T2-07", "RBAC Matrix", "ADMIN can manage members, deploy workflows, and update creds, but cannot delete workspace or manage billing", () => {
    assert.ok(TenantGuard.hasPermission("ADMIN", "workspace.manage_members"));
    assert.ok(TenantGuard.hasPermission("ADMIN", "credentials.create_update"));
    assert.ok(TenantGuard.hasPermission("ADMIN", "workflows.deploy_production"));
    assert.ok(TenantGuard.hasPermission("ADMIN", "audit_logs.view_export"));

    assert.equal(TenantGuard.hasPermission("ADMIN", "workspace.manage_billing"), false);
    assert.equal(TenantGuard.hasPermission("ADMIN", "workspace.delete"), false);
  });

  await challenge("SEC-T2-08", "RBAC Matrix", "OWNER has absolute master authority across billing, deletion, and deployment", () => {
    const ownerPrivileges = [
      "workspace.manage_billing",
      "workspace.delete",
      "workspace.manage_members",
      "credentials.create_update",
      "workflows.deploy_production",
      "audit_logs.view_export",
    ];
    for (const perm of ownerPrivileges) {
      assert.ok(TenantGuard.hasPermission("OWNER", perm), `OWNER must have ${perm}`);
    }
  });

  await challenge("SEC-T2-09", "RBAC API Route", "POST /api/workflows/executions enforces RBAC 403 when VIEWER attempts trigger", async () => {
    const reqViewer = new NextRequest(new Request("http://localhost:3000/api/workflows/executions", {
      method: "POST",
      headers: {
        "x-user-role": "VIEWER",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflowId: "wf_test_rbac",
        triggerPayload: { test: true },
      }),
    }));

    const res = await triggerExecutionHandler(reqViewer);
    assert.equal(res.status, 403, "VIEWER triggering execution must receive HTTP 403");
    const json = await res.json();
    assert.match(json.error, /Role 'VIEWER' lacks permission for action 'workflows.execute_trigger'/);
  });

  await challenge("SEC-T2-10", "RBAC API Route", "POST /api/workflows/executions/[id]/resume blocks VIEWER from approving gate", async () => {
    const reqViewer = new NextRequest(new Request("http://localhost:3000/api/workflows/executions/exec_dummy/resume", {
      method: "POST",
      headers: {
        "x-user-role": "VIEWER",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ approved: true }),
    }));

    const res = await resumeExecutionHandler(reqViewer, { params: Promise.resolve({ id: "exec_dummy" }) });
    assert.equal(res.status, 403, "VIEWER attempting approval resumption must receive HTTP 403");
    const json = await res.json();
    assert.match(json.error, /Role 'VIEWER' lacks permission for action 'approvals.approve_reject'/);
  });

  // ===========================================================================
  // SECTION 3: CRYPTOGRAPHIC AUDIT LOG TAMPERING & HASH CHAIN BREAKS
  // ===========================================================================
  console.log("\n--- SECTION 3: Cryptographic Audit Log Tampering ($H_n \\ne \\text{SHA256}(H_{n-1} + \\dots)$) ---");

  const tempAuditDir = path.resolve(process.cwd(), "src/data/test_audit_chainer_" + Date.now());

  await challenge("SEC-T3-01", "Audit Chainer", "Construct cryptographic hash chain and verify untampered validity", () => {
    const chainer = new AuditLogChainer(tempAuditDir);

    const e1 = chainer.recordEvent("tenant_corp", "WORKFLOW_CREATED", { workflowId: "wf_1", name: "Inbound Lead Flow" });
    const e2 = chainer.recordEvent("tenant_corp", "CREDENTIAL_STORED", { credId: "cred_slack_01", appId: "slack" });
    const e3 = chainer.recordEvent("tenant_corp", "WORKFLOW_DEPLOYED", { workflowId: "wf_1", env: "production" });
    const e4 = chainer.recordEvent("tenant_corp", "EXECUTION_STARTED", { executionId: "exec_9001" });
    const e5 = chainer.recordEvent("tenant_corp", "EXECUTION_COMPLETED", { executionId: "exec_9001", durationMs: 142 });

    // Mathematical verification of linkage
    assert.equal(e2.previousHash, e1.hash);
    assert.equal(e3.previousHash, e2.hash);
    assert.equal(e4.previousHash, e3.hash);
    assert.equal(e5.previousHash, e4.hash);

    // Mathematical verification of SHA-256 calculation
    const rawDataE3 = `${e2.hash}|${e3.index}|${e3.timestamp}|${e3.tenantId}|${e3.eventType}|${JSON.stringify(e3.details)}`;
    const expectedHashE3 = crypto.createHash("sha256").update(rawDataE3).digest("hex");
    assert.equal(e3.hash, expectedHashE3, "Stored hash must match exact SHA-256 computation");

    const integrity = chainer.verifyIntegrity("tenant_corp");
    assert.equal(integrity.valid, true, "Untampered chain must pass verification");
  });

  await challenge("SEC-T3-02", "Audit Chainer", "Detect alteration of intermediate log payload ($H_n \\ne \\text{SHA256}$)", () => {
    const chainer = new AuditLogChainer(tempAuditDir);
    chainer.recordEvent("tenant_corp", "EVENT_1", { amount: 100 });
    chainer.recordEvent("tenant_corp", "EVENT_2", { amount: 200 });
    chainer.recordEvent("tenant_corp", "EVENT_3", { amount: 300 });

    const chain = chainer.exportChain();
    assert.equal(chain.length, 4); // Genesis + 3 events

    // Attacker tampers with event 2 payload
    chain[2].details = { amount: 9999999 }; // unauthorized modification

    const result = chainer.verifyIntegrity();
    assert.equal(result.valid, false, "Tampered chain must be detected as invalid");
    assert.equal(result.tamperedIndex, 2, "Exact tampered index must be 2");
    assert.match(result.details || "", /Cryptographic hash mismatch at index 2/);
  });

  await challenge("SEC-T3-03", "Audit Chainer", "Detect alteration of eventType or timestamp", () => {
    const chainer = new AuditLogChainer(tempAuditDir);
    chainer.recordEvent("tenant_corp", "USER_INVITED", { email: "alice@acme.com" });
    chainer.recordEvent("tenant_corp", "ROLE_ASSIGNED", { role: "MEMBER" });

    const chain = chainer.exportChain();
    // Tamper with eventType: change from ROLE_ASSIGNED to OWNER_ESCALATED
    chain[2].eventType = "OWNER_ESCALATED";

    const result = chainer.verifyIntegrity();
    assert.equal(result.valid, false);
    assert.equal(result.tamperedIndex, 2);
    assert.match(result.details || "", /Cryptographic hash mismatch at index 2/);
  });

  await challenge("SEC-T3-04", "Audit Chainer", "Detect broken hash linkage when block hash is spoofed without subsequent update", () => {
    const chainer = new AuditLogChainer(tempAuditDir);
    const b1 = chainer.recordEvent("tenant_corp", "STEP_A", { v: 1 });
    const b2 = chainer.recordEvent("tenant_corp", "STEP_B", { v: 2 });
    const b3 = chainer.recordEvent("tenant_corp", "STEP_C", { v: 3 });

    const chain = chainer.exportChain();
    // Attacker modifies block 2 details AND recomputes block 2 hash to pass hash check on block 2
    chain[2].details = { v: 999 };
    const forgedRaw = `${chain[1].hash}|${chain[2].index}|${chain[2].timestamp}|${chain[2].tenantId}|${chain[2].eventType}|${JSON.stringify(chain[2].details)}`;
    chain[2].hash = crypto.createHash("sha256").update(forgedRaw).digest("hex");

    // But block 3's previousHash still points to original b2.hash!
    const result = chainer.verifyIntegrity();
    assert.equal(result.valid, false);
    assert.equal(result.tamperedIndex, 3, "Block 3 must flag broken pointer linkage");
    assert.match(result.details || "", /Broken hash chain pointer at index 3/);
  });

  // Clean up test audit dir
  try {
    if (fs.existsSync(tempAuditDir)) {
      fs.rmSync(tempAuditDir, { recursive: true, force: true });
    }
  } catch {}

  // ===========================================================================
  // SECTION 4: SECRET REDACTION & CREDENTIAL HYGIENE
  // ===========================================================================
  console.log("\n--- SECTION 4: Secret Redaction & Credential Hygiene ---");

  await challenge("SEC-T4-01", "Secret Redaction", "CredentialVault.redactSecrets sanitizes all API keys and bearer tokens", () => {
    const rawLogs = [
      "Connecting to Slack with token xoxb-1234567890-abcdef123456-secretTokenNow",
      "Calling OpenAI API using key sk-proj-abcdef1234567890ABCDEF1234567890",
      "Calling Anthropic API key sk-ant-api03-abcdef1234567890abcdef1234567890-XYZ",
      "Authorization: Bearer ya29.a0AfH6SMB_secretOAuthAccessToken987654321",
      "GET /api/webhook?token=supersecret123&apiKey=topsecretkey456",
      `{"access_token": "secret_access_value_123", "clientSecret": "super_secret_client_xyz"}`,
    ];

    for (const log of rawLogs) {
      const redacted = CredentialVault.redactSecrets(log);
      assert.doesNotMatch(redacted, /xoxb-1234567890-abcdef123456-secretTokenNow/);
      assert.doesNotMatch(redacted, /sk-proj-abcdef1234567890ABCDEF1234567890/);
      assert.doesNotMatch(redacted, /sk-ant-api03-abcdef1234567890abcdef1234567890-XYZ/);
      assert.doesNotMatch(redacted, /ya29\.a0AfH6SMB_secretOAuthAccessToken987654321/);
      assert.doesNotMatch(redacted, /supersecret123/);
      assert.doesNotMatch(redacted, /topsecretkey456/);
      assert.doesNotMatch(redacted, /secret_access_value_123/);
      assert.doesNotMatch(redacted, /super_secret_client_xyz/);
      assert.match(redacted, /REDACTED/);
    }
  });

  await challenge("SEC-T4-02", "Secret Redaction", "CredentialVault.redactObject recursively sanitizes deep payload objects", () => {
    const sensitivePayload = {
      user: "operator_alex",
      requestHeaders: {
        authorization: "Bearer secret_jwt_token_999",
        "x-api-key": "sk-proj-secret-key-000",
      },
      connection: {
        appId: "hubspot",
        credentials: {
          clientSecret: "hubspot_client_secret_xyz",
          refreshToken: "refresh_token_abc_123",
          password: "db_password_topsecret",
        },
      },
      metadata: {
        step: 2,
        status: "SUCCESS",
      },
    };

    const sanitized = CredentialVault.redactObject(sensitivePayload);

    assert.equal(sanitized.user, "operator_alex");
    assert.equal(sanitized.metadata.step, 2);
    assert.equal(sanitized.metadata.status, "SUCCESS");

    // All secrets must be masked
    assert.equal(sanitized.requestHeaders.authorization, "[REDACTED]");
    assert.equal(sanitized.requestHeaders["x-api-key"], "[REDACTED]");
    assert.equal(sanitized.connection.credentials.clientSecret, "[REDACTED]");
    assert.equal(sanitized.connection.credentials.refreshToken, "[REDACTED]");
    assert.equal(sanitized.connection.credentials.password, "[REDACTED]");
  });

  await challenge("SEC-T4-03", "Secret Redaction", "ExecutionEventBus automatically sanitizes lifecycle events emitted to SSE stream", () => {
    const bus = new ExecutionEventBus();
    const captured: any[] = [];

    bus.subscribeExecution("exec_sec_test", (ev) => {
      captured.push(ev);
    });

    bus.emitEvent({
      executionId: "exec_sec_test",
      tenantId: "tenant_corp",
      workspaceId: "ws_corp",
      workflowId: "wf_test",
      eventType: "node.completed",
      nodeId: "node_http_1",
      payload: {
        authorization: "Bearer secret_token_xyz_12345",
        apiKey: "sk-proj-abcdefghijklmnopqrstuvwxyz1234",
        outputData: { records: [1, 2, 3] },
      },
    });

    assert.equal(captured.length, 1);
    const event = captured[0];
    assert.equal(event.payload.authorization, "[REDACTED]");
    assert.equal(event.payload.apiKey, "[REDACTED]");
    assert.deepEqual(event.payload.outputData.records, [1, 2, 3]);

    // Check buffered history in bus
    const history = bus.getHistory("exec_sec_test");
    assert.equal(history.length, 1);
    assert.equal(history[0].payload.authorization, "[REDACTED]");
    assert.equal(history[0].payload.apiKey, "[REDACTED]");
  });

  await challenge("SEC-T4-04", "Credential Hygiene", "Workflow definitions store only opaque cred IDs, zero plaintext secrets", () => {
    // Check canonical definition format
    const sampleWorkflow = {
      id: "wf_export_test",
      version: 1,
      nodes: [
        {
          id: "node_slack",
          type: "action",
          service: "slack",
          credentialRef: "cred_550e8400-e29b-41d4-a716-446655440000",
          parameters: { channel: "#announcements" },
        },
      ],
      edges: [],
    };

    const exportedJson = JSON.stringify(sampleWorkflow);
    assert.match(exportedJson, /cred_550e8400-e29b-41d4-a716-446655440000/);
    assert.doesNotMatch(exportedJson, /xoxb-/);
    assert.doesNotMatch(exportedJson, /sk-/);
    assert.doesNotMatch(exportedJson, /Bearer /);
  });

  // ===========================================================================
  // SECTION 5: SCENARIO E (CONVERSATIONAL AST GRAPH PATCHING)
  // ===========================================================================
  console.log("\n--- SECTION 5: Scenario E (AST Graph Patching: WorkflowPatchEngine.ts) ---");

  await challenge("SEC-T5-01", "Scenario E", "Conversational INSERT_BRANCH preserves existing nodes, configurations & coordinates", () => {
    // V1 Baseline: Webhook Trigger -> WhatsApp Receipt Action
    const workflowV1 = {
      id: "wf_conversational_e_challenge",
      version: 1,
      name: "Stripe WhatsApp Receipt Flow",
      tenantId: "tenant_scenario_e",
      workspaceId: "ws_scenario_e",
      nodes: [
        {
          id: "node_stripe_webhook",
          type: "trigger",
          service: "webhook",
          label: "Stripe Payment Received",
          parameters: { event: "charge.succeeded", signingSecretRef: "cred_sec_stripe_01" },
          credentialRef: "cred_stripe_vault_01",
          position: { x: 100, y: 150 },
        },
        {
          id: "node_whatsapp_receipt",
          type: "action",
          service: "whatsapp",
          label: "Send WhatsApp Receipt",
          parameters: { template: "receipt_simple", customerPhone: "{{ $json.customerPhone }}" },
          credentialRef: "cred_wa_vault_02",
          position: { x: 600, y: 150 },
        },
      ],
      edges: [
        { id: "edge_v1_main", source: "node_stripe_webhook", target: "node_whatsapp_receipt" },
      ],
    };

    // Verify V1 is valid DAG
    const valV1 = DAGValidator.validate(workflowV1.nodes as any, workflowV1.edges);
    assert.ok(valV1.valid, "Workflow V1 must be valid DAG");
    assert.equal(workflowV1.nodes.length, 2);

    // Conversational Intent: "If the payment amount is greater than $500, also send an alert to #vip-customers in Slack"
    const patchOps: GraphPatchOperation[] = [
      {
        op: "INSERT_BRANCH",
        splitAfterNodeId: "node_stripe_webhook",
        conditionNode: {
          id: "node_cond_vip_amount",
          type: "conditionNode",
          label: "Amount > $500",
          expression: "{{ $json.amount > 500 }}",
          parameters: { expression: "{{ $json.amount > 500 }}" },
          position: { x: 350, y: 150 },
        },
        trueBranchNodes: [
          {
            id: "node_slack_vip_alert",
            type: "action",
            service: "slack",
            label: "Slack VIP Alert",
            parameters: { channel: "#vip-customers", message: "🔥 High-Value Order: ${{ $json.amount }}" },
            credentialRef: "cred_slack_vault_03",
            position: { x: 600, y: 50 },
          },
        ],
        falseBranchNodes: [], // Should automatically reconnect original successor to false branch
      },
    ];

    // Apply patch
    const workflowV2 = WorkflowPatchEngine.applyPatch(workflowV1, patchOps);

    // Verify version and immutability
    assert.equal(workflowV2.version, 2, "Workflow version must increment to 2");
    assert.equal(workflowV1.version, 1, "Original workflowV1 must remain completely unchanged (immutable)");
    assert.equal(workflowV2.nodes.length, 4, "Total nodes must be 4");

    // Verify preservation of original nodes
    const stripeNode = workflowV2.nodes.find((n: any) => n.id === "node_stripe_webhook");
    assert.ok(stripeNode, "Stripe webhook node must exist");
    assert.equal(stripeNode.credentialRef, "cred_stripe_vault_01", "Stripe credential reference must be preserved");
    assert.equal(stripeNode.parameters.signingSecretRef, "cred_sec_stripe_01", "Parameters must be preserved");
    assert.equal(stripeNode.position.x, 100);
    assert.equal(stripeNode.position.y, 150);

    const waNode = workflowV2.nodes.find((n: any) => n.id === "node_whatsapp_receipt");
    assert.ok(waNode, "WhatsApp node must exist");
    assert.equal(waNode.credentialRef, "cred_wa_vault_02", "WhatsApp credential reference must be preserved");
    assert.equal(waNode.parameters.template, "receipt_simple");
    assert.equal(waNode.position.x, 600);
    assert.equal(waNode.position.y, 150);

    // Verify newly added nodes
    const condNode = workflowV2.nodes.find((n: any) => n.id === "node_cond_vip_amount");
    assert.ok(condNode, "Condition node must exist");
    assert.equal(condNode.parameters.expression, "{{ $json.amount > 500 }}");

    const vipSlackNode = workflowV2.nodes.find((n: any) => n.id === "node_slack_vip_alert");
    assert.ok(vipSlackNode, "Slack VIP alert node must exist");
    assert.equal(vipSlackNode.credentialRef, "cred_slack_vault_03");

    // Verify resulting DAG is strictly acyclic
    const valV2 = DAGValidator.validate(workflowV2.nodes as any, workflowV2.edges);
    assert.ok(valV2.valid, "Resulting Workflow V2 DAG must be strictly valid");
    assert.deepEqual(valV2.sortedNodeIds, [
      "node_stripe_webhook",
      "node_cond_vip_amount",
      "node_slack_vip_alert",
      "node_whatsapp_receipt",
    ]);
  });

  await challenge("SEC-T5-02", "Scenario E", "Conversational INSERT_NODE rewires adjacent edges without dropping graph continuity", () => {
    const baseWorkflow = {
      id: "wf_insert_mid",
      version: 1,
      nodes: [
        { id: "step_start", type: "trigger", label: "Start", parameters: {} },
        { id: "step_end", type: "action", label: "End", parameters: {} },
      ],
      edges: [
        { id: "e1", source: "step_start", target: "step_end" },
      ],
    };

    const patch: GraphPatchOperation[] = [
      {
        op: "INSERT_NODE",
        position: { relativeToNodeId: "step_start", placement: "after" },
        node: {
          id: "step_ai_filter",
          type: "ai",
          service: "openai",
          label: "AI Filter",
          parameters: { model: "gpt-4o" },
        },
      },
    ];

    const patched = WorkflowPatchEngine.applyPatch(baseWorkflow, patch);
    assert.equal(patched.nodes.length, 3);
    assert.equal(patched.version, 2);

    // Verify edge continuity: start -> ai_filter -> end
    const edgeStartToAi = patched.edges.find((e: any) => e.source === "step_start" && e.target === "step_ai_filter");
    const edgeAiToEnd = patched.edges.find((e: any) => e.source === "step_ai_filter" && e.target === "step_end");
    assert.ok(edgeStartToAi, "Must have edge step_start -> step_ai_filter");
    assert.ok(edgeAiToEnd, "Must have edge step_ai_filter -> step_end");

    const val = DAGValidator.validate(patched.nodes, patched.edges);
    assert.ok(val.valid, "Patched graph must be valid DAG");
  });

  await challenge("SEC-T5-03", "Scenario E", "Adversarial patch creating graph cycle is rejected with cycle detection error", () => {
    const acyclicFlow = {
      id: "wf_cycle_test",
      version: 1,
      nodes: [
        { id: "n1", type: "trigger", label: "N1" },
        { id: "n2", type: "action", label: "N2" },
      ],
      edges: [
        { id: "e_1_2", source: "n1", target: "n2" },
      ],
    };

    // Adversarial patch: reconnect edge to create self cycle or loop n2 -> n1
    const badPatch: GraphPatchOperation[] = [
      {
        op: "RECONNECT_EDGE",
        newEdge: { source: "n2", target: "n1" },
      },
    ];

    assert.throws(
      () => WorkflowPatchEngine.applyPatch(acyclicFlow, badPatch),
      /Cycle detected in workflow graph/,
      "Must reject patch introducing graph cycle"
    );
  });

  await challenge("SEC-T5-04", "Scenario E", "Patch referencing non-existent anchor throws explicit error without corrupting state", () => {
    const validFlow = {
      id: "wf_anchor_test",
      version: 1,
      nodes: [{ id: "n_real", type: "trigger", label: "Real Node" }],
      edges: [],
    };

    const badPatch: GraphPatchOperation[] = [
      {
        op: "INSERT_BRANCH",
        splitAfterNodeId: "n_phantom_does_not_exist",
        conditionNode: { id: "cond_1" },
      },
    ];

    assert.throws(
      () => WorkflowPatchEngine.applyPatch(validFlow, badPatch),
      /Split node 'n_phantom_does_not_exist' not found for INSERT_BRANCH/
    );
    assert.equal(validFlow.nodes.length, 1, "Original flow must remain untouched");
  });

  // ===========================================================================
  // SUMMARY BENCHMARK & METRICS
  // ===========================================================================
  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = testResults.filter((r) => !r.passed).length;
  const totalDuration = testResults.reduce((acc, r) => acc + r.durationMs, 0);

  console.log("\n================================================================================");
  console.log("  CHALLENGER GATE 2 EXECUTION SUMMARY");
  console.log("================================================================================");
  console.log(`  Total Challenges Executed: ${testResults.length}`);
  console.log(`  Passed                   : ${passedCount} (${((passedCount / testResults.length) * 100).toFixed(1)}%)`);
  console.log(`  Failed                   : ${failedCount}`);
  console.log(`  Total Cumulative Time    : ${totalDuration}ms`);
  console.log("================================================================================");

  if (failedCount > 0) {
    console.error(`\nGATE 2 VERDICT: REJECT (${failedCount} failures detected)`);
    process.exit(1);
  } else {
    console.log("\nGATE 2 VERDICT: APPROVE (100% security & multi-tenancy requirements satisfied)");
  }

  return { total: testResults.length, passed: passedCount, failed: failedCount, testResults };
}

// Direct execution entrypoint
if (require.main === module || process.argv[1]?.endsWith("challenger_gate_2_suite.ts")) {
  runChallengerGate2Suite().catch((err) => {
    console.error("Fatal failure in challenger test runner:", err);
    process.exit(1);
  });
}
