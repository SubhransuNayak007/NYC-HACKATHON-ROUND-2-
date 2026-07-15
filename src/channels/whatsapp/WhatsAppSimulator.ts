/**
 * ============================================================
 *  QuickReply — WhatsApp Simulator
 *  src/channels/whatsapp/WhatsAppSimulator.ts
 *
 *  Developer-mode WhatsApp inbox simulator.
 *  Processes messages through the EXACT production AI pipeline
 *  without requiring any real WhatsApp Cloud API credentials.
 *
 *  Safe to use in development and staging environments.
 *  Should be disabled or protected in production.
 * ============================================================
 */

import { v4 as uuidv4 } from "uuid";
import type { IChannel, ChannelMessage, SendResult, MediaPayload, TemplatePayload, ChannelConversation, ChannelCustomer, WebhookConfig, ChannelEvent, ChannelStatus } from "../core/IChannel";

export interface SimulatorMessage {
  customerPhone: string;
  customerName?: string;
  text: string;
  mediaType?: "image" | "document";
  mediaUrl?: string;
}

export interface SimulatorResult {
  success: boolean;
  conversationId: string;
  incomingMessage: ChannelMessage;
  webhookPayload: unknown;   // The Meta-format payload that was processed
  error?: string;
}

// Re-export IChannel types needed by WhatsAppProviderFactory
export type { IChannel, ChannelStatus } from "../core/IChannel";

/**
 * WhatsApp Simulator — implements IChannel for development/testing.
 * Messages are processed through the real AI engine, responses are stored
 * in the database, but NO real WhatsApp messages are sent.
 */
export class WhatsAppSimulator implements IChannel {
  readonly platform = "whatsapp_simulator";
  readonly providerType = "meta_cloud_api" as const;
  private readonly businessPhone: string;
  private readonly sentMessages: { to: string; text: string; timestamp: string }[] = [];

  constructor(businessPhone = "+919999999999") {
    this.businessPhone = businessPhone;
  }

  async connect(): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    return { success: false, error: "Simulator mode is not a live WhatsApp connection." };
  }

  async disconnect(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  getQRCode(): string | null {
    return null;
  }

  getStatus(): ChannelStatus {
    return {
      connected: false,
      status: "disconnected",
      provider: "none",
      error: "SIMULATOR MODE — No real WhatsApp credentials configured. Messages are processed through the AI pipeline but not sent to real WhatsApp.",
    };
  }

  /**
   * Generate a Meta Cloud API format webhook payload for a customer message.
   * This is what Meta's servers would send to your webhook endpoint.
   */
  generateWebhookPayload(msg: SimulatorMessage): unknown {
    const messageId = `sim_${uuidv4().replace(/-/g, "")}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();

    return {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "SIMULATED_WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: this.businessPhone.replace("+", ""),
                  phone_number_id: "SIMULATED_PHONE_NUMBER_ID",
                },
                contacts: [
                  {
                    profile: { name: msg.customerName || "Simulated Customer" },
                    wa_id: msg.customerPhone.replace("+", "").replace(/\s/g, ""),
                  },
                ],
                messages: [
                  {
                    from: msg.customerPhone.replace("+", "").replace(/\s/g, ""),
                    id: messageId,
                    timestamp,
                    type: msg.mediaType ? msg.mediaType : "text",
                    ...(msg.text && !msg.mediaType ? { text: { body: msg.text } } : {}),
                    ...(msg.mediaType ? {
                      [msg.mediaType]: {
                        id: `sim_media_${uuidv4().replace(/-/g, "")}`,
                        mime_type: msg.mediaType === "image" ? "image/jpeg" : "application/pdf",
                        sha256: "simulated_hash",
                        caption: msg.text || "",
                      }
                    } : {}),
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
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
      ? new Date(parseInt(msg.timestamp as string) * 1000).toISOString()
      : new Date().toISOString();
    const type = (msg?.type as string) || "text";
    const toPhone = (metadata?.display_phone_number as string) || this.businessPhone;
    const text = type === "text"
      ? ((msg?.text as Record<string, string>)?.body || "")
      : ((msg?.[type] as Record<string, string>)?.caption || "");

    return {
      messageId: msgId,
      conversationId: from,  // In WhatsApp, conversation ID = customer phone
      from: `+${from}`,
      to: `+${toPhone}`,
      text,
      mediaType: type !== "text" ? (type as ChannelMessage["mediaType"]) : undefined,
      timestamp,
      platform: this.platform,
      rawPayload: payload,
    };
  }

  async sendMessage(to: string, text: string): Promise<SendResult> {
    const entry = { to, text, timestamp: new Date().toISOString() };
    this.sentMessages.push(entry);
    console.log(`[WhatsAppSimulator] SEND → ${to}: ${text.substring(0, 100)}...`);
    return { success: true, messageId: `sim_out_${uuidv4().replace(/-/g, "")}` };
  }

  async sendMedia(_to: string, _media: MediaPayload): Promise<SendResult> {
    return { success: true, messageId: `sim_media_${uuidv4().replace(/-/g, "")}` };
  }

  async sendTemplate(_to: string, _template: TemplatePayload): Promise<SendResult> {
    return { success: true, messageId: `sim_tmpl_${uuidv4().replace(/-/g, "")}` };
  }

  async getConversation(id: string): Promise<ChannelConversation | null> {
    return { id, participants: [id, this.businessPhone], lastMessageAt: new Date().toISOString() };
  }

  async markRead(_messageId: string): Promise<void> {
    // No-op in simulator
  }

  async getCustomer(id: string): Promise<ChannelCustomer | null> {
    return { id, phone: id };
  }

  async createWebhook(_config: WebhookConfig): Promise<string> {
    return "simulator_webhook_url";
  }

  async validateWebhook(_request: Request): Promise<boolean> {
    // Simulator always validates (no real signature)
    return true;
  }

  async handleEvent(_event: ChannelEvent): Promise<void> {
    // No-op in simulator
  }

  /** Get all messages "sent" by the AI during this session */
  getSentMessages() {
    return [...this.sentMessages];
  }
}
