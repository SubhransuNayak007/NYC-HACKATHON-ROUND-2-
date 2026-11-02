/**
 * QuickReply AI Automation Operating System — Dynamic Connector Onboarding Engine
 * src/backend/automation/intelligence/DynamicConnectorOnboarding.ts
 *
 * Implements Engine 3 (Dynamic Connector Onboarding) of Master Prompt V2:
 * Dedicated onboarding steps for each service distinguishing:
 * - Authenticating sender account
 * - Identifying recipient/destination
 * - Discovering accessible resources
 * - Testing connections securely
 */

export interface OnboardingStep {
  connectorId: string;
  title: string;
  description: string;
  authType: "oauth2" | "api_key" | "resource_selection" | "bot_token";
  instructions: string[];
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "password" | "select" | "oauth_button";
    placeholder?: string;
    required: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
  oauthUrl?: string;
}

export class DynamicConnectorOnboarding {
  /**
   * Get custom onboarding workflow for a requested service
   */
  static getOnboardingPlan(connectorId: string, currentStatus?: { isConnected?: boolean }): OnboardingStep | null {
    switch (connectorId) {
      case "gmail":
        return {
          connectorId: "gmail",
          title: "Connect Your Gmail Account",
          description:
            "Authorize QuickReply via official Google OAuth 2.0 to send notification emails from your verified address. We never ask for your Google password.",
          authType: "oauth2",
          instructions: [
            "Click 'Connect Google Account' below.",
            "Choose your designated sender Google account.",
            "Grant permission to send emails on your behalf.",
          ],
          fields: [
            {
              name: "oauth_action",
              label: "Authorize Google OAuth",
              type: "oauth_button",
              required: true,
            },
          ],
          oauthUrl: "/api/auth/google?scope=gmail.send",
        };

      case "whatsapp":
        return {
          connectorId: "whatsapp",
          title: "Connect WhatsApp Business Cloud API",
          description:
            "Connect your official Meta WhatsApp Business Account (WABA) or authorized messaging provider. Sender credentials and recipient mobile numbers are separate identities.",
          authType: "oauth2",
          instructions: [
            "Authenticate using your Meta Business Manager account.",
            "Select your verified WhatsApp Business phone number.",
            "We securely store your token in the AES-256-GCM vault.",
          ],
          fields: [
            {
              name: "senderPhoneNumberId",
              label: "Sender Phone Number ID",
              type: "text",
              placeholder: "e.g. 109283746591028",
              required: true,
            },
            {
              name: "wabaToken",
              label: "System User Access Token",
              type: "password",
              placeholder: "EAABw...",
              required: true,
            },
          ],
        };

      case "telegram":
        return {
          connectorId: "telegram",
          title: "Connect Telegram Bot via @BotFather",
          description:
            "Create a Telegram Bot to send automated notifications. A bot cannot message a user who hasn't first opened a chat with it.",
          authType: "bot_token",
          instructions: [
            "Open Telegram and search for @BotFather.",
            "Send /newbot and follow instructions to name your bot.",
            "Copy the HTTP API token provided by BotFather and enter it below.",
            "Open your newly created bot in Telegram and press 'Start' so we can discover your Chat ID.",
          ],
          fields: [
            {
              name: "botToken",
              label: "Bot API Token (from @BotFather)",
              type: "password",
              placeholder: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
              required: true,
            },
          ],
        };

      case "slack":
        return {
          connectorId: "slack",
          title: "Connect Slack Workspace",
          description: "Install QuickReply Bot to your Slack workspace and select your alert channel.",
          authType: "oauth2",
          instructions: [
            "Click 'Add to Slack' to grant workspace notification permissions.",
            "Choose which channel (e.g. #leads, #alerts) should receive messages.",
          ],
          fields: [
            {
              name: "slack_oauth",
              label: "Add to Slack",
              type: "oauth_button",
              required: true,
            },
          ],
          oauthUrl: "/api/auth/slack",
        };

      case "google_sheets":
        return {
          connectorId: "google_sheets",
          title: "Connect Google Sheets",
          description: "Authorize Google Drive & Sheets to automatically append rows or read lead records.",
          authType: "oauth2",
          instructions: [
            "Authenticate with your Google account.",
            "Select the spreadsheet you want to link.",
          ],
          fields: [
            {
              name: "sheets_oauth",
              label: "Connect Google Drive",
              type: "oauth_button",
              required: true,
            },
          ],
          oauthUrl: "/api/auth/google?scope=spreadsheets",
        };

      default:
        return null;
    }
  }
}
