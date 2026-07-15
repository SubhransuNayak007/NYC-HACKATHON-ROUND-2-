/**
 * ============================================================
 *  QuickReply — LinkedIn Channel Adapter
 *  src/channels/linkedin/LinkedInChannelAdapter.ts
 *
 *  Real LinkedIn Community Management API Adapter implementing IChannel.
 *  Supports Organization Posts, Comments, and Analytics.
 *  Enforces strict platform boundary rejecting personal DM automation.
 * ============================================================
 */

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
import { LinkedInApiClient } from "./LinkedInApiClient";
import { getDB, decryptToken } from "@/database/db";

export class LinkedInChannelAdapter implements IChannel {
  readonly platform = "linkedin";
  readonly providerType = "meta_cloud_api" as const;

  private client: LinkedInApiClient;

  constructor() {
    this.client = new LinkedInApiClient();
  }

  private async getActiveAccount() {
    const db = await getDB();
    const acct = db.socialAccounts?.find((a) => a.platform === "linkedin" && a.isActive);
    if (!acct || !acct.accessToken) return null;
    return {
      acct,
      token: decryptToken(acct.accessToken),
      orgId: acct.id,
      name: acct.name,
    };
  }

  getStatus(): ChannelStatus {
    return {
      connected: false,
      status: this.client.isConfigured() ? "disconnected" : "not_configured",
      provider: "none",
      error: this.client.isConfigured() ? undefined : "LinkedIn Client ID / Secret not configured in .env.local",
    };
  }

  async connect(): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    const active = await this.getActiveAccount();
    if (!active) {
      return { success: false, error: "No active LinkedIn account connected via OAuth." };
    }
    return { success: true };
  }

  async disconnect(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  getQRCode(): string | null {
    return null;
  }

  async receiveMessage(payload: unknown): Promise<ChannelMessage> {
    const p = payload as any;
    return {
      messageId: `li_${Date.now()}`,
      conversationId: p.postId || "li_general",
      from: p.author || "LinkedIn User",
      to: "LinkedIn Page",
      text: p.text || "",
      timestamp: new Date().toISOString(),
      platform: "linkedin",
      rawPayload: payload,
    };
  }

  /**
   * Hard Boundary: Personal DM automation is NOT supported on LinkedIn
   */
  async sendMessage(_to: string, _text: string): Promise<SendResult> {
    const rejection = this.client.rejectPersonalMessaging();
    return {
      success: false,
      error: rejection.error,
    };
  }

  /**
   * Reply to a comment on a LinkedIn post
   */
  async replyToComment(postUrn: string, commentText: string): Promise<SendResult> {
    const active = await this.getActiveAccount();
    if (!active) return { success: false, error: "LinkedIn account not connected" };

    const actorUrn = active.orgId.startsWith("urn:li:") ? active.orgId : `urn:li:organization:${active.orgId}`;
    const result = await this.client.replyToComment(postUrn, commentText, actorUrn, active.token);

    return {
      success: result.success,
      messageId: result.commentUrn,
      error: result.error,
    };
  }

  /**
   * Publish an Organic Post to the LinkedIn Organization Page
   */
  async publishPost(content: string): Promise<SendResult> {
    const active = await this.getActiveAccount();
    if (!active) return { success: false, error: "LinkedIn account not connected" };

    const orgUrn = active.orgId.startsWith("urn:li:organization:")
      ? active.orgId
      : `urn:li:organization:${active.orgId}`;

    const result = await this.client.createCompanyPost(orgUrn, content, active.token);
    return {
      success: result.success,
      messageId: result.postUrn,
      error: result.error,
    };
  }

  async sendMedia(_to: string, _media: MediaPayload): Promise<SendResult> {
    return this.sendMessage(_to, "");
  }

  async sendTemplate(_to: string, _template: TemplatePayload): Promise<SendResult> {
    return this.sendMessage(_to, "");
  }

  async getConversation(id: string): Promise<ChannelConversation | null> {
    return { id, participants: [id], lastMessageAt: new Date().toISOString() };
  }

  async markRead(_messageId: string): Promise<void> {}

  async getCustomer(id: string): Promise<ChannelCustomer | null> {
    return { id, name: `LinkedIn Member ${id}` };
  }

  async createWebhook(_config: WebhookConfig): Promise<string> {
    return "linkedin_community_management";
  }

  async validateWebhook(_request: Request): Promise<boolean> {
    return true;
  }

  async handleEvent(_event: ChannelEvent): Promise<void> {}
}
