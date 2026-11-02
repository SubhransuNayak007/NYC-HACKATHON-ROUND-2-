/**
 * ============================================================================
 * QuickReply — Selective Reply-Worthiness Decision Engine
 * src/backend/video_rag/intelligence/ReplyWorthinessService.ts
 *
 * Implements:
 * 1. Strict Selectivity Principle (High quality meaningful replies > Volume)
 * 2. Multi-Class Decision Making (REPLY vs SKIP vs REVIEW)
 * 3. Structured Policy Enforcement (ONLY_GENUINE_CONCERNS, QUESTIONS, etc.)
 * 4. Explainable Scoring Vector
 * ============================================================================
 */

import {
  CommentUnderstandingResult,
  VideoRAGConfig,
  ReplyWorthinessResult,
  RetrievedKnowledgeChunk,
} from "../types";

export class ReplyWorthinessService {
  /**
   * Evaluate whether an incoming comment warrants an automated reply
   */
  static evaluateReplyWorthiness(params: {
    understanding: CommentUnderstandingResult;
    config: VideoRAGConfig;
    retrievedChunks: RetrievedKnowledgeChunk[];
  }): ReplyWorthinessResult {
    const { understanding, config, retrievedChunks } = params;
    const criteriaMatched: string[] = [];

    // ── Guard 1: System Level Kill-Switches & Self-Responses ────────────────
    if (config.isPaused || !config.enabled) {
      return {
        decision: "SKIP",
        reason: "SAFETY_VIOLATION",
        score: 0.0,
        priority: "IGNORE",
        explanation: `Video RAG automation is currently paused (${config.pausedReason || "System pause"}).`,
        criteriaMatched: ["SYSTEM_PAUSED"],
      };
    }

    if (understanding.isSelfResponse) {
      return {
        decision: "SKIP",
        reason: "AUTOMATION_SELF_REPLY",
        score: 0.0,
        priority: "IGNORE",
        explanation: "Comment was posted by the creator or automation bot. Self-reply prevented.",
        criteriaMatched: ["SELF_RESPONSE_DETECTED"],
      };
    }

    if (understanding.isAlreadyAnswered) {
      return {
        decision: "SKIP",
        reason: "ALREADY_ANSWERED",
        score: 0.1,
        priority: "IGNORE",
        explanation: "Customer has already received an automated reply for this inquiry recently.",
        criteriaMatched: ["DUPLICATE_COOLDOWN_ACTIVE"],
      };
    }

    // ── Guard 2: Spam, Bots & Low Information Emojis ────────────────────────
    if (understanding.classifications.includes("SPAM") || understanding.spamProbability >= 0.6) {
      return {
        decision: "SKIP",
        reason: "SPAM",
        score: 0.02,
        priority: "IGNORE",
        explanation: `Spam score (${understanding.spamProbability}) exceeds maximum acceptable threshold.`,
        criteriaMatched: ["HIGH_SPAM_PROBABILITY"],
      };
    }

    if (understanding.classifications.includes("PRAISE")) {
      return {
        decision: "SKIP",
        reason: "GENERIC_PRAISE",
        score: 0.1,
        priority: "IGNORE",
        explanation: "Short praise or reaction without informational inquiry.",
        criteriaMatched: ["GENERIC_PRAISE_FILTER"],
      };
    }

    if (understanding.classifications.includes("LOW_INFORMATION")) {
      const isEmoji = /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(understanding.text);
      return {
        decision: "SKIP",
        reason: isEmoji ? "EMOJI_ONLY" : "LOW_INFORMATION",
        score: 0.05,
        priority: "IGNORE",
        explanation: "Short reaction or emoji-only comment without substantive informational query.",
        criteriaMatched: [isEmoji ? "EMOJI_ONLY_FILTER" : "LOW_INFORMATION_FILTER"],
      };
    }

    // ── Positive Reply Scoring Engine ────────────────────────────────────────
    let score = 0.5;

    // 1. Real problem or critical bug
    if (understanding.classifications.includes("REAL_PROBLEM")) {
      score += 0.45;
      criteriaMatched.push("REAL_PROBLEM_DETECTED");
    }

    // 2. Genuine Question
    if (understanding.classifications.includes("GENUINE_QUESTION")) {
      score += 0.35;
      criteriaMatched.push("GENUINE_QUESTION_DETECTED");
    }

    // 3. Purchase Intent
    if (understanding.classifications.includes("PURCHASE_INTENT")) {
      score += 0.35;
      criteriaMatched.push("HIGH_PURCHASE_INTENT");
    }

    // 4. Useful Feedback
    if (understanding.classifications.includes("USEFUL_FEEDBACK")) {
      score += 0.25;
      criteriaMatched.push("USEFUL_FEEDBACK_DETECTED");
    }

    // 5. Grounding availability boost
    if (retrievedChunks.length > 0 && retrievedChunks[0].relevanceScore >= 0.5) {
      score += 0.15;
      criteriaMatched.push("HIGH_RELEVANCE_KB_MATCH");
    }

    const finalScore = parseFloat(Math.min(1.0, score).toFixed(2));

    // ── Apply Configured Reply Policy ────────────────────────────────────────
    const policy = config.replyPolicy;

    // A. Real Problem / Support is ALWAYS eligible (Priority: CRITICAL / HIGH)
    if (understanding.classifications.includes("REAL_PROBLEM")) {
      return {
        decision: "REPLY",
        reason: "REAL_PROBLEM",
        score: finalScore,
        priority: "CRITICAL",
        explanation: "Customer is experiencing a real issue or bug that requires direct resolution.",
        criteriaMatched,
      };
    }

    // B. Purchase Intent is ALWAYS eligible (Priority: HIGH)
    if (understanding.classifications.includes("PURCHASE_INTENT")) {
      return {
        decision: "REPLY",
        reason: "PURCHASE_INTENT",
        score: finalScore,
        priority: "HIGH",
        explanation: "High-value commercial inquiry regarding pricing, availability, or specifications.",
        criteriaMatched,
      };
    }

    // C. Genuine Questions
    if (understanding.classifications.includes("GENUINE_QUESTION")) {
      if (policy === "ONLY_GENUINE_CONCERNS" && !understanding.extractedConcern && finalScore < 0.8) {
        return {
          decision: "SKIP",
          reason: "QUESTION",
          score: finalScore,
          priority: "LOW",
          explanation: "Configured policy 'ONLY_GENUINE_CONCERNS' filters general curiosity questions unless high certainty.",
          criteriaMatched,
        };
      }

      return {
        decision: "REPLY",
        reason: "QUESTION",
        score: finalScore,
        priority: "HIGH",
        explanation: "Direct question with strong grounding in video transcript or verified KB.",
        criteriaMatched,
      };
    }

    // D. Helpful Feedback
    if (understanding.classifications.includes("USEFUL_FEEDBACK")) {
      if (policy === "QUESTIONS_AND_FEEDBACK" || policy === "ALL_ELIGIBLE") {
        return {
          decision: "REPLY",
          reason: "HELPFUL_FEEDBACK",
          score: finalScore,
          priority: "MEDIUM",
          explanation: "Constructive feedback that provides opportunity for creator connection.",
          criteriaMatched,
        };
      }
    }

    // E. General Praise / Reactions without questions
    if (understanding.classifications.includes("PRAISE") || understanding.classifications.includes("JOKE")) {
      if (policy === "ALL_ELIGIBLE") {
        return {
          decision: "REPLY",
          reason: "GENERIC_PRAISE",
          score: finalScore,
          priority: "LOW",
          explanation: "Policy 'ALL_ELIGIBLE' allows light social engagement on compliments.",
          criteriaMatched,
        };
      }

      return {
        decision: "SKIP",
        reason: "GENERIC_PRAISE",
        score: 0.15,
        priority: "IGNORE",
        explanation: "Generic praise skipped under selective quality policy to prevent bot spam.",
        criteriaMatched: ["GENERIC_PRAISE_SKIPPED"],
      };
    }

    // Default Fallback
    return {
      decision: "SKIP",
      reason: "LOW_INFORMATION",
      score: finalScore,
      priority: "LOW",
      explanation: "Comment does not meet the minimum reply-worthiness threshold.",
      criteriaMatched,
    };
  }
}
