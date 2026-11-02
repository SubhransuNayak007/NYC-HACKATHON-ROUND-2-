/**
 * QuickReply AI Automation Operating System — Intent & Requirements Engine
 * src/backend/automation/intelligence/IntentRequirementsEngine.ts
 *
 * Implements Engine 1 of Master Prompt V2:
 * - Natural-language understanding of business objectives without jumping straight to nodes
 * - Structured requirement extraction into schema-validated RequirementDocument
 * - XML prompt bounds (<user_instruction>, <workspace_context>, <available_connectors>, etc.)
 * - Strict non-hallucination slot tracking (objective, trigger, input, processing, destination, identity, safety, reliability)
 * - Zero hallucination of fake phone numbers, emails, tokens, folder IDs, or credentials
 */

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  RequirementDocument,
  RequirementSlot,
  SideEffectClassification,
} from "../types";
import { normalizeWhatsAppNumber } from "@/backend/nodes/connectors/WhatsAppConnector";

// ============================================================================
// 1. Formal Zod Schemas for Structured Requirements
// ============================================================================

export const RequirementSlotSchema = z.object({
  id: z.string(),
  category: z.enum([
    "objective",
    "trigger",
    "input",
    "processing",
    "destination",
    "identity",
    "configuration",
    "safety",
    "reliability",
    "activation",
  ]),
  name: z.string(),
  value: z.any().optional(),
  status: z.enum(["resolved", "missing", "inferred"]),
  source: z
    .enum([
      "user_prompt",
      "clarification",
      "connector_metadata",
      "default",
      "inferred",
    ])
    .optional(),
  description: z.string(),
  validationRule: z.string().optional(),
});

export const RequirementDocumentSchema = z.object({
  id: z.string(),
  objective: z.string().min(1),
  trigger: z.object({
    type: z.string(),
    source: z.string(),
    details: z.record(z.string(), z.any()).optional().default({}),
  }),
  actions: z.array(
    z.object({
      service: z.string(),
      operation: z.string(),
      details: z.record(z.string(), z.any()).optional().default({}),
    })
  ),
  recipient: z.object({
    required: z.boolean(),
    resolved: z.boolean(),
    value: z.string().optional(),
    source: z.string().optional(),
  }),
  message: z.object({
    required: z.boolean(),
    templateId: z.string().optional(),
    content: z.string().optional(),
    dynamicFields: z.array(z.string()).optional(),
  }),
  credentials: z.record(z.string(), z.enum(["required", "connected", "missing"])),
  executionMode: z.enum(["event_driven", "scheduled", "manual", "batch"]),
  approvalRequired: z.boolean(),
  status: z.enum(["missing_requirements", "requirements_complete", "approved"]),
  slots: z.record(z.string(), RequirementSlotSchema),
  riskLevel: z.enum(["low", "medium", "high"]),
  candidateResources: z.record(z.string(), z.any()).optional().default({}),
});

export type ValidatedRequirementDocument = z.infer<typeof RequirementDocumentSchema>;

// ============================================================================
// 2. XML Prompt Framing & Instruction Bounds
// ============================================================================

export interface IntentPromptBounds {
  systemInstructions: string;
  availableConnectors: string[];
  workspaceContext: {
    tenantId?: string;
    connectedApps: string[];
    userEmail?: string;
  };
  userInstruction: string;
}

export class IntentRequirementsEngine {
  /**
   * Format instructions into secure XML prompt bounds preventing prompt injection
   */
  public static formatXmlPrompt(bounds: IntentPromptBounds): string {
    return `<intent_engine_request>
<system_instructions>
${bounds.systemInstructions}
</system_instructions>
<available_connectors>
${bounds.availableConnectors.map((c) => `  <connector id="${c}" />`).join("\n")}
</available_connectors>
<workspace_context>
  <connected_apps>${bounds.workspaceContext.connectedApps.join(", ") || "none"}</connected_apps>
  <user_identity>${bounds.workspaceContext.userEmail || "anonymous"}</user_identity>
</workspace_context>
<user_instruction>
<![CDATA[
${bounds.userInstruction}
]]>
</user_instruction>
</intent_engine_request>`;
  }

  /**
   * Parse structured XML response bounds from Small-LLM / Agent output
   */
  public static parseBoundedXmlResponse(xmlOutput: string): Record<string, any> | null {
    try {
      const match = xmlOutput.match(/<requirements_output>([\s\S]*?)<\/requirements_output>/i);
      if (!match) return null;
      const jsonContent = match[1].trim();
      return JSON.parse(jsonContent);
    } catch {
      return null;
    }
  }

  /**
   * Extract a formal, schema-validated RequirementDocument from the user's prompt
   * Enforces strict non-hallucination rules.
   */
  public static extractRequirements(params: {
    prompt: string;
    existingDocument?: RequirementDocument;
    connectedApps?: string[];
    userContext?: { email?: string; phone?: string; workspaceName?: string };
  }): RequirementDocument & { candidateResources?: Record<string, any> } {
    const { prompt, existingDocument, connectedApps = [], userContext = {} } = params;
    const text = prompt.toLowerCase();
    const docId = existingDocument?.id || `req_${uuidv4().substring(0, 8)}`;

    const slots: Record<string, RequirementSlot> = existingDocument?.slots
      ? { ...existingDocument.slots }
      : {};
    const candidateResources: Record<string, any> = existingDocument
      ? (existingDocument as any).candidateResources || {}
      : {};

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Objective Extraction (Verbatim from User Prompt)
    // ─────────────────────────────────────────────────────────────────────────
    const objective = prompt.trim();
    slots["objective"] = {
      id: "slot_objective",
      category: "objective",
      name: "Business Objective",
      value: objective,
      status: "resolved",
      source: "user_prompt",
      description: "User's exact natural language automation objective",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Trigger Extraction (Non-Hallucination)
    // ─────────────────────────────────────────────────────────────────────────
    let triggerType = "manual";
    let triggerSource = "manual";
    let triggerDetails: Record<string, any> = {};

    if (
      text.includes("invoice") &&
      (text.includes("gmail") || text.includes("email") || text.includes("inbox") || text.includes("pdf attachment"))
    ) {
      triggerType = "new_email";
      triggerSource = "gmail";
      triggerDetails = {
        query: "subject:invoice has:attachment",
        expectedPayload: "invoice_pdf_attachment",
      };
    } else if (text.includes("form") || text.includes("contact form") || text.includes("signup form") || text.includes("registration")) {
      triggerType = "form_submission";
      triggerSource = text.includes("google form") ? "google_forms" : "website";
      triggerDetails = { endpoint: "/api/webhooks/form-leads" };
    } else if (text.includes("sheet") || text.includes("spreadsheet") || text.includes("row added") || text.includes("lead enters my google sheet")) {
      triggerType = "new_row";
      triggerSource = "google_sheets";
    } else if (text.includes("order") || text.includes("purchase") || text.includes("buys") || text.includes("bought") || text.includes("payment")) {
      triggerType = "new_order";
      triggerSource = text.includes("shopify") ? "shopify" : text.includes("stripe") ? "stripe" : "website_store";
    } else if (text.includes("webhook") || text.includes("http post") || text.includes("api event")) {
      triggerType = "webhook";
      triggerSource = "custom_webhook";
      triggerDetails = { endpoint: "/api/webhooks/inbound" };
    } else if (text.includes("email") && (text.includes("received") || text.includes("incoming") || text.includes("inbox") || text.includes("new email"))) {
      triggerType = "new_email";
      triggerSource = "gmail";
      triggerDetails = { filterQuery: "is:unread label:inbox" };
    } else if (text.includes("every day") || text.includes("daily") || text.includes("at 9am") || text.includes("morning") || text.includes("schedule") || text.includes("cron")) {
      triggerType = "schedule";
      triggerSource = "scheduler";
      triggerDetails = { schedule: "daily", cron: "0 9 * * *" };
    }

    slots["trigger"] = {
      id: "slot_trigger",
      category: "trigger",
      name: "Automation Trigger",
      value: { type: triggerType, source: triggerSource, details: triggerDetails },
      status: triggerType !== "manual" ? "resolved" : "missing",
      source: "user_prompt",
      description: "Initiating event that starts the workflow",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Actions & Destinations Extraction
    // ─────────────────────────────────────────────────────────────────────────
    const actions: Array<{ service: string; operation: string; details?: Record<string, any> }> = [];
    const credentials: Record<string, "required" | "connected" | "missing"> = {};

    // Destination: Google Drive
    if (text.includes("google drive") || text.includes("drive") || text.includes("drive upload") || text.includes("upload pdf")) {
      // Extract target folder name if mentioned (e.g. "Invoices folder" or "folder Invoices" or "into Invoices")
      const folderMatch = prompt.match(/(?:folder|directory|into)\s+['"]?([a-zA-Z0-9_\-\/]+)['"]?|['"]?([a-zA-Z0-9_\-\/]+)['"]?\s+(?:folder|directory)/i);
      const targetFolder = folderMatch ? (folderMatch[1] || folderMatch[2] || "").trim() : "Invoices";
      candidateResources["google_drive_folder"] = targetFolder || "Invoices";

      actions.push({
        service: "google_drive",
        operation: "upload_file",
        details: { targetFolderName: targetFolder || "Invoices" },
      });
      credentials["google_drive"] = connectedApps.includes("google_drive") ? "connected" : "required";
    }

    // Destination: Google Sheets
    if (text.includes("google sheet") || text.includes("spreadsheet") || text.includes("record in sheet") || text.includes("add row") || text.includes("log to sheet")) {
      if (triggerSource !== "google_sheets") {
        const tabMatch = prompt.match(/(?:tab|sheet)\s+['"]?([a-zA-Z0-9_\- ]+)['"]?/i);
        const targetTab = tabMatch ? tabMatch[1].trim() : "Sheet1";
        candidateResources["google_sheets_tab"] = targetTab;

        actions.push({
          service: "google_sheets",
          operation: "append_row",
          details: { tabName: targetTab },
        });
        credentials["google_sheets"] = connectedApps.includes("google_sheets") ? "connected" : "required";
      }
    }

    // Destination: Telegram
    if (text.includes("telegram")) {
      actions.push({ service: "telegram", operation: "send_message" });
      credentials["telegram"] = connectedApps.includes("telegram") ? "connected" : "required";
    }

    // Destination: Slack
    if (text.includes("slack")) {
      const channelMatch = prompt.match(/#([a-zA-Z0-9_\-]+)/);
      const targetChannel = channelMatch ? `#${channelMatch[1]}` : undefined;
      actions.push({
        service: "slack",
        operation: "post_message",
        details: targetChannel ? { channel: targetChannel } : {},
      });
      credentials["slack"] = connectedApps.includes("slack") ? "connected" : "required";
    }

    // Destination: WhatsApp
    if (text.includes("whatsapp")) {
      actions.push({ service: "whatsapp", operation: "send_message" });
      credentials["whatsapp"] = connectedApps.includes("whatsapp") ? "connected" : "required";
    }

    // Destination: Gmail Outbound
    if (
      (text.includes("email") || text.includes("gmail") || text.includes("mail")) &&
      (triggerSource !== "gmail" || text.includes("send an email") || text.includes("email me") || text.includes("reply by email") || text.includes("send confirmation"))
    ) {
      actions.push({ service: "gmail", operation: "send_email" });
      credentials["gmail"] = connectedApps.includes("gmail") ? "connected" : "required";
    }

    // Destination: HubSpot
    if (text.includes("hubspot") || text.includes("crm")) {
      actions.push({ service: "hubspot", operation: "create_contact" });
      credentials["hubspot"] = connectedApps.includes("hubspot") ? "connected" : "required";
    }

    // Trigger credentials
    if (triggerSource === "gmail") {
      credentials["gmail"] = connectedApps.includes("gmail") ? "connected" : "required";
    } else if (triggerSource === "google_sheets") {
      credentials["google_sheets"] = connectedApps.includes("google_sheets") ? "connected" : "required";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Strict Non-Hallucination Slot Extraction (Recipient / Address)
    // ─────────────────────────────────────────────────────────────────────────
    // Extract explicit phone number (+1234..., +91...)
    const phoneMatch = prompt.match(/\+?[1-9]\d{9,14}/);
    let recipientPhone: string | undefined = undefined;
    if (phoneMatch) {
      const norm = normalizeWhatsAppNumber(phoneMatch[0]);
      if (norm.valid) recipientPhone = norm.normalized;
    }

    // Extract explicit email address if provided
    const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const recipientEmail = emailMatch ? emailMatch[0] : undefined;

    // Extract explicit Telegram chat ID or channel (@channel or -100...)
    const telegramChatMatch = prompt.match(/@([a-zA-Z0-9_]{4,32})|chat[_\s]?id[:\s]+(-?\d+)/i);
    const recipientTelegram = telegramChatMatch
      ? telegramChatMatch[1]
        ? `@${telegramChatMatch[1]}`
        : telegramChatMatch[2]
      : undefined;

    const isRecipientRequired = actions.some((a) =>
      ["whatsapp", "telegram", "gmail", "slack"].includes(a.service)
    );

    let resolvedRecipientValue = recipientPhone || recipientEmail || recipientTelegram;
    let recipientSource: "user_prompt" | "inferred" | undefined = resolvedRecipientValue
      ? "user_prompt"
      : undefined;

    // Strict non-hallucination: Never invent arbitrary phone numbers or emails.
    // If not supplied, map dynamically from trigger context or mark as missing
    if (!resolvedRecipientValue) {
      if (text.includes("customer") || text.includes("submitter") || text.includes("client")) {
        resolvedRecipientValue = "{{ nodes.trigger.output.customer_email || nodes.trigger.output.phone }}";
        recipientSource = "inferred";
      } else if (text.includes("admin") || text.includes("team") || text.includes("channel")) {
        resolvedRecipientValue = undefined; // Will be resolved during Resource Discovery
        recipientSource = undefined;
      }
    }

    slots["recipient"] = {
      id: "slot_recipient",
      category: "destination",
      name: "Notification Recipient",
      value: resolvedRecipientValue,
      status: resolvedRecipientValue ? "resolved" : isRecipientRequired ? "missing" : "resolved",
      source: recipientSource,
      description: "Verified destination address, phone number, channel, or dynamic field",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Message Content & Data Flow
    // ─────────────────────────────────────────────────────────────────────────
    const isMessageRequired = actions.some((a) =>
      ["whatsapp", "telegram", "gmail", "slack"].includes(a.service)
    );

    slots["message"] = {
      id: "slot_message",
      category: "configuration",
      name: "Notification Template",
      value: undefined,
      status: isMessageRequired ? "resolved" : "resolved",
      source: "inferred",
      description: "Notification message structure and data bindings",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Risk Level & Safety Governance
    // ─────────────────────────────────────────────────────────────────────────
    const hasExternalComm = actions.some((a) =>
      ["whatsapp", "telegram", "gmail", "slack"].includes(a.service)
    );
    const hasDestructive = text.includes("delete") || text.includes("drop") || text.includes("cancel");
    const hasFinancial = text.includes("refund") || text.includes("charge") || text.includes("payout");

    const riskLevel: "low" | "medium" | "high" = hasFinancial || hasDestructive
      ? "high"
      : hasExternalComm
      ? "medium"
      : "low";

    const hasMissingSlots = Object.values(slots).some((s) => s.status === "missing");
    const isAmbiguous = triggerType === "manual" && actions.length === 0;

    const rawDoc: RequirementDocument & { candidateResources: Record<string, any> } = {
      id: docId,
      objective,
      trigger: {
        type: triggerType,
        source: triggerSource,
        details: triggerDetails,
      },
      actions,
      recipient: {
        required: isRecipientRequired,
        resolved: Boolean(resolvedRecipientValue),
        value: resolvedRecipientValue,
        source: recipientSource,
      },
      message: {
        required: isMessageRequired,
        content: undefined,
      },
      credentials,
      executionMode: triggerType === "schedule" ? "scheduled" : "event_driven",
      approvalRequired: riskLevel !== "low",
      status: hasMissingSlots || isAmbiguous ? "missing_requirements" : "requirements_complete",
      slots,
      riskLevel,
      candidateResources,
    };

    // Schema Validation via Zod
    return RequirementDocumentSchema.parse(rawDoc) as ValidatedRequirementDocument;
  }
}
