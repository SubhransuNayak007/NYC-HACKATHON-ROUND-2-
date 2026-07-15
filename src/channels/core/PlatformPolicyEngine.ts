/**
 * ============================================================
 *  QuickReply — Platform Policy Engine
 *  src/channels/core/PlatformPolicyEngine.ts
 *
 *  Validates outbound messages, comments, and publishing operations
 *  against real platform compliance rules before sending.
 * ============================================================
 */

import { CapabilityEngine, ChannelPlatform } from "./CapabilityEngine";

export type PolicyDecision = "ALLOW" | "BLOCK" | "HUMAN_APPROVAL" | "REQUIRES_REAUTH" | "NOT_SUPPORTED";

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  allowed: boolean;
  reason?: string;
  sanitizedContent?: string;
  violations?: string[];
}

export interface OutboundContext {
  platform: ChannelPlatform;
  operation: "send_message" | "reply_comment" | "private_comment_reply" | "publish_post";
  recipientId?: string;
  lastInboundTimestamp?: string; // ISO string for messaging window verification
  content: string;
  isTokenValid: boolean;
  hasRequiredScopes: boolean;
}

export class PlatformPolicyEngine {
  /**
   * Evaluates an outbound operation against platform constraints
   */
  static evaluate(ctx: OutboundContext): PolicyEvaluationResult {
    const violations: string[] = [];

    // 1. Check token validity
    if (!ctx.isTokenValid) {
      return {
        decision: "REQUIRES_REAUTH",
        allowed: false,
        reason: `Authentication token for ${ctx.platform} is expired or invalid. Please re-authenticate.`,
        violations: ["TOKEN_EXPIRED"],
      };
    }

    // 2. Check platform capability
    const capCheck = CapabilityEngine.isOperationSupported(ctx.platform, ctx.operation);
    if (!capCheck.supported) {
      return {
        decision: "NOT_SUPPORTED",
        allowed: false,
        reason: capCheck.reason || "Operation is not supported by the platform API.",
        violations: ["OPERATION_UNSUPPORTED"],
      };
    }

    // 3. Check required scopes / permissions
    if (!ctx.hasRequiredScopes) {
      return {
        decision: "REQUIRES_REAUTH",
        allowed: false,
        reason: `Application lacks required permissions on ${ctx.platform} to perform this action.`,
        violations: ["MISSING_SCOPES"],
      };
    }

    // 4. Instagram 24-Hour Messaging Window Rule
    if (ctx.platform === "instagram" && ctx.operation === "send_message") {
      if (ctx.lastInboundTimestamp) {
        const lastInbound = new Date(ctx.lastInboundTimestamp).getTime();
        const diffHours = (Date.now() - lastInbound) / (1000 * 60 * 60);

        if (diffHours > 24) {
          return {
            decision: "HUMAN_APPROVAL",
            allowed: false,
            reason:
              "Meta Instagram 24-hour messaging window has elapsed. Automated DMs cannot be sent outside the 24-hour customer service window.",
            violations: ["24_HOUR_WINDOW_EXPIRED"],
          };
        }
      }
    }

    // 5. Content length restrictions
    const len = ctx.content ? ctx.content.length : 0;
    if (len === 0) {
      return {
        decision: "BLOCK",
        allowed: false,
        reason: "Message content cannot be empty.",
        violations: ["EMPTY_CONTENT"],
      };
    }

    if (ctx.platform === "instagram" && ctx.operation === "reply_comment" && len > 300) {
      violations.push("Comment length exceeds 300 character Instagram limit.");
    } else if (ctx.platform === "whatsapp" && len > 4096) {
      violations.push("Message length exceeds 4096 character WhatsApp limit.");
    } else if (ctx.platform === "linkedin" && ctx.operation === "publish_post" && len > 3000) {
      violations.push("Post length exceeds 3000 character LinkedIn limit.");
    }

    if (violations.length > 0) {
      return {
        decision: "BLOCK",
        allowed: false,
        reason: violations.join(" "),
        violations,
      };
    }

    return {
      decision: "ALLOW",
      allowed: true,
      sanitizedContent: ctx.content.trim(),
    };
  }
}
