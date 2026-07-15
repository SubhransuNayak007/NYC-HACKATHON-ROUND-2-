/**
 * ============================================================
 * QuickReply AGI — Continuous Learning Engine (Core)
 * src/backend/agi/ContinuousLearningEngine.ts
 *
 * Orchestrates the full 15-minute AGI learning cycle:
 * 1. Pull new comments from connected platforms
 * 2. Analyze + classify each comment
 * 3. Check keyword alerts
 * 4. Update audience knowledge graph
 * 5. Generate confident replies
 * 6. Log the learning cycle
 * ============================================================
 */

import { getDB, saveDB, type LearnedComment, type AGILearningCycle } from '@/database/db';
import { analyzeComment } from './CommentIntelligence';
import { matchKeywords, processKeywordMatches } from './KeywordAlertEngine';
import { updateAudienceKnowledge } from './AudienceKnowledgeGraph';
import { getVideoContext, buildVideoContextPrompt } from './VideoContextExtractor';
import { scoreReply } from './ReplyQualityScorer';

export interface LearningCycleResult {
  commentsProcessed: number;
  newInsightsExtracted: number;
  alertsTriggered: number;
  repliesGenerated: number;
  repliesAutoSent: number;
  repliesQueued: number;
  durationMs: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

/**
 * Source adapters: pull raw comments from DB (already fetched by platform pollers).
 * The platform pollers (youtube.ts, engine.ts) write raw comments into db.comments.
 * The AGI layer reads them and converts to LearnedComment format.
 */
async function pullUnprocessedComments(): Promise<{
  commentId: string;
  text: string;
  authorName: string;
  authorId: string;
  likes: number;
  timestamp: string;
  platform: LearnedComment['platform'];
  videoId?: string;
  videoTitle?: string;
  channelId?: string;
}[]> {
  const db = await getDB();
  const processedIds = new Set((db.agiLearnedComments || []).map(c => c.commentId));

  const raw: any[] = [];

  // 1. Pull from YouTube / standard comments
  for (const comment of (db.comments || [])) {
    if (processedIds.has(comment.id)) continue;
    if (!comment.text) continue;

    raw.push({
      commentId: comment.id,
      text: comment.text,
      authorName: comment.author || 'Unknown',
      authorId: (comment as any).authorId || '',
      likes: (comment as any).likeCount || 0,
      timestamp: comment.publishedAt || new Date().toISOString(),
      platform: 'youtube' as const,
      videoId: (comment as any).videoId || '',
      videoTitle: comment.videoTitle,
      channelId: comment.channelId,
    });
  }

  // 2. Pull from multi-platform social comments (Instagram, TikTok, Facebook, etc.)
  for (const sComment of (db.socialComments || [])) {
    if (processedIds.has(sComment.id)) continue;
    if (!sComment.text) continue;

    const platformRaw = (sComment.platform || 'instagram').toLowerCase();
    const platform = (['youtube', 'instagram', 'tiktok', 'facebook', 'discord', 'telegram'].includes(platformRaw)
      ? platformRaw
      : 'instagram') as LearnedComment['platform'];

    raw.push({
      commentId: sComment.id,
      text: sComment.text,
      authorName: sComment.author || 'Unknown',
      authorId: sComment.authorId || '',
      likes: (sComment as any).likes || 0,
      timestamp: sComment.publishedAt || new Date().toISOString(),
      platform,
      videoId: sComment.postId || '',
      videoTitle: sComment.postTitle || '',
      channelId: sComment.accountId,
    });
  }

  // Cap at 200 per cycle to avoid overload
  return raw.slice(0, 200);
}

/**
 * Generate a reply for a comment using available context.
 * Returns null if no reply should be sent.
 */
async function generateCommentReply(
  comment: LearnedComment,
  audienceContext: string
): Promise<{ reply: string; confidence: number } | null> {
  // Only generate replies for actionable classifications
  if (['spam', 'competitor_mention'].includes(comment.classification)) return null;
  if (comment.replyStatus !== 'pending') return null;

  // Build context
  let videoContextStr = '';
  if (comment.videoId) {
    const ctx = await getVideoContext(comment.videoId);
    if (ctx) videoContextStr = buildVideoContextPrompt(ctx);
  }

  // Fetch business name
  const db = await getDB();
  const businessName = db.workspace?.name || 'our brand';
  const tone = db.waSettings?.brandVoice?.tone || 'friendly';

  // Build the prompt
  const prompt = [
    `You are the official social media representative for "${businessName}".`,
    `Your tone is: ${tone}.`,
    videoContextStr ? `\n${videoContextStr}` : '',
    audienceContext ? `\nAUDIENCE CONTEXT:\n${audienceContext}` : '',
    `\nCOMMENT TO REPLY TO:`,
    `Author: ${comment.authorName}`,
    `Platform: ${comment.platform}`,
    `Comment: "${comment.text}"`,
    `Classification: ${comment.classification}`,
    `\nINSTRUCTIONS:`,
    `- Reply naturally in 1-3 sentences maximum.`,
    `- Be specific and relevant to what they said.`,
    `- Never make up prices, discount codes, or specific policy details.`,
    `- Never mention refunds, legal matters, or payments.`,
    `- If you cannot reply confidently, start your response with "SKIP: " and state the reason.`,
    `\nReply:`,
  ].filter(Boolean).join('\n');

  try {
    // Call AI via existing engine pattern
    const { generateText } = await import('@/backend/ai');
    const reply = await generateText(prompt);

    if (!reply) return null;

    const quality = scoreReply({
      reply,
      originalComment: comment.text,
      videoContext: videoContextStr,
    });

    return { reply, confidence: quality.score };
  } catch {
    return null;
  }
}

/**
 * Main learning cycle — called by the cron route every 15 minutes.
 */
export async function runLearningCycle(): Promise<LearningCycleResult> {
  const startMs = Date.now();
  const cycleId = `cycle_${Date.now()}`;

  const result: LearningCycleResult = {
    commentsProcessed: 0,
    newInsightsExtracted: 0,
    alertsTriggered: 0,
    repliesGenerated: 0,
    repliesAutoSent: 0,
    repliesQueued: 0,
    durationMs: 0,
    status: 'success',
  };

  try {
    const db = await getDB();
    if (!db.agiLearnedComments) db.agiLearnedComments = [];
    if (!db.keywordAlerts) db.keywordAlerts = [];

    // 1. Pull unprocessed comments
    const rawComments = await pullUnprocessedComments();
    if (rawComments.length === 0) {
      result.durationMs = Date.now() - startMs;
      return result;
    }

    // 2. Get active keyword alerts
    const activeAlerts = db.keywordAlerts.filter(a => a.isActive);
    const alertKeywords = activeAlerts.map(a => a.keyword);

    // 3. Get audience context for reply generation
    const { getAudienceContextForPrompt } = await import('./AudienceKnowledgeGraph');
    const audienceContext = await getAudienceContextForPrompt();

    // 4. Process each comment
    const newLearnedComments: LearnedComment[] = [];
    const keywordMatches: any[] = [];

    for (const raw of rawComments) {
      const analyzed = analyzeComment({
        ...raw,
        keywordAlertList: alertKeywords,
      });

      const learned: LearnedComment = {
        id: `lc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...analyzed,
        replyStatus: 'pending',
        processedAt: new Date().toISOString(),
      };

      result.commentsProcessed++;
      result.newInsightsExtracted += learned.learnedInsights.length;

      // Check keyword alerts
      const matches = matchKeywords(learned, activeAlerts);
      if (matches.length > 0) {
        keywordMatches.push(...matches);
        result.alertsTriggered += matches.length;
      }

      // Generate reply
      const replyResult = await generateCommentReply(learned, audienceContext);
      if (replyResult) {
        learned.replyGenerated = replyResult.reply;
        learned.replyConfidence = replyResult.confidence;
        result.repliesGenerated++;

        // Route based on confidence
        const quality = scoreReply({
          reply: replyResult.reply,
          originalComment: raw.text,
        });

        if (quality.decision === 'auto_send') {
          learned.replyStatus = 'approved'; // Mark for sending
          result.repliesAutoSent++;
        } else if (quality.decision === 'queue_for_review') {
          learned.replyStatus = 'pending';  // Queue for human review
          result.repliesQueued++;
        } else {
          learned.replyStatus = 'skipped';
        }
      } else {
        learned.replyStatus = 'skipped';
      }

      newLearnedComments.push(learned);
    }

    // 5. Update keyword alert stats
    if (keywordMatches.length > 0) {
      await processKeywordMatches(keywordMatches);
    }

    // 6. Update audience knowledge graph
    await updateAudienceKnowledge(newLearnedComments);

    // 7. Save all learned comments
    const freshDb = await getDB();
    if (!freshDb.agiLearnedComments) freshDb.agiLearnedComments = [];
    freshDb.agiLearnedComments.push(...newLearnedComments);
    // Keep only last 5,000 learned comments
    if (freshDb.agiLearnedComments.length > 5000) {
      freshDb.agiLearnedComments = freshDb.agiLearnedComments.slice(-5000);
    }

    // 8. Log cycle
    if (!freshDb.agiLearningCycles) freshDb.agiLearningCycles = [];
    result.durationMs = Date.now() - startMs;

    const cycle: AGILearningCycle = {
      id: cycleId,
      triggeredAt: new Date().toISOString(),
      commentsProcessed: result.commentsProcessed,
      newInsightsExtracted: result.newInsightsExtracted,
      knowledgeUpdates: [`Processed ${result.commentsProcessed} comments`],
      alertsTriggered: result.alertsTriggered,
      repliesGenerated: result.repliesGenerated,
      repliesAutoSent: result.repliesAutoSent,
      repliesQueued: result.repliesQueued,
      durationMs: result.durationMs,
      platforms: ['youtube'],
      status: 'success',
    };

    freshDb.agiLearningCycles.push(cycle);
    // Keep last 100 cycles
    freshDb.agiLearningCycles = freshDb.agiLearningCycles.slice(-100);

    await saveDB(freshDb);

  } catch (err: any) {
    result.status = 'failed';
    result.errorMessage = err?.message || 'Unknown error';
    result.durationMs = Date.now() - startMs;
    console.error('[AGI] Learning cycle failed:', err);
  }

  return result;
}
