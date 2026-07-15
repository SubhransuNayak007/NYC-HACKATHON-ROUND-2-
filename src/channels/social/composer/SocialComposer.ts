/**
 * ============================================================
 * QuickReply — Unified Multi-Platform Composer & AI Adaptation
 * src/channels/social/composer/SocialComposer.ts
 *
 * Takes canonical business intent and creates platform-tailored
 * variants for Instagram, LinkedIn, X, and Telegram.
 * ============================================================
 */

import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB, type SocialPost, type PlatformVariant, type SocialPlatform } from "@/database/db";
import { SocialProviderRegistry } from "../SocialProviderRegistry";
import { MediaPipeline } from "../media/MediaPipeline";

export interface GenerateVariantsInput {
  intent: string;
  mediaUrls?: string[];
  tone?: "professional" | "enthusiastic" | "concise" | "conversational";
  targetPlatforms?: SocialPlatform[];
}

export interface PublishMultiPlatformInput {
  canonicalIntent: string;
  mediaUrls?: string[];
  platforms: {
    platform: SocialPlatform;
    content: string;
    accountId: string;
    hashtags?: string[];
  }[];
  scheduledAt?: string;
}

export interface PublishMultiPlatformResult {
  postId: string;
  status: "published" | "partially_published" | "queued" | "failed";
  platformResults: {
    platform: SocialPlatform;
    success: boolean;
    providerPostId?: string;
    permalink?: string;
    error?: string;
  }[];
}

export class SocialComposer {
  /**
   * Generate platform-specific copy from canonical intent
   */
  static generatePlatformVariants(input: GenerateVariantsInput): Record<SocialPlatform, string> {
    const intent = input.intent.trim();

    // 1. Instagram: Visual-first + Engaging caption + Hashtags + Link CTA
    const igVariant = `✨ ${intent}\n\n👉 Check out the link in our bio for full details!\n\n#Growth #Business #Productivity #Innovation`;

    // 2. LinkedIn: Professional narrative + Bullet insights + Discussion prompt
    const liVariant = `${intent}\n\nKey Takeaways:\n• Designed for modern business workflows\n• Scalable 24/7 autonomous engagement\n• Direct customer conversion\n\nHow is your team optimizing this in 2026? Drop your thoughts below.\n\n#BusinessGrowth #Leadership #Tech #Automation`;

    // 3. X (Twitter): Punchy hook under 280 characters
    const xSummary = intent.length > 220 ? intent.substring(0, 215) + "..." : intent;
    const xVariant = `🚀 ${xSummary}\n\nRead more & get started: 👇`;

    // 4. Telegram: Direct conversational announcement formatted with HTML
    const tgVariant = `📢 <b>Announcement</b>\n\n${intent}\n\n👉 <i>Tap the link to learn more!</i>`;

    return {
      instagram: igVariant,
      linkedin: liVariant,
      twitter: xVariant,
      telegram: tgVariant,
      whatsapp: intent,
      youtube: intent,
    };
  }

  /**
   * Multi-Platform Post Publishing & Scheduling Coordinator
   */
  static async publishOrSchedule(input: PublishMultiPlatformInput): Promise<PublishMultiPlatformResult> {
    const db = await getDB();
    if (!db.socialPosts) db.socialPosts = [];

    const postId = `post_${uuidv4().replace(/-/g, "")}`;
    const variants: PlatformVariant[] = [];
    const platformResults: PublishMultiPlatformResult["platformResults"] = [];

    const isScheduled = !!input.scheduledAt && new Date(input.scheduledAt) > new Date();

    for (const item of input.platforms) {
      if (isScheduled) {
        // Queue for scheduler
        const provider = SocialProviderRegistry.getProvider(item.platform);
        const schedRes = await provider.scheduleContent({
          accountId: item.accountId,
          content: item.content,
          mediaUrls: input.mediaUrls,
          hashtags: item.hashtags,
          scheduledAt: input.scheduledAt!,
          metadata: { postId },
        });

        variants.push({
          platform: item.platform,
          content: item.content,
          mediaUrls: input.mediaUrls,
          hashtags: item.hashtags,
          status: "queued",
        });

        platformResults.push({
          platform: item.platform,
          success: schedRes.success,
          error: schedRes.error,
        });
      } else {
        // Immediate publish
        try {
          const provider = SocialProviderRegistry.getProvider(item.platform);
          const pubRes = await provider.publishContent({
            accountId: item.accountId,
            content: item.content,
            mediaUrls: input.mediaUrls,
            hashtags: item.hashtags,
          });

          variants.push({
            platform: item.platform,
            content: item.content,
            mediaUrls: input.mediaUrls,
            hashtags: item.hashtags,
            status: pubRes.success ? "published" : "failed",
            providerPostId: pubRes.providerPostId,
            permalink: pubRes.permalink,
            error: pubRes.userFacingExplanation || pubRes.error,
            publishedAt: pubRes.success ? new Date().toISOString() : undefined,
          });

          platformResults.push({
            platform: item.platform,
            success: pubRes.success,
            providerPostId: pubRes.providerPostId,
            permalink: pubRes.permalink,
            error: pubRes.userFacingExplanation || pubRes.error,
          });
        } catch (err: any) {
          variants.push({
            platform: item.platform,
            content: item.content,
            mediaUrls: input.mediaUrls,
            hashtags: item.hashtags,
            status: "failed",
            error: err.message,
          });

          platformResults.push({
            platform: item.platform,
            success: false,
            error: err.message,
          });
        }
      }
    }

    const allSucceeded = platformResults.every((r) => r.success);
    const anySucceeded = platformResults.some((r) => r.success);

    let postStatus: SocialPost["status"] = "publish_failed";
    if (isScheduled) {
      postStatus = "queued";
    } else if (allSucceeded) {
      postStatus = "published";
    } else if (anySucceeded) {
      postStatus = "partially_published";
    }

    const newPost: SocialPost = {
      id: postId,
      canonicalIntent: input.canonicalIntent,
      canonicalMediaUrls: input.mediaUrls,
      variants,
      scheduledAt: input.scheduledAt,
      publishedAt: !isScheduled && anySucceeded ? new Date().toISOString() : undefined,
      status: postStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.socialPosts.unshift(newPost);
    await saveDB(db);

    return {
      postId,
      status: postStatus as any,
      platformResults,
    };
  }
}
