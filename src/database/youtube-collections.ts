/**
 * QuickReply — YouTube Dedicated MongoDB Collections
 * src/database/youtube-collections.ts
 *
 * Provides strongly-typed access to YouTube-specific MongoDB collections.
 * These are SEPARATE from the single-user-document getDB/saveDB blob.
 * Source of truth for: automations, comments, sync state, executions, outbox, heartbeats.
 */

import crypto from "crypto";
import { getMongoClient } from "./db";
import type { Collection, Db } from "mongodb";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type AutomationStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ERROR" | "ARCHIVED";
export type ExecutionMode = "TAG" | "RAG" | "HYBRID";

export interface YTAutomation {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  platform: "youtube";
  status: AutomationStatus;
  executionMode: ExecutionMode;
  activeVersionId: string | null;
  scope: {
    channelId?: string;
    videoId?: string;
    videoIds?: string[];
  };
  conditions: Array<{
    id: string;
    type: "contains" | "equals" | "regex" | "starts_with" | "reply_all";
    value: string;
    operator?: "AND" | "OR";
  }>;
  action: {
    type: "reply";
    replyTemplate: string;
    delay?: number;
  };
  rateLimit?: {
    maxRepliesPerVideo?: number;
    maxRepliesPerUser?: number;
    windowSeconds?: number;
  };
  safety?: {
    skipSpam: boolean;
    skipNegative: boolean;
    requireConfidence?: number;
  };
  priority: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  execCountToday: number;
  execCountTotal: number;
  lastExecutedAt?: string;
  lastError?: string;
}

export interface YTAutomationVersion {
  id: string;
  automationId: string;
  workspaceId: string;
  version: number;
  compiledDefinition: object;
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
}

export interface YTComment {
  id: string;
  workspaceId: string;
  videoId: string;
  channelId: string;
  threadId: string;
  parentCommentId?: string;
  youtubeCommentId: string;
  authorChannelId?: string;
  authorName: string;
  authorAvatar?: string;
  textOriginal: string;
  textDisplay: string;
  publishedAt: string;
  updatedAt?: string;
  likeCount: number;
  isReply: boolean;
  isCreator: boolean;
  rawSourceHash: string;
  ingestedAt: string;
  sentiment?: "positive" | "neutral" | "negative" | "question" | "spam";
  leadScore?: number;
  spamScore?: number;
  intent?: string;
  intentConfidence?: number;
  status: "new" | "matched" | "replied" | "skipped" | "review" | "failed";
  matchedAutomationId?: string;
  executionId?: string;
  replyText?: string;
  replyPostedAt?: string;
  youtubeReplyCommentId?: string;
}

export interface YTSyncState {
  id: string;
  workspaceId: string;
  videoId: string;
  channelId: string;
  lastPageToken?: string;
  lastSuccessfulSyncAt?: string;
  lastSeenCommentPublishedAt?: string;
  lastSeenCommentId?: string;
  status: "pending" | "running" | "healthy" | "error" | "paused" | "stale";
  consecutiveFailures: number;
  lastError?: string;
  lastErrorAt?: string;
  nextPollAt: string;
  backoffUntil?: string;
  pollIntervalMs: number;
  priority: "critical" | "high" | "normal" | "low" | "background";
  automationEnabled: boolean;
  ragEnabled: boolean;
  commentsIngestedTotal: number;
  apiCallsTotal: number;
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "SKIPPED";

export interface YTExecution {
  id: string;
  workspaceId: string;
  automationId: string;
  automationVersionId: string;
  commentId: string;
  youtubeCommentId: string;
  videoId: string;
  idempotencyKey: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  ruleMatched: boolean;
  executionMode: ExecutionMode;
  replyText?: string;
  youtubeReplyId?: string;
  attemptCount: number;
  lastError?: string;
  nextRetryAt?: string;
  latencyMs?: number;
}

export type OutboxEventType =
  | "comment.created" | "comment.updated" | "reply.created"
  | "automation.created" | "automation.published" | "automation.paused"
  | "execution.started" | "execution.completed" | "execution.failed"
  | "sync.started" | "sync.completed" | "sync.failed" | "sync.stale"
  | "connection.expired" | "quota.warning" | "worker.heartbeat";

export interface YTOutboxEvent {
  id: string;
  workspaceId: string;
  eventType: OutboxEventType;
  aggregateType: "comment" | "automation" | "execution" | "sync" | "connection" | "worker";
  aggregateId: string;
  payload: object;
  createdAt: string;
  publishedAt?: string;
  attempts: number;
  lastError?: string;
}

export interface YTWorkerHeartbeat {
  workerId: string;
  workerType: "sync" | "action" | "scheduler";
  hostname: string;
  status: "healthy" | "degraded" | "stopping";
  lastHeartbeatAt: string;
  currentJob?: string;
  processedJobs: number;
  failedJobs: number;
  startedAt: string;
}

// ─── COLLECTION ACCESS ───────────────────────────────────────────────────────

const DB_NAME = process.env.MONGODB_DB_NAME || "quickreply";

export function isMongoAvailable(): boolean {
  return !!process.env.MONGODB_URI;
}

async function getYTDb(): Promise<Db | null> {
  if (!isMongoAvailable()) return null;
  try {
    const client = await getMongoClient();
    return client.db(DB_NAME);
  } catch {
    return null;
  }
}

export async function getYTAutomationsCollection(): Promise<Collection<YTAutomation> | null> {
  const db = await getYTDb();
  if (!db) return null;
  return db.collection<YTAutomation>("yt_automations");
}

export async function getYTAutomationVersionsCollection(): Promise<Collection<YTAutomationVersion> | null> {
  const db = await getYTDb();
  if (!db) return null;
  return db.collection<YTAutomationVersion>("yt_automation_versions");
}

export async function getYTCommentsCollection(): Promise<Collection<YTComment> | null> {
  const db = await getYTDb();
  if (!db) return null;
  return db.collection<YTComment>("yt_comments");
}

export async function getYTSyncStateCollection(): Promise<Collection<YTSyncState> | null> {
  const db = await getYTDb();
  if (!db) return null;
  return db.collection<YTSyncState>("yt_sync_state");
}

export async function getYTExecutionsCollection(): Promise<Collection<YTExecution> | null> {
  const db = await getYTDb();
  if (!db) return null;
  return db.collection<YTExecution>("yt_executions");
}

export async function getYTOutboxCollection(): Promise<Collection<YTOutboxEvent> | null> {
  const db = await getYTDb();
  if (!db) return null;
  return db.collection<YTOutboxEvent>("yt_outbox");
}

export async function getYTWorkerHeartbeatCollection(): Promise<Collection<YTWorkerHeartbeat> | null> {
  const db = await getYTDb();
  if (!db) return null;
  return db.collection<YTWorkerHeartbeat>("yt_worker_heartbeats");
}

// ─── INDEX BOOTSTRAP ─────────────────────────────────────────────────────────

let _indexesCreated = false;

export async function ensureYouTubeIndexes(): Promise<void> {
  if (_indexesCreated || !isMongoAvailable()) return;
  try {
    const db = await getYTDb();
    if (!db) return;

    await db.collection("yt_automations").createIndexes([
      { key: { workspaceId: 1, status: 1 } },
      { key: { workspaceId: 1, "scope.videoId": 1, status: 1 } },
      { key: { id: 1 }, unique: true },
    ]);

    await db.collection("yt_comments").createIndexes([
      { key: { workspaceId: 1, youtubeCommentId: 1 }, unique: true },
      { key: { workspaceId: 1, videoId: 1, publishedAt: -1 } },
      { key: { workspaceId: 1, status: 1 } },
      { key: { workspaceId: 1, ingestedAt: -1 } },
    ]);

    await db.collection("yt_sync_state").createIndexes([
      { key: { workspaceId: 1, videoId: 1 }, unique: true },
      { key: { workspaceId: 1, nextPollAt: 1, status: 1 } },
    ]);

    await db.collection("yt_executions").createIndexes([
      { key: { idempotencyKey: 1 }, unique: true },
      { key: { workspaceId: 1, automationId: 1, status: 1 } },
      { key: { workspaceId: 1, startedAt: -1 } },
    ]);

    await db.collection("yt_outbox").createIndexes([
      { key: { workspaceId: 1, createdAt: 1 } },
      { key: { publishedAt: 1 } },
    ]);

    await db.collection("yt_worker_heartbeats").createIndexes([
      { key: { workerId: 1 }, unique: true },
      { key: { lastHeartbeatAt: 1 } },
    ]);

    _indexesCreated = true;
    console.log("[YT-Collections] Indexes ensured.");
  } catch (err) {
    console.error("[YT-Collections] Index error (non-fatal):", err);
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Idempotency key: prevents duplicate execution of same automation on same comment. */
export function buildExecutionIdempotencyKey(
  workspaceId: string,
  automationId: string,
  youtubeCommentId: string
): string {
  return crypto
    .createHash("sha256")
    .update(`${workspaceId}:${automationId}:${youtubeCommentId}`)
    .digest("hex");
}

/** Write an outbox event. Non-fatal if it fails — DB comment is already persisted. */
export async function writeOutboxEvent(
  workspaceId: string,
  eventType: OutboxEventType,
  aggregateType: YTOutboxEvent["aggregateType"],
  aggregateId: string,
  payload: object
): Promise<void> {
  try {
    const outbox = await getYTOutboxCollection();
    if (!outbox) return;
    await outbox.insertOne({
      id: crypto.randomUUID(),
      workspaceId,
      eventType,
      aggregateType,
      aggregateId,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    } as YTOutboxEvent);
  } catch (err) {
    console.error("[YT-Outbox] Write failed (non-fatal):", err);
  }
}

/** Adaptive polling interval based on video activity and automation status. */
export function computePollIntervalMs(opts: {
  videoAgeMs: number;
  hasActiveAutomation: boolean;
  hasActiveGiveaway?: boolean;
  consecutiveEmpty?: number;
}): number {
  const { videoAgeMs, hasActiveAutomation, hasActiveGiveaway, consecutiveEmpty = 0 } = opts;
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;
  const ONE_WEEK = 7 * ONE_DAY;

  if (hasActiveGiveaway) return 15_000;           // 15s — active giveaway
  if (videoAgeMs < ONE_HOUR && hasActiveAutomation) return 30_000;  // 30s — hot + automated
  if (videoAgeMs < ONE_HOUR) return 60_000;       // 1min — hot video
  if (videoAgeMs < ONE_DAY && hasActiveAutomation) return 90_000;   // 90s — recent + automated
  if (videoAgeMs < ONE_DAY) return 5 * 60_000;   // 5min — recent
  if (videoAgeMs < ONE_WEEK && hasActiveAutomation) return 10 * 60_000; // 10min
  if (videoAgeMs < ONE_WEEK) return 20 * 60_000; // 20min
  // Old video — back off based on consecutive empty polls
  const backoffMultiplier = Math.min(consecutiveEmpty, 3);
  return 30 * 60_000 * (backoffMultiplier + 1);   // 30min → 60min → 90min → 120min
}
