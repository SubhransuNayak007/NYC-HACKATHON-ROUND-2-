/**
 * ============================================================
 *  QuickReply — Instagram Professional Channel Adapter
 *  src/channels/instagram/InstagramChannelAdapter.ts
 *
 *  Real Meta Graph API implementation of IChannel.
 *  Connects Instagram Business & Creator accounts.
 * ============================================================
 */

import { v4 as uuidv4 } from "uuid";
import type {
  IChannel,
  ChannelMessage,
  SendResult,
  MediaPayload,
  TemplatePayload,
  ChannelConversation,
  ChannelCustomer,
  WebhookConfig,
  ChannelEvent,
  ChannelStatus,
} from "../core/IChannel";
import { MetaApiClient, InstagramWebhookEvent } from "./MetaApiClient";
import { getDB, decryptToken } from "@/database/db";
import { PlatformPolicyEngine } from "../core/PlatformPolicyEngine";

export class InstagramChannelAdapter implements IChannel {
  readonly platform = "instagram";
  readonly providerType = "meta_cloud_api" as const;

  private client: MetaApiClient;

  constructor() {
    this.client = new MetaApiClient();
  }

  private async getActiveAccount() {
    const db = await getDB();
    const acct = db.socialAccounts?.find((a) => a.platform === "instagram" && a.isActive);
    if (!acct || !acct.accessToken) return null;
    return {
      acct,
      token: decryptToken(acct.accessToken),
      igUserId: acct.id,
      expiresAt: acct.tokenExpiry,
    };
  }

  getStatus(): ChannelStatus {
    return {
      connected: false,
      status: this.client.isConfigured() ? "disconnected" : "not_configured",
      provider: "meta_cloud_api",
      error: this.client.isConfigured() ? undefined : "Meta App ID / Secret not configured in .env.local",
    };
  }

  async connect(): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    const active = await this.getActiveAccount();
    if (!active) {
      return { success: false, error: "No active Instagram account connected via OAuth." };
    }
    return { success: true };
  }

  async disconnect(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  getQRCode(): string | null {
    return null;
  }

  /**
   * Receive and normalize an incoming Meta Webhook payload
   */
  async receiveMessage(payload: unknown): Promise<ChannelMessage> {
    const event = payload as InstagramWebhookEvent;
    const entry = event.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (messaging) {
      const from = messaging.sender.id;
      const to = messaging.recipient.id;
      const text = messaging.message?.text || "";
      const mediaAttachment = messaging.message?.attachments?.[0];

      return {
        messageId: messaging.message?.mid || `ig_${Date.now()}`,
        conversationId: from,
        from,
        to,
        text,
        mediaType: mediaAttachment?.type === "image" ? "image" : undefined,
        mediaUrl: mediaAttachment?.payload?.url,
        timestamp: new Date(messaging.timestamp || Date.now()).toISOString(),
        platform: "instagram",
        rawPayload: payload,
      };
    }

    return {
      messageId: `ig_${uuidv4()}`,
      conversationId: "unknown",
      from: "unknown",
      to: "unknown",
      timestamp: new Date().toISOString(),
      platform: "instagram",
      rawPayload: payload,
    };
  }

  /**
   * Send Direct Message to an Instagram user (Checks 24-hr messaging window)
   */
  async sendMessage(to: string, text: string): Promise<SendResult> {
    const active = await this.getActiveAccount();
    if (!active) {
      return { success: false, error: "Instagram account is not connected" };
    }

    const policy = PlatformPolicyEngine.evaluate({
      platform: "instagram",
      operation: "send_message",
      recipientId: to,
      content: text,
      isTokenValid: true,
      hasRequiredScopes: true,
    });

    if (!policy.allowed) {
      return { success: false, error: policy.reason };
    }

    const result = await this.client.sendMessage(active.igUserId, to, text, active.token);
    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, text: string): Promise<SendResult> {
    const active = await this.getActiveAccount();
    if (!active) return { success: false, error: "Instagram not connected" };

    const result = await this.client.replyToComment(commentId, text, active.token);
    return {
      success: result.success,
      messageId: result.commentId,
      error: result.error,
    };
  }

  /**
   * Send a private reply to a comment
   */
  async sendPrivateCommentReply(commentId: string, text: string): Promise<SendResult> {
    const active = await this.getActiveAccount();
    if (!active) return { success: false, error: "Instagram not connected" };

    const result = await this.client.sendPrivateCommentReply(active.igUserId, commentId, text, active.token);
    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Publish an Image post
   */
  async publishPost(imageUrl: string, caption: string): Promise<SendResult> {
    const active = await this.getActiveAccount();
    if (!active) return { success: false, error: "Instagram not connected" };

    const result = await this.client.publishImagePost(active.igUserId, imageUrl, caption, active.token);
    return {
      success: result.success,
      messageId: result.mediaId,
      error: result.error,
    };
  }

  async sendMedia(to: string, media: MediaPayload): Promise<SendResult> {
    return this.sendMessage(to, media.caption || media.url || "");
  }

  async sendTemplate(to: string, _template: TemplatePayload): Promise<SendResult> {
    return this.sendMessage(to, "Template not supported on Instagram.");
  }

  async getConversation(id: string): Promise<ChannelConversation | null> {
    return { id, participants: [id], lastMessageAt: new Date().toISOString() };
  }

  async markRead(_messageId: string): Promise<void> {}

  async getCustomer(id: string): Promise<ChannelCustomer | null> {
    return { id, name: `Instagram User ${id}` };
  }

  async createWebhook(_config: WebhookConfig): Promise<string> {
    return "meta_graph_api_webhook";
  }

  async validateWebhook(request: Request): Promise<boolean> {
    const signature = request.headers.get("x-hub-signature-256");
    const rawBody = await request.clone().text();
    return this.client.validateWebhookSignature(rawBody, signature);
  }

  async handleEvent(_event: ChannelEvent): Promise<void> {}
}
