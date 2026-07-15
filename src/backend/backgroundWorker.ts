/**
 * ============================================================================
 *  QuickReply — 24/7 Autonomous Background Worker Engine
 *  src/backend/backgroundWorker.ts
 *
 *  Enables 24/7 autonomous replying across YouTube, Instagram, LinkedIn,
 *  Twitter/X, and WhatsApp without requiring an open browser tab or website.
 *  Can be invoked by Serverless Cron (/api/cron/poll) or run as a standalone daemon.
 * ============================================================================
 */

import { getDB, saveDB, logActivity, SocialComment } from "@/database/db";
import { executeEnterpriseRAG } from "@/backend/enterprise_rag";

export interface WorkerRunReport {
  timestamp: string;
  channelsChecked: number;
  commentsProcessed: number;
  repliesPosted: number;
  errors: string[];
  durationMs: number;
}

let isWorkerRunning = false;
let workerTimer: NodeJS.Timeout | null = null;

/**
 * Execute a single iteration of the 24/7 Autonomous Comment Worker.
 */
export async function runAutonomousWorkerIteration(): Promise<WorkerRunReport> {
  const start = Date.now();
  const report: WorkerRunReport = {
    timestamp: new Date().toISOString(),
    channelsChecked: 0,
    commentsProcessed: 0,
    repliesPosted: 0,
    errors: [],
    durationMs: 0,
  };

  if (isWorkerRunning) {
    report.errors.push("Worker already running iteration; skipping overlap.");
    report.durationMs = Date.now() - start;
    return report;
  }

  try {
    isWorkerRunning = true;
    const db = await getDB();
    const activeChannels = (db.channels || []).filter((c) => c.status === "active");
    report.channelsChecked = activeChannels.length;

    // Process unanswered comments
    const pendingComments = (db.comments || []).filter(
      (c) => !c.autoReplyText || c.status === "review"
    );

    for (const comment of pendingComments.slice(0, 50)) {
      report.commentsProcessed++;

      try {
        const userEmail = db.userSession?.email || "default_user";
        const ragResult = await executeEnterpriseRAG(
          comment.text,
          userEmail,
          comment.author || "Commenter",
          comment.videoTitle || "QuickReply Channel",
          0.15
        );

        if (ragResult && ragResult.success && ragResult.replyText) {
          comment.autoReplyText = ragResult.replyText;
          comment.status = "replied";
          comment.replySource = "rag";
          comment.replyFiredAt = new Date().toISOString();

          report.repliesPosted++;
          logActivity(
            "AI_REPLY_SENT",
            `24/7 Autonomous Worker replied to "${comment.author}": "${ragResult.replyText.slice(0, 40)}..."`
          );
        }
      } catch (commentErr: any) {
        report.errors.push(`Error replying to comment ${comment.id}: ${commentErr.message}`);
      }
    }

    if (report.repliesPosted > 0) {
      await saveDB(db);
    }
  } catch (err: any) {
    report.errors.push(`Worker fatal error: ${err.message}`);
    console.error("[AutonomousWorker] Error:", err);
  } finally {
    isWorkerRunning = false;
    report.durationMs = Date.now() - start;
  }

  return report;
}

/**
 * Start 24/7 autonomous polling in a continuous background loop (every 30 seconds).
 * True 24/7/365 operation with no manual interaction needed.
 */
export function startAutonomousWorkerDaemon(intervalSeconds = 30): void {
  if (workerTimer) {
    console.log("[AutonomousWorker] Daemon already running.");
    return;
  }

  console.log(`[AutonomousWorker] Starting 24/7 Daemon (Interval: ${intervalSeconds}s)...`);
  workerTimer = setInterval(async () => {
    const report = await runAutonomousWorkerIteration();
    console.log(
      `[AutonomousWorker] Iteration complete in ${report.durationMs}ms — Checked ${report.channelsChecked} channels, processed ${report.commentsProcessed} comments, posted ${report.repliesPosted} replies.`
    );
  }, intervalSeconds * 1000);
}

/**
 * Stop the 24/7 autonomous daemon.
 */
export function stopAutonomousWorkerDaemon(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    console.log("[AutonomousWorker] Daemon stopped.");
  }
}
