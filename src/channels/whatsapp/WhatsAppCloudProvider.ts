/**
 * ============================================================
 *  QuickReply — WhatsApp Cloud API Provider
 *  src/channels/whatsapp/WhatsAppCloudProvider.ts
 *
 *  Official Meta WhatsApp Cloud API adapter (Graph API v18+).
 *  Activates only when WHATSAPP_PHONE_NUMBER_ID and
 *  WHATSAPP_ACCESS_TOKEN are set in environment variables.
 *
 *  When credentials are missing, getStatus() returns not_configured
 *  and all send operations return { success: false }.
 *  This NEVER fakes a connected status.
 * ============================================================
 */

import crypto from "crypto";
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

const WA_API_VERSION = "v18.0";
const WA_API_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;

export class WhatsAppCloudProvider implements IChannel {
  readonly platform = "whatsapp";
  readonly providerType = "meta_cloud_api" as const;

  private readonly phoneNumberId: string | null;
  private readonly accessToken: string | null;
  private readonly appSecret: string | null;
  private readonly businessPhone: string | null;
  private isConnected: boolean = false;
  private connectedTimestamp: number | null = null;
  private lastReceivedAt: string | null = null;
  private lastSentAt: string | null = null;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || null;
    this.appSecret = process.env.WHATSAPP_APP_SECRET || null;
    this.businessPhone = process.env.WHATSAPP_BUSINESS_PHONE || null;

    if (this.isConfigured()) {
      this.isConnected = true;
      this.connectedTimestamp = Date.now();
    }
  }

  private isConfigured(): boolean {
    return !!(this.phoneNumberId && this.accessToken);
  }

  async connect(): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be configured in environment.",
      };
    }

    try {
      // Validate credentials against Meta Graph API
      const res = await this.apiCall("", "GET");
      if (res.ok) {
        this.isConnected = true;
        this.connectedTimestamp = Date.now();
        return { success: true };
      } else {
        this.isConnected = false;
        return { success: false, error: res.error || "Meta Cloud API authentication failed." };
      }
    } catch (err) {
      this.isConnected = false;
      return { success: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async disconnect(): Promise<{ success: boolean; error?: string }> {
    this.isConnected = false;
    this.connectedTimestamp = null;
    return { success: true };
  }

  getStatus(): ChannelStatus {
    if (!this.isConfigured()) {
      return {
        connected: false,
        status: "not_configured",
        provider: "meta_cloud_api",
        error: "WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not configured in environment.",
      };
    }

    return {
      connected: this.isConnected,
      status: this.isConnected ? "connected" : "disconnected",
      phone: this.businessPhone || this.phoneNumberId || undefined,
      businessName: "Meta WhatsApp Cloud API",
      provider: "meta_cloud_api",
      uptime: this.connectedTimestamp ? Date.now() - this.connectedTimestamp : undefined,
      lastConnectedAt: this.connectedTimestamp ? new Date(this.connectedTimestamp).toISOString() : undefined,
      lastMessageReceivedAt: this.lastReceivedAt || undefined,
      lastMessageSentAt: this.lastSentAt || undefined,
    };
  }

  getQRCode(): string | null {
    return null; // Official Cloud API does not use QR pairing
  }

  private async apiCall(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
    body?: unknown
  ): Promise<{ ok: boolean; data?: unknown; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, error: "WhatsApp Cloud API not configured" };
    }

    try {
      const url = `${WA_API_BASE}/${this.phoneNumberId}${endpoint}`;
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = (data as Record<string, unknown>)?.error
          ? JSON.stringify((data as Record<string, unknown>).error)
          : `HTTP ${res.status}`;
        return { ok: false, error: errMsg };
      }

      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  async receiveMessage(payload: unknown): Promise<ChannelMessage> {
    const p = payload as Record<string, unknown>;
    const entry = (p.entry as Record<string, unknown>[])?.[0];
    const change = (entry?.changes as Record<string, unknown>[])?.[0];
    const value = change?.value as Record<string, unknown>;
    const messages = value?.messages as Record<string, unknown>[];
    const contacts = value?.contacts as Record<string, unknown>[];
    const metadata = value?.metadata as Record<string, unknown>;
    const msg = messages?.[0];
    const contact = contacts?.[0];

    const from = (msg?.from as string) || "unknown";
    const msgId = (msg?.id as string) || uuidv4();
    const timestamp = msg?.timestamp
      ? new Date(parseInt(msg.timestamp as string, 10) * 1000).toISOString()
      : new Date().toISOString();
    const type = (msg?.type as string) || "text";
    const toPhone = (metadata?.display_phone_number as string) || this.businessPhone || "";
    const text =
      type === "text"
        ? (msg?.text as Record<string, string>)?.body || ""
        : (msg?.[type] as Record<string, string>)?.caption || "";

    this.lastReceivedAt = timestamp;

    return {
      messageId: msgId,
      conversationId: from,
      from: from.startsWith("+") ? from : `+${from}`,
      to: toPhone.startsWith("+") ? toPhone : `+${toPhone}`,
      senderName: (contact?.profile as Record<string, string>)?.name || undefined,
      text,
      mediaType: type !== "text" ? (type as ChannelMessage["mediaType"]) : undefined,
      timestamp,
      platform: this.platform,
      rawPayload: payload,
    };
  }

  async sendMessage(to: string, text: string): Promise<SendResult> {
    const toClean = to.replace("+", "").replace(/\s/g, "");
    const result = await this.apiCall("/messages", "POST", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toClean,
      type: "text",
      text: { body: text, preview_url: false },
    });

    if (!result.ok) {
      return { success: false, error: result.error };
    }

    const data = result.data as Record<string, unknown>;
    const messages = data?.messages as Record<string, string>[];
    this.lastSentAt = new Date().toISOString();
    return { success: true, messageId: messages?.[0]?.id };
  }

  async sendMedia(to: string, media: MediaPayload): Promise<SendResult> {
    const toClean = to.replace("+", "").replace(/\s/g, "");
    const result = await this.apiCall("/messages", "POST", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toClean,
      type: media.type,
      [media.type]: {
        ...(media.url ? { link: media.url } : {}),
        ...(media.caption ? { caption: media.caption } : {}),
        ...(media.filename ? { filename: media.filename } : {}),
      },
    });

    if (!result.ok) return { success: false, error: result.error };
    const data = result.data as Record<string, unknown>;
    const messages = data?.messages as Record<string, string>[];
    this.lastSentAt = new Date().toISOString();
    return { success: true, messageId: messages?.[0]?.id };
  }

  async sendTemplate(to: string, template: TemplatePayload): Promise<SendResult> {
    const toClean = to.replace("+", "").replace(/\s/g, "");
    const result = await this.apiCall("/messages", "POST", {
      messaging_product: "whatsapp",
      to: toClean,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language || "en_US" },
        ...(template.components ? { components: template.components } : {}),
      },
    });

    if (!result.ok) return { success: false, error: result.error };
    const data = result.data as Record<string, unknown>;
    const messages = data?.messages as Record<string, string>[];
    this.lastSentAt = new Date().toISOString();
    return { success: true, messageId: messages?.[0]?.id };
  }

  async getConversation(_id: string): Promise<ChannelConversation | null> {
    return null;
  }

  async markRead(messageId: string): Promise<void> {
    await this.apiCall("/messages", "POST", {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    });
  }

  async getCustomer(_id: string): Promise<ChannelCustomer | null> {
    return null;
  }

  async createWebhook(_config: WebhookConfig): Promise<string> {
    return `Configure webhook in Meta Business Manager to: ${_config.url}`;
  }

  async validateWebhook(request: Request): Promise<boolean> {
    if (!this.appSecret) {
      console.warn("[WhatsAppCloudProvider] WHATSAPP_APP_SECRET not set — webhook signature validation skipped");
      return true;
    }

    try {
      const signature = request.headers.get("x-hub-signature-256");
      if (!signature) return false;

      const body = await request.text();
      const expectedSig = await this.computeHmac(this.appSecret, body);
      const receivedSig = signature.replace("sha256=", "");

      return this.timingSafeEqual(expectedSig, receivedSig);
    } catch {
      return false;
    }
  }

  private async computeHmac(secret: string, body: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  async handleEvent(_event: ChannelEvent): Promise<void> {
    // Platform events are handled at the webhook level
  }
}
