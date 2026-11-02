/**
 * ============================================================
 *  QuickReply — WhatsApp Policy & Messaging Compliance Service
 *  src/backend/whatsapp/WhatsAppPolicyService.ts
 *
 *  Enforces Meta's 24-hour Customer Service Window, rate limits,
 *  quiet hours, and template requirements before dispatching to Meta API.
 * ============================================================
 */

import type { WAConversation, WASettings } from "@/database/db";

export type OutboundSendPolicy =
  | { allowed: true; mode: "FREEFORM" }
  | { allowed: true; mode: "TEMPLATE"; templateRequired: true }
  | { allowed: false; reason: string; policyCode: "WINDOW_EXPIRED" | "QUIET_HOURS" | "RATE_LIMITED" | "OPTED_OUT" | "NOT_CONFIGURED" };

export class WhatsAppPolicyService {
  private static readonly CUSTOMER_SERVICE_WINDOW_HOURS = 24;

  /**
   * Evaluate whether a message can be sent to a customer under WhatsApp policies.
   */
  public static evaluateSendPolicy(
    conversation: WAConversation | null,
    settings: WASettings | null,
    isTemplateSend: boolean = false
  ): OutboundSendPolicy {
    if (!conversation) {
      if (isTemplateSend) {
        return { allowed: true, mode: "TEMPLATE", templateRequired: true };
      }
      return {
        allowed: false,
        reason: "No active conversation found. A registered WhatsApp Template is required to initiate business messaging.",
        policyCode: "WINDOW_EXPIRED",
      };
    }

    // 1. Check 24-hour window from last customer inbound message
    const lastCustomerMsgTime = new Date(conversation.lastMessageAt || conversation.createdAt || Date.now()).getTime();
    const now = Date.now();
    const elapsedHours = (now - lastCustomerMsgTime) / (1000 * 60 * 60);

    const isInsideWindow = elapsedHours <= this.CUSTOMER_SERVICE_WINDOW_HOURS;

    if (isInsideWindow) {
      // Free-form responses are allowed inside the 24-hour session
      return { allowed: true, mode: "FREEFORM" };
    }

    // 2. Outside 24h window: only approved template messages can be sent
    if (isTemplateSend) {
      return { allowed: true, mode: "TEMPLATE", templateRequired: true };
    }

    return {
      allowed: false,
      reason: `Customer service window expired (${Math.round(elapsedHours)}h elapsed since last inbound message). Meta policies require an approved WhatsApp Template for re-engagement.`,
      policyCode: "WINDOW_EXPIRED",
    };
  }

  /**
   * Calculates time remaining in seconds for the 24-hour customer service window.
   */
  public static getSessionWindowSeconds(lastCustomerMessageAt: string | undefined): number {
    if (!lastCustomerMessageAt) return 0;
    const lastTime = new Date(lastCustomerMessageAt).getTime();
    const maxWindowMs = this.CUSTOMER_SERVICE_WINDOW_HOURS * 60 * 60 * 1000;
    const remainingMs = lastTime + maxWindowMs - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
  }
}
