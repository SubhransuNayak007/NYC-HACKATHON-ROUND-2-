/**
 * Edge Function: Rule Evaluation
 *
 * Runs on Vercel Edge Runtime for <50ms latency.
 * Evaluates comment text against user rules without hitting the main server.
 *
 * This endpoint is called by the comment polling system to quickly
 * determine if a comment matches any rules before the full processing pipeline.
 *
 * Edge Runtime benefits:
 * - Cold start <50ms
 * - Runs close to the user (edge network)
 * - No Node.js dependencies needed
 * - Stateless — reads rules from request body
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

// --- Rule Types (duplicated for Edge runtime — no shared imports) ---

interface RuleCondition {
  type: "contains" | "equals" | "regex" | "starts_with" | "reply_all";
  value: string;
}

interface Rule {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  conditions: RuleCondition[];
  operator: "AND" | "OR";
  templateId: string;
  filters: {
    topLevelOnly: boolean;
    maxRepliesPerUser: number;
    language: string;
  };
}

interface EvalRequest {
  commentText: string;
  rules: Rule[];
  negativeKeywords?: string;
}

interface EvalResult {
  matched: boolean;
  matchedRuleId: string | null;
  matchedRuleName: string | null;
  templateId: string | null;
  replyText: string | null;
  isNegative: boolean;
  evaluationTimeMs: number;
  error?: string;
}

/**
 * POST /api/edge/rules
 *
 * Evaluate a comment against rules at the edge.
 * Request body: EvalRequest
 * Response: EvalResult
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    const body: EvalRequest = await req.json();
    const { commentText, rules, negativeKeywords } = body;

    if (!commentText || !rules) {
      return NextResponse.json(
        { error: "Missing required fields: commentText, rules" },
        { status: 400 }
      );
    }

    const commentLower = commentText.toLowerCase();
    let matched = false;
    let matchedRuleId: string | null = null;
    let matchedRuleName: string | null = null;
    let templateId: string | null = null;

    // --- Negative Keyword Check ---
    const negKeywords = (negativeKeywords || "scam, refund, disappointed, hate, fake, bot, report")
      .split(",")
      .map((k: string) => k.trim().toLowerCase())
      .filter(Boolean);

    const isNegative = negKeywords.some((keyword) => commentLower.includes(keyword));

    if (isNegative) {
      // Negative comments should be held for review, not auto-replied
      const elapsed = performance.now() - startTime;
      return NextResponse.json({
        matched: false,
        matchedRuleId: null,
        matchedRuleName: null,
        templateId: null,
        replyText: null,
        isNegative: true,
        evaluationTimeMs: parseFloat(elapsed.toFixed(2)),
      } satisfies EvalResult);
    }

    // --- Rule Matching ---
    const activeRules = rules
      .filter((r) => r.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      const checkCond = (c: RuleCondition): boolean => {
        if (c.type === "reply_all") return true;
        const v = c.value?.trim();
        if (!v) return false;
        const vLower = v.toLowerCase();

        switch (c.type) {
          case "contains":
            return commentLower.includes(vLower);
          case "equals":
            return commentLower === vLower;
          case "starts_with":
            return commentLower.startsWith(vLower);
          case "regex": {
            // Safety: reject long or potentially catastrophic regex
            if (v.length > 200) return false;
            if (/\([^)]*[+*][^)]*[+*]\)/.test(v)) return false; // ReDoS protection
            try {
              const rx = new RegExp(v, "i");
              return rx.test(commentText);
            } catch {
              return false;
            }
          }
          default:
            return false;
        }
      };

      const isMatch =
        rule.operator === "OR"
          ? rule.conditions.some(checkCond)
          : rule.conditions.every(checkCond);

      if (isMatch) {
        matched = true;
        matchedRuleId = rule.id;
        matchedRuleName = rule.name;
        templateId = rule.templateId;
        break;
      }
    }

    const elapsed = performance.now() - startTime;

    const result: EvalResult = {
      matched,
      matchedRuleId,
      matchedRuleName,
      templateId,
      replyText: null, // Template resolution happens server-side
      isNegative: false,
      evaluationTimeMs: parseFloat(elapsed.toFixed(2)),
    };

    return NextResponse.json(result);
  } catch (err) {
    const elapsed = performance.now() - startTime;
    console.error("[Edge Rules] Evaluation error:", err);
    return NextResponse.json(
      {
        matched: false,
        matchedRuleId: null,
        matchedRuleName: null,
        templateId: null,
        replyText: null,
        isNegative: false,
        evaluationTimeMs: parseFloat(elapsed.toFixed(2)),
        error: "Rule evaluation failed",
      } satisfies EvalResult,
      { status: 500 }
    );
  }
}

/**
 * GET /api/edge/rules — Health check
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    runtime: "edge",
    timestamp: new Date().toISOString(),
  });
}
