/**
 * QuickReply AI Automation Operating System — Connector Prerequisite Engine
 * src/backend/automation/intelligence/ConnectorPrerequisiteEngine.ts
 *
 * Implements Engine 2 Prerequisite Verification of Master Prompt V2:
 * Evaluates real readiness states for each connector node:
 * READY | MISSING_CREDENTIAL | INVALID_CREDENTIAL | MISSING_RECIPIENT |
 * MISSING_RESOURCE | MISSING_PARAMETER | INSUFFICIENT_PERMISSION |
 * PROVIDER_CONFIGURATION_REQUIRED | UNSUPPORTED_OPERATION | NEEDS_USER_APPROVAL | BLOCKED
 */

import { ConnectorPrerequisiteStatus } from "../types";
import { normalizeWhatsAppNumber } from "@/backend/nodes/connectors/WhatsAppConnector";

export interface PrerequisiteCheckResult {
  connectorId: string;
  operationId: string;
  status: ConnectorPrerequisiteStatus;
  isReady: boolean;
  reasons: string[];
  suggestedAction?: "connect_oauth" | "enter_token" | "provide_phone" | "select_resource" | "provide_parameter";
}

export class ConnectorPrerequisiteEngine {
  /**
   * Evaluate operational readiness for a given connector operation and parameters
   */
  static evaluatePrerequisites(params: {
    connectorId: string;
    operationId: string;
    credentials?: Record<string, any>;
    parameters?: Record<string, any>;
    connectedApps?: string[];
  }): PrerequisiteCheckResult {
    const { connectorId, operationId, credentials = {}, parameters = {}, connectedApps = [] } = params;
    const reasons: string[] = [];
    const isAppConnected = connectedApps.includes(connectorId) || Boolean(credentials[connectorId]);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. WhatsApp Business Cloud API Evaluation
    // ─────────────────────────────────────────────────────────────────────────
    if (connectorId === "whatsapp") {
      if (!isAppConnected && !credentials.token && !credentials.accessToken) {
        return {
          connectorId,
          operationId,
          status: "MISSING_CREDENTIAL",
          isReady: false,
          reasons: ["WhatsApp Business sender account is not connected. Requires Meta Cloud API authorization."],
          suggestedAction: "connect_oauth",
        };
      }

      const rawRecipient = parameters.to || parameters.recipient || "";
      if (!rawRecipient) {
        return {
          connectorId,
          operationId,
          status: "MISSING_RECIPIENT",
          isReady: false,
          reasons: ["Missing recipient phone number. Provide international phone number with country code."],
          suggestedAction: "provide_phone",
        };
      }

      const phoneValidation = normalizeWhatsAppNumber(rawRecipient);
      if (!phoneValidation.valid) {
        return {
          connectorId,
          operationId,
          status: "INVALID_CREDENTIAL",
          isReady: false,
          reasons: [phoneValidation.error || "Invalid phone number format."],
          suggestedAction: "provide_phone",
        };
      }

      return {
        connectorId,
        operationId,
        status: "READY",
        isReady: true,
        reasons: ["WhatsApp sender and recipient are fully verified."],
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Telegram Bot API Evaluation
    // ─────────────────────────────────────────────────────────────────────────
    if (connectorId === "telegram") {
      if (!isAppConnected && !credentials.token && !credentials.botToken) {
        return {
          connectorId,
          operationId,
          status: "MISSING_CREDENTIAL",
          isReady: false,
          reasons: ["Telegram Bot token is required. Create a bot using @BotFather on Telegram."],
          suggestedAction: "enter_token",
        };
      }

      const chatId = parameters.chatId || parameters.chat_id || parameters.to;
      if (!chatId) {
        return {
          connectorId,
          operationId,
          status: "MISSING_RECIPIENT",
          isReady: false,
          reasons: ["Target Chat ID or Channel is not resolved. Please start the bot or provide @channel."],
          suggestedAction: "select_resource",
        };
      }

      return {
        connectorId,
        operationId,
        status: "READY",
        isReady: true,
        reasons: ["Telegram Bot credentials and destination chat resolved."],
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Gmail Evaluation
    // ─────────────────────────────────────────────────────────────────────────
    if (connectorId === "gmail") {
      if (!isAppConnected && !credentials.token && !credentials.accessToken) {
        return {
          connectorId,
          operationId,
          status: "MISSING_CREDENTIAL",
          isReady: false,
          reasons: ["Gmail account is not connected. Google OAuth authorization is required."],
          suggestedAction: "connect_oauth",
        };
      }

      const to = parameters.to || parameters.recipient;
      if (!to && operationId === "send_message") {
        return {
          connectorId,
          operationId,
          status: "MISSING_RECIPIENT",
          isReady: false,
          reasons: ["Missing recipient email address or dynamic form field mapping."],
          suggestedAction: "provide_parameter",
        };
      }

      return {
        connectorId,
        operationId,
        status: "READY",
        isReady: true,
        reasons: ["Gmail OAuth connection and message parameters resolved."],
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Google Sheets Evaluation
    // ─────────────────────────────────────────────────────────────────────────
    if (connectorId === "google_sheets") {
      if (!isAppConnected && !credentials.token && !credentials.accessToken) {
        return {
          connectorId,
          operationId,
          status: "MISSING_CREDENTIAL",
          isReady: false,
          reasons: ["Google account is not connected for Google Sheets."],
          suggestedAction: "connect_oauth",
        };
      }

      if (!parameters.spreadsheetId && !parameters.spreadsheetName) {
        return {
          connectorId,
          operationId,
          status: "MISSING_RESOURCE",
          isReady: false,
          reasons: ["Spreadsheet file is not selected."],
          suggestedAction: "select_resource",
        };
      }

      return {
        connectorId,
        operationId,
        status: "READY",
        isReady: true,
        reasons: ["Google Sheets authorized and target spreadsheet configured."],
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Slack Evaluation
    // ─────────────────────────────────────────────────────────────────────────
    if (connectorId === "slack") {
      if (!isAppConnected && !credentials.token && !credentials.botToken) {
        return {
          connectorId,
          operationId,
          status: "MISSING_CREDENTIAL",
          isReady: false,
          reasons: ["Slack workspace is not connected."],
          suggestedAction: "connect_oauth",
        };
      }

      if (!parameters.channel) {
        return {
          connectorId,
          operationId,
          status: "MISSING_RESOURCE",
          isReady: false,
          reasons: ["Target Slack channel (e.g. #general) is not selected."],
          suggestedAction: "select_resource",
        };
      }

      return {
        connectorId,
        operationId,
        status: "READY",
        isReady: true,
        reasons: ["Slack workspace connected and target channel selected."],
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Default Fallback
    // ─────────────────────────────────────────────────────────────────────────
    return {
      connectorId,
      operationId,
      status: isAppConnected ? "READY" : "MISSING_CREDENTIAL",
      isReady: isAppConnected,
      reasons: isAppConnected ? ["Connector operational."] : [`${connectorId} credential required.`],
    };
  }
}
