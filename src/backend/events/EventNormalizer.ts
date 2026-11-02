/**
 * ============================================================================
 * QuickReply — Universal Event Normalizer
 * src/backend/events/EventNormalizer.ts
 *
 * Translates disparate raw platform payloads (Meta, Google, Telegram, Custom Webhooks)
 * into a single unified NormalizedEvent schema consumed by the Workflow Engine.
 * ============================================================================
 */

import crypto from "crypto";

export type PlatformType = "youtube" | "instagram" | "whatsapp" | "telegram" | "webhook" | "schedule" | "manual";

export type NormalizedEventType =
  | "comment.created"
  | "message.received"
  | "mention.created"
  | "webhook.received"
  | "schedule.triggered"
  | "manual.triggered";

export interface NormalizedActor {
  id: string;
  username?: string;
  name?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}

export interface NormalizedTarget {
  postId?: string;
  videoId?: string;
  channelId?: string;
  threadId?: string;
  accountHandle?: string;
}

export interface NormalizedEvent {
  id: string;
  tenantId: string;
  workspaceId: string;
  platform: PlatformType;
  eventType: NormalizedEventType;
  actor: NormalizedActor;
  target?: NormalizedTarget;
  content: string;
  mediaUrls?: string[];
  rawPayload: Record<string, any>;
  timestamp: string;
  idempotencyKey: string;
}

export class EventNormalizer {
  /**
   * Generates a deterministic idempotency key for an event
   */
  static generateIdempotencyKey(tenantId: string, platform: string, externalEventId: string, content: string): string {
    return crypto
      .createHash("sha256")
      .update(`${tenantId}:${platform}:${externalEventId}:${content.trim()}`)
      .digest("hex");
  }

  /**
   * Normalize an incoming YouTube Comment
   */
  static fromYouTubeComment(params: {
    tenantId: string;
    workspaceId: string;
    commentId: string;
    author: string;
    authorAvatar?: string;
    text: string;
    videoId: string;
    channelId: string;
    publishedAt?: string;
    raw?: any;
  }): NormalizedEvent {
    const timestamp = params.publishedAt || new Date().toISOString();
    return {
      id: `evt_yt_${params.commentId}`,
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      platform: "youtube",
      eventType: "comment.created",
      actor: {
        id: params.author,
        name: params.author,
        username: params.author,
        avatarUrl: params.authorAvatar,
      },
      target: {
        videoId: params.videoId,
        channelId: params.channelId,
      },
      content: params.text,
      rawPayload: params.raw || {},
      timestamp,
      idempotencyKey: this.generateIdempotencyKey(params.tenantId, "youtube", params.commentId, params.text),
    };
  }

  /**
   * Normalize an incoming Instagram Comment / DM
   */
  static fromInstagram(params: {
    tenantId: string;
    workspaceId: string;
    isDM: boolean;
    providerId: string;
    authorId: string;
    authorUsername?: string;
    text: string;
    postId?: string;
    recipientId?: string;
    timestamp?: string | number;
    raw?: any;
  }): NormalizedEvent {
    const ts = typeof params.timestamp === "number" ? new Date(params.timestamp).toISOString() : (params.timestamp || new Date().toISOString());
    return {
      id: `evt_ig_${params.providerId}`,
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      platform: "instagram",
      eventType: params.isDM ? "message.received" : "comment.created",
      actor: {
        id: params.authorId,
        username: params.authorUsername || params.authorId,
        name: params.authorUsername,
      },
      target: {
        postId: params.postId,
        threadId: params.isDM ? params.authorId : undefined,
      },
      content: params.text,
      rawPayload: params.raw || {},
      timestamp: ts,
      idempotencyKey: this.generateIdempotencyKey(params.tenantId, "instagram", params.providerId, params.text),
    };
  }

  /**
   * Normalize an incoming WhatsApp Message
   */
  static fromWhatsApp(params: {
    tenantId: string;
    workspaceId: string;
    messageId: string;
    fromPhone: string;
    senderName?: string;
    text: string;
    timestamp?: string | number;
    raw?: any;
  }): NormalizedEvent {
    const ts = typeof params.timestamp === "number" ? new Date(params.timestamp * 1000).toISOString() : (params.timestamp || new Date().toISOString());
    return {
      id: `evt_wa_${params.messageId}`,
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      platform: "whatsapp",
      eventType: "message.received",
      actor: {
        id: params.fromPhone,
        phone: params.fromPhone,
        name: params.senderName,
      },
      target: {
        threadId: params.fromPhone,
      },
      content: params.text,
      rawPayload: params.raw || {},
      timestamp: ts,
      idempotencyKey: this.generateIdempotencyKey(params.tenantId, "whatsapp", params.messageId, params.text),
    };
  }

  /**
   * Normalize an incoming Telegram Message
   */
  static fromTelegram(params: {
    tenantId: string;
    workspaceId: string;
    updateId: number | string;
    messageId: number | string;
    fromId: string;
    fromUsername?: string;
    fromName?: string;
    chatId: string;
    text: string;
    timestamp?: number;
    raw?: any;
  }): NormalizedEvent {
    const ts = params.timestamp ? new Date(params.timestamp * 1000).toISOString() : new Date().toISOString();
    return {
      id: `evt_tg_${params.updateId}_${params.messageId}`,
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      platform: "telegram",
      eventType: "message.received",
      actor: {
        id: params.fromId,
        username: params.fromUsername,
        name: params.fromName,
      },
      target: {
        threadId: params.chatId,
      },
      content: params.text,
      rawPayload: params.raw || {},
      timestamp: ts,
      idempotencyKey: this.generateIdempotencyKey(params.tenantId, "telegram", `${params.updateId}:${params.messageId}`, params.text),
    };
  }
}
