/**
 * ============================================================================
 * QuickReply — Automation Scope Matcher
 * src/backend/rules/ScopeMatcher.ts
 *
 * Ensures an automation rule only executes on explicitly targeted content
 * (all videos, specific posts, channels, playlists, or campaign tags).
 * ============================================================================
 */

import { AutomationScope, AssembledContext } from "./types";

export class ScopeMatcher {
  /**
   * Evaluate if an event & content context fall within the specified scope
   */
  static isEventInScope(scope: AutomationScope, ctx: AssembledContext): { inScope: boolean; reason: string } {
    const { event, contentMetadata } = ctx;

    // 1. Platform Check
    if (scope.platforms && scope.platforms.length > 0) {
      if (!scope.platforms.includes(event.platform as any)) {
        return { inScope: false, reason: `Platform "${event.platform}" is not in rule's allowed platforms.` };
      }
    }

    // 2. Excluded Tags Check
    if (scope.excludedTags && scope.excludedTags.length > 0) {
      const contentTags = (contentMetadata.tags || []).map((t) => t.toLowerCase());
      for (const exTag of scope.excludedTags) {
        if (contentTags.includes(exTag.toLowerCase())) {
          return { inScope: false, reason: `Content contains excluded tag: "${exTag}".` };
        }
      }
    }

    // 3. Required Tags Check
    if (scope.requiredTags && scope.requiredTags.length > 0) {
      const contentTags = (contentMetadata.tags || []).map((t) => t.toLowerCase());
      const hasAllRequired = scope.requiredTags.every((reqTag) =>
        contentTags.includes(reqTag.toLowerCase())
      );
      if (!hasAllRequired) {
        return { inScope: false, reason: "Content lacks one or more required tags." };
      }
    }

    // 4. Target Type & ID Matching
    const targetIds = scope.targetIds || [];
    const eventVideoId = event.target?.videoId || contentMetadata.id;
    const eventPostId = event.target?.postId || contentMetadata.id;
    const eventChannelId = event.target?.channelId;

    switch (scope.targetType) {
      case "ALL_CONTENT":
        return { inScope: true, reason: "Matches all content." };

      case "ALL_VIDEOS":
        if (event.platform === "youtube" || eventVideoId) {
          return { inScope: true, reason: "Matches all videos." };
        }
        return { inScope: false, reason: "Event is not a video." };

      case "ALL_POSTS":
        if (event.platform === "instagram" || (event.platform as string) === "linkedin" || eventPostId) {
          return { inScope: true, reason: "Matches all posts." };
        }
        return { inScope: false, reason: "Event is not a social post." };

      case "SELECTED_VIDEOS":
        if (eventVideoId && targetIds.includes(eventVideoId)) {
          return { inScope: true, reason: `Matches selected video ID: ${eventVideoId}` };
        }
        return { inScope: false, reason: `Video ID "${eventVideoId}" is not in selected videos.` };

      case "SELECTED_POSTS":
        if (eventPostId && targetIds.includes(eventPostId)) {
          return { inScope: true, reason: `Matches selected post ID: ${eventPostId}` };
        }
        return { inScope: false, reason: `Post ID "${eventPostId}" is not in selected posts.` };

      case "SELECTED_CHANNELS":
        if (eventChannelId && targetIds.includes(eventChannelId)) {
          return { inScope: true, reason: `Matches selected channel: ${eventChannelId}` };
        }
        return { inScope: false, reason: `Channel "${eventChannelId}" is not in selected channels.` };

      default:
        return { inScope: true, reason: "Scope passed." };
    }
  }
}
