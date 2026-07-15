/**
 * Dynamic Confidence Thresholds for Quick Reply RAG
 *
 * Adjusts the confidence threshold based on:
 * - Comment intent (questions get easier thresholds)
 * - Comment complexity (short comments = simpler, long = complex)
 * - Ensures minimum quality bar for auto-replies
 */

import {
  CommentIntent,
  ConfidenceConfig,
  DEFAULT_CONFIDENCE_CONFIG,
} from "./rag_types";

export interface ConfidenceThresholds {
  /** Threshold to use RAG answer directly (high confidence) */
  ragDirect: number;
  /** Threshold to attempt FAQ-grounded generation (medium confidence) */
  faqFallback: number;
  /** Below this → skip entirely (no KB match) */
  skip: number;
}

/**
 * Compute dynamic confidence thresholds based on comment characteristics.
 *
 * @param intent - Classified intent of the comment
 * @param commentLength - Character count of the comment text
 * @param config - Optional custom configuration
 * @returns Threshold triple for the three decision gates
 */
export function getDynamicThresholds(
  intent: CommentIntent,
  commentLength: number,
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): ConfidenceThresholds {
  // Start with base threshold
  let threshold = config.baseThreshold;

  // Apply intent adjustment
  const intentAdj = config.intentAdjustments[intent] ?? 0;
  threshold += intentAdj;

  // Apply complexity adjustment
  if (commentLength < 20) {
    // Short comments are simpler — lower threshold
    threshold = Math.min(threshold, config.shortCommentThreshold);
  } else if (commentLength > 200) {
    // Long/complex comments need higher confidence
    threshold = Math.max(threshold, config.longCommentThreshold);
  }

  // Clamp to safe range
  threshold = Math.max(0.15, Math.min(0.80, threshold));

  return {
    ragDirect: threshold,
    faqFallback: config.faqFallbackThreshold,
    skip: config.skipThreshold,
  };
}
