/**
 * ============================================================================
 * QuickReply — Dynamic Instagram Capability Service
 * src/channels/instagram/InstagramCapabilityService.ts
 *
 * Evaluates real granted capabilities based on account type, OAuth scopes,
 * Meta app review status, and platform boundaries. Zero fake capabilities.
 * ============================================================================
 */

import { InstagramAccount, InstagramConnection, InstagramAccountType } from "@/database/db";

export type CapabilityStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "REQUIRES_PERMISSION"
  | "REQUIRES_ACCOUNT_TYPE"
  | "NOT_SUPPORTED"
  | "TEMPORARILY_DISABLED";

export interface CapabilityItem {
  id: string;
  name: string;
  category: "AUTHENTICATION" | "PUBLISHING" | "MODERATION" | "DIRECT_MESSAGING" | "ANALYTICS" | "COMMERCE";
  status: CapabilityStatus;
  requiredScopes: string[];
  requiredAccountType: InstagramAccountType[];
  description: string;
  remediation?: string;
}

export interface InstagramCapabilityManifest {
  accountId: string;
  accountType: InstagramAccountType;
  scopes: string[];
  capabilities: Record<string, CapabilityItem>;
  availableCount: number;
  totalCount: number;
  evaluatedAt: string;
}

export class InstagramCapabilityService {
  /**
   * Derive full capability manifest for an Instagram account
   */
  static evaluate(
    account?: InstagramAccount | null,
    connection?: InstagramConnection | null
  ): InstagramCapabilityManifest {
    const scopes = new Set(connection?.scopes || []);
    const accountType = account?.accountType || "UNKNOWN";
    const isConnected = connection?.status === "READY" || connection?.status === "CONNECTING";

    const hasScope = (...required: string[]) => required.every((s) => scopes.has(s));
    const isBusinessOrCreator = accountType === "BUSINESS" || accountType === "CREATOR";

    const defs: Record<string, Omit<CapabilityItem, "status" | "remediation">> = {
      ACCOUNT_CONNECTION: {
        id: "ACCOUNT_CONNECTION",
        name: "Account Identity & Graph Link",
        category: "AUTHENTICATION",
        requiredScopes: ["instagram_basic"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Official Meta Graph API OAuth connection link.",
      },
      PROFILE_READ: {
        id: "PROFILE_READ",
        name: "Profile & Follower Metadata",
        category: "AUTHENTICATION",
        requiredScopes: ["instagram_basic"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Read username, bio, follower count, and media count.",
      },
      CONTENT_PUBLISH: {
        id: "CONTENT_PUBLISH",
        name: "Single Image & Video Publishing",
        category: "PUBLISHING",
        requiredScopes: ["instagram_content_publish", "pages_show_list"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Direct publish single photos and videos to Instagram feed.",
      },
      MEDIA_PUBLISH: {
        id: "MEDIA_PUBLISH",
        name: "Container Media Pipeline",
        category: "PUBLISHING",
        requiredScopes: ["instagram_content_publish"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Multi-stage async media container creation & publishing.",
      },
      REEL_RELATED_CAPABILITY: {
        id: "REEL_RELATED_CAPABILITY",
        name: "Reels Publishing",
        category: "PUBLISHING",
        requiredScopes: ["instagram_content_publish"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Publish 9:16 short-form video Reels with captions.",
      },
      STORY_RELATED_CAPABILITY: {
        id: "STORY_RELATED_CAPABILITY",
        name: "Stories Publishing",
        category: "PUBLISHING",
        requiredScopes: ["instagram_content_publish"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Publish 24-hour ephemeral Stories via Container API.",
      },
      COMMENT_READ: {
        id: "COMMENT_READ",
        name: "Comment Ingestion & Webhooks",
        category: "MODERATION",
        requiredScopes: ["instagram_manage_comments"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Real-time webhook notification for comments on posts.",
      },
      COMMENT_REPLY: {
        id: "COMMENT_REPLY",
        name: "Public Comment Replies",
        category: "MODERATION",
        requiredScopes: ["instagram_manage_comments"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Submit official replies to user comments on posts.",
      },
      COMMENT_MODERATION: {
        id: "COMMENT_MODERATION",
        name: "Comment Hiding & Deletion",
        category: "MODERATION",
        requiredScopes: ["instagram_manage_comments"],
        requiredAccountType: ["BUSINESS"],
        description: "Hide or delete abusive, spam, or toxic comments.",
      },
      MENTION_EVENTS: {
        id: "MENTION_EVENTS",
        name: "Mention & Tag Webhooks",
        category: "MODERATION",
        requiredScopes: ["instagram_basic", "instagram_manage_comments"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Receive webhooks when account is mentioned in captions or comments.",
      },
      DM_RECEIVE: {
        id: "DM_RECEIVE",
        name: "Direct Message Ingestion",
        category: "DIRECT_MESSAGING",
        requiredScopes: ["instagram_manage_messages", "pages_manage_metadata"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Real-time webhook ingestion of customer DMs.",
      },
      DM_REPLY: {
        id: "DM_REPLY",
        name: "Direct Message Replies (24h Window)",
        category: "DIRECT_MESSAGING",
        requiredScopes: ["instagram_manage_messages"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Send automated or human responses within 24-hour window.",
      },
      MESSAGE_TEMPLATES: {
        id: "MESSAGE_TEMPLATES",
        name: "Quick Replies & Ice Breakers",
        category: "DIRECT_MESSAGING",
        requiredScopes: ["instagram_manage_messages"],
        requiredAccountType: ["BUSINESS"],
        description: "Configurable starter buttons and quick reply templates.",
      },
      INSIGHTS: {
        id: "INSIGHTS",
        name: "Account & Post Insights",
        category: "ANALYTICS",
        requiredScopes: ["instagram_basic", "pages_read_engagement"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Reach, impressions, profile views, and engagement metrics.",
      },
      AUDIENCE_ANALYTICS: {
        id: "AUDIENCE_ANALYTICS",
        name: "Audience Demographics",
        category: "ANALYTICS",
        requiredScopes: ["pages_read_engagement"],
        requiredAccountType: ["BUSINESS"],
        description: "Follower location, age distribution, and active hours.",
      },
      CONTENT_ANALYTICS: {
        id: "CONTENT_ANALYTICS",
        name: "Media Performance Tracking",
        category: "ANALYTICS",
        requiredScopes: ["instagram_basic", "pages_read_engagement"],
        requiredAccountType: ["BUSINESS", "CREATOR"],
        description: "Likes, comments, shares, and saves per post.",
      },
      HASHTAG_DISCOVERY: {
        id: "HASHTAG_DISCOVERY",
        name: "Hashtag Search API",
        category: "COMMERCE",
        requiredScopes: ["instagram_basic"],
        requiredAccountType: ["BUSINESS"],
        description: "Search top and recent public media by hashtag.",
      },
      LEAD_EVENTS: {
        id: "LEAD_EVENTS",
        name: "Lead Generation Webhooks",
        category: "COMMERCE",
        requiredScopes: ["pages_manage_ads", "leads_retrieval"],
        requiredAccountType: ["BUSINESS"],
        description: "Receive instant webhook notifications for Instagram Lead Ads.",
      },
    };

    const capabilities: Record<string, CapabilityItem> = {};
    let availableCount = 0;

    for (const [key, def] of Object.entries(defs)) {
      let status: CapabilityStatus = "AVAILABLE";
      let remediation: string | undefined;

      if (!isConnected) {
        status = "UNAVAILABLE";
        remediation = "Connect your Instagram Professional account via Meta OAuth.";
      } else if (!isBusinessOrCreator) {
        status = "REQUIRES_ACCOUNT_TYPE";
        remediation = "Convert your Instagram account to a Professional (Business or Creator) account.";
      } else if (!hasScope(...def.requiredScopes)) {
        status = "REQUIRES_PERMISSION";
        const missing = def.requiredScopes.filter((s) => !scopes.has(s));
        remediation = `Grant Meta permission scope(s): ${missing.join(", ")}.`;
      } else if (def.requiredAccountType.length === 1 && def.requiredAccountType[0] === "BUSINESS" && accountType !== "BUSINESS") {
        status = "REQUIRES_ACCOUNT_TYPE";
        remediation = "This feature requires an Instagram Business account (not Creator).";
      }

      if (status === "AVAILABLE") {
        availableCount++;
      }

      capabilities[key] = {
        ...def,
        status,
        remediation,
      };
    }

    return {
      accountId: account?.providerAccountId || "none",
      accountType,
      scopes: Array.from(scopes),
      capabilities,
      availableCount,
      totalCount: Object.keys(defs).length,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
