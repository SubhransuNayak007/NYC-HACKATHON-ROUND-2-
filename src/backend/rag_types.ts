/**
 * Shared types for the Quick Reply RAG Pipeline.
 * Used by intent_classifier, reranker, confidence, rag, and scheduler.
 */

// --- Intent Classification ---

export type CommentIntent =
  | "question"    // Commenter is asking for information, how-to, or clarification
  | "praise"      // Complimenting the content, expressing appreciation
  | "complaint"   // Expressing dissatisfaction or criticism
  | "suggestion"  // Proposing an idea or feature request
  | "report"      // Reporting a bug, error, or issue
  | "off_topic";  // Not related to the video/knowledge base

/** Intents that should be SKIPPED — no knowledge base match expected */
export const SKIP_INTENTS: CommentIntent[] = ["off_topic"];

/** Intents that should always be skipped (never replied to) */
export const NEVER_REPLY_INTENTS: CommentIntent[] = ["off_topic"];

// --- Multi-Query Expansion ---

export interface ExpandedQueries {
  originalQuery: string;
  variations: string[];
  intent: CommentIntent;
}

// --- RAG Pipeline Results ---

export interface RAGSearchResult {
  faqId: string;
  question: string;
  answer: string;
  category: string;
  confidence: number;       // Combined score (0.0 - 1.0)
  denseScore: number;       // Semantic vector cosine score
  sparseScore: number;      // BM25 / keyword score
  rerankedScore?: number;   // LLM re-ranking score (if applied)
  finalScore: number;       // Final merged score
  matchedChunkText: string;
}

export interface RAGReplyResult {
  replyText: string;
  confidence: number;
  matchSource: "rag_direct" | "rag_fallback" | "faq_hybrid" | "keyword_fallback";
  matchedFAQId: string | null;
  matchedChunks: Array<{ id: string; score: number; source: string }>;
  intent: CommentIntent;
  processingTimeMs: number;
}

// --- Confidence Thresholds ---

export interface ConfidenceConfig {
  baseThreshold: number;
  /** Minimum confidence to use RAG answer directly (>= this) */
  ragDirectThreshold: number;
  /** Minimum confidence to generate FAQ-grounded reply (>= this) */
  faqFallbackThreshold: number;
  /** Below this, skip entirely (no KB match) */
  skipThreshold: number;
  /** Intent-specific adjustments */
  intentAdjustments: Record<CommentIntent, number>;
  /** Complexity adjustments */
  shortCommentThreshold: number;   // For comments < 20 chars
  longCommentThreshold: number;    // For comments > 200 chars
}

export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  baseThreshold: 0.30,
  ragDirectThreshold: 0.30,
  faqFallbackThreshold: 0.18,
  skipThreshold: 0.18,
  intentAdjustments: {
    question: -0.05,     // Easier to match — prioritize answering questions
    praise: 0.15,        // Harder to match — skip unless very confident
    complaint: 0.10,     // Harder to match — need high confidence
    suggestion: 0.05,    // Slightly harder
    report: 0.10,        // Harder — need strong KB match
    off_topic: 1.0,      // Never match
  },
  shortCommentThreshold: 0.30,
  longCommentThreshold: 0.50,
};

// --- Polling Tiers ---
// True 24/7/365 operation: 30-second auto-reply for all active videos

export const POLLING_TIERS = {
  /** Tier 1: < 24 hours old — poll every 30 seconds (hot + warm combined for true 24hr operation) */
  HOT: { maxAgeHours: 24, intervalMs: 30_000, priority: 1 },
  /** Tier 2: 24 hours - 7 days old — poll every 2 minutes */
  WARM: { maxAgeHours: 168, intervalMs: 120_000, priority: 2 },
  /** Tier 3: 7-30 days old — poll every 10 minutes */
  COOL: { maxAgeHours: 720, intervalMs: 600_000, priority: 3 },
  /** Tier 4: 30+ days old — poll every 30 minutes */
  COLD: { maxAgeHours: Infinity, intervalMs: 1_800_000, priority: 4 },
} as const;

export function getVideoPollingTier(publishedAt: string): typeof POLLING_TIERS[keyof typeof POLLING_TIERS] {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < POLLING_TIERS.HOT.maxAgeHours) return POLLING_TIERS.HOT;
  if (ageHours < POLLING_TIERS.WARM.maxAgeHours) return POLLING_TIERS.WARM;
  if (ageHours < POLLING_TIERS.COOL.maxAgeHours) return POLLING_TIERS.COOL;
  return POLLING_TIERS.COLD;
}
