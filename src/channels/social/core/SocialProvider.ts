/**
 * ============================================================
 * QuickReply — Unified Native Social Provider Abstraction
 * src/channels/social/core/SocialProvider.ts
 *
 * Common contract that ALL official social platform adapters implement:
 * - Instagram (Meta Graph API)
 * - Telegram (Bot API)
 * - LinkedIn (Community Management & Posts REST API)
 * - X / Twitter (X API v2)
 *
 * STRICT ZERO-MOCK & OFFICIAL API RULE:
 * If an operation is unsupported by the platform, returns explicit
 * unsupported state with missing permissions / required account tier.
 * ============================================================
 */

import type {
  SocialAccount,
  SocialPost,
  SocialComment,
  SocialMessage,
  SocialMetric,
  SocialPlatform,
  SocialConnectionStatus,
  IntegrationError,
} from "@/database/db";

export interface ProviderCapabilities {
  platform: SocialPlatform;
  displayName: string;
  accountType?: string;          // e.g. "Business", "Creator", "Bot", "Personal"
  publishing: boolean;
  textPosts: boolean;
  imagePosts: boolean;
  videoPosts: boolean;
  stories: boolean;
  reels: boolean;
  commentsRead: boolean;
  commentsReply: boolean;
  dmRead: boolean;
  dmSend: boolean;
  analytics: boolean;
  webhooks: boolean;
  unsupportedOperations: string[];
  missingPermissions?: string[];
  notes: string;
}

export interface OAuthStart {
  authUrl: string;
  state: string;
  codeVerifier?: string;         // For PKCE flows (X / Twitter)
}

export interface OAuthResult {
  success: boolean;
  account?: SocialAccount;
  error?: string;
  userFacingExplanation?: string;
}

export interface PublishInput {
  accountId: string;
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  title?: string;
  scheduledTime?: string;
  replyToId?: string;            // For comment/thread replies
  organizationUrn?: string;      // For LinkedIn company pages
  metadata?: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  providerPostId?: string;
  permalink?: string;
  error?: string;
  userFacingExplanation?: string;
  errorCode?: string;
  publishedAt?: string;
}

export interface ScheduleInput extends PublishInput {
  scheduledAt: string;           // ISO timestamp
  idempotencyKey?: string;
}

export interface ScheduleResult {
  success: boolean;
  jobId: string;
  scheduledAt: string;
  error?: string;
}

export interface AnalyticsResult {
  platform: SocialPlatform;
  accountId: string;
  metrics: Record<string, { value: number; available: boolean; source: string }>;
  fetchedAt: string;
  lastUpdatedText: string;
  error?: string;
}

export interface CommentReplyResult {
  success: boolean;
  replyId?: string;
  error?: string;
  userFacingExplanation?: string;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  userFacingExplanation?: string;
}

export interface NormalizedEvent {
  id: string;
  platform: SocialPlatform;
  eventType: "comment.created" | "message.received" | "post.published" | "account.disconnected" | "token.expiring";
  timestamp: string;
  accountId: string;
  payload: any;
}

export interface TokenResult {
  success: boolean;
  newAccessToken?: string;
  newRefreshToken?: string;
  expiresInSeconds?: number;
  error?: string;
}

export interface ConnectionDiagnostics {
  platform: SocialPlatform;
  connected: boolean;
  status: SocialConnectionStatus;
  tokenValid: boolean;
  accountDiscovered: boolean;
  permissionsVerified: boolean;
  apiReachable: boolean;
  webhookActive: boolean;
  details: string;
  rawError?: string;
}

/**
 * Universal interface that every native platform adapter implements
 */
export interface SocialProvider {
  readonly platform: SocialPlatform;
  readonly displayName: string;

  /** Initialize OAuth flow or token onboarding */
  connect(redirectUri?: string): Promise<OAuthStart>;

  /** Complete OAuth callback or token validation */
  callback(params: Record<string, any>): Promise<OAuthResult>;

  /** Revoke tokens and disconnect account */
  disconnect(accountId: string): Promise<void>;

  /** Fetch fresh account details from official API */
  getAccount(accountId: string): Promise<SocialAccount | null>;

  /** Query runtime platform capabilities for this account */
  getCapabilities(accountId: string): Promise<ProviderCapabilities>;

  /** Publish post immediately through official API */
  publishContent(input: PublishInput): Promise<PublishResult>;

  /** Schedule a post for future durable execution */
  scheduleContent(input: ScheduleInput): Promise<ScheduleResult>;

  /** Fetch published posts from official API */
  getPosts(accountId: string, limit?: number): Promise<any[]>;

  /** Fetch official platform analytics */
  getAnalytics(accountId: string): Promise<AnalyticsResult>;

  /** Fetch comments on an account's posts */
  getComments(accountId: string, postId?: string): Promise<SocialComment[]>;

  /** Reply to a specific comment */
  replyToComment(accountId: string, commentId: string, text: string): Promise<CommentReplyResult>;

  /** Fetch direct messages (where supported) */
  getMessages(accountId: string, conversationId?: string): Promise<SocialMessage[]>;

  /** Send a direct message (where supported) */
  sendMessage(accountId: string, toId: string, text: string, mediaUrl?: string): Promise<MessageResult>;

  /** Register or verify official webhooks */
  registerWebhooks(accountId: string, webhookUrl: string): Promise<{ success: boolean; webhookId?: string; error?: string }>;

  /** Parse and normalize incoming webhook payloads */
  handleWebhook(payload: unknown, headers?: Record<string, string>): Promise<NormalizedEvent | null>;

  /** Refresh an expiring access token */
  refreshToken(accountId: string): Promise<TokenResult>;

  /** Test end-to-end API connectivity and permissions */
  testConnection(accountId: string): Promise<ConnectionDiagnostics>;
}
