import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB, decryptToken, N8nConnectionRecord } from "@/database/db";
import { AutomationPlannerAgent } from "@/backend/automation/agent/AutomationPlannerAgent";
import { WorkflowCompiler } from "@/backend/automation/compiler/WorkflowCompiler";
import { N8nApiClient } from "@/backend/automation/n8n/N8nApiClient";
import { WorkflowSpec } from "@/backend/automation/types";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      connectionId,
      n8nInstanceUrl,
      n8nApiKey,
      clarificationAnswers,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required to generate an automation workflow." },
        { status: 400 }
      );
    }

    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";
    const workspaceId = `ws_${tenantId}`;

    const db = await getDB(tenantId);
    if (!db.workflowSpecs) db.workflowSpecs = [];
    if (!db.workflowDeployments) db.workflowDeployments = [];

    // Step 1: Synthesize WorkflowSpec from Natural Language
    const { spec, explanation } = AutomationPlannerAgent.synthesizeWorkflowSpec({
      tenantId,
      workspaceId,
      prompt: prompt.trim(),
      clarificationAnswers,
    });

    // Step 2: Validate Graph & Parameter Constraints
    const validation = WorkflowCompiler.validate(spec);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Workflow validation failed.",
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 422 }
      );
    }

    // Step 3: Compile to Official n8n Workflow JSON
    const compiledN8nWorkflow = WorkflowCompiler.compileToN8n(spec);

    // Step 4: Resolve n8n Instance Credentials
    let targetInstanceUrl: string | null = null;
    let targetApiKey: string | null = null;

    // Check direct parameter overrides first
    if (n8nInstanceUrl && n8nApiKey) {
      targetInstanceUrl = n8nInstanceUrl.trim();
      targetApiKey = n8nApiKey.trim();
    } else {
      // Look up in database connections
      const connections: N8nConnectionRecord[] = db.n8nConnections || [];
      let matchedConn: N8nConnectionRecord | undefined;

      if (connectionId) {
        matchedConn = connections.find((c) => c.id === connectionId);
      } else {
        matchedConn = connections.find((c) => c.isDefault) || connections[0];
      }

      if (matchedConn) {
        targetInstanceUrl = matchedConn.instanceUrl;
        try {
          targetApiKey = decryptToken(matchedConn.encryptedApiKey);
        } catch {
          targetApiKey = null;
        }
      } else if (process.env.N8N_API_URL && process.env.N8N_API_KEY) {
        // Fallback to server environment n8n instance if configured
        targetInstanceUrl = process.env.N8N_API_URL;
        targetApiKey = process.env.N8N_API_KEY;
      }
    }

    // Build DAG preview for UI canvas
    let currentX = 100;
    const currentY = 150;
    const dagNodes = [
      {
        id: "trigger",
        type: "triggerNode",
        position: { x: currentX, y: currentY },
        data: {
          label: spec.trigger.type === "schedule" ? "Morning 9:00 AM Cron" : "Inbound Event Trigger",
          appId: spec.trigger.appId,
          type: spec.trigger.type,
          config: spec.trigger.config,
        },
      },
      ...spec.steps.map((step) => {
        currentX += 260;
        return {
          id: step.id,
          type: "actionNode",
          position: { x: currentX, y: currentY },
          data: {
            label: step.label,
            appId: step.appId,
            actionId: step.actionId,
            sideEffect: step.sideEffect,
            approvalRequired: step.approvalRequired,
            approvalCondition: step.approvalCondition,
            parameters: step.parameters,
          },
        };
      }),
    ];

    const dagEdges = spec.steps.map((step, idx) => {
      const sourceId = idx === 0 ? "trigger" : spec.steps[idx - 1].id;
      return {
        id: `e_${sourceId}_${step.id}`,
        source: sourceId,
        target: step.id,
        label: step.approvalCondition || "",
        animated: true,
      };
    });

    // Save spec in tenant database
    db.workflowSpecs.push(spec);
    await saveDB(db, tenantId);

    // Step 5: If credentials are ready, deploy directly to user's n8n account
    if (targetInstanceUrl && targetApiKey) {
      try {
        const creationResult = await N8nApiClient.createWorkflow(
          targetInstanceUrl,
          targetApiKey,
          compiledN8nWorkflow,
          { idempotencyKey: `gen_${spec.id}` }
        );

        // Record deployment in database
        const deploymentRecord = {
          deploymentId: `dep_n8n_${uuidv4().substring(0, 8)}`,
          workflowId: spec.id,
          version: spec.version,
          provider: "n8n",
          status: "DRAFT_INACTIVE", // Created inactive for user review
          externalWorkflowId: creationResult.workflowId,
          editorUrl: creationResult.editorUrl,
          instanceUrl: targetInstanceUrl,
          deployedAt: new Date().toISOString(),
        };

        db.workflowDeployments.push(deploymentRecord);
        await saveDB(db, tenantId);

        return NextResponse.json({
          success: true,
          workflowId: creationResult.workflowId,
          editorUrl: creationResult.editorUrl,
          name: creationResult.name,
          nodesCount: creationResult.nodesCount,
          active: creationResult.active,
          workflowSpec: spec,
          n8nJson: compiledN8nWorkflow,
          dagPreview: { nodes: dagNodes, edges: dagEdges },
          steps: [
            { name: "Understanding your instructions", status: "completed" },
            { name: `Generating ${compiledN8nWorkflow.nodes.length} nodes`, status: "completed" },
            { name: "Validating connections", status: "completed" },
            { name: "Creating workflow in n8n", status: "completed" },
          ],
          needsConnection: false,
          explanation,
          message: "Workflow created successfully in your n8n account as an inactive draft.",
        });
      } catch (apiErr: any) {
        return NextResponse.json(
          {
            success: false,
            error: apiErr.message || "Failed to create workflow in your n8n instance.",
            workflowSpec: spec,
            n8nJson: compiledN8nWorkflow,
            dagPreview: { nodes: dagNodes, edges: dagEdges },
            steps: [
              { name: "Understanding your instructions", status: "completed" },
              { name: `Generating ${compiledN8nWorkflow.nodes.length} nodes`, status: "completed" },
              { name: "Validating connections", status: "completed" },
              { name: "Creating workflow in n8n", status: "failed", error: apiErr.message },
            ],
            needsConnection: true,
            explanation,
          },
          { status: 502 }
        );
      }
    }

    // Step 6: When no connection is configured, return compiled workflow and prompt connection
    return NextResponse.json({
      success: true,
      workflowId: spec.id,
      editorUrl: null,
      name: spec.name,
      nodesCount: compiledN8nWorkflow.nodes.length,
      active: false,
      workflowSpec: spec,
      n8nJson: compiledN8nWorkflow,
      dagPreview: { nodes: dagNodes, edges: dagEdges },
      steps: [
        { name: "Understanding your instructions", status: "completed" },
        { name: `Generating ${compiledN8nWorkflow.nodes.length} nodes`, status: "completed" },
        { name: "Validating connections", status: "completed" },
        { name: "Creating workflow in n8n", status: "waiting_connection" },
      ],
      needsConnection: true,
      explanation,
      message: "Workflow compiled and validated. Connect your n8n account to create it directly.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Workflow generation pipeline failed.", details: err.message },
      { status: 500 }
    );
  }
}
