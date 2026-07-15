/**
 * Redis/BullMQ Job Queue System for Quick Reply
 *
 * Replaces the in-process setInterval scheduler with a proper
 * distributed job queue. This provides:
 * - Reliability: Jobs survive server restarts
 * - Scalability: Multiple workers can process jobs in parallel
 * - Monitoring: Job status, retries, and failure tracking
 * - Rate limiting: Built-in rate limiting per queue
 *
 * Queues:
 * - comment-poll: Fetches new YouTube comments
 * - reply-post: Posts replies to YouTube comments
 * - rag-process: Runs RAG matching on comments
 * - billing-cycle: Handles subscription billing cycles
 */

import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { getRedis, isRedisAvailable } from "./redis";

// --- Queue Configuration ---

const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { count: 100, age: 24 * 3600 },  // Keep 100 completed jobs for 24h
  removeOnFail: { count: 50, age: 72 * 3600 },       // Keep 50 failed jobs for 72h
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
};

// --- Queue Definitions ---

let commentPollQueue: Queue | null = null;
let replyPostQueue: Queue | null = null;
let ragProcessQueue: Queue | null = null;
let billingQueue: Queue | null = null;

async function getQueue(name: string): Promise<Queue | null> {
  const redis = await getRedis();
  if (!redis || !isRedisAvailable()) return null;

  switch (name) {
    case "comment-poll":
      if (!commentPollQueue) {
        commentPollQueue = new Queue("comment-poll", {
          connection: redis,
          defaultJobOptions: {
            ...DEFAULT_JOB_OPTIONS,
            attempts: 2,  // Polling is idempotent, fewer retries
          },
        });
      }
      return commentPollQueue;
    case "reply-post":
      if (!replyPostQueue) {
        replyPostQueue = new Queue("reply-post", {
          connection: redis,
          defaultJobOptions: {
            ...DEFAULT_JOB_OPTIONS,
            attempts: 5,  // Reply posting needs more retries
          },
        });
      }
      return replyPostQueue;
    case "rag-process":
      if (!ragProcessQueue) {
        ragProcessQueue = new Queue("rag-process", {
          connection: redis,
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });
      }
      return ragProcessQueue;
    case "billing":
      if (!billingQueue) {
        billingQueue = new Queue("billing", {
          connection: redis,
          defaultJobOptions: {
            ...DEFAULT_JOB_OPTIONS,
            attempts: 3,
          },
        });
      }
      return billingQueue;
    default:
      return null;
  }
}

// --- Job Data Interfaces ---

export interface CommentPollJobData {
  userId: string;
  channelId?: string;  // Optional: poll specific channel
  videoId?: string;    // Optional: poll specific video
}

export interface ReplyPostJobData {
  userId: string;
  channelId: string;
  commentId: string;
  replyText: string;
  templateId?: string;
  ruleId?: string;
}

export interface RAGProcessJobData {
  userId: string;
  channelId: string;
  commentId: string;
  commentText: string;
  commenterName: string;
  channelName: string;
}

export interface BillingJobData {
  userId: string;
  action: "subscription_check" | "invoice_created" | "payment_failed";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

// --- Queue Operations ---

/**
 * Add a comment poll job to the queue.
 * Falls back to direct execution if Redis is unavailable.
 */
export async function enqueueCommentPoll(data: CommentPollJobData): Promise<string | null> {
  const queue = await getQueue("comment-poll");
  if (!queue) return null;

  const job = await queue.add("poll", data, {
    priority: 1,
    delay: 0,
  });
  return job.id?.toString() || null;
}

/**
 * Add a reply post job to the queue.
 */
export async function enqueueReplyPost(data: ReplyPostJobData): Promise<string | null> {
  const queue = await getQueue("reply-post");
  if (!queue) return null;

  const job = await queue.add("reply", data, {
    priority: 2,
    delay: 0,
  });
  return job.id?.toString() || null;
}

/**
 * Add an RAG processing job to the queue.
 */
export async function enqueueRAGProcess(data: RAGProcessJobData): Promise<string | null> {
  const queue = await getQueue("rag-process");
  if (!queue) return null;

  const job = await queue.add("rag", data, {
    priority: 3,
  });
  return job.id?.toString() || null;
}

/**
 * Add a billing job to the queue.
 */
export async function enqueueBillingJob(data: BillingJobData): Promise<string | null> {
  const queue = await getQueue("billing");
  if (!queue) return null;

  const job = await queue.add("billing", data, {
    priority: 4,
  });
  return job.id?.toString() || null;
}

// --- Worker Definitions ---

let pollWorker: Worker | null = null;
let replyWorker: Worker | null = null;
let ragWorker: Worker | null = null;
let billingWorker: Worker | null = null;

/**
 * Start all queue workers.
 * Only runs when Redis is available.
 */
export async function startWorkers(): Promise<void> {
  if (!isRedisAvailable()) {
    console.log("[Queue] Redis not available — workers not started. Using in-process scheduler.");
    return;
  }

  const redis = await getRedis();
  if (!redis) return;

  // Comment Poll Worker
  if (!pollWorker) {
    pollWorker = new Worker(
      "comment-poll",
      async (job: Job<CommentPollJobData>) => {
        const { pollAndReply } = await import("./scheduler");
        const result = await pollAndReply();
        return result;
      },
      { connection: redis, concurrency: 1 }  // Only 1 concurrent poll
    );

    pollWorker.on("completed", (job) => {
      console.log(`[Queue] Poll job ${job.id} completed`);
    });

    pollWorker.on("failed", (job, err) => {
      console.error(`[Queue] Poll job ${job?.id} failed:`, err.message);
    });
  }

  // Reply Post Worker
  if (!replyWorker) {
    replyWorker = new Worker(
      "reply-post",
      async (job: Job<ReplyPostJobData>) => {
        const { postCommentReply } = await import("./youtube");
        const result = await postCommentReply(
          job.data.channelId,
          job.data.commentId,
          job.data.replyText
        );
        return { success: !!result, commentId: job.data.commentId };
      },
      { connection: redis, concurrency: 5 }  // Can post 5 replies concurrently
    );

    replyWorker.on("completed", (job) => {
      console.log(`[Queue] Reply job ${job.id} completed for comment ${job.data.commentId}`);
    });

    replyWorker.on("failed", (job, err) => {
      console.error(`[Queue] Reply job ${job?.id} failed:`, err.message);
    });
  }

  // RAG Process Worker
  if (!ragWorker) {
    ragWorker = new Worker(
      "rag-process",
      async (job: Job<RAGProcessJobData>) => {
        const { processRAGReply } = await import("./rag");
        const { getDB } = await import("@/database/db");
        const db = await getDB(job.data.userId);
        const faqs = db.faqs || [];
        const result = await processRAGReply(
          job.data.commentText,
          faqs,
          job.data.commenterName,
          job.data.channelName,
          0.40,
          job.data.userId
        );
        return result;
      },
      { connection: redis, concurrency: 3 }
    );

    ragWorker.on("completed", (job) => {
      console.log(`[Queue] RAG job ${job.id} completed`);
    });

    ragWorker.on("failed", (job, err) => {
      console.error(`[Queue] RAG job ${job?.id} failed:`, err.message);
    });
  }

  // Billing Worker
  if (!billingWorker) {
    billingWorker = new Worker(
      "billing",
      async (job: Job<BillingJobData>) => {
        const { handleBillingEvent } = await import("./stripe");
        const result = await handleBillingEvent(job.data);
        return result;
      },
      { connection: redis, concurrency: 1 }
    );

    billingWorker.on("completed", (job) => {
      console.log(`[Queue] Billing job ${job.id} completed`);
    });

    billingWorker.on("failed", (job, err) => {
      console.error(`[Queue] Billing job ${job?.id} failed:`, err.message);
    });
  }

  console.log("[Queue] All workers started");
}

/**
 * Stop all queue workers gracefully.
 */
export async function stopWorkers(): Promise<void> {
  const workers = [pollWorker, replyWorker, ragWorker, billingWorker];
  await Promise.all(workers.filter(Boolean).map((w) => w!.close()));
  pollWorker = replyWorker = ragWorker = billingWorker = null;

  // Close queues
  const queues = [commentPollQueue, replyPostQueue, ragProcessQueue, billingQueue];
  await Promise.all(queues.filter(Boolean).map((q) => q!.close()));
  commentPollQueue = replyPostQueue = ragProcessQueue = billingQueue = null;

  console.log("[Queue] All workers and queues closed");
}

/**
 * Get queue health/status for monitoring.
 */
export async function getQueueStatus(): Promise<Record<string, {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}>> {
  const statuses: Record<string, any> = {};

  for (const name of ["comment-poll", "reply-post", "rag-process", "billing"]) {
    const queue = await getQueue(name);
    if (!queue) {
      statuses[name] = { waiting: 0, active: 0, completed: 0, failed: 0, status: "unavailable" };
      continue;
    }

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      statuses[name] = { waiting, active, completed, failed, status: "running" };
    } catch {
      statuses[name] = { waiting: 0, active: 0, completed: 0, failed: 0, status: "error" };
    }
  }

  return statuses;
}

// --- Fallback: Direct Execution (when Redis unavailable) ---

/**
 * Execute a poll directly (bypassing queue) when Redis is not available.
 * This is the same as the old setInterval behavior.
 */
export async function executePollDirectly(): Promise<any> {
  const { pollAndReply } = await import("./scheduler");
  return pollAndReply();
}

/**
 * Execute a reply directly (bypassing queue) when Redis is not available.
 */
export async function executeReplyDirectly(
  channelId: string,
  commentId: string,
  replyText: string
): Promise<any> {
  const { postCommentReply } = await import("./youtube");
  return postCommentReply(channelId, commentId, replyText);
}
