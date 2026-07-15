/**
 * ============================================================
 * QuickReply AGI — Comment Intelligence Engine
 * src/backend/agi/CommentIntelligence.ts
 *
 * Classifies comments, scores sentiment, extracts insights,
 * and determines usefulness for the business owner.
 * ============================================================
 */

import type { CommentClassification, LearnedComment } from '@/database/db';

// ─────────────────────────────────────────────────────────────
// Sentiment Analysis (Rule-based with scoring)
// ─────────────────────────────────────────────────────────────

const POSITIVE_SIGNALS = [
  'love', 'amazing', 'excellent', 'great', 'awesome', 'fantastic', 'brilliant',
  'perfect', 'best', 'helpful', 'wonderful', 'superb', 'outstanding', 'recommend',
  'impressed', 'quality', 'satisfied', 'happy', 'thank', 'thanks', '❤️', '🔥', '👏',
  '⭐', 'bahut accha', 'best hai', 'mast', 'zabardast', 'bahut badiya',
];

const NEGATIVE_SIGNALS = [
  'scam', 'fraud', 'fake', 'worst', 'terrible', 'horrible', 'awful', 'broken',
  'damaged', 'refund', 'return', 'never again', 'disappointed', 'waste', 'bad',
  'useless', 'cheap quality', 'pathetic', 'cheating', 'loot', 'bekar', 'bakwaas',
  'ghatiya', 'fraud hai', 'mat lo', 'dhoka', 'problem', 'issue', 'complaint',
];

const QUESTION_SIGNALS = [
  '?', 'how', 'what', 'when', 'where', 'why', 'which', 'can you', 'is it', 'are you',
  'do you', 'does it', 'will it', 'kaise', 'kya', 'kab', 'kitna', 'price', 'cost',
  'available', 'delivery', 'ship', 'size', 'color', 'colour', 'discount', 'offer',
];

const FEATURE_REQUEST_SIGNALS = [
  'should add', 'please add', 'would be great if', 'wish you had', 'suggestion',
  'feature request', 'can you make', 'next time add', 'improve', 'add option',
];

const BUG_SIGNALS = [
  'not working', "doesn't work", 'is broken', 'got broken', 'button broken', 'link broken',
  'crash', 'fatal error', 'glitch in', 'stopped working', 'failed to load', 'page error',
];

/**
 * Score sentiment of a comment (-1.0 to +1.0)
 */
export function scoreSentiment(text: string): { score: number; label: 'positive' | 'neutral' | 'negative' } {
  const lower = text.toLowerCase();

  let positive = 0;
  let negative = 0;

  for (const signal of POSITIVE_SIGNALS) {
    if (lower.includes(signal)) positive += 1;
  }
  for (const signal of NEGATIVE_SIGNALS) {
    if (lower.includes(signal)) negative += 1.5; // Negative weighted higher
  }

  const total = positive + negative;
  if (total === 0) return { score: 0, label: 'neutral' };

  const raw = (positive - negative) / Math.max(total, 1);
  const score = Math.max(-1, Math.min(1, raw));

  if (score > 0.15) return { score, label: 'positive' };
  if (score < -0.15) return { score, label: 'negative' };
  return { score, label: 'neutral' };
}

/**
 * Classify a comment into its primary category
 */
export function classifyComment(text: string): CommentClassification {
  const lower = text.toLowerCase();

  // Spam check first
  if (text.length < 3) return 'spam';
  const spamPatterns = ['http://', 'https://', 'follow me', 'check my', 'sub4sub', 'like4like'];
  if (spamPatterns.some(p => lower.includes(p))) return 'spam';

  // Question (explicit question with query signals)
  const isQuestion = QUESTION_SIGNALS.some(s => lower.includes(s));
  if (isQuestion && text.includes('?')) return 'question';

  // Bug report
  if (BUG_SIGNALS.some(s => lower.includes(s))) return 'bug_report';

  // Feature request
  if (FEATURE_REQUEST_SIGNALS.some(s => lower.includes(s))) return 'feature_request';

  // Sentiment-based classification
  const { label, score } = scoreSentiment(text);

  if (label === 'positive' && score > 0.4) return 'testimonial';
  if (label === 'negative') return 'actionable_feedback';
  if (isQuestion) return 'question';

  return 'general';
}

/**
 * Detect competitor mentions in text
 * Returns competitor name if found, null otherwise
 */
export function detectCompetitorMention(
  text: string,
  competitorKeywords: string[] = []
): string | null {
  const lower = text.toLowerCase();
  for (const keyword of competitorKeywords) {
    if (lower.includes(keyword.toLowerCase())) return keyword;
  }
  return null;
}

/**
 * Calculate usefulness score (0-100) — how valuable is this comment to the business owner?
 */
export function calculateUsefulnessScore(
  text: string,
  classification: CommentClassification,
  likes: number,
  sentimentScore: number
): number {
  let score = 0;

  // Classification base score
  const classScore: Record<CommentClassification, number> = {
    actionable_feedback: 80,
    feature_request: 75,
    bug_report: 85,
    testimonial: 70,
    competitor_mention: 65,
    question: 50,
    general: 20,
    spam: 0,
  };
  score += classScore[classification];

  // Like count bonus (popular comments matter more)
  if (likes >= 100) score += 15;
  else if (likes >= 20) score += 10;
  else if (likes >= 5) score += 5;

  // Text length bonus (longer, more detailed = more useful)
  if (text.length > 200) score += 10;
  else if (text.length > 100) score += 5;

  // Strong sentiment bonus (strong opinions are more actionable)
  if (Math.abs(sentimentScore) > 0.7) score += 10;

  return Math.min(100, score);
}

/**
 * Extract specific insights/learnings from a comment
 */
export function extractInsights(text: string, classification: CommentClassification): string[] {
  const insights: string[] = [];
  const lower = text.toLowerCase();

  if (classification === 'question') {
    insights.push(`Customer asked: "${text.slice(0, 100)}"`);
  }
  if (classification === 'actionable_feedback') {
    insights.push(`Feedback received: ${text.slice(0, 100)}`);
  }
  if (classification === 'bug_report') {
    insights.push(`Bug reported: ${text.slice(0, 100)}`);
  }
  if (classification === 'testimonial') {
    insights.push(`Testimonial: ${text.slice(0, 100)}`);
  }
  if (classification === 'feature_request') {
    insights.push(`Feature requested: ${text.slice(0, 100)}`);
  }

  // Extract specific topics mentioned
  const topics = ['delivery', 'packaging', 'quality', 'price', 'size', 'color', 'support', 'shipping'];
  for (const topic of topics) {
    if (lower.includes(topic)) insights.push(`Topic mentioned: ${topic}`);
  }

  return insights;
}

/**
 * Full comment analysis — returns a partial LearnedComment ready to be saved
 */
export function analyzeComment(params: {
  commentId: string;
  text: string;
  authorName: string;
  authorId: string;
  likes: number;
  timestamp: string;
  platform: LearnedComment['platform'];
  videoId?: string;
  videoTitle?: string;
  postId?: string;
  channel?: string;
  keywordAlertList?: string[];
}): Omit<LearnedComment, 'id' | 'replyStatus' | 'processedAt'> {
  const classification = classifyComment(params.text);
  const { score, label } = scoreSentiment(params.text);
  const usefulnessScore = calculateUsefulnessScore(params.text, classification, params.likes, score);
  const insights = extractInsights(params.text, classification);

  // Check keyword alerts
  const keywordsMatched: string[] = [];
  if (params.keywordAlertList) {
    const lower = params.text.toLowerCase();
    for (const kw of params.keywordAlertList) {
      if (lower.includes(kw.toLowerCase())) keywordsMatched.push(kw);
    }
  }

  // Check competitor mention
  const competitorKw = params.keywordAlertList?.filter(k => k.startsWith('competitor:')) || [];
  const mentionedCompetitor = detectCompetitorMention(
    params.text,
    competitorKw.map(k => k.replace('competitor:', ''))
  );
  if (mentionedCompetitor) {
    const idx = keywordsMatched.indexOf(`competitor:${mentionedCompetitor}`);
    if (idx === -1) keywordsMatched.push(mentionedCompetitor);
  }

  return {
    platform: params.platform,
    videoId: params.videoId,
    videoTitle: params.videoTitle,
    postId: params.postId,
    channel: params.channel,
    commentId: params.commentId,
    text: params.text,
    authorName: params.authorName,
    authorId: params.authorId,
    likes: params.likes,
    timestamp: params.timestamp,
    classification: mentionedCompetitor ? 'competitor_mention' : classification,
    sentiment: label,
    sentimentScore: score,
    keywordsMatched,
    isUsefulFeedback: usefulnessScore >= 50,
    usefulnessScore,
    learnedInsights: insights,
  };
}
