/**
 * ============================================================
 *  QuickReply — Platform Capability Engine
 *  src/channels/core/CapabilityEngine.ts
 *
 *  Runtime enforcement of what operations are officially supported
 *  by each platform's API and connection mode.
 *
 *  ZERO-MOCK RULE:
 *  If an operation is not supported by the platform (e.g. LinkedIn personal DMs),
 *  this engine returns supported: false and prevents the UI / AI from executing it.
 * ============================================================
 */

export type ChannelPlatform = "whatsapp" | "instagram" | "linkedin" | "youtube" | "twitter" | "telegram";

export interface PlatformCapabilities {
  platform: ChannelPlatform;
  displayName: string;
  messaging: boolean;
  comments: boolean;
  privateCommentReply: boolean;
  publishing: boolean;
  analytics: boolean;
  webhooks: boolean;
  aiReplies: boolean;
  humanTakeover: boolean;
  mediaAttachments: boolean;
  windowRestrictions?: {
    hasMessageWindow: boolean;
    windowHours?: number;
    description?: string;
  };
  unsupportedFeatures: string[];
  notes: string;
}

export class CapabilityEngine {
  private static readonly CAPABILITY_MATRIX: Record<ChannelPlatform, PlatformCapabilities> = {
    whatsapp: {
      platform: "whatsapp",
      displayName: "WhatsApp Business",
      messaging: true,
      comments: false,
      privateCommentReply: false,
      publishing: false,
      analytics: true,
      webhooks: true,
      aiReplies: true,
      humanTakeover: true,
      mediaAttachments: true,
      windowRestrictions: {
        hasMessageWindow: false,
        description: "Standard messaging via real multi-device WebSocket or Meta Cloud API.",
      },
      unsupportedFeatures: ["Post comments", "Feed post publishing", "Story publishing"],
      notes: "Direct peer-to-peer or Cloud API communication with full media support.",
    },

    instagram: {
      platform: "instagram",
      displayName: "Instagram Professional",
      messaging: true,
      comments: true,
      privateCommentReply: true,
      publishing: true,
      analytics: true,
      webhooks: true,
      aiReplies: true,
      humanTakeover: true,
      mediaAttachments: true,
      windowRestrictions: {
        hasMessageWindow: true,
        windowHours: 24,
        description: "Meta policy restricts outbound DMs to a 24-hour window from the user's last message.",
      },
      unsupportedFeatures: ["Arbitrary cold outbound DMs", "Personal non-business account automation"],
      notes: "Requires Instagram Professional (Business or Creator) account and Meta Graph API permissions.",
    },

    linkedin: {
      platform: "linkedin",
      displayName: "LinkedIn Community Management",
      messaging: false, // Strict platform boundary
      comments: true,
      privateCommentReply: false,
      publishing: true,
      analytics: true,
      webhooks: true,
      aiReplies: true, // For comments and post drafting
      humanTakeover: true,
      mediaAttachments: true,
      unsupportedFeatures: [
        "Personal Direct Message automation",
        "Personal inbox scraping",
        "Cold DM campaigns via standard Community Management API",
      ],
      notes:
        "LinkedIn Community Management APIs support Organization/Company Page posts, comments, reactions, and analytics. Personal DM automation is restricted and not supported.",
    },

    youtube: {
      platform: "youtube",
      displayName: "YouTube Channel",
      messaging: false,
      comments: true,
      privateCommentReply: false,
      publishing: false,
      analytics: true,
      webhooks: false,
      aiReplies: true,
      humanTakeover: true,
      mediaAttachments: false,
      unsupportedFeatures: ["Direct messages", "Video uploads via comment engine"],
      notes: "Official YouTube Data API v3 for comment management and automated moderation.",
    },

    twitter: {
      platform: "twitter",
      displayName: "X / Twitter",
      messaging: true,
      comments: true,
      privateCommentReply: false,
      publishing: true,
      analytics: true,
      webhooks: true,
      aiReplies: true,
      humanTakeover: true,
      mediaAttachments: true,
      unsupportedFeatures: ["Direct message mass campaigns without rate limit compliance"],
      notes: "X / Twitter API v2 for mentions and replies.",
    },

    telegram: {
      platform: "telegram",
      displayName: "Telegram Official Bot API",
      messaging: true,
      comments: true,
      privateCommentReply: true,
      publishing: true,
      analytics: true,
      webhooks: true,
      aiReplies: true,
      humanTakeover: true,
      mediaAttachments: true,
      unsupportedFeatures: ["Personal non-bot account scraping", "User Stories publishing"],
      notes: "Official Telegram Bot API with webhooks, interactive buttons, and commands.",
    },
  };

  /**
   * Get official capabilities for a platform
   */
  static getCapabilities(platform: ChannelPlatform): PlatformCapabilities {
    return (
      this.CAPABILITY_MATRIX[platform] || {
        platform,
        displayName: platform,
        messaging: false,
        comments: false,
        privateCommentReply: false,
        publishing: false,
        analytics: false,
        webhooks: false,
        aiReplies: false,
        humanTakeover: false,
        mediaAttachments: false,
        unsupportedFeatures: ["Unknown platform"],
        notes: "No capability configuration found.",
      }
    );
  }

  /**
   * Check if a specific operation is supported on a platform
   */
  static isOperationSupported(
    platform: ChannelPlatform,
    operation:
      | "send_message"
      | "reply_comment"
      | "private_comment_reply"
      | "publish_post"
      | "get_analytics"
      | "stream_webhooks"
  ): { supported: boolean; reason?: string } {
    const caps = this.getCapabilities(platform);

    switch (operation) {
      case "send_message":
        if (!caps.messaging) {
          return {
            supported: false,
            reason: `Direct message automation is NOT supported on ${caps.displayName}. ${caps.notes}`,
          };
        }
        return { supported: true };

      case "reply_comment":
        if (!caps.comments) {
          return {
            supported: false,
            reason: `Comment operations are not supported on ${caps.displayName}.`,
          };
        }
        return { supported: true };

      case "private_comment_reply":
        if (!caps.privateCommentReply) {
          return {
            supported: false,
            reason: `Private comment replies are not supported on ${caps.displayName}.`,
          };
        }
        return { supported: true };

      case "publish_post":
        if (!caps.publishing) {
          return {
            supported: false,
            reason: `Post publishing is not supported on ${caps.displayName}.`,
          };
        }
        return { supported: true };

      case "get_analytics":
        return { supported: caps.analytics };

      case "stream_webhooks":
        return { supported: caps.webhooks };

      default:
        return { supported: false, reason: "Unknown operation" };
    }
  }
}
