/**
 * Cron Manager for Quick Reply — True 24/7 Operation
 *
 * Orchestrates three polling layers:
 *   Layer 1: In-process setInterval (30s) — works on standalone Node.js servers
 *   Layer 2: External cron calling /api/cron/poll every 30s — works on Netlify/Vercel serverless
 *   Layer 3: Health heartbeat — proves the system is alive to the dashboard
 *
 * Discovery runs less frequently (every 30 minutes) to save YouTube API quota.
 * Comment polling runs every 30 seconds regardless of method.
 *
 * The lock guard in scheduler.ts prevents duplicate work if both layers are active.
 */

import { runDiscoveryForAllChannels } from "./video_discovery";
import { getDB, saveDB } from "@/database/db";
import { getQuotaUsedToday } from "./youtube";

// --- Discovery Scheduling ---
// Discovery runs every 10 minutes for true 24/7 operation.
// New videos are discovered quickly so they enter the 30-second polling cycle.

const DISCOVERY_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let lastDiscoveryRun = 0;

const AGI_LEARNING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
let lastAgiLearningRun = 0;

/**
 * Run AGI continuous learning cycle if enough time has passed.
 * Analyzes comments, learns audience patterns, triggers keyword alerts, and drafts replies.
 */
export async function runAgiLearningIfNeeded(): Promise<{
  ran: boolean;
  summary?: any;
}> {
  const now = Date.now();
  if (now - lastAgiLearningRun < AGI_LEARNING_INTERVAL_MS) {
    return { ran: false };
  }

  lastAgiLearningRun = now;
  try {
    const { runLearningCycle } = await import("./agi/ContinuousLearningEngine");
    const summary = await runLearningCycle();
    console.log(
      `[CronManager] AGI Learning complete: ${summary.commentsProcessed} comments processed, ${summary.newInsightsExtracted} insights extracted, ${summary.alertsTriggered} alerts`
    );
    return { ran: true, summary };
  } catch (err) {
    console.error("[CronManager] AGI Learning cycle error:", err);
    return { ran: false };
  }
}

/**
 * Run discovery if enough time has passed since the last run.
 * Called by both the cron endpoint and the in-process scheduler.
 */
export async function runDiscoveryIfNeeded(): Promise<{
  ran: boolean;
  summary?: Awaited<ReturnType<typeof runDiscoveryForAllChannels>>;
}> {
  const now = Date.now();
  if (now - lastDiscoveryRun < DISCOVERY_INTERVAL_MS) {
    return { ran: false };
  }

  lastDiscoveryRun = now;
  console.log("[CronManager] Running video discovery...");
  const summary = await runDiscoveryForAllChannels();
  console.log(
    `[CronManager] Discovery complete: ${summary.totalDiscovered} new videos from ${summary.channelsChecked} channels`
  );
  return { ran: true, summary };
}

/**
 * Write a health heartbeat to the database.
 * The dashboard checks this to determine if the system is alive.
 * If the latest heartbeat is > 3 minutes old, system is "offline".
 */
export async function writeHeartbeat(): Promise<void> {
  try {
    const db = await getDB();
    const now = new Date().toISOString();

    if (db.systemStatus) {
      db.systemStatus.lastCronRunAt = now;
      db.systemStatus.youtubeQuotaUsedToday = getQuotaUsedToday();
    }

    if (!db.systemEvents) db.systemEvents = [];
    db.systemEvents.unshift({
      id: `hb-${Date.now()}`,
      type: "cron_tick",
      message: "System heartbeat — 24/7 engine active",
      metadata: {
        pid: process.pid,
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        quotaUsed: getQuotaUsedToday(),
      },
      timestamp: now,
    });

    if (db.systemEvents.length > 200) {
      db.systemEvents = db.systemEvents.slice(0, 200);
    }

    await saveDB(db);
  } catch {
    // Non-critical
  }
}

/**
 * Detect the deployment target to determine which cron layer to use.
 */
export type DeploymentTarget = "netlify" | "vercel" | "standalone";

export function detectDeploymentTarget(): DeploymentTarget {
  if (process.env.NETLIFY) return "netlify";
  if (process.env.VERCEL) return "standalone"; // Vercel has its own cron in vercel.json
  return "standalone";
}
