/**
 * QuickReply AI Automation Operating System — Human-Like Clarification Manager
 * src/backend/automation/intelligence/ClarificationManager.ts
 *
 * Implements Engine 3 (Human-Like Clarification) of Master Prompt V2:
 * - Asks minimum necessary questions (1-2 at most) instead of long technical questionnaires
 * - Explains why each detail is required in plain business terms
 * - Never asks for details already available via authorized connector or preceding node
 * - Recommends sensible defaults for low-risk parameters
 */

import { ClarificationQuestion, RequirementDocument } from "../types";
import { ConnectorPrerequisiteEngine } from "./ConnectorPrerequisiteEngine";

export class ClarificationManager {
  /**
   * Determine the most critical clarification questions based on requirement gaps
   */
  static getNextClarificationQuestions(params: {
    requirementDoc: RequirementDocument;
    connectedApps?: string[];
    userContext?: { email?: string; phone?: string; workspaceName?: string };
  }): ClarificationQuestion[] {
    const { requirementDoc, connectedApps = [], userContext = {} } = params;
    const questions: ClarificationQuestion[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Ambiguous Trigger Clarification
    // ─────────────────────────────────────────────────────────────────────────
    if (requirementDoc.trigger.type === "manual" && requirementDoc.actions.length === 0) {
      questions.push({
        id: "clarify_trigger_and_destination",
        field: "objective",
        question: "What specific event should start this automation, and where would you like to receive alerts?",
        reason: "Every automation needs a trigger event (e.g. website form submission, new order, or scheduled time) and a destination channel.",
        suggestedOptions: [
          "When someone submits my website form → Send me a WhatsApp message",
          "When a new customer makes a purchase → Send a Telegram alert",
          "Every morning at 9:00 AM → Summarize leads in Google Sheets",
        ],
      });
      return questions;
    }

    if (requirementDoc.trigger.source === "website" && !requirementDoc.trigger.details?.formType) {
      questions.push({
        id: "clarify_form_source",
        field: "formSource",
        question: "Which form or registration system collects your submissions? Is it your website contact form, Google Forms, or another app?",
        reason: "We need to set up the correct webhook or trigger connection to listen for new entries.",
        suggestedOptions: ["Website Contact Form (Webhook)", "Google Forms", "Shopify Checkout"],
        defaultValue: "Website Contact Form (Webhook)",
      });
      return questions;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Action & Destination Clarification
    // ─────────────────────────────────────────────────────────────────────────
    for (const action of requirementDoc.actions) {
      const prereq = ConnectorPrerequisiteEngine.evaluatePrerequisites({
        connectorId: action.service,
        operationId: action.operation,
        connectedApps,
        parameters: {
          to: requirementDoc.recipient.value,
          chatId: requirementDoc.recipient.value,
        },
      });

      // Recipient Missing for WhatsApp
      if (action.service === "whatsapp" && prereq.status === "MISSING_RECIPIENT") {
        questions.push({
          id: "clarify_whatsapp_recipient",
          field: "recipientPhone",
          question: "Which WhatsApp number should receive the notifications? Please include the country code (e.g. +91 98765 43210 or +1 415 555 2671).",
          reason: "WhatsApp requires an international E.164 phone number to route direct message alerts.",
          suggestedOptions: userContext.phone ? [userContext.phone] : undefined,
          defaultValue: userContext.phone,
        });
        return questions; // Ask one focused question at a time
      }

      // Recipient Missing for Telegram
      if (action.service === "telegram" && prereq.status === "MISSING_RECIPIENT") {
        questions.push({
          id: "clarify_telegram_destination",
          field: "telegramChatId",
          question: "Where should Telegram alerts be sent? Would you like them delivered to your private Telegram chat, a group, or a channel?",
          reason: "Telegram bots can only message users who have initiated a conversation or groups where the bot is an admin.",
          suggestedOptions: ["My Private Telegram Chat", "A Telegram Group / Channel (@ChannelName)"],
          defaultValue: "My Private Telegram Chat",
        });
        return questions;
      }

      // Recipient Missing for Gmail (when not mapped from customer input)
      if (action.service === "gmail" && prereq.status === "MISSING_RECIPIENT") {
        questions.push({
          id: "clarify_email_recipient",
          field: "recipientEmail",
          question: "Which email address should receive notifications?",
          reason: "Required to deliver email dispatches.",
          suggestedOptions: userContext.email ? [userContext.email] : undefined,
          defaultValue: userContext.email,
        });
        return questions;
      }

      // Google Sheets Spreadsheet Missing
      if (action.service === "google_sheets" && prereq.status === "MISSING_RESOURCE") {
        questions.push({
          id: "clarify_google_sheet",
          field: "spreadsheetName",
          question: "Which Google Sheet and tab name should store the new entries?",
          reason: "Ensures incoming records are written to the right tabular ledger without overwriting other tabs.",
          suggestedOptions: ["Leads (Sheet1)", "Customer Orders", "Form Submissions"],
          defaultValue: "Leads (Sheet1)",
        });
        return questions;
      }
    }

    return questions;
  }
}
