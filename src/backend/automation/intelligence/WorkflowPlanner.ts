/**
 * QuickReply AI Automation Operating System — Workflow Planning Engine
 * src/backend/automation/intelligence/WorkflowPlanner.ts
 *
 * Implements Engine 4 (Planning & Blueprint Synthesis) of Master Prompt V2:
 * Generates comprehensive, versioned AutomationPlan documents before any node
 * is added to the canvas. The plan acts as the strict construction blueprint.
 */

import { v4 as uuidv4 } from "uuid";
import {
  AutomationPlan,
  PlanConnectorRequirement,
  PlanDataMapping,
  PlanStep,
  RequirementDocument,
} from "../types";
import { ConnectorPrerequisiteEngine } from "./ConnectorPrerequisiteEngine";

export class WorkflowPlanner {
  /**
   * Synthesize a formal AutomationPlan from an analyzed RequirementDocument
   */
  static generatePlan(params: {
    conversationId: string;
    tenantId: string;
    workspaceId: string;
    requirementDoc: RequirementDocument;
    connectedApps?: string[];
    userOverrides?: Record<string, any>;
    existingPlan?: AutomationPlan;
  }): AutomationPlan {
    const {
      conversationId,
      tenantId,
      workspaceId,
      requirementDoc,
      connectedApps = [],
      userOverrides = {},
      existingPlan,
    } = params;

    const planId = existingPlan?.id || `plan_${uuidv4().substring(0, 8)}`;
    const version = existingPlan ? existingPlan.version + 1 : 1;
    const now = new Date().toISOString();

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Trigger Specification
    // ─────────────────────────────────────────────────────────────────────────
    let triggerAppId = "custom_webhook";
    let triggerId = "webhook_received";
    let triggerLabel = "Inbound Webhook Trigger";
    let triggerConfig: Record<string, any> = {};

    if (requirementDoc.trigger.source === "google_sheets") {
      triggerAppId = "google_sheets";
      triggerId = "new_row";
      triggerLabel = "Google Sheets New Row Added";
      triggerConfig = {
        spreadsheetName: userOverrides.spreadsheetName || "Leads",
        sheetTab: userOverrides.sheetTab || "Sheet1",
      };
    } else if (requirementDoc.trigger.source === "website") {
      triggerAppId = "custom_webhook";
      triggerId = "webhook_received";
      triggerLabel = "Website Contact Form Submission";
      triggerConfig = { endpoint: "/api/webhooks/form-leads" };
    } else if (requirementDoc.trigger.type === "new_order") {
      triggerAppId = "custom_webhook";
      triggerId = "webhook_received";
      triggerLabel = "New Customer Order Event";
      triggerConfig = { event: "order.created" };
    } else if (requirementDoc.trigger.type === "schedule") {
      triggerAppId = "scheduler";
      triggerId = "cron_trigger";
      triggerLabel = "Daily Morning Schedule (09:00 AM)";
      triggerConfig = { cron: "0 9 * * *", timezone: "UTC" };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Connectors & Prerequisites Evaluation
    // ─────────────────────────────────────────────────────────────────────────
    const connectors: PlanConnectorRequirement[] = [];
    const outstandingRequirements: string[] = [];

    // Trigger Connector
    if (triggerAppId !== "custom_webhook" && triggerAppId !== "scheduler") {
      const isConnected = connectedApps.includes(triggerAppId);
      connectors.push({
        connectorId: triggerAppId,
        name: triggerAppId === "google_sheets" ? "Google Sheets" : triggerAppId,
        operation: triggerId,
        accountIdentity: isConnected ? "user@example.com" : undefined,
        connectionStatus: isConnected ? "connected" : "missing",
        authorizationStatus: isConnected ? "authorized" : "unauthorized",
        requiredPermissions: ["read_content"],
        prerequisiteStatus: isConnected ? "READY" : "MISSING_CREDENTIAL",
        prerequisiteReason: isConnected ? undefined : `Authorize ${triggerAppId} account to listen for events.`,
      });
      if (!isConnected) {
        outstandingRequirements.push(`Connect your ${triggerAppId} account.`);
      }
    }

    // Action Connectors
    for (const action of requirementDoc.actions) {
      const isConnected = connectedApps.includes(action.service);
      const recipientVal = userOverrides.recipient || requirementDoc.recipient.value;

      const prereq = ConnectorPrerequisiteEngine.evaluatePrerequisites({
        connectorId: action.service,
        operationId: action.operation,
        connectedApps,
        parameters: { to: recipientVal, chatId: recipientVal },
      });

      connectors.push({
        connectorId: action.service,
        name:
          action.service === "whatsapp"
            ? "WhatsApp Business"
            : action.service === "telegram"
            ? "Telegram Bot"
            : action.service === "gmail"
            ? "Gmail"
            : action.service,
        operation: action.operation,
        accountIdentity: isConnected ? "Verified Business Account" : undefined,
        connectionStatus: isConnected ? "connected" : "missing",
        authorizationStatus: isConnected ? "authorized" : "unauthorized",
        requiredPermissions:
          action.service === "whatsapp"
            ? ["whatsapp_business_messaging"]
            : action.service === "telegram"
            ? ["bot_api"]
            : ["gmail.send"],
        prerequisiteStatus: prereq.status,
        prerequisiteReason: prereq.reasons[0],
      });

      if (!prereq.isReady) {
        outstandingRequirements.push(...prereq.reasons);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Workflow Steps & Data Mappings
    // ─────────────────────────────────────────────────────────────────────────
    const steps: PlanStep[] = [];
    const allDataMappings: PlanDataMapping[] = [];

    // Trigger step
    steps.push({
      id: "step_trigger",
      appId: triggerAppId,
      actionId: triggerId,
      label: triggerLabel,
      description: `Listens for incoming ${requirementDoc.trigger.type} events and extracts payload`,
      parameters: triggerConfig,
      dataMappings: [],
      dependsOn: [],
      sideEffect: "SAFE_READ",
      approvalRequired: false,
    });

    let prevStepId = "step_trigger";

    // AI Classification / Transformation Step (if business logic needed)
    if (requirementDoc.actions.length > 1 || requirementDoc.objective.toLowerCase().includes("classify") || requirementDoc.objective.toLowerCase().includes("format")) {
      const stepId = "step_ai_format";
      steps.push({
        id: stepId,
        appId: "ai_extractor",
        actionId: "apply_business_logic",
        label: "AI Message Formatter & Intent Classifier",
        description: "Structures the event data into a clean notification message",
        parameters: {
          prompt: "Format a concise alert for team notifications based on input payload.",
        },
        dataMappings: [
          {
            targetField: "context",
            expression: "{{ nodes.step_trigger.output }}",
            sourceNodeId: "step_trigger",
            sourceField: "payload",
          },
        ],
        dependsOn: [prevStepId],
        sideEffect: "SAFE_READ",
        approvalRequired: false,
      });
      prevStepId = stepId;
    }

    // Action Steps
    for (let i = 0; i < requirementDoc.actions.length; i++) {
      const act = requirementDoc.actions[i];
      const stepId = `step_${act.service}_${i + 1}`;
      const recipientVal = userOverrides.recipient || requirementDoc.recipient.value || "{{ nodes.step_trigger.output.phone }}";

      const stepMappings: PlanDataMapping[] = [];

      if (act.service === "whatsapp") {
        stepMappings.push(
          {
            targetField: "to",
            expression: recipientVal.startsWith("{{") ? recipientVal : recipientVal,
            sourceNodeId: "step_trigger",
            sourceField: "phone",
            sampleValue: recipientVal,
          },
          {
            targetField: "message",
            expression: "Hi! New submission received: {{ nodes.step_trigger.output.name || 'Valued Lead' }}",
            sourceNodeId: "step_trigger",
            sourceField: "name",
          }
        );

        steps.push({
          id: stepId,
          appId: "whatsapp",
          actionId: "send_message",
          label: "Dispatch WhatsApp Notification",
          description: `Delivers official WhatsApp notification to verified recipient (${recipientVal})`,
          credentialRef: "cred_whatsapp_primary",
          parameters: {
            to: recipientVal,
            message: "New automated alert from QuickReply",
          },
          dataMappings: stepMappings,
          dependsOn: [prevStepId],
          sideEffect: "EXTERNAL_COMMUNICATION",
          approvalRequired: false,
          retryPolicy: { maxAttempts: 3, backoffMs: 2000 },
        });
      } else if (act.service === "telegram") {
        stepMappings.push(
          {
            targetField: "chatId",
            expression: recipientVal,
            sourceNodeId: "step_trigger",
            sourceField: "chat_id",
            sampleValue: recipientVal,
          },
          {
            targetField: "text",
            expression: "🚨 *New Lead Alert*\n• Name: `{{ nodes.step_trigger.output.name }}`\n• Email: `{{ nodes.step_trigger.output.email }}`",
            sourceNodeId: "step_trigger",
            sourceField: "email",
          }
        );

        steps.push({
          id: stepId,
          appId: "telegram",
          actionId: "send_message",
          label: "Send Telegram Alert",
          description: `Posts priority markdown alert to Telegram destination: ${recipientVal}`,
          credentialRef: "cred_telegram_bot",
          parameters: {
            chatId: recipientVal,
            parseMode: "Markdown",
          },
          dataMappings: stepMappings,
          dependsOn: [prevStepId],
          sideEffect: "EXTERNAL_COMMUNICATION",
          approvalRequired: false,
          retryPolicy: { maxAttempts: 3, backoffMs: 1500 },
        });
      } else if (act.service === "gmail") {
        stepMappings.push({
          targetField: "to",
          expression: recipientVal,
          sourceNodeId: "step_trigger",
          sourceField: "email",
          sampleValue: recipientVal,
        });

        steps.push({
          id: stepId,
          appId: "gmail",
          actionId: "send_message",
          label: "Send Confirmation Email",
          description: `Dispatches email via authenticated Gmail account to ${recipientVal}`,
          credentialRef: "cred_gmail_primary",
          parameters: {
            to: recipientVal,
            subject: "Notification: New Form Submission Received",
          },
          dataMappings: stepMappings,
          dependsOn: [prevStepId],
          sideEffect: "EXTERNAL_COMMUNICATION",
          approvalRequired: false,
        });
      } else if (act.service === "google_sheets") {
        steps.push({
          id: stepId,
          appId: "google_sheets",
          actionId: "append_row",
          label: "Append Row to Google Sheets Ledger",
          description: "Appends incoming event data to specified spreadsheet tab",
          credentialRef: "cred_sheets_primary",
          parameters: {
            spreadsheetName: userOverrides.spreadsheetName || "Leads",
            sheetTab: userOverrides.sheetTab || "Sheet1",
          },
          dataMappings: [
            {
              targetField: "values",
              expression: "{{ nodes.step_trigger.output }}",
              sourceNodeId: "step_trigger",
              sourceField: "payload",
            },
          ],
          dependsOn: [prevStepId],
          sideEffect: "REVERSIBLE",
          approvalRequired: false,
        });
      }

      allDataMappings.push(...stepMappings);
      prevStepId = stepId;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Safety & Permissions Disclosure
    // ─────────────────────────────────────────────────────────────────────────
    const hasExternal = steps.some((s) => s.sideEffect === "EXTERNAL_COMMUNICATION");
    const externalDestinations = connectors
      .filter((c) => ["whatsapp", "telegram", "gmail", "slack"].includes(c.connectorId))
      .map((c) => c.name);

    return {
      id: planId,
      conversationId,
      tenantId,
      workspaceId,
      version,
      title: `${triggerLabel} → ${requirementDoc.actions.map((a) => a.service.toUpperCase()).join(" & ")}`,
      objective: requirementDoc.objective,
      trigger: {
        appId: triggerAppId,
        triggerId,
        label: triggerLabel,
        config: triggerConfig,
      },
      connectors,
      steps,
      dataMappings: allDataMappings,
      recipients: [
        {
          destination: requirementDoc.actions[0]?.service || "Notification Destination",
          addressOrChannel: requirementDoc.recipient.value || "Configured Recipient",
          verified: Boolean(requirementDoc.recipient.value),
        },
      ],
      safety: {
        externalSideEffects: hasExternal,
        externalDestinations,
        financialOrDestructive: false,
        dataModificationPolicy: "Append-only data logging with external outbound delivery.",
      },
      reliability: {
        maxRetries: 3,
        retryBackoffMs: 2000,
      },
      executionBehavior: requirementDoc.executionMode,
      outstandingRequirements,
      isApproved: false,
      createdAt: now,
      updatedAt: now,
    };
  }
}
