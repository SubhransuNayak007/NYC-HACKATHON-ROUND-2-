/**
 * ============================================================
 *  QuickReply Autonomous OS — Zero-Dashboard Business Engine
 *  src/backend/execution/ZeroDashboardEngine.ts
 *
 *  KILLER FEATURE:
 *  "Your business keeps running even when you don't."
 *  The owner never needs to open the dashboard.
 *  - Alerts sent directly to owner via WhatsApp
 *  - 2-Way Command Approval: Owner replies 'APPROVE' to execute high-risk actions
 * ============================================================
 */

import { ActionFirewall } from "../firewall/ActionFirewall";
import { getWhatsAppWebSessionProvider } from "@/channels/whatsapp/WhatsAppProviderFactory";
import { getDB, type DBData } from "@/database/db";
import { VerifiableAuditLedger } from "../audit/VerifiableAuditLedger";

export class ZeroDashboardEngine {
  /**
   * Dispatches an urgent alert to the business owner with 2-way approval instructions
   */
  static async sendOwnerAlert(alert: {
    title: string;
    description: string;
    approvalToken?: string;
    suggestedCommand?: string;
    details: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    const db = await getDB();
    const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;

    if (!ownerPhone) {
      console.warn("[ZeroDashboard] No owner phone configured to receive alert.");
      return { success: false, error: "No owner phone configured." };
    }

    const wa = getWhatsAppWebSessionProvider();
    const text = [
      `🔔 *QuickReply Business Alert*`,
      `*${alert.title}*`,
      ``,
      alert.description,
      ``,
      alert.approvalToken
        ? `To authorize, reply:\n👉 *APPROVE ${alert.approvalToken}*\nOr: *REJECT ${alert.approvalToken}*`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await wa.sendMessage(ownerPhone, text);
    VerifiableAuditLedger.record("owner_alert_dispatched", "system", { alertTitle: alert.title });
    return res;
  }

  /**
   * Parses 2-way approval messages sent by the owner to execute or cancel gated actions
   */
  static async handleOwnerInboundReply(fromPhone: string, text: string): Promise<boolean> {
    const db = await getDB();
    const ownerPhone = (process.env.OWNER_WHATSAPP_PHONE || "").replace(/\D/g, "");
    const senderClean = fromPhone.replace(/\D/g, "");

    // Only process if sender is the verified owner phone
    if (!ownerPhone || senderClean !== ownerPhone) {
      return false;
    }

    const trimmed = text.trim().toUpperCase();
    if (trimmed.startsWith("APPROVE")) {
      const parts = trimmed.split(" ");
      const token = parts[1];

      if (!token) return false;

      const resolution = ActionFirewall.resolveApproval(token.toLowerCase());
      const wa = getWhatsAppWebSessionProvider();

      if (resolution.approved && resolution.proposal) {
        // Execute approved proposal
        VerifiableAuditLedger.record("owner_authorized_action", fromPhone, { token, tool: resolution.proposal.toolName });
        await wa.sendMessage(
          fromPhone,
          `✅ *Action Authorized & Executed*\nTool: ${resolution.proposal.toolName}\nToken: ${token}`
        );
        return true;
      } else {
        await wa.sendMessage(fromPhone, `❌ *Authorization Failed*: ${resolution.error || "Invalid token"}`);
        return true;
      }
    } else if (trimmed.startsWith("REJECT")) {
      const parts = trimmed.split(" ");
      const token = parts[1];
      if (token) {
        ActionFirewall.resolveApproval(token.toLowerCase()); // Clears token
        const wa = getWhatsAppWebSessionProvider();
        await wa.sendMessage(fromPhone, `🛑 *Action Rejected*: Token ${token} has been cancelled.`);
        return true;
      }
    }

    return false;
  }
}
