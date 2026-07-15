/**
 * ============================================================
 *  QuickReply — Channel Abstraction Layer
 *  src/channels/core/IChannel.ts
 *
 *  Common interface that ALL messaging channel adapters must implement.
 *  This isolates platform-specific logic from the AI engine,
 *  allowing WhatsApp to be replaced or upgraded without touching
 *  the AI, RAG, or automation layers.
 * ============================================================
 */

export interface ChannelMessage {
  messageId: string;        // Platform-specific message ID
  conversationId: string;   // Platform conversation/thread ID
  from: string;             // Sender phone/ID (E.164)
  to: string;               // Recipient phone/ID (E.164)
  senderName?: string;      // Customer profile display name
  text?: string;
  mediaType?: "image" | "document" | "audio" | "video" | "sticker";
  mediaUrl?: string;
  mediaCaption?: string;
  timestamp: string;        // ISO string
  platform: string;
  rawPayload?: unknown;     // Original payload for auditing
}

export interface SendResult {
  success: boolean;
  messageId?: string;       // Platform message ID on success
  error?: string;           // Error message on failure
}

export interface MediaPayload {
  type: "image" | "document" | "audio" | "video";
  url?: string;
  caption?: string;
  filename?: string;
}

export interface TemplatePayload {
  name: string;
  language: string;
  components?: unknown[];
}

export interface ChannelConversation {
  id: string;
  participants: string[];
  lastMessageAt: string;
}

export interface ChannelCustomer {
  id: string;
  phone?: string;
  name?: string;
  avatar?: string;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  events?: string[];
}

export interface ChannelEvent {
  type: string;
  payload: unknown;
  timestamp: string;
}

export type ChannelConnectionState =
  | "connected"
  | "disconnected"
  | "connecting"
  | "qr_ready"
  | "session_expired"
  | "not_configured"
  | "error";

export type ChannelStatus = {
  connected: boolean;
  status: ChannelConnectionState;
  phone?: string;
  businessName?: string;
  provider: "meta_cloud_api" | "whatsapp_web_session" | "none";
  qrCode?: string;         // Data URL or raw string for pairing QR code
  uptime?: number;         // Milliseconds since connected
  lastConnectedAt?: string;
  lastMessageReceivedAt?: string;
  lastMessageSentAt?: string;
  error?: string;
};

/**
 * Common interface all channel adapters must implement.
 */
export interface IChannel {
  readonly platform: string;
  readonly providerType: "meta_cloud_api" | "whatsapp_web_session" | "none";

  /** Connect/initialize the channel session */
  connect(): Promise<{ success: boolean; qrCode?: string; error?: string }>;

  /** Disconnect/terminate the session */
  disconnect(): Promise<{ success: boolean; error?: string }>;

  /** Get live connection status */
  getStatus(): ChannelStatus;

  /** Get active QR code string/data URL for web session pairing */
  getQRCode(): string | null;

  /** Parse an incoming message payload into a normalized ChannelMessage */
  receiveMessage(payload: unknown): Promise<ChannelMessage>;

  /** Send a plain text message */
  sendMessage(to: string, text: string): Promise<SendResult>;

  /** Send a media message (image, document, audio, video) */
  sendMedia(to: string, media: MediaPayload): Promise<SendResult>;

  /** Send a pre-approved template message */
  sendTemplate(to: string, template: TemplatePayload): Promise<SendResult>;

  /** Retrieve conversation from the platform (if supported) */
  getConversation(id: string): Promise<ChannelConversation | null>;

  /** Mark a message as read */
  markRead(messageId: string): Promise<void>;

  /** Get a customer/contact by platform ID */
  getCustomer(id: string): Promise<ChannelCustomer | null>;

  /** Register a webhook with the platform */
  createWebhook(config: WebhookConfig): Promise<string>;

  /** Verify that an incoming webhook request is authentic */
  validateWebhook(request: Request): Promise<boolean>;

  /** Handle a platform-specific event */
  handleEvent(event: ChannelEvent): Promise<void>;
}
