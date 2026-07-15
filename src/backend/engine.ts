/**
 * ============================================================================
 *  QuickReply — Comment Processing Engine (src/backend/engine.ts)
 *
 *  The per-comment heart of the product. Every comment that enters the
 *  system flows through here, whether it was fetched from the YouTube API
 *  or injected by demo mode. Each stage records its decision and latency
 *  into a PipelineTrace, which is streamed to the Live Pipeline visualizer.
 *
 *  Stages:
 *    ingest → safety → rule → intent → rag → confidence → reply
 *
 *  Key behaviors (preserved from the original scheduler):
 *   - O(1) deduplication on processed comment ids
 *   - Negative-keyword interception → review queue
 *   - Priority-ordered rule matching (contains/equals/starts_with/regex/reply_all)
 *   - RAG replies ONLY when a knowledge-base match passes the confidence gate
 *   - B4: workspace-configurable confidence gate — low-confidence matches route
 *         to review instead of firing autonomously
 * ============================================================================
 */

import type {
  DBData,
  Comment as DBComment,
  PipelineTrace,
  PipelineStageResult,
  UserSession,
} from "@/database/db";
import { appendPipelineTrace } from "@/database/db";
import { postCommentReply } from "@/backend/youtube";
import type { FAQEntry } from "@/backend/rag";
import { processEnhancedRAGReply } from "@/backend/rag";
import { classifyIntent, shouldSkipByIntent } from "@/backend/intent_classifier";
import { emitCommentEvent } from "@/backend/events";

export interface IncomingComment {
  commentId: string;
  author: string;
  authorAvatar: string;
  text: string;
  publishedAt: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  channelId: string;
  channelName: string;
  isDemo?: boolean;
}

export interface EngineContext {
  db: DBData;
  activeUser: UserSession;
  maxDailyLimit: number;
  processedCommentIds: Set<string>;
  faqs: FAQEntry[];
  /** Watch a comment flow through the engine live (never throws). */
}

export interface ProcessResult {
  comment: DBComment | null;
  trace: PipelineTrace;
  replied: boolean;
  reviewed: boolean;
  skipped: boolean;
  failed: boolean;
  ruleMatched: boolean;
  limitHit: boolean;
}

// ─────────────────────────────────────────────────────────────
//  Trace helpers
// ─────────────────────────────────────────────────────────────

function makeStage(
  stage: PipelineStageResult["stage"],
  status: PipelineStageResult["status"],
  latencyMs: number,
  extra: Partial<PipelineStageResult> = {}
): PipelineStageResult {
  return { stage, status, latencyMs, ...extra };
}

// ─────────────────────────────────────────────────────────────
//  Core processor
// ─────────────────────────────────────────────────────────────

export async function processIncomingComment(
  input: IncomingComment,
  ctx: EngineContext
): Promise<ProcessResult> {
  const { db, activeUser, maxDailyLimit, processedCommentIds, faqs } = ctx;
  const traceId = `trace-${input.commentId}-${Date.now()}`;
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  const stages: PipelineStageResult[] = [];

  // ── ingest ──
  const tIngest = Date.now();
  if (processedCommentIds.has(input.commentId)) {
    return {
      comment: null,
      trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "skipped", "duplicate"),
      replied: false, reviewed: false, skipped: true, failed: false, ruleMatched: false, limitHit: false,
    };
  }
  processedCommentIds.add(input.commentId);
  stages.push(makeStage("ingest", "pass", Date.now() - tIngest, { detail: "dedup ok" }));

  const baseComment: DBComment = {
    id: input.commentId,
    channelId: input.channelId,
    author: input.author,
    authorAvatar: input.authorAvatar,
    authorSubscribers: "0",
    authorHistoryCount: 0,
    text: input.text,
    videoTitle: input.videoTitle,
    videoThumbnail: input.videoThumbnail,
    publishedAt: input.publishedAt,
    status: "matched",
    matchedRuleId: null,
    delayRemainingSeconds: 0,
    autoReplyText: null,
    replyFiredAt: null,
    replySource: "rule",
    fetchedAt: startedAtIso,
    traceId,
    isDemo: input.isDemo,
  };

  // ── safety (negative keyword interception) ──
  const tSafety = Date.now();
  const negKeywordsStr =
    db.workspace?.settings?.negativeKeywords ||
    "scam, refund, disappointed, hate, fake, bot, report";
  const negKeywords = negKeywordsStr
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const textLower = input.text.toLowerCase();
  const containsNegativeKeyword = negKeywords.some((k) => textLower.includes(k));

  if (containsNegativeKeyword) {
    stages.push(makeStage("safety", "block", Date.now() - tSafety, { detail: "negative keyword" }));
    const reviewComment: DBComment = {
      ...baseComment,
      status: "review",
      sentiment: "negative",
      decidedAt: new Date().toISOString(),
    };
    db.comments.unshift(reviewComment);
    emitCommentEvent({ type: "review", comment: reviewComment });
    return {
      comment: reviewComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "review", "negative keyword", reviewComment),
      replied: false, reviewed: true, skipped: false, failed: false, ruleMatched: false, limitHit: false,
    };
  }
  stages.push(makeStage("safety", "pass", Date.now() - tSafety, { detail: "clean" }));

  // ── rule matching ──
  const tRule = Date.now();
  const activeRules = (db.rules || [])
    .filter((r) => r.isActive)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    const conditions = rule.conditions || [];
    if (conditions.length === 0) continue;

    const matches = conditions.map((cond) => {
      const val = cond.value?.toLowerCase() || "";
      const txt = textLower;
      switch (cond.type) {
        case "contains": return txt.includes(val);
        case "equals": return txt === val;
        case "starts_with": return txt.startsWith(val);
        case "regex":
          try { return new RegExp(cond.value, "i").test(input.text); }
          catch { return false; }
        case "reply_all": return true;
        default: return false;
      }
    });
    const conditionMet = rule.operator === "AND"
      ? matches.every(Boolean)
      : matches.some(Boolean);
    if (!conditionMet) continue;

    const ruleResult = await handleRuleMatch(rule, baseComment, input, ctx, stages, tRule, traceId, startedAtIso, startedAt);
    return ruleResult;
  }
  stages.push(makeStage("rule", "skip", Date.now() - tRule, { detail: "no rule matched" }));

  // ── intent classification ──
  const tIntent = Date.now();
  let intent: import("./rag_types").CommentIntent = "question";
  try {
    intent = await classifyIntent(input.text, input.videoTitle);
  } catch {
    intent = "question";
  }
  stages.push(makeStage("intent", "pass", Date.now() - tIntent, { detail: intent }));

  const isQuestionLike =
    input.text.includes("?") ||
    /\b(what|how|when|where|who|why|can|does|is|are|do|did|will|team|price|cost|info|help|know|tell|about|support)\b/i.test(input.text);

  if (shouldSkipByIntent(intent) && !isQuestionLike) {
    const skippedComment: DBComment = {
      ...baseComment,
      status: "skipped",
      decidedAt: new Date().toISOString(),
    };
    db.comments.unshift(skippedComment);
    emitCommentEvent({ type: "skipped", comment: skippedComment });
    return {
      comment: skippedComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "skipped", `intent=${intent}`, skippedComment),
      replied: false, reviewed: false, skipped: true, failed: false, ruleMatched: false, limitHit: false,
    };
  }

  // ── RAG / knowledge-base matching ──
  const tRag = Date.now();
  let replyText: string | null = null;
  let replySource: "rag" | "ai" = "rag";
  let matchedFAQId: string | null = null;
  let confidence = 0;

  if (faqs.length > 0) {
    try {
      const ragResult = await processEnhancedRAGReply(
        input.text,
        faqs,
        input.author,
        input.channelName,
        intent,
        input.videoTitle,
        db.userSession?.email || "default_user"
      );

      if (ragResult) {
        replyText = ragResult.replyText;
        matchedFAQId = ragResult.matchedFAQId;
        confidence = ragResult.confidence;
        stages.push(makeStage("rag", "pass", Date.now() - tRag, {
          detail: ragResult.matchSource,
          confidence,
          matchedId: matchedFAQId ?? undefined,
        }));
      } else {
        stages.push(makeStage("rag", "skip", Date.now() - tRag, { detail: "no KB match" }));
        const skippedComment: DBComment = {
          ...baseComment,
          status: "skipped",
          decidedAt: new Date().toISOString(),
        };
        db.comments.unshift(skippedComment);
        emitCommentEvent({ type: "skipped", comment: skippedComment });
        return {
          comment: skippedComment,
          trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "skipped", "rag miss", skippedComment),
          replied: false, reviewed: false, skipped: true, failed: false, ruleMatched: false, limitHit: false,
        };
      }
    } catch (err) {
      console.error("[Engine] RAG processing error:", err);
      stages.push(makeStage("rag", "error", Date.now() - tRag, { detail: "exception" }));
      const skippedComment: DBComment = { ...baseComment, status: "skipped", decidedAt: new Date().toISOString() };
      db.comments.unshift(skippedComment);
      emitCommentEvent({ type: "skipped", comment: skippedComment });
      return {
        comment: skippedComment,
        trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "skipped", "rag error", skippedComment),
        replied: false, reviewed: false, skipped: true, failed: false, ruleMatched: false, limitHit: false,
      };
    }
  } else {
    stages.push(makeStage("rag", "skip", Date.now() - tRag, { detail: "no KB configured" }));
    const skippedComment: DBComment = {
      ...baseComment,
      status: "skipped",
      decidedAt: new Date().toISOString(),
    };
    db.comments.unshift(skippedComment);
    emitCommentEvent({ type: "skipped", comment: skippedComment });
    return {
      comment: skippedComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "skipped", "no KB", skippedComment),
      replied: false, reviewed: false, skipped: true, failed: false, ruleMatched: false, limitHit: false,
    };
  }

  if (!replyText) {
    const skippedComment: DBComment = { ...baseComment, status: "skipped", decidedAt: new Date().toISOString() };
    db.comments.unshift(skippedComment);
    emitCommentEvent({ type: "skipped", comment: skippedComment });
    return {
      comment: skippedComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "skipped", "no reply", skippedComment),
      replied: false, reviewed: false, skipped: true, failed: false, ruleMatched: false, limitHit: false,
    };
  }

  // ── confidence gate (B4) ──
  const tConf = Date.now();
  const gate = db.workspace?.settings?.confidenceGate;
  if (typeof gate === "number" && gate > 0 && confidence < gate) {
    stages.push(makeStage("confidence", "hold", Date.now() - tConf, { detail: `${confidence.toFixed(2)} < ${gate}`, confidence }));
    const reviewComment: DBComment = {
      ...baseComment,
      status: "review",
      matchedRuleId: matchedFAQId || "rag",
      autoReplyText: replyText,
      confidence,
      decidedAt: new Date().toISOString(),
    };
    db.comments.unshift(reviewComment);
    emitCommentEvent({ type: "review", comment: reviewComment });
    return {
      comment: reviewComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "review", `low confidence ${confidence.toFixed(2)}`, reviewComment, replyText, replySource, confidence),
      replied: false, reviewed: true, skipped: false, failed: false, ruleMatched: false, limitHit: false,
    };
  }
  stages.push(makeStage("confidence", "pass", Date.now() - tConf, { detail: `${(confidence * 100).toFixed(0)}%`, confidence }));

  // ── reply ──
  const tReply = Date.now();
  if (activeUser.repliesToday >= maxDailyLimit) {
    const holdComment: DBComment = { ...baseComment, status: "matched", matchedRuleId: matchedFAQId || "rag", autoReplyText: replyText, confidence, decidedAt: new Date().toISOString() };
    db.comments.unshift(holdComment);
    emitCommentEvent({ type: "new", comment: holdComment });
    return {
      comment: holdComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "limit", "daily limit reached", holdComment, replyText, replySource, confidence),
      replied: false, reviewed: false, skipped: false, failed: false, ruleMatched: false, limitHit: true,
    };
  }

  const ytResponse = await postCommentReply(input.channelId, input.commentId, replyText);
  if (ytResponse) {
    activeUser.repliesToday++;
    stages.push(makeStage("reply", "done", Date.now() - tReply, { detail: "posted", confidence }));
    const successComment: DBComment = {
      ...baseComment,
      status: "replied",
      matchedRuleId: matchedFAQId || "rag",
      autoReplyText: replyText,
      replyFiredAt: new Date().toISOString(),
      replySource,
      confidence,
      authorHistoryCount: 1,
      decidedAt: new Date().toISOString(),
    };
    db.comments.unshift(successComment);
    emitCommentEvent({ type: "rag_match", comment: successComment });
    return {
      comment: successComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "replied", "posted", successComment, replyText, replySource, confidence),
      replied: true, reviewed: false, skipped: false, failed: false, ruleMatched: false, limitHit: false,
    };
  }

  stages.push(makeStage("reply", "error", Date.now() - tReply, { detail: "youtube api rejected" }));
  const failedComment: DBComment = {
    ...baseComment,
    status: "failed",
    matchedRuleId: matchedFAQId || "rag",
    autoReplyText: replyText,
    replySource,
    confidence,
    decidedAt: new Date().toISOString(),
  };
  db.comments.unshift(failedComment);
  emitCommentEvent({ type: "failed", comment: failedComment });
  return {
    comment: failedComment,
    trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "failed", "post failed", failedComment, replyText, replySource, confidence),
    replied: false, reviewed: false, skipped: false, failed: true, ruleMatched: false, limitHit: false,
  };
}

// ─────────────────────────────────────────────────────────────
//  Rule-match handling (extracted so the trace stays complete)
// ─────────────────────────────────────────────────────────────

async function handleRuleMatch(
  rule: import("@/database/db").Rule,
  baseComment: DBComment,
  input: IncomingComment,
  ctx: EngineContext,
  stages: PipelineStageResult[],
  tRule: number,
  traceId: string,
  startedAtIso: string,
  startedAt: number
): Promise<ProcessResult> {
  const { db, activeUser, maxDailyLimit } = ctx;
  const nowMs = Date.now();

  const template = (db.templates || []).find((t) => t.id === rule.templateId);
  const rawReply = template?.body || "Thank you for your comment!";
  const ruleReplyText = rawReply
    .replace(/\{\{commenter_name\}\}/g, input.author)
    .replace(/\{\{video_title\}\}/g, input.videoTitle)
    .replace(/\{\{channel_name\}\}/g, input.channelName)
    .replace(/\{\{reply_date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{custom_variable_1\}\}/g, rule.customVariable1 || "")
    .replace(/\{\{custom_variable_2\}\}/g, rule.customVariable2 || "")
    .replace(/\{\{custom_variable_3\}\}/g, rule.customVariable3 || "");

  // Rule daily limit
  const todayStr = new Date().toISOString().split("T")[0];
  const ruleRepliesToday = db.comments.filter(
    (c) => c.matchedRuleId === rule.id && c.replyFiredAt?.startsWith(todayStr)
  ).length;
  if (rule.dailyLimit > 0 && ruleRepliesToday >= rule.dailyLimit) {
    stages.push(makeStage("rule", "skip", Date.now() - tRule, { detail: `${rule.name}: daily limit hit`, matchedId: rule.id }));
    return continueToIntent(baseComment, input, ctx, stages, tRule, traceId, startedAtIso);
  }

  // Review mode
  if (rule.approvalMode === "review") {
    stages.push(makeStage("rule", "hold", Date.now() - tRule, { detail: `${rule.name}: review mode`, matchedId: rule.id }));
    const reviewComment: DBComment = {
      ...baseComment,
      status: "review",
      matchedRuleId: rule.id,
      delayRemainingSeconds: rule.delaySeconds || 0,
      autoReplyText: ruleReplyText,
      decidedAt: new Date().toISOString(),
    };
    db.comments.unshift(reviewComment);
    emitCommentEvent({ type: "review", comment: reviewComment });
    return {
      comment: reviewComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, nowMs, "review", "rule review mode", reviewComment, ruleReplyText, "rule"),
      replied: false, reviewed: true, skipped: false, failed: false, ruleMatched: true, limitHit: false,
    };
  }

  // Autonomous — post
  if (activeUser.repliesToday >= maxDailyLimit) {
    stages.push(makeStage("rule", "skip", Date.now() - tRule, { detail: "daily limit reached", matchedId: rule.id }));
    const holdComment: DBComment = { ...baseComment, status: "matched", matchedRuleId: rule.id, autoReplyText: ruleReplyText, decidedAt: new Date().toISOString() };
    db.comments.unshift(holdComment);
    emitCommentEvent({ type: "new", comment: holdComment });
    return {
      comment: holdComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, nowMs, "limit", "daily limit reached", holdComment, ruleReplyText, "rule"),
      replied: false, reviewed: false, skipped: false, failed: false, ruleMatched: true, limitHit: true,
    };
  }

  const ytResponse = await postCommentReply(input.channelId, input.commentId, ruleReplyText);
  if (ytResponse) {
    activeUser.repliesToday++;
    stages.push(makeStage("rule", "done", Date.now() - tRule, { detail: `${rule.name}: posted`, matchedId: rule.id }));
    const successComment: DBComment = {
      ...baseComment,
      status: "replied",
      matchedRuleId: rule.id,
      autoReplyText: ruleReplyText,
      replyFiredAt: new Date().toISOString(),
      replySource: "rule",
      authorHistoryCount: 1,
      decidedAt: new Date().toISOString(),
    };
    db.comments.unshift(successComment);
    emitCommentEvent({ type: "replied", comment: successComment });
    return {
      comment: successComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, nowMs, "replied", `rule: ${rule.name}`, successComment, ruleReplyText, "rule"),
      replied: true, reviewed: false, skipped: false, failed: false, ruleMatched: true, limitHit: false,
    };
  }

  stages.push(makeStage("rule", "error", Date.now() - tRule, { detail: `${rule.name}: post failed`, matchedId: rule.id }));
  const failedComment: DBComment = {
    ...baseComment,
    status: "failed",
    matchedRuleId: rule.id,
    autoReplyText: ruleReplyText,
    decidedAt: new Date().toISOString(),
  };
  db.comments.unshift(failedComment);
  emitCommentEvent({ type: "failed", comment: failedComment });
  return {
    comment: failedComment,
    trace: buildTrace(stages, traceId, input, startedAtIso, nowMs, "failed", "rule post failed", failedComment, ruleReplyText, "rule"),
    replied: false, reviewed: false, skipped: false, failed: true, ruleMatched: true, limitHit: false,
  };
}

// When a rule matches but is over its daily cap, fall through to intent+RAG
async function continueToIntent(
  baseComment: DBComment,
  input: IncomingComment,
  ctx: EngineContext,
  stages: PipelineStageResult[],
  tRule: number,
  traceId: string,
  startedAtIso: string
): Promise<ProcessResult> {
  const { db, activeUser, maxDailyLimit, processedCommentIds, faqs } = ctx;
  const startedAt = Date.now();

  let intent: import("./rag_types").CommentIntent = "question";
  try {
    intent = await classifyIntent(input.text, input.videoTitle);
  } catch {
    intent = "question";
  }
  stages.push(makeStage("intent", "pass", Date.now() - tRule, { detail: intent }));

  const isQuestionLike =
    input.text.includes("?") ||
    /\b(what|how|when|where|who|why|can|does|is|are|do|did|will|team|price|cost|info|help|know|tell|about|support)\b/i.test(input.text);

  if (shouldSkipByIntent(intent) && !isQuestionLike) {
    const skippedComment: DBComment = { ...baseComment, status: "skipped", decidedAt: new Date().toISOString() };
    db.comments.unshift(skippedComment);
    emitCommentEvent({ type: "skipped", comment: skippedComment });
    return {
      comment: skippedComment,
      trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "skipped", "intent skip", skippedComment),
      replied: false, reviewed: false, skipped: true, failed: false, ruleMatched: true, limitHit: false,
    };
  }

  if (faqs.length > 0) {
    try {
      const ragResult = await processEnhancedRAGReply(
        input.text,
        faqs,
        input.author,
        input.channelName,
        intent,
        input.videoTitle,
        db.userSession?.email || "default_user"
      );
      if (ragResult) {
        stages.push(makeStage("rag", "pass", Date.now() - tRule, { detail: ragResult.matchSource, confidence: ragResult.confidence, matchedId: ragResult.matchedFAQId ?? undefined }));
        if (activeUser.repliesToday >= maxDailyLimit) {
          const holdComment: DBComment = { ...baseComment, status: "matched", matchedRuleId: ragResult.matchedFAQId || "rag", autoReplyText: ragResult.replyText, confidence: ragResult.confidence, decidedAt: new Date().toISOString() };
          db.comments.unshift(holdComment);
          emitCommentEvent({ type: "new", comment: holdComment });
          return {
            comment: holdComment,
            trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "limit", "daily limit", holdComment, ragResult.replyText, "rag", ragResult.confidence),
            replied: false, reviewed: false, skipped: false, failed: false, ruleMatched: true, limitHit: true,
          };
        }
        const ytResponse = await postCommentReply(input.channelId, input.commentId, ragResult.replyText);
        if (ytResponse) {
          activeUser.repliesToday++;
          stages.push(makeStage("reply", "done", Date.now() - tRule, { detail: "posted", confidence: ragResult.confidence }));
          const successComment: DBComment = {
            ...baseComment,
            status: "replied",
            matchedRuleId: ragResult.matchedFAQId || "rag",
            autoReplyText: ragResult.replyText,
            replyFiredAt: new Date().toISOString(),
            replySource: "rag",
            confidence: ragResult.confidence,
            authorHistoryCount: 1,
            decidedAt: new Date().toISOString(),
          };
          db.comments.unshift(successComment);
          emitCommentEvent({ type: "rag_match", comment: successComment });
          return {
            comment: successComment,
            trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "replied", "rag posted", successComment, ragResult.replyText, "rag", ragResult.confidence),
            replied: true, reviewed: false, skipped: false, failed: false, ruleMatched: true, limitHit: false,
          };
        }
        stages.push(makeStage("reply", "error", Date.now() - tRule, { detail: "post failed" }));
        const failedComment: DBComment = { ...baseComment, status: "failed", matchedRuleId: ragResult.matchedFAQId || "rag", autoReplyText: ragResult.replyText, replySource: "rag", confidence: ragResult.confidence, decidedAt: new Date().toISOString() };
        db.comments.unshift(failedComment);
        emitCommentEvent({ type: "failed", comment: failedComment });
        return {
          comment: failedComment,
          trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "failed", "post failed", failedComment, ragResult.replyText, "rag", ragResult.confidence),
          replied: false, reviewed: false, skipped: false, failed: true, ruleMatched: true, limitHit: false,
        };
      }
      stages.push(makeStage("rag", "skip", Date.now() - tRule, { detail: "no KB match" }));
    } catch (err) {
      console.error("[Engine] RAG error after rule cap:", err);
    }
  } else {
    stages.push(makeStage("rag", "skip", Date.now() - tRule, { detail: "no KB configured" }));
  }

  const skippedComment: DBComment = { ...baseComment, status: "skipped", decidedAt: new Date().toISOString() };
  db.comments.unshift(skippedComment);
  emitCommentEvent({ type: "skipped", comment: skippedComment });
  return {
    comment: skippedComment,
    trace: buildTrace(stages, traceId, input, startedAtIso, startedAt, "skipped", "no match", skippedComment),
    replied: false, reviewed: false, skipped: true, failed: false, ruleMatched: true, limitHit: false,
  };
}

// ─────────────────────────────────────────────────────────────
//  Trace builder + emit
// ─────────────────────────────────────────────────────────────

function buildTrace(
  stages: PipelineStageResult[],
  traceId: string,
  input: IncomingComment,
  startedAtIso: string,
  startedAt: number,
  outcome: PipelineTrace["outcome"],
  detail: string,
  comment?: DBComment | null,
  replyText?: string,
  replySource?: "rule" | "rag" | "ai",
  confidence?: number
): PipelineTrace {
  const finishedAt = new Date().toISOString();
  const trace: PipelineTrace = {
    id: traceId,
    commentId: input.commentId,
    author: input.author,
    textPreview: input.text.slice(0, 120),
    videoTitle: input.videoTitle,
    channelId: input.channelId,
    startedAt: startedAtIso,
    finishedAt,
    totalMs: Date.now() - startedAt,
    stages,
    outcome,
    replyText,
    replySource,
    confidence,
    isDemo: input.isDemo,
  };

  // Persist for the visualizer (fire-and-forget; never blocks the engine)
  appendPipelineTrace(trace).catch(() => {});

  // Stream to SSE + Socket.io clients
  emitCommentEvent({ type: "trace", trace });

  // Attach trace to the persisted comment if it exists
  if (comment) {
    comment.traceId = trace.id;
    comment.decidedAt = comment.decidedAt || finishedAt;
  }

  void detail;
  return trace;
}
