/**
 * YouTubeAutomationRuntime — Evaluates automation rules against ingested comments
 * src/backend/youtube-automation-runtime.ts
 *
 * Pipeline: Load active automations → Evaluate scope → Match conditions →
 *   Priority resolve → Idempotency check → Queue reply → Write execution record
 *
 * Execution is IDEMPOTENT: the unique index on yt_executions.idempotencyKey
 * guarantees that even if this function is called twice for the same
 * (automation, comment) pair, only one reply will ever be posted.
 */

import crypto from "crypto";
import {
  getYTAutomationsCollection,
  getYTExecutionsCollection,
  getYTCommentsCollection,
  writeOutboxEvent,
  buildExecutionIdempotencyKey,
  type YTAutomation,
  type YTComment,
  type YTExecution,
} from "@/database/youtube-collections";
import { postCommentReply } from "./youtube";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AutomationResult {
  commentId: string;
  youtubeCommentId: string;
  matched: boolean;
  automationId?: string;
  automationName?: string;
  executionId?: string;
  replyText?: string;
  skippedReason?: string;
  error?: string;
  latencyMs: number;
}

// ─── CONDITION MATCHING ────────────────────────────────────────────────────────

function matchesCondition(
  text: string,
  condition: YTAutomation["conditions"][0]
): boolean {
  const lowerText = text.toLowerCase();
  const lowerValue = condition.value.toLowerCase();

  switch (condition.type) {
    case "contains":
      return lowerText.includes(lowerValue);
    case "equals":
      return lowerText === lowerValue;
    case "starts_with":
      return lowerText.startsWith(lowerValue);
    case "regex":
      try {
        return new RegExp(condition.value, "i").test(text);
      } catch {
        return false;
      }
    case "reply_all":
      return true;
    default:
      return false;
  }
}

function evaluateConditions(
  text: string,
  conditions: YTAutomation["conditions"]
): boolean {
  if (!conditions || conditions.length === 0) return false;

  // Determine overall operator from first condition with an operator, or default to OR
  // (reply_all type always matches regardless)
  if (conditions.some((c) => c.type === "reply_all")) return true;

  const operator = conditions.find((c) => c.operator)?.operator || "OR";

  if (operator === "AND") {
    return conditions.every((c) => matchesCondition(text, c));
  }
  return conditions.some((c) => matchesCondition(text, c));
}

// ─── SCOPE MATCHING ───────────────────────────────────────────────────────────

function automationInScope(
  automation: YTAutomation,
  comment: YTComment
): boolean {
  const { scope } = automation;

  // Channel scope check
  if (scope.channelId && scope.channelId !== comment.channelId) return false;

  // Single video scope
  if (scope.videoId && scope.videoId !== comment.videoId) return false;

  // Multi-video scope
  if (scope.videoIds && scope.videoIds.length > 0) {
    if (!scope.videoIds.includes(comment.videoId)) return false;
  }

  return true;
}

// ─── TEMPLATE RENDERING ───────────────────────────────────────────────────────

function renderTemplate(template: string, comment: YTComment): string {
  return template
    .replace(/\{\{author\}\}/gi, comment.authorName || "there")
    .replace(/\{\{videoId\}\}/gi, comment.videoId)
    .replace(/\{\{channelId\}\}/gi, comment.channelId)
    .trim();
}

// ─── SAFETY FILTERS ───────────────────────────────────────────────────────────

function passedSafetyFilters(comment: YTComment, automation: YTAutomation): { passed: boolean; reason?: string } {
  const safety = automation.safety;
  if (!safety) return { passed: true };

  if (safety.skipSpam && comment.spamScore && comment.spamScore > 0.8) {
    return { passed: false, reason: "SPAM_SCORE_TOO_HIGH" };
  }
  if (safety.skipNegative && comment.sentiment === "spam") {
    return { passed: false, reason: "SPAM_SENTIMENT" };
  }
  if (safety.requireConfidence && comment.intentConfidence !== undefined) {
    if (comment.intentConfidence < safety.requireConfidence) {
      return { passed: false, reason: "CONFIDENCE_BELOW_THRESHOLD" };
    }
  }
  // Never reply to own comments (isCreator flag)
  if (comment.isCreator) {
    return { passed: false, reason: "IS_CREATOR_COMMENT" };
  }
  return { passed: true };
}

// ─── MAIN RUNTIME ─────────────────────────────────────────────────────────────

/**
 * Process a single ingested comment against all active automations.
 * Returns the result of the first matching automation (by priority).
 */
export async function processCommentAgainstAutomations(
  comment: YTComment
): Promise<AutomationResult> {
  const startMs = Date.now();

  const base: AutomationResult = {
    commentId: comment.id,
    youtubeCommentId: comment.youtubeCommentId,
    matched: false,
    latencyMs: 0,
  };

  // Skip if already processed
  if (comment.status !== "new") {
    return { ...base, skippedReason: "ALREADY_PROCESSED", latencyMs: Date.now() - startMs };
  }

  // Load active automations for this workspace scoped to this video/channel
  let automations: YTAutomation[] = [];
  try {
    const col = await getYTAutomationsCollection();
    if (col) {
      automations = await col
        .find({
          workspaceId: comment.workspaceId,
          status: "ACTIVE",
          $or: [
            { "scope.channelId": comment.channelId },
            { "scope.videoId": comment.videoId },
            { "scope.videoIds": comment.videoId },
            // Automations with no specific scope apply globally within workspace
            { "scope.channelId": { $exists: false }, "scope.videoId": { $exists: false }, "scope.videoIds": { $exists: false } },
          ],
        })
        .sort({ priority: 1 })
        .toArray();
    }
  } catch (err: any) {
    return { ...base, error: err?.message, latencyMs: Date.now() - startMs };
  }

  if (automations.length === 0) {
    return { ...base, skippedReason: "NO_ACTIVE_AUTOMATIONS", latencyMs: Date.now() - startMs };
  }

  // Evaluate each automation in priority order
  for (const automation of automations) {
    if (!automationInScope(automation, comment)) continue;

    const safetyCheck = passedSafetyFilters(comment, automation);
    if (!safetyCheck.passed) continue;

    const matched = evaluateConditions(comment.textDisplay, automation.conditions);
    if (!matched) continue;

    // Found a match — build idempotency key
    const idempotencyKey = buildExecutionIdempotencyKey(
      comment.workspaceId,
      automation.id,
      comment.youtubeCommentId
    );

    // Check if already executed (idempotency)
    try {
      const execCol = await getYTExecutionsCollection();
      if (execCol) {
        const existing = await execCol.findOne({ idempotencyKey });
        if (existing) {
          return {
            ...base,
            matched: true,
            automationId: automation.id,
            automationName: automation.name,
            executionId: existing.id,
            replyText: existing.replyText,
            skippedReason: "ALREADY_EXECUTED",
            latencyMs: Date.now() - startMs,
          };
        }
      }

      // Render reply text
      const replyText = renderTemplate(
        automation.action.replyTemplate,
        comment
      );

      // Create execution record (QUEUED state)
      const executionId = crypto.randomUUID();
      const executionDoc: YTExecution = {
        id: executionId,
        workspaceId: comment.workspaceId,
        automationId: automation.id,
        automationVersionId: automation.activeVersionId || "none",
        commentId: comment.id,
        youtubeCommentId: comment.youtubeCommentId,
        videoId: comment.videoId,
        idempotencyKey,
        status: "RUNNING",
        startedAt: new Date().toISOString(),
        ruleMatched: true,
        executionMode: automation.executionMode,
        replyText,
        attemptCount: 1,
      };

      // Insert execution if Mongo available
      if (execCol) {
        await execCol.insertOne(executionDoc);
      }

      // Write outbox event
      await writeOutboxEvent(
        comment.workspaceId,
        "execution.started",
        "execution",
        executionId,
        { automationId: automation.id, commentId: comment.id, videoId: comment.videoId }
      );

      // Apply delay if configured
      if (automation.action.delay && automation.action.delay > 0) {
        await new Promise((r) => setTimeout(r, Math.min(automation.action.delay! * 1000, 10_000)));
      }

      // Post reply to YouTube
      let youtubeReplyId: string | null = null;
      let replyError: string | undefined;
      try {
        const ytResponse = await postCommentReply(
          comment.channelId,
          comment.youtubeCommentId,
          replyText
        );
        youtubeReplyId = ytResponse?.id || null;
      } catch (err: any) {
        replyError = err?.message || "REPLY_POST_FAILED";
      }

      const latencyMs = Date.now() - startMs;
      const finalStatus: YTExecution["status"] = youtubeReplyId ? "COMPLETED" : "FAILED";

      // Update execution record
      if (execCol) {
        await execCol.updateOne(
          { id: executionId },
          {
            $set: {
              status: finalStatus,
              completedAt: new Date().toISOString(),
              youtubeReplyId: youtubeReplyId || undefined,
              lastError: replyError,
              latencyMs,
            },
          }
        );
      }

      // Update comment status
      const commentsCol = await getYTCommentsCollection();
      if (commentsCol) {
        await commentsCol.updateOne(
          { id: comment.id },
          {
            $set: {
              status: youtubeReplyId ? "replied" : "failed",
              matchedAutomationId: automation.id,
              executionId,
              replyText,
              replyPostedAt: youtubeReplyId ? new Date().toISOString() : undefined,
              youtubeReplyCommentId: youtubeReplyId || undefined,
            },
          }
        );
      }

      // Update automation counters
      const autoCol = await getYTAutomationsCollection();
      if (autoCol) {
        await autoCol.updateOne(
          { id: automation.id },
          {
            $inc: {
              execCountToday: 1,
              execCountTotal: 1,
            },
            $set: { lastExecutedAt: new Date().toISOString() },
          }
        );
      }

      // Write outbox event for live feed
      await writeOutboxEvent(
        comment.workspaceId,
        youtubeReplyId ? "reply.created" : "execution.failed",
        "execution",
        executionId,
        {
          commentId: comment.id,
          youtubeCommentId: comment.youtubeCommentId,
          videoId: comment.videoId,
          replyText,
          youtubeReplyId,
          error: replyError,
        }
      );

      return {
        commentId: comment.id,
        youtubeCommentId: comment.youtubeCommentId,
        matched: true,
        automationId: automation.id,
        automationName: automation.name,
        executionId,
        replyText,
        error: replyError,
        latencyMs,
      };
    } catch (err: any) {
      // Idempotency key conflict = another worker already processed this
      if (err?.code === 11000) {
        return {
          ...base,
          matched: true,
          automationId: automation.id,
          skippedReason: "DUPLICATE_PREVENTED_BY_UNIQUE_INDEX",
          latencyMs: Date.now() - startMs,
        };
      }
      return { ...base, error: err?.message, latencyMs: Date.now() - startMs };
    }
  }

  // No automation matched
  const commentsCol = await getYTCommentsCollection();
  if (commentsCol) {
    await commentsCol.updateOne({ id: comment.id }, { $set: { status: "skipped" } });
  }

  return { ...base, skippedReason: "NO_RULE_MATCHED", latencyMs: Date.now() - startMs };
}

/**
 * Process all "new" comments for a video against automations.
 * Returns summary of how many were matched, replied, or skipped.
 */
export async function processNewCommentsForVideo(
  workspaceId: string,
  videoId: string
): Promise<{ processed: number; matched: number; replied: number; failed: number; skipped: number }> {
  const summary = { processed: 0, matched: 0, replied: 0, failed: 0, skipped: 0 };

  try {
    const commentsCol = await getYTCommentsCollection();
    if (commentsCol) {
      const newComments = await commentsCol
        .find({ workspaceId, videoId, status: "new" })
        .limit(100)
        .toArray();

      for (const comment of newComments) {
        const result = await processCommentAgainstAutomations(comment);
        summary.processed++;
        if (result.matched) {
          summary.matched++;
          if (result.error) {
            summary.failed++;
          } else if (!result.skippedReason) {
            summary.replied++;
          }
        } else {
          summary.skipped++;
        }
      }
    }
  } catch (err) {
    console.error("[YT-Runtime] processNewCommentsForVideo error:", err);
  }

  return summary;
}
