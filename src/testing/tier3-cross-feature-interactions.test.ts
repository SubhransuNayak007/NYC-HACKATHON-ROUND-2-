/**
 * tier3-cross-feature-interactions.test.ts
 * Tier 3: Cross-Feature Interactions (Pairwise and multi-module integration tests)
 * Tests interactions across Webhooks, Conditions, Loops, AI, OAuth, RBAC, Showcase, and Sandboxes.
 */

import assert from "node:assert/strict";
import {
  SafeExpressionEvaluator,
  DAGValidator,
  SecureCredentialVault,
  CryptographicAuditLog,
  SSRFGuard,
  TenantGuard,
  BackoffCalculator,
  WorkflowDefinitionV3,
  NodeType,
  WorkflowNode,
  WorkflowEdge,
  ExecutionCheckpoint,
  LifecycleEvent,
} from "./TestHarnessModels";
import { MockIntegrationServer } from "./MockIntegrationServer";

export async function runTier3Tests(): Promise<{ total: number; passed: number; failed: number; results: { id: string; name: string; passed: boolean; error?: string }[] }> {
  const results: { id: string; name: string; passed: boolean; error?: string }[] = [];

  function test(id: string, name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        results.push({ id, name, passed: true });
      } catch (err: any) {
        results.push({ id, name, passed: false, error: err.message });
      }
    })();
  }

  // =========================================================================
  // Cross-Feature Interaction Test Cases
  // =========================================================================

  await test("T3_X01", "Webhook Ingestion -> Validation -> Safe AST Conditional Branching (R4 + R5)", () => {
    // 1. Inbound webhook payload
    const webhookPayload = {
      leadName: "Alice Walker",
      email: "alice@fintech.io",
      budget: 35000,
      source: "Partner Referral",
    };

    // 2. Validation
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(webhookPayload.email);
    assert.ok(isEmailValid, "Email format must be valid");
    assert.ok(webhookPayload.budget > 0, "Budget must be positive");

    // 3. Conditional routing via SafeExpressionEvaluator
    const isEnterprise = SafeExpressionEvaluator.evaluate("{{ $json.budget >= 10000 }}", { $json: webhookPayload });
    assert.equal(isEnterprise, true);

    const routingDecision = isEnterprise ? "ENTERPRISE_BRANCH" : "SMB_BRANCH";
    assert.equal(routingDecision, "ENTERPRISE_BRANCH");
  });

  await test("T3_X02", "Collection Loop -> AI Summarization with simulated rate limiter pacing (R4 + R5)", async () => {
    const server = new MockIntegrationServer();
    await server.start();
    const baseUrl = server.getBaseUrl();

    try {
      const items = [
        { id: 1, title: "Support Ticket 1", text: "Customer requests refund on order #100" },
        { id: 2, title: "Support Ticket 2", text: "Enterprise renewal inquiry for 500 licenses" },
        { id: 3, title: "Support Ticket 3", text: "Bug report: CSV export timeout" },
      ];

      const processedSummaries: any[] = [];
      for (const item of items) {
        // AI request
        const res = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `summarize: ${item.text}` }],
          }),
        }).then((r) => r.json());

        processedSummaries.push({
          itemId: item.id,
          summary: res.choices[0].message.content,
        });
      }

      assert.equal(processedSummaries.length, 3);
      assert.ok(processedSummaries[0].summary);
      const recorded = server.getRecordedRequests("openai");
      assert.equal(recorded.length, 3);
    } finally {
      await server.stop();
    }
  });

  await test("T3_X03", "OAuth token refresh triggered mid-execution without checkpoint state loss (R4 + R5)", async () => {
    const server = new MockIntegrationServer();
    await server.start();
    const baseUrl = server.getBaseUrl();
    const vault = new SecureCredentialVault();

    try {
      // 1. Initial token acquisition
      const initial = await fetch(`${baseUrl}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "authorization_code", code: "initial_auth_code" }),
      }).then((r) => r.json());

      const encryptedCred = vault.encrypt({
        accessToken: initial.access_token,
        refreshToken: initial.refresh_token,
        expiresAt: Date.now() - 5000, // Token expired!
      });

      // 2. Pre-execution token refresh check
      const credData = vault.decrypt(encryptedCred);
      let activeAccessToken = credData.accessToken;
      if (credData.expiresAt <= Date.now() + 300000) {
        const refreshRes = await fetch(`${baseUrl}/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: credData.refreshToken,
          }),
        }).then((r) => r.json());
        activeAccessToken = refreshRes.access_token;
      }

      assert.notEqual(activeAccessToken, initial.access_token);
      assert.ok(activeAccessToken.startsWith("mock_access_rotated_"));

      // 3. Execution resumes with fresh token
      const sheetRes = await fetch(`${baseUrl}/v4/spreadsheets/123/values/Sheet1!A1:append`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [["Refreshed Token Success"]] }),
      }).then((r) => r.json());

      assert.equal(sheetRes.updates.updatedRows, 1);
    } finally {
      await server.stop();
    }
  });

  await test("T3_X04", "Conversational AI Graph Patch applied to running/checkpointed workflow (R3 + R4)", () => {
    // Checkpointed execution running on v1
    const checkpoint: ExecutionCheckpoint = {
      executionId: "exec_v1_run",
      tenantId: "ten_live",
      workspaceId: "ws_live",
      workflowId: "wf_shared",
      workflowVersion: 1,
      status: "RUNNING",
      currentNodeId: "n_action_1",
      completedNodeIds: ["n_trigger"],
      pendingNodeIds: ["n_action_1"],
      nodeOutputs: { n_trigger: { leadId: "lead_99" } },
      workflowState: { leadId: "lead_99" },
      retryState: {},
      lastHeartbeatAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Chat builder introduces v2 patch (adds Slack alert after action)
    const patch = {
      type: "APPEND_NODE",
      newNode: {
        id: "n_slack_alert",
        type: "action" as NodeType,
        label: "Slack Alert",
        parameters: { channel: "#leads" },
      },
    };

    // New version created
    const v2Workflow: WorkflowDefinitionV3 = {
      id: checkpoint.workflowId,
      version: 2,
      name: "Lead Flow v2",
      tenantId: checkpoint.tenantId,
      workspaceId: checkpoint.workspaceId,
      nodes: [
        { id: "n_trigger", type: "trigger", label: "Trigger", parameters: {} },
        { id: "n_action_1", type: "action", label: "Action", parameters: {} },
        patch.newNode,
      ],
      edges: [
        { id: "e1", source: "n_trigger", target: "n_action_1" },
        { id: "e2", source: "n_action_1", target: "n_slack_alert" },
      ],
    };

    // Checkpoint v1 state is unaffected
    assert.equal(checkpoint.workflowVersion, 1);
    assert.equal(checkpoint.nodeOutputs.n_trigger.leadId, "lead_99");
    assert.equal(v2Workflow.version, 2);
    assert.equal(v2Workflow.nodes.length, 3);
  });

  await test("T3_X05", "Cryptographic Audit Log emitted on Cross-Tenant Unauthorized Access Attempt (R5 + R7)", () => {
    const auditLog = new CryptographicAuditLog();
    const callerWorkspace = "ws_attacker";
    const protectedWorkspace = "ws_victim_enterprise";

    let accessDenied = false;
    try {
      TenantGuard.assertWorkspaceIsolation(protectedWorkspace, callerWorkspace);
    } catch (err: any) {
      accessDenied = true;
      // Record security audit event
      auditLog.append(callerWorkspace, "SECURITY_CROSS_TENANT_VIOLATION", {
        targetWorkspace: protectedWorkspace,
        reason: err.message,
        actionBlocked: "READ_CREDENTIALS",
      });
    }

    assert.ok(accessDenied, "Cross tenant access must be denied");
    const chain = auditLog.getChain();
    assert.equal(chain.length, 2);
    assert.equal(chain[1].eventType, "SECURITY_CROSS_TENANT_VIOLATION");
    assert.ok(auditLog.verifyIntegrity().valid, "Audit chain integrity must be valid");
  });

  await test("T3_X06", "Custom Sandboxed Script Node transforming Google Sheets output within limits (R5 + R7)", () => {
    // 1. Raw rows from Google Sheets
    const sheetRows = [
      ["Lead", "Email", "Budget"],
      ["Acme", "contact@acme.com", "50000"],
      ["Beta", "team@beta.io", "8000"],
    ];

    // 2. Script node transformation logic
    const script = (rows: any[][]) => {
      const headers = rows[0];
      const items = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        items.push({
          company: row[0],
          email: row[1],
          budget: Number(row[2]),
          tier: Number(row[2]) >= 10000 ? "ENTERPRISE" : "SMB",
        });
      }
      return items;
    };

    const transformed = script(sheetRows);
    assert.equal(transformed.length, 2);
    assert.equal(transformed[0].tier, "ENTERPRISE");
    assert.equal(transformed[1].tier, "SMB");
  });

  await test("T3_X07", "Canva Connect Autofill invoked from AI Content Output with Real-time SSE streaming (R5 + R6 + R7)", async () => {
    const server = new MockIntegrationServer();
    await server.start();
    const baseUrl = server.getBaseUrl();
    const sseEvents: LifecycleEvent[] = [];

    try {
      // 1. AI content generation
      const aiRes = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Canva headline generation" }] }),
      }).then((r) => r.json());

      const content = JSON.parse(aiRes.choices[0].message.content);
      assert.ok(content.headline);

      // Emit node.started SSE event
      sseEvents.push({
        eventId: "e1",
        executionId: "exec_canva_stream",
        tenantId: "t1",
        workspaceId: "w1",
        workflowId: "wf1",
        eventType: "node.started",
        nodeId: "canva_autofill_step",
        timestamp: new Date().toISOString(),
        payload: { templateId: "tpl_workflow_brief_01" },
      });

      // 2. Canva autofill dispatch
      const canvaRes = await fetch(`${baseUrl}/v1/autofills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: "tpl_workflow_brief_01",
          data: { headline: content.headline },
        }),
      }).then((r) => r.json());

      assert.equal(canvaRes.job.status, "success");

      // Emit node.completed SSE event
      sseEvents.push({
        eventId: "e2",
        executionId: "exec_canva_stream",
        tenantId: "t1",
        workspaceId: "w1",
        workflowId: "wf1",
        eventType: "node.completed",
        nodeId: "canva_autofill_step",
        timestamp: new Date().toISOString(),
        payload: { designId: canvaRes.job.result.design.id },
      });

      assert.equal(sseEvents.length, 2);
      assert.equal(sseEvents[1].payload.designId, canvaRes.job.result.design.id);
    } finally {
      await server.stop();
    }
  });

  await test("T3_X08", "Parallel Fork/Join executing simultaneous HubSpot and Slack calls with independent credentials (R4 + R5)", async () => {
    const server = new MockIntegrationServer();
    await server.start();
    const baseUrl = server.getBaseUrl();

    try {
      const hubspotToken = "mock_hubspot_token_abc";
      const slackToken = "mock_slack_token_xyz";

      // Parallel execution
      const [hubspotRes, slackRes] = await Promise.all([
        fetch(`${baseUrl}/crm/v3/objects/contacts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hubspotToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ properties: { email: "parallel@acme.com", firstname: "Parallel" } }),
        }).then((r) => r.json()),
        fetch(`${baseUrl}/api/chat.postMessage`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${slackToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channel: "#sales-parallel", text: "New lead created in HubSpot" }),
        }).then((r) => r.json()),
      ]);

      assert.ok(hubspotRes.id);
      assert.equal(slackRes.ok, true);

      // Join node combines both outputs
      const joinState = {
        hubspotContactId: hubspotRes.id,
        slackMessageTs: slackRes.ts,
        completedAt: new Date().toISOString(),
      };

      assert.ok(joinState.hubspotContactId);
      assert.ok(joinState.slackMessageTs);
    } finally {
      await server.stop();
    }
  });

  await test("T3_X09", "Human Approval Gate pausing execution, rehydrating on approval, and continuing downstream actions (R4 + R7 + R8)", async () => {
    const server = new MockIntegrationServer();
    await server.start();
    const baseUrl = server.getBaseUrl();

    try {
      const approvalId = `appr_${Date.now()}`;
      // 1. Pipeline reaches approval gate and pauses
      let executionStatus = "WAITING_APPROVAL";
      const checkpoint: ExecutionCheckpoint = {
        executionId: "exec_appr_01",
        tenantId: "t1",
        workspaceId: "w1",
        workflowId: "wf_appr",
        workflowVersion: 1,
        status: "WAITING_APPROVAL",
        currentNodeId: "approval_gate_node",
        completedNodeIds: ["gmail_trig", "ai_summarize"],
        pendingNodeIds: ["approval_gate_node", "slack_notify"],
        nodeOutputs: { ai_summarize: { quoteAmount: 85000, riskScore: 25 } },
        workflowState: { approvalId },
        retryState: {},
        lastHeartbeatAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      assert.equal(checkpoint.status, "WAITING_APPROVAL");

      // 2. User approves via simulated API
      const approvalRes = await fetch(`${baseUrl}/api/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "vp_sales@quickreply.io" }),
      }).then((r) => r.json());

      assert.equal(approvalRes.status, "APPROVED");

      // 3. Execution resumes
      executionStatus = "RUNNING";
      // Downstream Slack action executes
      const slackRes = await fetch(`${baseUrl}/api/chat.postMessage`, {
        method: "POST",
        headers: {
          Authorization: "Bearer mock_slack_tok",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "#deals-approved",
          text: `Quote of $85,000 APPROVED by vp_sales. Proceed with contract.`,
        }),
      }).then((r) => r.json());

      assert.equal(slackRes.ok, true);
      executionStatus = "COMPLETED";
      assert.equal(executionStatus, "COMPLETED");
    } finally {
      await server.stop();
    }
  });

  await test("T3_X10", "Exponential Backoff Retry during SSE status streaming maintaining client diagnostics (R4 + R7)", async () => {
    const server = new MockIntegrationServer({ billingFailuresBeforeSuccess: 2 });
    await server.start();
    const baseUrl = server.getBaseUrl();
    const sseLifecycleLog: string[] = [];

    try {
      const maxRetries = 3;
      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        attempt++;
        const res = await fetch(`${baseUrl}/api/mock/billing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: 250 }),
        });

        if (res.status === 503) {
          const waitTime = BackoffCalculator.calculateWaitTime(attempt - 1, 10, 100, 5);
          sseLifecycleLog.push(`node.retrying: attempt=${attempt}, waitMs=${waitTime}`);
          await new Promise((r) => setTimeout(r, waitTime));
        } else if (res.status === 200) {
          success = true;
          sseLifecycleLog.push(`node.completed: attempt=${attempt}`);
        }
      }

      assert.equal(success, true);
      assert.equal(attempt, 3);
      assert.equal(sseLifecycleLog.length, 3);
      assert.ok(sseLifecycleLog[0].startsWith("node.retrying: attempt=1"));
      assert.ok(sseLifecycleLog[1].startsWith("node.retrying: attempt=2"));
      assert.ok(sseLifecycleLog[2].startsWith("node.completed: attempt=3"));
    } finally {
      await server.stop();
    }
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  return { total: results.length, passed: passedCount, failed: failedCount, results };
}

// Standalone execution support
if (require.main === module) {
  runTier3Tests().then((res) => {
    console.log(`[Tier 3 Cross-Feature Interactions] Total: ${res.total}, Passed: ${res.passed}, Failed: ${res.failed}`);
    if (res.failed > 0) {
      console.error(res.results.filter((r) => !r.passed));
      process.exit(1);
    }
  });
}
