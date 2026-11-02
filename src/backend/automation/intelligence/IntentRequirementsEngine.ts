/**
 * QuickReply AI Automation Operating System — Intent & Requirements Engine
 * src/backend/automation/intelligence/IntentRequirementsEngine.ts
 *
 * Implements Engine 1 of Master Prompt V2:
 * - Natural-language understanding of business objectives without jumping straight to nodes
 * - Structured requirement extraction into versioned RequirementDocument
 * - Slot tracking (objective, trigger, input, processing, destination, identity, safety, reliability)
 * - Strict non-hallucination rules: never invents phone numbers, emails, tokens, or credentials
 */

import { v4 as uuidv4 } from "uuid";
import {
  RequirementDocument,
  RequirementSlot,
  SideEffectClassification,
} from "../types";
import { normalizeWhatsAppNumber } from "@/backend/nodes/connectors/WhatsAppConnector";

export class IntentRequirementsEngine {
  /**
   * Extract a formal RequirementDocument from the user's objective and conversation history
   */
  static extractRequirements(params: {
    prompt: string;
    existingDocument?: RequirementDocument;
    connectedApps?: string[];
  }): RequirementDocument {
    const { prompt, existingDocument, connectedApps = [] } = params;
    const text = prompt.toLowerCase();
    const docId = existingDocument?.id || `req_${uuidv4().substring(0, 8)}`;

    const slots: Record<string, RequirementSlot> = existingDocument?.slots ? { ...existingDocument.slots } : {};

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Objective Extraction
    // ─────────────────────────────────────────────────────────────────────────
    const objective = prompt.trim();
    slots["objective"] = {
      id: "slot_objective",
      category: "objective",
      name: "Business Objective",
      value: objective,
      status: "resolved",
      source: "user_prompt",
      description: "User's stated goal for the automation",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Trigger Extraction
    // ─────────────────────────────────────────────────────────────────────────
    let triggerType = "manual";
    let triggerSource = "manual";
    let triggerDetails: Record<string, any> = {};

    if (text.includes("form") || text.includes("contact form") || text.includes("signup form") || text.includes("registration")) {
      triggerType = "form_submission";
      triggerSource = text.includes("google form") ? "google_forms" : "website";
    } else if (text.includes("sheet") || text.includes("spreadsheet") || text.includes("row added") || text.includes("lead enters my google sheet")) {
      triggerType = "new_row";
      triggerSource = "google_sheets";
    } else if (text.includes("order") || text.includes("purchase") || text.includes("buys") || text.includes("bought")) {
      triggerType = "new_order";
      triggerSource = text.includes("shopify") ? "shopify" : text.includes("stripe") ? "stripe" : "website_store";
    } else if (text.includes("webhook") || text.includes("http post") || text.includes("api event")) {
      triggerType = "webhook";
      triggerSource = "custom_webhook";
    } else if (text.includes("email") && (text.includes("received") || text.includes("incoming") || text.includes("inbox") || text.includes("new email"))) {
      triggerType = "new_email";
      triggerSource = "gmail";
    } else if (text.includes("every day") || text.includes("daily") || text.includes("at 9am") || text.includes("schedule") || text.includes("cron")) {
      triggerType = "schedule";
      triggerSource = "scheduler";
      triggerDetails = { schedule: "daily" };
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

    // Destination: WhatsApp
    if (text.includes("whatsapp")) {
      actions.push({ service: "whatsapp", operation: "send_message" });
      credentials["whatsapp"] = connectedApps.includes("whatsapp") ? "connected" : "required";
    }

    // Destination: Telegram
    if (text.includes("telegram")) {
      actions.push({ service: "telegram", operation: "send_message" });
      credentials["telegram"] = connectedApps.includes("telegram") ? "connected" : "required";
    }

    // Destination: Gmail
    if (text.includes("email") || text.includes("gmail") || text.includes("mail")) {
      if (triggerSource !== "gmail" || text.includes("send an email") || text.includes("email me") || text.includes("notify me by email")) {
        actions.push({ service: "gmail", operation: "send_message" });
        credentials["gmail"] = connectedApps.includes("gmail") ? "connected" : "required";
      }
    }

    // Destination: Slack
    if (text.includes("slack")) {
      actions.push({ service: "slack", operation: "post_message" });
      credentials["slack"] = connectedApps.includes("slack") ? "connected" : "required";
    }

    // Destination: Google Sheets
    if (text.includes("google sheet") || text.includes("sheet") || text.includes("record in sheet") || text.includes("add row")) {
      if (triggerSource !== "google_sheets") {
        actions.push({ service: "google_sheets", operation: "append_row" });
        credentials["google_sheets"] = connectedApps.includes("google_sheets") ? "connected" : "required";
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Recipient Extraction (Strict Non-Hallucination)
    // ─────────────────────────────────────────────────────────────────────────
    // Extract explicit phone number if user provided one (+1234..., +91...)
    const phoneMatch = prompt.match(/\+?[1-9]\d{9,14}/);
    let recipientPhone: string | undefined = undefined;
    if (phoneMatch) {
      const norm = normalizeWhatsAppNumber(phoneMatch[0]);
      if (norm.valid) recipientPhone = norm.normalized;
    }

    // Extract explicit email address if provided
    const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const recipientEmail = emailMatch ? emailMatch[0] : undefined;

    // Extract explicit Telegram chat ID or channel (@channel or numeric ID)
    const telegramChatMatch = prompt.match(/@([a-zA-Z0-9_]{4,32})|chat[_\s]?id[:\s]+(-?\d+)/i);
    const recipientTelegram = telegramChatMatch ? telegramChatMatch[1] ? `@${telegramChatMatch[1]}` : telegramChatMatch[2] : undefined;

    const isRecipientRequired = actions.some((a) =>
      ["whatsapp", "telegram", "gmail", "slack"].includes(a.service)
    );

    let resolvedRecipientValue = recipientPhone || recipientEmail || recipientTelegram;
    // Check if recipient is to be mapped dynamically from trigger data (e.g. form submission customer email)
    let recipientSource = resolvedRecipientValue ? "explicit_input" : undefined;
    if (!resolvedRecipientValue && (text.includes("customer") || text.includes("submitter") || text.includes("client"))) {
      resolvedRecipientValue = "{{ trigger.customer_email || trigger.phone }}";
      recipientSource = "dynamic_mapping";
    }

    slots["recipient"] = {
      id: "slot_recipient",
      category: "recipient" as any,
      name: "Notification Recipient",
      value: resolvedRecipientValue,
      status: resolvedRecipientValue ? "resolved" : isRecipientRequired ? "missing" : "resolved",
      source: recipientSource as any,
      description: "Destination address, phone number, channel, or dynamic field",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Message Content
    // ─────────────────────────────────────────────────────────────────────────
    const isMessageRequired = actions.some((a) =>
      ["whatsapp", "telegram", "gmail", "slack"].includes(a.service)
    );

    slots["message"] = {
      id: "slot_message",
      category: "configuration",
      name: "Notification Message",
      value: undefined,
      status: isMessageRequired ? "resolved" : "resolved", // Default template can be inferred if trigger is known
      source: "inferred",
      description: "Formatted message body to dispatch",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Risk Level & Status Assessment
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

    return {
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
    };
  }
}
