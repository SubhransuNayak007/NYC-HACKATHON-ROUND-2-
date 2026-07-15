/**
 * ============================================================
 * QuickReply AGI — Reply Quality Scorer
 * src/backend/agi/ReplyQualityScorer.ts
 *
 * Scores AI-generated replies for quality, relevance, brand fit,
 * and safety BEFORE they are sent. Routes to auto-send, queue,
 * or skip based on confidence threshold.
 * ============================================================
 */

export type ReplyDecision = 'auto_send' | 'queue_for_review' | 'skip';

export interface ReplyQualityResult {
  score: number;           // 0-100
  decision: ReplyDecision;
  reasons: string[];       // Why this score was given
  warnings: string[];      // Specific concerns
}

// Thresholds
const AUTO_SEND_THRESHOLD = 80;
const QUEUE_THRESHOLD = 60;

// Dangerous patterns that should NEVER be auto-sent
const DANGER_PATTERNS = [
  /refund/i, /money back/i, /legal/i, /lawsuit/i, /court/i,
  /\$[0-9]+/, /₹[0-9]+/, /free/i, /discount code/i, /promo code/i,
  /sorry for/i, /apologize/i, /compensation/i,
];

// Quality signals that improve score
const QUALITY_SIGNALS = [
  { pattern: /thank/i, score: 5, reason: 'Acknowledges the commenter' },
  { pattern: /great question/i, score: 5, reason: 'Engages with the question' },
  { pattern: /\!/, score: 3, reason: 'Shows enthusiasm' },
];

/**
 * Score an AI-generated reply before sending.
 */
export function scoreReply(params: {
  reply: string;
  originalComment: string;
  videoContext?: string;
  businessContext?: string;
}): ReplyQualityResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 70; // Start at 70 (assume decent)

  const reply = params.reply?.trim() || '';

  // Hard block: empty or skip signal
  if (!reply || reply.toUpperCase().startsWith('SKIP')) {
    return { score: 0, decision: 'skip', reasons: ['AI indicated skip'], warnings: [] };
  }

  // Hard block: dangerous content
  for (const pattern of DANGER_PATTERNS) {
    if (pattern.test(reply)) {
      warnings.push(`Dangerous pattern detected: ${pattern}`);
      score -= 30;
    }
  }

  // Length check: too short or too long
  if (reply.length < 10) {
    score -= 25;
    reasons.push('Reply too short');
  } else if (reply.length > 500) {
    score -= 10;
    reasons.push('Reply too long (may feel unnatural)');
  }

  // Relevance: does reply reference the comment topic?
  const commentWords = params.originalComment.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const replyLower = reply.toLowerCase();
  const relevantWords = commentWords.filter(w => replyLower.includes(w));
  if (relevantWords.length > 0) {
    score += 10;
    reasons.push(`Relevant to comment (mentions: ${relevantWords.slice(0, 3).join(', ')})`);
  }

  // Quality signals
  for (const signal of QUALITY_SIGNALS) {
    if (signal.pattern.test(reply)) {
      score += signal.score;
      reasons.push(signal.reason);
    }
  }

  // Generic / filler penalty
  const genericPhrases = ['great!', 'thanks!', 'thank you!', 'awesome!', 'nice!'];
  if (genericPhrases.some(p => replyLower.trim() === p)) {
    score -= 20;
    reasons.push('Reply is too generic');
  }

  // Cap score
  score = Math.max(0, Math.min(100, score));

  let decision: ReplyDecision;
  if (score >= AUTO_SEND_THRESHOLD && warnings.length === 0) {
    decision = 'auto_send';
  } else if (score >= QUEUE_THRESHOLD) {
    decision = 'queue_for_review';
  } else {
    decision = 'skip';
  }

  return { score, decision, reasons, warnings };
}
