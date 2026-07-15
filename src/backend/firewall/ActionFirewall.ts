/**
 * ============================================================
 *  QuickReply Autonomous OS — Action Firewall
 *  src/backend/firewall/ActionFirewall.ts
 *
 *  AI IS NOT TRUSTED:
 *  Every AI-generated action is treated as an untrusted proposal.
 *  The Action Firewall inspects, scores, validates, and gates all actions
 *  before physical execution against platform APIs or database state.
 * ============================================================
 */

import { CapabilityEngine, type ChannelPlatform } from "@/channels/core/CapabilityEngine";
import { PlatformPolicyEngine } from "@/channels/core/PlatformPolicyEngine";
import { getDB, type DBData } from "@/database/db";

export type ActionRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface AIActionProposal {
  actionId: string;
  toolName: string;
  organizationId: string;
  platform?: ChannelPlatform;
  targetId?: string; // phone, username, commentId
  args: Record<string, any>;
  proposedByAgent: string;
  timestamp: string;
}

export interface FirewallDecision {
  allowed: boolean;
  riskLevel: ActionRiskLevel;
  requiresOwnerApproval: boolean;
  approvalToken?: string;
  reason?: string;
  violations: string[];
  sanitizedArgs?: Record<string, any>;
}

export class ActionFirewall {
  private static pendingApprovals = new Map<string, { proposal: AIActionProposal; expiresAt: number }>();

  /**
   * Evaluates an AI proposal against the 6-stage security firewall
   */
  static async evaluate(proposal: AIActionProposal): Promise<FirewallDecision> {
    const violations: string[] = [];
    const tool = proposal.toolName;

    // 1. Stage 1: Platform Capability Check
    if (proposal.platform) {
      if (tool.includes("message") || tool.includes("send")) {
        const cap = CapabilityEngine.isOperationSupported(proposal.platform, "send_message");
        if (!cap.supported) violations.push(`Operation unsupported on ${proposal.platform}: ${cap.reason}`);
      } else if (tool.includes("comment")) {
        const cap = CapabilityEngine.isOperationSupported(proposal.platform, "reply_comment");
        if (!cap.supported) violations.push(`Comment reply unsupported on ${proposal.platform}`);
      }
    }

    // 2. Stage 2: Risk Level Classification
    let riskLevel: ActionRiskLevel = "LOW";
    let requiresOwnerApproval = false;

    if (
      tool === "refund_order" ||
      tool.includes("refund") ||
      tool === "change_product_price" ||
      tool === "delete_customer" ||
      tool === "approve_restock"
    ) {
      riskLevel = "HIGH";
      requiresOwnerApproval = true;
    } else if (
      tool.includes("publish_post") ||
      tool.includes("update_customer") ||
      tool.includes("escalate")
    ) {
      riskLevel = "MEDIUM";
    }

    // High Financial Value threshold check
    if (proposal.args?.amount && Number(proposal.args.amount) > 5000) {
      riskLevel = "HIGH";
      requiresOwnerApproval = true;
    }

    // 3. Stage 3: Data Validation against Database
    const db = await getDB();
    if (proposal.args?.productId) {
      const p = (db.waProducts || []).find((prod) => prod.id === proposal.args.productId);
      if (!p) violations.push(`Referenced productId '${proposal.args.productId}' does not exist in business catalog.`);
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        riskLevel,
        requiresOwnerApproval: false,
        reason: violations.join(" | "),
        violations,
      };
    }

    // 4. Stage 4: Owner Approval Gate for HIGH risk actions
    let approvalToken: string | undefined;
    if (requiresOwnerApproval) {
      approvalToken = `appr_${Math.floor(100000 + Math.random() * 900000)}`;
      this.pendingApprovals.set(approvalToken, {
        proposal,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });

      return {
        allowed: false,
        riskLevel: "HIGH",
        requiresOwnerApproval: true,
        approvalToken,
        reason: "Action classified as HIGH risk. Staged for business owner authorization.",
        violations: [],
      };
    }

    return {
      allowed: true,
      riskLevel,
      requiresOwnerApproval: false,
      sanitizedArgs: proposal.args,
      violations: [],
    };
  }

  /**
   * Resolves a pending owner authorization token
   */
  static resolveApproval(token: string): { approved: boolean; proposal?: AIActionProposal; error?: string } {
    const entry = this.pendingApprovals.get(token);
    if (!entry) {
      return { approved: false, error: "Invalid or expired approval token." };
    }

    if (entry.expiresAt < Date.now()) {
      this.pendingApprovals.delete(token);
      return { approved: false, error: "Approval token has expired." };
    }

    this.pendingApprovals.delete(token);
    return { approved: true, proposal: entry.proposal };
  }
}
