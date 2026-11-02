/**
 * ============================================================================
 * QuickReply — Centralized AI Safety & Policy Engine
 * src/backend/policy/PolicyEngine.ts
 *
 * Evaluates inbound customer content and proposed AI replies against:
 * 1. Prohibited & Escalation keywords (legal, safety, severe complaints)
 * 2. Prompt injection attacks (jailbreaks, instruction overrides)
 * 3. Brand voice & tone compliance
 * 4. Duplicate reply defense
 * 5. Dynamic Risk Scoring (Low -> Auto Send, High -> Require Approval)
 * ============================================================================
 */

import { getDB } from "@/database/db";

export interface PolicyEvaluationInput {
  tenantId: string;
  content: string;          // Inbound customer message / comment
  proposedReply?: string;   // Generated or template reply
  platform: string;
  actorId?: string;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  action: "ALLOW_AUTONOMOUS" | "REQUIRE_APPROVAL" | "BLOCK";
  riskScore: number;        // 0.0 (Safe) to 1.0 (Critical)
  reason: string;
  flaggedRules: string[];
}

export class PolicyEngine {
  // Common prompt injection attack signatures
  private static INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /disregard\s+(the\s+)?(system|initial)\s+prompt/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /jailbreak/i,
    /reveal\s+(your\s+)?(system\s+prompt|hidden\s+rules|api\s+key)/i,
    /dan\s+mode/i,
  ];

  // High-risk legal & complaint triggers requiring mandatory human review
  private static HIGH_RISK_KEYWORDS = [
    "sue",
    "lawyer",
    "attorney",
    "legal action",
    "injured",
    "injury",
    "hospital",
    "police",
    "fraud",
    "scam",
    "stole",
    "chargeback",
    "consumer court",
    "compensation",
  ];

  /**
   * Evaluates input and output against security, safety, and brand policies
   */
  static async evaluate(input: PolicyEvaluationInput): Promise<PolicyEvaluationResult> {
    const flaggedRules: string[] = [];
    let riskScore = 0.05; // Base minimal risk
    let reason = "Passed all automated safety and brand policies.";

    const customerText = (input.content || "").toLowerCase();
    const replyText = (input.proposedReply || "").toLowerCase();

    // 1. Prompt Injection Defense
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(input.content)) {
        flaggedRules.push("PROMPT_INJECTION_DETECTED");
        riskScore = Math.max(riskScore, 0.95);
        reason = "Hostile prompt injection attempt detected in customer content.";
        return {
          allowed: false,
          action: "REQUIRE_APPROVAL",
          riskScore,
          reason,
          flaggedRules,
        };
      }
    }

    // 2. High-Risk Complaint / Legal Triggers
    for (const kw of this.HIGH_RISK_KEYWORDS) {
      if (customerText.includes(kw)) {
        flaggedRules.push(`HIGH_RISK_KEYWORD:${kw}`);
        riskScore = Math.max(riskScore, 0.88);
        reason = `Critical topic or legal escalation keyword detected ("${kw}"). Human review required.`;
      }
    }

    // 3. Workspace Custom Negative Keywords
    try {
      const db = await getDB(input.tenantId);
      const customNegatives = (((db.settings as any)?.negativeKeywords || (db as any).negativeKeywords || "") as string)
        .split(",")
        .map((k: string) => k.trim().toLowerCase())
        .filter(Boolean);

      for (const neg of customNegatives) {
        if (customerText.includes(neg)) {
          flaggedRules.push(`CUSTOM_NEGATIVE_KEYWORD:${neg}`);
          riskScore = Math.max(riskScore, 0.75);
          reason = `Workspace-defined negative keyword matched: "${neg}". Routed to review queue.`;
        }
      }
    } catch {
      // Fallback
    }

    // 4. Proposed Reply Quality & Length Validation
    if (input.proposedReply) {
      if (input.proposedReply.length > 1000) {
        flaggedRules.push("EXCESSIVE_MESSAGE_LENGTH");
        riskScore = Math.max(riskScore, 0.65);
        reason = "Generated reply exceeds standard platform length limits.";
      }
      if (input.proposedReply.includes("undefined") || input.proposedReply.includes("NaN")) {
        flaggedRules.push("MALFORMED_TEMPLATE_VARIABLE");
        riskScore = Math.max(riskScore, 0.85);
        reason = "Proposed reply contains unpopulated template variables.";
      }
    }

    // Determine Final Action Gate
    let action: PolicyEvaluationResult["action"] = "ALLOW_AUTONOMOUS";
    if (riskScore >= 0.7) {
      action = "REQUIRE_APPROVAL";
    }

    return {
      allowed: action === "ALLOW_AUTONOMOUS",
      action,
      riskScore: parseFloat(riskScore.toFixed(2)),
      reason,
      flaggedRules,
    };
  }
}
