/**
 * ============================================================
 * QuickReply — Multi-Platform Durable Scheduler
 * src/channels/social/scheduler/SocialScheduler.ts
 *
 * Background scheduler with idempotency, exponential backoff,
 * jitter, and transient-error retry policy.
 * ============================================================
 */

import { getDB, saveDB, type SocialScheduledJob, type SocialPost } from "@/database/db";
import { SocialProviderRegistry } from "../SocialProviderRegistry";

export class SocialScheduler {
  /**
   * Process all due scheduled jobs
   */
  static async processDueJobs(now: Date = new Date()): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const db = await getDB();
    if (!db.socialScheduledJobs || db.socialScheduledJobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    const nowIso = now.toISOString();
    const dueJobs = db.socialScheduledJobs.filter(
      (j) => j.status === "pending" && j.scheduledAt <= nowIso
    );

    let succeeded = 0;
    let failed = 0;

    for (const job of dueJobs) {
      job.status = "processing";
      job.attempts += 1;
      await saveDB(db);

      try {
        const post = db.socialPosts?.find((p) => p.id === job.postId);
        const variant = post?.variants.find((v) => v.platform === job.platform);

        if (!post || !variant) {
          job.status = "failed";
          job.lastError = "Associated SocialPost or platform variant not found.";
          failed++;
          continue;
        }

        const provider = SocialProviderRegistry.getProvider(job.platform);
        const result = await provider.publishContent({
          accountId: job.accountId,
          content: variant.content,
          mediaUrls: variant.mediaUrls,
          hashtags: variant.hashtags,
        });

        if (result.success) {
          job.status = "completed";
          variant.status = "published";
          variant.providerPostId = result.providerPostId;
          variant.permalink = result.permalink;
          variant.publishedAt = new Date().toISOString();

          // Check if all variants are published
          const allPublished = post.variants.every((v) => v.status === "published");
          post.status = allPublished ? "published" : "partially_published";
          succeeded++;
        } else {
          const isTransient = this.isTransientError(result.error || result.errorCode);
          if (isTransient && job.attempts < job.maxAttempts) {
            // Requeue with exponential backoff & jitter (2^attempt * 30s + jitter)
            const jitterMs = Math.floor(Math.random() * 5000);
            const backoffSeconds = Math.pow(2, job.attempts) * 30;
            const nextTime = new Date(Date.now() + backoffSeconds * 1000 + jitterMs);

            job.status = "pending";
            job.scheduledAt = nextTime.toISOString();
            job.lastError = `Transient error: ${result.error}. Retrying in ${backoffSeconds}s.`;
          } else {
            job.status = "failed";
            job.lastError = result.userFacingExplanation || result.error || "Publication failed.";
            variant.status = "failed";
            variant.error = job.lastError;
            failed++;
          }
        }
      } catch (err: any) {
        job.status = "failed";
        job.lastError = err.message;
        failed++;
      }
    }

    await saveDB(db);
    return { processed: dueJobs.length, succeeded, failed };
  }

  private static isTransientError(errorText?: string): boolean {
    if (!errorText) return false;
    const lower = errorText.toLowerCase();
    return (
      lower.includes("timeout") ||
      lower.includes("econnrefused") ||
      lower.includes("429") ||
      lower.includes("rate limit") ||
      lower.includes("500") ||
      lower.includes("502") ||
      lower.includes("503") ||
      lower.includes("504") ||
      lower.includes("network")
    );
  }
}
