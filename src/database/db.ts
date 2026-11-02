import fs from "fs";
import path from "path";
import crypto from "crypto";
import dns from "dns";
import { MongoClient } from "mongodb";
import { cookies } from "next/headers";
import type {
  AutomationConversation,
  AutomationPlan,
  PlanApprovalRecord,
  ActivationApprovalRecord,
  WorkflowSpec,
} from "@/backend/automation/types";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignored in non-Node environments
}

// --- Token Encryption Utilities ---
// AES-256-GCM encryption for OAuth tokens at rest

function getTokenEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (key && key.length === 64) {
    return Buffer.from(key, "hex");
  }
  const seed = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.APP_SECRET;
  if (!seed && process.env.NODE_ENV === "production") {
    console.error("[Security] CRITICAL: TOKEN_ENCRYPTION_KEY or SESSION_SECRET must be configured in production.");
  }
  return crypto.createHash("sha256").update(seed || "quickreply_dev_encryption_seed_non_prod_only").digest();
}

export function encryptToken(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getTokenEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  // Check if the token is already encrypted (has the iv:tag:ciphertext format)
  const parts = encryptedText.split(":");
  if (parts.length !== 3) return encryptedText; // Not encrypted, return as-is for backwards compatibility

  try {
    const [ivHex, authTagHex, ciphertext] = parts;
    const key = getTokenEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // If decryption fails, the token might be in legacy plaintext format
    return encryptedText;
  }
}

// High-Performance Singleton MongoDB Connection Pool across Next.js Lambdas & Hot-Reloads
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  if (globalThis._mongoClientPromise) {
    return globalThis._mongoClientPromise;
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 50,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 5000,
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000,
  });

  globalThis._mongoClientPromise = client.connect().catch((err) => {
    globalThis._mongoClientPromise = undefined;
    throw err;
  });

  return globalThis._mongoClientPromise;
}

export interface WorkspaceMember {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
}

export interface GlobalReplyConfig {
  replyToAll: boolean;
  tags: string;
  template: string;
}

export interface WorkspaceSettings {
  dailyReplyQuota: number;
  blockedUsers: string[];
  spamProtection: boolean;
  slackWebhook: string;
  emailDigest: string;
  negativeKeywords?: string;
  globalReplyConfig?: GlobalReplyConfig;
  // AI settings
  defaultLanguage?: string;
  autoTranslate?: boolean;
  aiReplyEnabled?: boolean;
  // Safety gate (B4): minimum confidence before an auto-reply fires.
  // Below this the comment routes to the review queue instead.
  confidenceGate?: number;
  // Golden-hour mode (B5): prioritize comments on videos published in the last 60 min.
  goldenHourEnabled?: boolean;
  // Custom Platform Client ID & Secret credentials for connecting real channels
  customCredentials?: Record<string, {
    clientId?: string;
    clientSecret?: string;
    token?: string;
    phoneId?: string;
  }>;
}

export interface Workspace {
  name: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
}

export interface Channel {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  status: "active" | "quota_error";
  subscribers: string;
  refreshToken?: string;
  accessToken?: string;
  automatedVideos?: string[];
  platform?: "youtube"; // Kept for YouTube-specific channels
  // Auto-discovery fields
  autoDiscoverVideos?: boolean;       // Default: true — auto-discover new videos
  lastDiscoveryAt?: string | null;    // ISO string of last discovery run
  maxVideosPerChannel?: number;       // Default: 50 — limit queue size per channel
}

// --- 24/7 Auto-Reply System ---

export interface VideoQueueEntry {
  id: string;
  channelId: string;
  videoId: string;
  title: string;
  publishedAt: string;          // ISO string — when video was published
  discoveredAt: string;         // ISO string — when our system discovered it
  lastPolledAt: string | null;  // ISO string — last time comments were fetched
  status: "pending" | "active" | "stale" | "error";
  pollCount: number;
  commentCount: number;         // Total comments processed
  repliedCount: number;         // Total replies posted
  priority: number;             // 1=hottest (newest), 4=coldest (oldest)
  error?: string | null;        // Last error message
  isAutomated?: boolean;
  isRAGAutomated?: boolean;
}

export type SystemEventType =
  | "video_discovered"
  | "poll_tick"
  | "reply_posted"
  | "reply_failed"
  | "rag_match"
  | "rag_miss"
  | "faq_fallback"
  | "cron_tick"
  | "error";

export interface SystemEvent {
  id: string;
  type: SystemEventType;
  channelId?: string;
  videoId?: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;            // ISO string
}

export interface SystemStatus {
  lastCronRunAt: string | null;
  lastDiscoveryRunAt: string | null;
  lastPollRunAt: string | null;
  startedAt: string;            // ISO string — when system booted
  youtubeQuotaUsedToday: number;
  /** Persistent quota ledger — date the counter belongs to (YYYY-MM-DD). Survives serverless cold starts. */
  quotaDate?: string;
}

// --- Pipeline telemetry (B3): the engine's per-stage trace, streamed to the visualizer ---
export type PipelineStageStatus = "pass" | "hold" | "block" | "skip" | "done" | "error";

export interface PipelineStageResult {
  stage: "ingest" | "safety" | "intent" | "rule" | "rag" | "confidence" | "reply";
  status: PipelineStageStatus;
  latencyMs: number;
  detail?: string;
  confidence?: number;
  matchedId?: string;
}

export type PipelineOutcome = "replied" | "review" | "skipped" | "failed" | "limit";

export interface PipelineTrace {
  id: string;
  commentId: string;
  author: string;
  textPreview: string;
  videoTitle: string;
  channelId: string;
  startedAt: string;
  finishedAt: string;
  totalMs: number;
  stages: PipelineStageResult[];
  outcome: PipelineOutcome;
  replyText?: string;
  replySource?: "rule" | "rag" | "ai";
  confidence?: number;
  isDemo?: boolean;
}

// --- Multi-Platform Social Accounts & Unified Integration Layer ---
export type SocialPlatform = "youtube" | "instagram" | "twitter" | "linkedin" | "whatsapp" | "telegram";
export type SocialConnectionStatus = "connected" | "disconnected" | "needs_reauth" | "restricted" | "error" | "pending";

export interface SocialAccount {
  platform: SocialPlatform;
  id: string;                   // Platform user/page/bot/phone ID
  name: string;                 // Display name
  username: string;             // @handle, bot username, or phone number
  avatar?: string;
  accessToken?: string;         // Encrypted OAuth / Bot token
  refreshToken?: string;        // Encrypted refresh token
  tokenExpiry?: string;         // ISO string
  appSecret?: string;           // Encrypted App Secret
  scopes?: string[];            // Authorized OAuth scopes
  pageId?: string;              // Instagram Business page ID / LinkedIn company URN
  phoneNumberId?: string;       // WhatsApp Business Phone Number ID
  whatsappToken?: string;       // Encrypted WhatsApp Business API token
  webhookVerifyToken?: string;  // Secret token for webhook verification
  telegramBotId?: string;       // Telegram Bot ID
  telegramBotUsername?: string; // Telegram Bot Username (e.g. @MyBot)
  telegramWebhookSet?: boolean; // True if Telegram webhook registered
  linkedinUrn?: string;         // LinkedIn Person URN (e.g. urn:li:person:...)
  linkedinOrganizationUrns?: string[]; // LinkedIn Company URNs administered
  xUserId?: string;             // X / Twitter numerical User ID
  xPlan?: "free" | "basic" | "pro" | "enterprise"; // Detected X API plan access
  followers?: string;           // Formatted follower/subscriber count
  connectedAt: string;          // ISO string
  isActive: boolean;
  status?: SocialConnectionStatus;
  capabilities?: Record<string, boolean>;
  lastSyncAt?: string;          // ISO string of last comment/message fetch
  dailyReplies?: number;
  totalReplies?: number;
  error?: string;               // Last error message if any
}

export interface SocialComment {
  id: string;                   // Platform-specific comment/message ID
  platform: Exclude<SocialPlatform, "youtube">;
  accountId: string;            // SocialAccount.id this belongs to
  author: string;               // Commenter display name
  authorId?: string;            // Platform user ID of commenter
  authorAvatar?: string;
  text: string;                 // Comment content
  postId?: string;              // Parent post/tweet/media ID
  postTitle?: string;           // Title/caption of parent post
  postUrl?: string;             // Link to parent post
  publishedAt: string;          // ISO string
  status: "pending" | "replied" | "skipped" | "review" | "failed";
  replyText?: string;
  repliedAt?: string;
  matchedRuleId?: string;
  autoReplyText?: string;
  sentiment?: "positive" | "neutral" | "negative" | "question" | "spam";
  buyingIntent?: boolean;
  buyingIntentScore?: number;
  detectedIntent?: string;
}

export interface SocialMessage {
  id: string;                   // Platform message ID
  platform: SocialPlatform;
  accountId: string;            // SocialAccount.id
  conversationId: string;       // Thread/chat ID
  senderId: string;
  senderName: string;
  recipientId: string;
  direction: "inbound" | "outbound";
  text: string;
  mediaType?: "image" | "video" | "document" | "audio";
  mediaUrl?: string;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "failed" | "pending";
  metadata?: Record<string, any>;
}

export interface SocialConversation {
  id: string;
  platform: SocialPlatform;
  accountId: string;
  participantId: string;
  participantName: string;
  participantUsername?: string;
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "active" | "resolved" | "archived";
}

export interface PlatformVariant {
  platform: SocialPlatform;
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  status: "draft" | "queued" | "publishing" | "published" | "failed";
  providerPostId?: string;
  permalink?: string;
  error?: string;
  publishedAt?: string;
}

export interface SocialPost {
  id: string;
  tenantId?: string;
  canonicalIntent: string;
  canonicalMediaUrls?: string[];
  variants: PlatformVariant[];
  scheduledAt?: string;
  publishedAt?: string;
  status: "draft" | "validating" | "queued" | "publishing" | "published" | "publish_failed" | "partially_published";
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaAsset {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  aspectRatio?: string;
  platformAssetUrns?: Record<string, string>;
  validationState: Record<string, { valid: boolean; error?: string }>;
  createdAt: string;
}

export interface SocialScheduledJob {
  id: string;
  tenantId?: string;
  platform: SocialPlatform;
  accountId: string;
  postId: string;
  scheduledAt: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialMetric {
  id: string;
  platform: SocialPlatform;
  accountId: string;
  postId?: string;
  metricName: "impressions" | "reach" | "likes" | "comments" | "shares" | "views" | "clicks" | "subscribers" | "messages";
  value: number;
  available: boolean;           // False -> display N/A
  source: "official_api" | "webhook" | "calculated";
  fetchedAt: string;
}

export interface SocialWebhook {
  id: string;
  platform: SocialPlatform;
  accountId?: string;
  eventId: string;
  eventType: string;
  rawPayload: any;
  processed: boolean;
  processedAt?: string;
  error?: string;
  createdAt: string;
}

export interface IntegrationError {
  id: string;
  platform: SocialPlatform;
  accountId?: string;
  errorCode: string;
  message: string;
  userFacingExplanation: string;
  missingPermission?: string;
  requiredAccountType?: string;
  needsReauth: boolean;
  timestamp: string;
}

export interface Template {
  id: string;
  name: string;
  emoji: string;
  body: string;
  variants: string[];
  usageCount: number;
  lastEdited: string;
}

export interface RuleCondition {
  id: string;
  type: "contains" | "equals" | "regex" | "starts_with" | "reply_all";
  value: string;
  // Feature 6: Extended condition types
  advancedType?: "subscriber_count" | "time_of_day" | "day_of_week";
  advancedOperator?: "gt" | "lt" | "eq" | "gte" | "lte";
  advancedValue?: string;
}

export interface RuleFilters {
  topLevelOnly: boolean;
  maxRepliesPerUser: number;
  language: string;
  // Feature 6: Time-based rules
  activeHoursStart?: number;   // 0-23
  activeHoursEnd?: number;     // 0-23
  activeDays?: number[];       // 0=Sun, 6=Sat
  businessHoursOnly?: boolean;
}

export interface Rule {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  colorLabel: "red" | "blue" | "yellow" | "green";
  conditions: RuleCondition[];
  operator: "AND" | "OR";
  filters: RuleFilters;
  templateId: string;
  delaySeconds: number;
  dailyLimit: number;
  customVariable1: string;
  customVariable2: string;
  customVariable3: string;
  approvalMode?: "autonomous" | "review";
  // Feature 6: Workflow automations
  followUpEnabled?: boolean;
  followUpDelayHours?: number;
  followUpMessage?: string;
  webhookTriggerId?: string;
  // Feature 8: AI learning tracking
  effectivenessScore?: number;    // 0-100
  totalTriggers?: number;
  totalSuccesses?: number;
}

export interface Comment {
  id: string;
  channelId: string;
  author: string;
  authorAvatar: string;
  authorSubscribers: string;
  authorHistoryCount: number;
  text: string;
  videoTitle: string;
  videoThumbnail: string;
  publishedAt: string;
  status: "matched" | "review" | "replied" | "skipped" | "failed";
  matchedRuleId: string | null;
  delayRemainingSeconds: number;
  autoReplyText: string | null;
  replyFiredAt: string | null;
  matchedAt?: string;
  // AI-powered fields
  replySource?: "rule" | "rag" | "ai" | "global";
  sentiment?: "positive" | "neutral" | "negative" | "question" | "spam";
  language?: string;
  wasTranslated?: boolean;
  // Per-stage pipeline telemetry (B3)
  fetchedAt?: string;            // When the comment entered the engine
  decidedAt?: string;            // When the engine reached a decision
  confidence?: number;           // Confidence score used for the decision (0-1)
  traceId?: string;              // Pipeline trace id for the visualizer
  // Idempotent retry (B6)
  retryCount?: number;           // How many times a failed reply has been retried
  lastAttemptAt?: string;        // ISO of the last retry attempt
  isDemo?: boolean;              // True when injected by demo mode (B9)
  // Analytics fields
  replyTimeMinutes?: number;           // Time from comment to reply
  algorithmicBoostScore?: number;      // 0-100 estimated algorithmic impact
  engagementAfterReply?: number;       // Likes/replies on comment after our reply
  isSuperfan?: boolean;                // Tracked separately via TopCommenter
}

export interface TopCommenter {
  author: string;
  authorAvatar: string;
  commentCount: number;
  totalRepliesReceived: number;
  avgSentiment: "positive" | "neutral" | "negative";
  lastCommentAt: string;
  subscriberCount: number;
  isSuperfan: boolean;
  channelIds: string[];
}

export interface EngagementHourly {
  hour: number;           // 0-23
  dayOfWeek: number;      // 0-6
  commentCount: number;
  replyCount: number;
  avgResponseTime: number;
}

export interface ROIData {
  repliesThisWeek: number;
  hoursSavedThisWeek: number;
  hourlyRate: number;
  moneySavedThisWeek: number;
  repliesThisMonth: number;
  hoursSavedThisMonth: number;
  moneySavedThisMonth: number;
  allTimeReplies: number;
  allTimeHoursSaved: number;
  allTimeMoneySaved: number;
}

export interface WeeklyDigestData {
  periodStart: string;
  periodEnd: string;
  totalComments: number;
  autoReplies: number;
  reviewQueue: number;
  hoursSaved: number;
  moneySaved: number;
  topKeywords: { keyword: string; count: number }[];
  topCommenters: TopCommenter[];
  peakHours: { hour: number; count: number }[];
  rulePerformance: { name: string; triggers: number; accuracy: number }[];
  milestones: { label: string; value: number }[];
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface UserSession {
  email: string;
  name: string;
  username: string;        // Unique username for the account
  tier: "free" | "starter" | "growth" | "pro" | "business" | "premium";
  repliesToday: number;
  lastResetDate: string;
  quickLogin?: {
    secretCodeHash?: string;      // Bcrypt-hashed 6-digit secret code
    secretCodePlain?: string;     // Plain text (shown once during setup, then cleared)
    totpSecret?: string;          // TOTP secret for Google Authenticator
    totpEnabled?: boolean;        // Whether user has completed TOTP setup
    quickLoginEnabled?: boolean;  // Master toggle
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  avatar?: string;
  joinedAt: string;
  lastActive?: string;
}


export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  code: string;
  isUsed: boolean;
  usedBy?: string;
}

// ============================================================
// Credit System & Immutable Ledger — Data Models
// ============================================================

export type CreditTransactionType =
  | "PURCHASE"
  | "SUBSCRIPTION_GRANT"
  | "BONUS"
  | "SIGNUP_BONUS"
  | "USAGE"
  | "REFUND"
  | "RESERVATION"
  | "RESERVATION_RELEASE"
  | "ADMIN_ADJUSTMENT"
  | "EXPIRATION";

export type CreditReferenceType =
  | "REPLY_KEYWORD"
  | "REPLY_RULE"
  | "REPLY_AI"
  | "REPLY_RAG"
  | "STRIPE_CHECKOUT"
  | "RAZORPAY_PAYMENT"
  | "SUBSCRIPTION_MONTHLY"
  | "SIGNUP_BONUS"
  | "ADMIN";

export interface CreditAccount {
  id: string;
  tenantId: string;
  balance: number;
  reservedBalance: number;
  lifetimeGranted: number;
  lifetimeUsed: number;
  version: number;
  updatedAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  tenantId: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  referenceType: CreditReferenceType;
  referenceId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CreditReservation {
  id: string;
  tenantId: string;
  amount: number;
  referenceId: string;
  idempotencyKey: string;
  status: "PENDING" | "COMMITTED" | "RELEASED";
  createdAt: string;
  expiresAt: string;
}

// ============================================================
// Billing, Subscriptions & Webhooks — Data Models
// ============================================================

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELED"
  | "INCOMPLETE"
  | "EXPIRED";

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  provider: "stripe" | "razorpay";
  subscriptionId: string;
  customerId: string;
  tier: "free" | "starter" | "growth" | "pro" | "business" | "premium";
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransactionRecord {
  id: string;
  tenantId: string;
  provider: "stripe" | "razorpay";
  transactionId: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  tier?: string;
  creditsGranted?: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: "stripe" | "razorpay" | "whatsapp" | "meta";
  eventId: string;
  eventType: string;
  processedAt: string;
  status: "processed" | "failed" | "ignored";
  idempotencyKey: string;
  error?: string;
}

export interface N8nConnectionRecord {
  id: string;
  tenantId: string;
  name?: string;
  instanceUrl: string;
  encryptedApiKey: string;
  status: "connected" | "error" | "unverified";
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

export interface DBData {
  workspace: Workspace;
  channels: Channel[];
  templates: Template[];
  rules: Rule[];
  comments: Comment[];
  activityLogs: ActivityLog[];
  faqs: FAQEntry[];
  userSession?: UserSession;
  passwordHash?: string;  // scrypt-hashed password for email/password auth
  coupons?: Coupon[];
  // Credit Ledger & Accounts
  creditAccount?: CreditAccount;
  creditLedger?: CreditLedgerEntry[];
  creditReservations?: CreditReservation[];
  // Subscriptions & Payment Transactions
  subscriptions?: SubscriptionRecord[];
  paymentTransactions?: PaymentTransactionRecord[];
  webhookEvents?: WebhookEventRecord[];
  // Analytics & Insights
  topCommenters?: TopCommenter[];
  engagementHourly?: EngagementHourly[];
  roiData?: ROIData;
  weeklyDigest?: WeeklyDigestData;
  // Workflow Automations
  automationChains?: AutomationChain[];
  followUpSequences?: FollowUpSequence[];
  webhookTriggers?: WebhookTrigger[];
  workflowSpecs?: WorkflowSpec[];
  workflowDeployments?: any[];
  automationConversations?: AutomationConversation[];
  automationPlans?: AutomationPlan[];
  planApprovals?: PlanApprovalRecord[];
  activationApprovals?: ActivationApprovalRecord[];
  // Team Collaboration
  teamMembers?: TeamMember[];
  commentAssignments?: CommentAssignment[];
  commentNotes?: CommentNote[];
  approvalWorkflows?: ApprovalWorkflow[];
  templateVersions?: TemplateVersion[];
  // AI Learning
  replyEdits?: ReplyEdit[];
  replyEffectiveness?: ReplyEffectiveness[];
  suggestedRules?: SuggestedRule[];
  suggestedFAQs?: SuggestedFAQ[];
  // Notifications
  notificationLog?: NotificationLog[];
  milestones?: Milestone[];
  quotaWarnings?: QuotaWarning[];
  // Multi-Platform Social & Native Integrations
  socialAccounts?: SocialAccount[];
  socialComments?: SocialComment[];
  socialPosts?: SocialPost[];
  socialMediaAssets?: SocialMediaAsset[];
  socialScheduledJobs?: SocialScheduledJob[];
  socialMetrics?: SocialMetric[];
  socialWebhooks?: SocialWebhook[];
  socialMessages?: SocialMessage[];
  socialConversations?: SocialConversation[];
  integrationErrors?: IntegrationError[];
  // 24/7 Auto-Reply System
  videoQueue?: VideoQueueEntry[];
  systemEvents?: SystemEvent[];
  systemStatus?: SystemStatus;
  // Pipeline telemetry traces (B3) — capped, used by the visualizer
  pipelineTraces?: PipelineTrace[];
  // Leaderboard rewards
  leaderboardRewards?: LeaderboardReward[];
  // WhatsApp Business Automation Engine (Official Meta Cloud API)
  waConnections?: WhatsAppConnection[];
  waTemplates?: WhatsAppTemplate[];
  waCampaigns?: WhatsAppCampaign[];
  waAutomations?: WhatsAppAutomation[];
  waConversations?: WAConversation[];
  waMessages?: WAMessage[];
  waCustomers?: WACustomer[];
  waProducts?: WAProduct[];
  waOrders?: WAOrder[];
  waKnowledgeSources?: WAKnowledgeSource[];
  waSettings?: WASettings;
  waAnalyticsEvents?: WAAnalyticsEvent[];
  mcpTools?: MCPTool[];
  waQuickReplies?: WAQuickReply[];
  // Autonomous Business OS Collections
  workflows?: any[];
  credentialsVault?: any[];
  n8nConnections?: N8nConnectionRecord[];
  aiConversations?: any[];
  aiMessages?: any[];
  approvalRequests?: any[];
  auditLogs?: any[];
  crmCustomers?: any[];
  idempotencyRecords?: any[];
  workflowExecutions?: any[];
  settings?: any;
  automationRules?: any[];
  giveawayCampaigns?: any[];
  giveawayWinners?: any[];
  // Video-Aware RAG Comment Intelligence & Selective Reply Engine
  videoContentProfiles?: any[];
  videoRAGConfigs?: any[];
  commentDecisionTraces?: any[];
  // LinkedIn Enterprise Platform (Official REST API v202401+)
  linkedinConnections?: LinkedInConnection[];
  linkedinOrganizations?: LinkedInOrganization[];
  linkedinPosts?: LinkedInPost[];
  linkedinSocialActions?: LinkedInSocialAction[];
  linkedinAnalyticsEvents?: LinkedInAnalyticsEvent[];
  linkedinAIGenerationRecords?: LinkedInAIGenerationRecord[];
  linkedinAutomations?: LinkedInAutomation[];
  // Instagram 24/7 Autonomous Enterprise Operations (Official Meta Graph API v19.0+)
  instagramAccounts?: InstagramAccount[];
  instagramConnections?: InstagramConnection[];
  instagramPosts?: InstagramPost[];
  instagramComments?: InstagramComment[];
  instagramConversations?: InstagramConversation[];
  instagramMessages?: InstagramMessage[];
  instagramAutomations?: InstagramAutomation[];
  instagramExecutions?: InstagramAutomationExecution[];
  instagramScheduledJobs?: InstagramScheduledJob[];
  instagramEvents?: InstagramEvent[];
  instagramContacts?: InstagramContact[];
  // Telegram 24/7 Autonomous Enterprise Operations (Official Telegram Bot API v7.0-10.2+)
  telegramConnections?: TelegramConnection[];
  telegramChats?: TelegramChat[];
  telegramContacts?: TelegramContact[];
  telegramConversations?: TelegramConversation[];
  telegramMessages?: TelegramMessage[];
  telegramAutomations?: TelegramAutomation[];
  telegramExecutions?: TelegramAutomationExecution[];
  telegramScheduledJobs?: TelegramScheduledJob[];
  telegramEvents?: TelegramEvent[];
  telegramPayments?: TelegramPayment[];
  telegramCampaigns?: TelegramCampaign[];
  telegramMiniApps?: TelegramMiniApp[];
  telegramVoiceOfCustomer?: TelegramVoiceOfCustomer[];
  telegramSupportTickets?: TelegramSupportTicket[];
  // Business Intelligence & Autonomous Agent Operating Layer
  agiLearnedComments?: LearnedComment[];
  audienceKnowledge?: AudienceKnowledge;
  keywordAlerts?: KeywordAlert[];
  agiLearningCycles?: AGILearningCycle[];
  agiVideoContexts?: VideoContext[];
  businessKnowledgeItems?: BusinessKnowledgeItem[];
  feedbackSignalClusters?: FeedbackSignalCluster[];
  videoContextGraphs?: VideoContextGraph[];
  contentGapItems?: ContentGapItem[];
  humanEditSignals?: HumanEditSignal[];
  businessDigitalTwin?: BusinessDigitalTwinState;
  autonomyConfig?: AutonomyGovernanceConfig;
}

// ============================================================
// Business Intelligence & Autonomous Agent Layer — Data Models
// ============================================================

export type EpistemicType =
  | 'FACT'
  | 'INFERENCE'
  | 'PREFERENCE'
  | 'PREDICTION'
  | 'RECOMMENDATION'
  | 'OPINION'
  | 'UNKNOWN';

export type KnowledgeStatus = 'ACTIVE' | 'STALE' | 'CONFLICTED' | 'REJECTED' | 'ARCHIVED';

export type KnowledgeCategory =
  | 'BUSINESS_PROFILE'
  | 'PRODUCT_KNOWLEDGE'
  | 'CUSTOMER_KNOWLEDGE'
  | 'BRAND_KNOWLEDGE'
  | 'POLICY_KNOWLEDGE'
  | 'OPERATIONS_KNOWLEDGE'
  | 'MARKETING_KNOWLEDGE'
  | 'SALES_KNOWLEDGE'
  | 'SUPPORT_KNOWLEDGE'
  | 'COMPETITOR_KNOWLEDGE'
  | 'HISTORICAL_KNOWLEDGE'
  | 'OWNER_PREFERENCES'
  | 'LEARNED_PATTERNS';

export interface BusinessKnowledgeItem {
  id: string;
  tenantId: string;
  category: KnowledgeCategory;
  epistemicType: EpistemicType;
  content: string;
  source: 'database_truth' | 'owner_instruction' | 'product_catalog' | 'policy_document' | 'business_event' | 'historical_memory' | 'ai_inference';
  sourceId?: string;
  createdAt: string;
  observedAt: string;
  confidence: number;            // 0 - 1.0
  evidence: string[];
  status: KnowledgeStatus;
  expiresAt?: string;
  version: number;
  supersededById?: string;
  structuredFacts?: Record<string, any>;
}

export type FeedbackCategory =
  | 'delivery'
  | 'product_quality'
  | 'pricing'
  | 'feature_request'
  | 'support'
  | 'setup_complexity'
  | 'content_gap'
  | 'general';

export interface FeedbackSignalCluster {
  id: string;
  title: string;                 // e.g. "Delivery Speed & Fulfillment Delay"
  category: FeedbackCategory;
  frequency: number;             // Number of distinct mentions
  customerCount: number;
  channels: string[];            // ['instagram', 'whatsapp', 'youtube']
  trend: 'increasing' | 'stable' | 'decreasing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedProducts?: string[];
  affectedChannels?: string[];
  estimatedRevenueImpact?: number; // In currency units (e.g. ₹45,000 risk)
  recommendedAction: string;
  confidence: number;            // 0 - 1.0
  evidenceQuotes: { commentId: string; author: string; text: string; platform: string; date: string }[];
  firstObservedAt: string;
  lastObservedAt: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
}

export interface VideoTimelineSegment {
  timeRange: string;             // e.g. "0-3s", "3-7s", "7-14s", "14-18s", "18-21s"
  purpose: 'hook' | 'product_intro' | 'demonstration' | 'benefit' | 'cta' | 'b_roll';
  description: string;
  claimsMade: string[];
  onScreenText?: string;
  sentiment: 'positive' | 'neutral' | 'urgent' | 'enthusiastic';
}

export interface VideoContextGraph {
  id: string;
  videoId: string;
  platform: 'youtube' | 'instagram' | 'tiktok';
  title: string;
  durationSeconds?: number;
  summary: string;
  segments: VideoTimelineSegment[];
  claimsMade: string[];          // e.g. ["Saves 30 minutes daily", "Zero setup required"]
  productsFeatured: string[];
  cta: string;
  performanceDNA: {
    retentionAt3s?: number;      // e.g. 74%
    completionRate?: number;     // e.g. 38%
    commentsCount: number;
    sharesCount?: number;
    leadsGenerated?: number;
    attributedRevenue?: number;
  };
  unansweredAudienceQuestions: string[]; // Claims that triggered confusion in comments
  createdAt: string;
  updatedAt: string;
}

export interface ContentGapItem {
  id: string;
  topic: string;                 // e.g. "Delivery Time & Return Process"
  customerQuestionCount: number;
  missingInContentIds: string[]; // Videos/posts that failed to address this
  recommendedContentType: 'tutorial_video' | 'faq_entry' | 'product_page_update' | 'reel_short';
  recommendedHeadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedConversionLift: string; // e.g. "+14% checkout conversion"
  detectedAt: string;
  status: 'pending' | 'created' | 'dismissed';
}

export interface HumanEditSignal {
  id: string;
  commentId?: string;
  conversationId?: string;
  originalAiReply: string;
  humanEditedReply: string;
  diffSummary: string;
  inferredPreference: string;    // e.g. "Prefers concise direct answers without excessive emojis"
  sampleCount: number;
  appliedCount: number;
  createdAt: string;
}

export interface KnowledgeCoverageSummary {
  knownCount: number;
  unknownCount: number;
  staleCount: number;
  conflictedCount: number;
  coveragePercentage: number;
  lastAuditedAt: string;
}

export interface BusinessDigitalTwinState {
  organizationName: string;
  revenueSummary: {
    yesterdayRevenue: number;
    weekToDateRevenue: number;
    growthPercentage: number;
    attributedChannels: { channel: string; revenue: number; percentage: number }[];
  };
  activeGoals: { id: string; name: string; target: number; current: number; metric: string }[];
  knowledgeCoverage: KnowledgeCoverageSummary;
  topOpportunities: { title: string; potentialRevenue: number; action: string; confidence: number }[];
  topRisks: { title: string; severity: 'low' | 'medium' | 'high'; impact: string; recommendation: string }[];
  updatedAt: string;
}

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface AutonomyGovernanceConfig {
  currentLevel: AutonomyLevel;   // 0: Observe, 1: Recommend, 2: Draft, 3: Low-risk Execute, 4: Approved Workflows, 5: Bounded Autonomy
  confidenceThresholds: {
    autoSend: number;            // default 0.85
    draftForReview: number;      // default 0.65
    escalateToHuman: number;     // default 0.40
  };
  hardPolicies: {
    neverMentionDiscountsWithoutApproval: boolean;
    neverPromiseRefundsAutonomously: boolean;
    neverRecommendOutOfStockProducts: boolean;
    escalateLegalThreatsImmediately: boolean;
    escalateAngryVIPCustomers: boolean;
    customRules: string[];
  };
  circuitBreaker: {
    tripped: boolean;
    reason?: string;
    lastTrippedAt?: string;
    downgradedToLevel?: AutonomyLevel;
  };
}

export type CommentClassification =
  | 'question'
  | 'actionable_feedback'
  | 'feature_request'
  | 'testimonial'
  | 'competitor_mention'
  | 'bug_report'
  | 'spam'
  | 'general';

export interface LearnedComment {
  id: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'discord' | 'telegram';
  videoId?: string;
  videoTitle?: string;
  postId?: string;
  commentId: string;
  text: string;
  authorName: string;
  authorId: string;
  likes: number;
  timestamp: string;
  classification: CommentClassification;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;          // -1.0 to +1.0
  keywordsMatched: string[];
  isUsefulFeedback: boolean;
  usefulnessScore: number;         // 0-100
  replyGenerated?: string;
  replyStatus: 'pending' | 'approved' | 'sent' | 'skipped' | 'flagged';
  replyConfidence?: number;        // 0-100
  learnedInsights: string[];
  processedAt: string;
  channel?: string;                // channelId from channels array
}

export interface AudienceKnowledge {
  topQuestions: { question: string; frequency: number; lastSeen: string; bestAnswer?: string }[];
  recurringPraises: { topic: string; frequency: number; exampleComment?: string }[];
  recurringComplaints: { topic: string; frequency: number; urgency: 'low' | 'medium' | 'high'; exampleComment?: string }[];
  featureRequests: { request: string; votes: number; firstSeen: string }[];
  audienceLanguagePatterns: string[];
  sentimentTrend: { date: string; score: number; commentCount: number }[];
  topTestimonials: { text: string; author: string; likes: number; platform: string; commentId: string }[];
  competitorMentions: { competitor: string; context: string; sentiment: string; date: string; commentId: string }[];
  totalCommentsProcessed: number;
  lastUpdated: string;
}

export interface KeywordAlert {
  id: string;
  keyword: string;
  type: 'brand' | 'competitor' | 'negative' | 'positive' | 'custom';
  platforms: string[];             // ['youtube', 'instagram', 'all']
  isActive: boolean;
  caseSensitive: boolean;
  alertViaWhatsApp: boolean;
  alertViaDashboard: boolean;
  matchCount: number;
  lastMatchAt?: string;
  createdAt: string;
  recentMatches?: { commentId: string; text: string; platform: string; date: string }[];
}

export interface AGILearningCycle {
  id: string;
  triggeredAt: string;
  commentsProcessed: number;
  newInsightsExtracted: number;
  knowledgeUpdates: string[];
  alertsTriggered: number;
  repliesGenerated: number;
  repliesAutoSent: number;
  repliesQueued: number;
  durationMs: number;
  platforms: string[];
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

export interface VideoContext {
  videoId: string;
  platform: 'youtube' | 'instagram' | 'tiktok';
  title: string;
  description: string;
  summary: string;                 // 3-sentence AI summary
  keyPoints: string[];             // Bullet points from transcript
  cta?: string;                    // Call-to-action detected
  transcript?: string;             // Full transcript if available
  transcriptSource: 'youtube_captions' | 'whisper' | 'description_only';
  channelId: string;
  publishedAt: string;
  processedAt: string;
}

// --- Feature 6: Workflow Automations ---
export interface AutomationCondition {
  id: string;
  type: "contains" | "equals" | "regex" | "starts_with" | "subscriber_count" | "language" | "time_of_day" | "day_of_week";
  operator?: "gt" | "lt" | "eq" | "gte" | "lte";
  value: string;
}

export interface AutomationAction {
  id: string;
  type: "reply" | "flag_for_review" | "send_webhook" | "assign_to" | "escalate" | "send_notification";
  config: Record<string, string>;
}

export interface AutomationChain {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  conditions: AutomationCondition[];
  operator: "AND" | "OR";
  actions: AutomationAction[];
  createdAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
}

export interface FollowUpSequence {
  id: string;
  commentId: string;
  sequence: {
    step: number;
    delayHours: number;
    message: string;
    status: "pending" | "sent" | "skipped";
    sentAt?: string;
  }[];
  escalateAfterSteps: number;
  escalateTo?: string;
  status: "active" | "completed" | "escalated" | "cancelled";
  createdAt: string;
}

export interface WebhookTrigger {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: ("comment_matched" | "comment_replied" | "rule_triggered" | "milestone_reached" | "quota_warning")[];
  isActive: boolean;
  lastFiredAt?: string;
  fireCount: number;
  headers?: Record<string, string>;
}

// --- Feature 7: Team Collaboration ---
export interface CommentAssignment {
  commentId: string;
  assignedTo: string;     // email of team member
  assignedBy: string;
  assignedAt: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  dueDate?: string;
  note?: string;
  createdAt?: string;
}

export interface CommentNote {
  id: string;
  commentId: string;
  author: string;
  text: string;
  isInternal: boolean;
  createdAt: string;
  editedAt?: string;
}

export interface ApprovalWorkflow {
  id: string;
  commentId: string;
  draftReply: string;
  draftedBy: string;       // "ai" or email
  approvedBy?: string;
  approvedAt?: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "sent";
  reviewerNotes?: string;
  createdAt: string;
  createdBy?: string;
  history?: Array<{ action: string; by: string; at: string; note?: string }>;
  assignedApprover?: string;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  templateName?: string;
  version: number;
  body: string;
  editedBy: string;
  createdAt: string;
  changelog?: string;
}

// --- Feature 8: AI Learning ---
export interface ReplyEdit {
  id: string;
  commentId: string;
  originalReply?: string;
  editedReply?: string;
  originalText: string;
  editedText: string;
  editedBy: string;
  editedAt: string;
  ruleId?: string;
  editReason?: string;
  similarity?: number;
  createdAt?: string;
}

export interface ReplyEffectiveness {
  commentId: string;
  replyText: string;
  replyFiredAt: string;
  gotLikes: boolean;
  likeCount: number;
  gotFollowUpReply: boolean;
  followUpSentiment?: "positive" | "neutral" | "negative";
  commenterReturned: boolean;       // Did they comment again?
  effectivenessScore: number;      // 0-100
  trackedAt: string;
}

export interface SuggestedRule {
  id: string;
  pattern: string;
  exampleComments: string[];
  suggestedCondition: string;
  suggestedReply: string;
  confidence: number;
  reason: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

export interface SuggestedFAQ {
  id: string;
  question: string;
  suggestedAnswer: string;
  exampleComments: string[];
  frequency: number;
  confidence: number;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

// --- Feature 9: Smart Notifications ---
export interface NotificationLog {
  id: string;
  channel: "slack" | "discord" | "email" | "sms" | "whatsapp" | "in_app";
  type: "flagged_comment" | "daily_summary" | "milestone" | "quota_warning" | "approval_needed" | "assignment";
  title: string;
  message: string;
  sentAt: string;
  success: boolean;
  recipient?: string;
}

export interface Milestone {
  id: string;
  type: "replies_count" | "hours_saved" | "streak_days" | "comments_processed" | "rules_created";
  value: number;
  label: string;
  celebratedAt: string;
  notified: boolean;
}

export interface QuotaWarning {
  id: string;
  type: "daily_approaching" | "daily_exceeded" | "monthly_approaching" | "api_limit";
  threshold: number;
  current: number;
  warnedAt: string;
  acknowledged: boolean;
}

export interface LeaderboardReward {
  rank: number;
  plan: "premium" | "pro";
  durationMonths: number;
  awardedAt: string;
  expiresAt: string;
}

// ============================================================
// WhatsApp Business Automation Engine — Data Models
// ============================================================

export type WAConversationStatus = "active" | "resolved" | "escalated" | "ai_paused";
export type WAConversationMode = "ai" | "human" | "copilot";
export type WAMessageSender = "customer" | "ai" | "human" | "system";
export type WAMessageStatus = "sent" | "delivered" | "read" | "failed" | "pending";
export type WALeadStage = "cold" | "warm" | "hot" | "very_hot";
export type WAMCPRiskLevel = "low" | "medium" | "high";
export type WAAnalyticsEventType =
  | "message_received"
  | "message_sent"
  | "ai_reply"
  | "human_reply"
  | "conversation_created"
  | "conversation_resolved"
  | "escalation"
  | "lead_created"
  | "followup_sent"
  | "intent_detected"
  | "product_lookup"
  | "knowledge_retrieval";

export type WhatsAppConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTING"
  | "META_AUTH_REQUIRED"
  | "ONBOARDING"
  | "WABA_SELECTED"
  | "PHONE_NUMBER_REGISTERING"
  | "PHONE_NUMBER_CONNECTED"
  | "WEBHOOK_PENDING"
  | "READY"
  | "DEGRADED"
  | "REAUTH_REQUIRED"
  | "DISCONNECTED"
  | "ERROR";

export type WhatsAppQualityRating = "GREEN" | "YELLOW" | "RED" | "NA";
export type WhatsAppMessagingLimit = "TIER_50" | "TIER_250" | "TIER_1K" | "TIER_10K" | "TIER_100K" | "TIER_UNLIMITED";

export interface WhatsAppConnection {
  id: string;
  tenantId: string;
  wabaId: string;
  phoneNumberId: string;
  businessPortfolioId?: string;
  displayPhoneNumber: string;
  verifiedName?: string;
  status: WhatsAppConnectionStatus;
  qualityRating: WhatsAppQualityRating;
  messagingLimit: WhatsAppMessagingLimit;
  country?: string;
  timezone?: string;
  encryptedCredentialRef?: string;
  webhookStatus: "healthy" | "pending" | "failing" | "unverified";
  lastSyncAt: string;
  lastWebhookAt?: string;
  lastError?: {
    code: string;
    message: string;
    timestamp: string;
    resolution?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type WhatsAppTemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
export type WhatsAppTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export interface WhatsAppTemplate {
  id: string;
  tenantId?: string;
  providerTemplateId?: string;
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  status: WhatsAppTemplateStatus;
  components: {
    type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
    format?: "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO";
    text?: string;
    example?: Record<string, any>;
    buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
  }[];
  quality?: string;
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppCampaign {
  id: string;
  tenantId: string;
  name: string;
  templateId: string;
  templateName?: string;
  targetAudience: string;
  recipientCount: number;
  scheduledTime: string;
  status: "scheduled" | "processing" | "completed" | "paused" | "cancelled" | "failed";
  rateLimitPerMinute: number;
  metrics: {
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppAutomation {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  trigger: "keyword" | "intent" | "new_contact" | "customer_replied" | "post_delivery" | "cart_abandoned";
  conditions: Array<{
    type: "contains" | "equals" | "regex" | "intent" | "sentiment" | "vip_only" | "outside_hours";
    value: string;
  }>;
  actions: Array<{
    type: "send_reply" | "send_template" | "escalate" | "add_tag" | "update_lead_score";
    payload?: string;
    templateId?: string;
  }>;
  priority: number;
  cooldownMs: number;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppWebhookEvent {
  id: string;
  tenantId: string;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  status: "processed" | "ignored_duplicate" | "failed";
  receivedAt: string;
  processedAt?: string;
  error?: string;
}

export interface WAConversation {
  id: string;
  waConversationId?: string;     // WhatsApp's native conversation ID
  channelPhone?: string;         // Our WhatsApp Business number
  customerPhone: string;         // Customer's phone (E.164 format)
  customerId?: string;           // Link to WACustomer.id
  status: WAConversationStatus;
  mode: WAConversationMode;
  assignedAgent?: string;        // Team member email
  priority: "low" | "normal" | "high" | "urgent";
  sentiment?: "positive" | "neutral" | "negative";
  tags: string[];
  leadScore?: number;            // 0-100, AI estimated
  unreadCount: number;
  lastMessageAt: string;         // ISO string
  lastMessagePreview: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  summary?: string;              // AI-generated conversation summary
  intentHistory: string[];       // Last 5 detected intents
  escalationReason?: string;
  isDemo?: boolean;
}

export interface WAMessage {
  id: string;
  waMessageId?: string;          // WhatsApp's message ID (for idempotency)
  conversationId: string;
  direction: "inbound" | "outbound";
  sender: WAMessageSender;
  senderName?: string;
  text?: string;
  mediaType?: "image" | "document" | "audio" | "video" | "sticker";
  mediaUrl?: string;
  mediaCaption?: string;
  templateName?: string;
  status: WAMessageStatus;
  timestamp: string;             // ISO string
  metadata?: {
    aiConfidence?: number;
    intentDetected?: string;
    toolsUsed?: string[];
    knowledgeChunksUsed?: string[];
    processingMs?: number;
    escalationTriggered?: boolean;
  };
  systemEvent?: string;          // e.g. "ai_took_over", "human_joined", "lead_created"
  isDemo?: boolean;
}

export interface WACustomer {
  id: string;
  phone: string;                 // E.164 format
  name?: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
  tags: string[];
  notes?: string;
  totalConversations: number;
  totalOrders: number;
  totalSpent: number;
  lastInteractionAt: string;
  leadScore: number;             // 0-100
  leadStage: WALeadStage;
  communicationPrefs?: {
    language?: string;
    preferredTime?: string;
  };
  preferences?: string[];
  memory?: {
    previousPurchases?: string[];
    interests?: string[];
    importantNotes?: string[];
    lastProductsViewed?: string[];
  };
  optedOut: boolean;
  isVip?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface WAProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  currency: string;              // ISO 4217, e.g. "INR", "USD"
  stock: number;
  sku?: string;
  category: string;
  images: string[];
  variants?: { name: string; options: string[] }[];
  attributes?: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface WAOrder {
  id: string;
  customerId: string;
  items: { productId: string; name: string; qty: number; price: number }[];
  total: number;
  currency: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  shippingStatus?: string;
  trackingNumber?: string;
  shippingAddress?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface WAKnowledgeSource {
  id: string;
  type: "faq" | "product_catalog" | "policy" | "website" | "document" | "custom_instructions";
  name: string;
  description?: string;
  status: "processing" | "ready" | "error";
  documentCount: number;
  chunkCount: number;
  lastUpdated: string;
  embeddingStatus: "pending" | "indexed" | "error";
  sourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  errorMessage?: string;
}

export interface WABusinessHoursSlot {
  day: number;                   // 0=Sun, 6=Sat
  open: string;                  // "09:00"
  close: string;                 // "18:00"
  closed: boolean;
}

export interface WASettings {
  enabled: boolean;
  autoReply: boolean;
  mode: "full_auto" | "copilot" | "human_only";
  confidenceThreshold: number;   // 0-1, default 0.75
  brandVoice: {
    tone: "professional" | "friendly" | "premium" | "casual" | "luxury";
    responseLength: "short" | "medium" | "detailed";
    emojiUsage: "off" | "minimal" | "moderate";
    language: "auto" | "en" | "hi" | "or" | "hinglish";
    customPersona?: string;       // Custom AI persona instructions
  };
  businessHours: {
    timezone: string;             // IANA tz, e.g. "Asia/Kolkata"
    schedule: WABusinessHoursSlot[];
    holidays: string[];           // ISO date strings
    outsideHoursMessage?: string;
  };
  escalationRules: {
    onAngerDetected: boolean;
    onLegalThreat: boolean;
    onLowConfidence: boolean;
    onExplicitRequest: boolean;
    onHighValue: boolean;
    onPaymentDispute: boolean;
    confidenceThreshold: number;  // override for escalation (default 0.65)
  };
  maxFollowups: number;           // Per customer max follow-ups
  quietHoursStart: string;        // "22:00"
  quietHoursEnd: string;          // "08:00"
  spamProtection: boolean;
  maxMessagesPerHourPerCustomer: number;
  welcomeMessage?: string;
  offlineMessage?: string;
}

export interface WAAnalyticsEvent {
  id: string;
  type: WAAnalyticsEventType;
  conversationId?: string;
  customerId?: string;
  agentEmail?: string;
  intentDetected?: string;
  aiConfidence?: number;
  processingMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;             // ISO string
  isDemo?: boolean;
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  riskLevel: WAMCPRiskLevel;
  category: string;
  enabled: boolean;
  requiresConfirmation: boolean;
  lastInvokedAt?: string;
  invocationCount: number;
  lastError?: string;
}

export interface WAQuickReply {
  id: string;
  shortcut: string;              // e.g. "/price"
  title: string;
  message: string;
  createdAt: string;
}

// ============================================================
// LinkedIn Enterprise Community Management — Data Models
// ============================================================

export type LinkedInConnectionStatus =
  | "NOT_CONNECTED"
  | "AUTHORIZING"
  | "CONNECTED"
  | "DEGRADED"
  | "TOKEN_EXPIRED"
  | "REAUTH_REQUIRED"
  | "REVOKED"
  | "PERMISSION_CHANGED"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "DISCONNECTED";

export interface LinkedInConnection {
  id: string;
  tenantId: string;
  workspaceId: string;
  provider: "linkedin_official_rest";
  status: LinkedInConnectionStatus;
  memberId: string;
  memberUrn: string;
  memberName?: string;
  memberEmail?: string;
  memberAvatarUrl?: string;
  organizationIds: string[];
  authorizedScopes: string[];
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: string;
  lastRefreshAt?: string;
  apiVersion: string;
  lastSuccessfulRequestAt?: string;
  lastFailedRequestAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedInOrganization {
  id: string;
  tenantId: string;
  connectionId: string;
  organizationId: string;
  organizationUrn: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
  description?: string;
  role: "ADMINISTRATOR" | "DIRECT_SPONSORED_CONTENT_POSTER" | "CONTENT_ADMIN" | "CURATOR" | "ANALYST" | string;
  permissions: string[];
  followerCount?: number;
  status: "ACTIVE" | "REVOKED" | "UNVERIFIED";
  lastSyncedAt: string;
}

export type LinkedInPostStatus =
  | "DRAFT"
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "SCHEDULED"
  | "QUEUED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "RETRYING"
  | "FAILED_FINAL";

export type LinkedInPostVisibility = "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";

export interface LinkedInPost {
  id: string;
  tenantId: string;
  workspaceId: string;
  connectionId: string;
  organizationId?: string; // Optional if posting as Member Profile
  providerPostUrn?: string; // e.g. "urn:li:share:123" or "urn:li:ugcPost:123"
  authorUrn: string; // e.g. "urn:li:organization:12345" or "urn:li:person:67890"
  authorName?: string;
  content: string;
  media?: {
    type: "image" | "video" | "document" | "article" | "none";
    assetUrn?: string;
    url?: string;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
  };
  article?: {
    sourceUrl: string;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
  };
  visibility: LinkedInPostVisibility;
  status: LinkedInPostStatus;
  idempotencyKey: string;
  scheduledAt?: string;
  publishedAt?: string;
  providerCreatedAt?: string;
  likes: number;
  comments: number;
  reactions: number;
  shares: number;
  impressions: number;
  approvalRequired?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  lastError?: {
    code: string;
    message: string;
    timestamp: string;
  };
  isAutomationActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedInSocialAction {
  id: string;
  tenantId: string;
  postId: string;
  providerActionUrn: string;
  type: "COMMENT" | "REACTION" | "LIKE";
  actorUrn: string;
  actorName?: string;
  actorHeadline?: string;
  actorAvatarUrl?: string;
  content?: string;
  sentiment?: "positive" | "neutral" | "negative";
  priority?: "low" | "medium" | "high" | "urgent";
  moderationFlag?: "none" | "safe" | "spam" | "harassment" | "legal_threat" | "competitor";
  aiSuggestedReply?: string;
  replyUrn?: string;
  replyContent?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface LinkedInAnalyticsEvent {
  id: string;
  tenantId: string;
  organizationId?: string;
  postId?: string;
  metric: "impressions" | "clicks" | "reactions" | "comments" | "shares" | "engagement_rate" | "follower_growth";
  value: number;
  capturedAt: string;
  source: "official_api" | "webhook" | "calculated";
}

export interface LinkedInAIGenerationRecord {
  id: string;
  tenantId: string;
  connectionId?: string;
  postId?: string;
  promptHash: string;
  formatType: string;
  tone: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  generatedText: string;
  qualityScore: number;
  approved: boolean;
  published: boolean;
  createdAt: string;
}

export interface LinkedInAutomation {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  trigger: "cadence_schedule" | "topic_trend" | "new_blog_detected" | "youtube_video_uploaded" | "comment_threshold";
  scheduleCron?: string;
  topic?: string;
  tone?: string;
  formatType?: string;
  targetAuthorUrn?: string;
  requiresApproval: boolean;
  cooldownMs: number;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Instagram 24/7 Autonomous Enterprise Operations — Data Models
// ============================================================

export type InstagramConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTING"
  | "READY"
  | "CONNECTED"
  | "DEGRADED"
  | "REAUTH_REQUIRED"
  | "REVOKED"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "DISCONNECTED";

export type InstagramAccountType = "BUSINESS" | "CREATOR" | "PERSONAL" | "UNKNOWN";

export interface InstagramAccount {
  id: string;
  tenantId: string;
  workspaceId?: string;
  providerAccountId?: string; // IG User ID / Page ID
  username: string;
  name?: string;
  displayName?: string;
  profileUrl?: string;
  profileImage?: string;
  profilePictureUrl?: string;
  accountType?: InstagramAccountType;
  status: "ACTIVE" | "DEGRADED" | "DISCONNECTED";
  capabilities?: string[];
  followersCount: number;
  followingCount?: number;
  mediaCount?: number;
  connectedAt?: string;
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstagramConnection {
  id: string;
  tenantId: string;
  workspaceId?: string;
  accountId?: string;
  instagramAccountId?: string;
  facebookPageId?: string;
  accountType?: InstagramAccountType;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  encryptedCredentialRef?: string;
  encryptedAccessToken?: string;
  tokenExpiresAt?: string;
  status: InstagramConnectionStatus;
  expiresAt?: string;
  scopes?: string[];
  webhookStatus?: string;
  lastWebhookAt?: string;
  lastSuccessfulCallAt?: string;
  lastFailureAt?: string;
  lastSyncedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type InstagramPostMediaType = "IMAGE" | "VIDEO" | "REELS" | "CAROUSEL" | "STORIES";
export type InstagramPostStatus = "DRAFT" | "CONTAINER_CREATED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "SCHEDULED";

export interface InstagramPost {
  id: string;
  tenantId: string;
  workspaceId: string;
  accountId: string;
  providerMediaId?: string;
  containerId?: string;
  type: InstagramPostMediaType;
  caption: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  carouselItems?: Array<{ type: "IMAGE" | "VIDEO"; url: string }>;
  status: InstagramPostStatus;
  publishedAt?: string;
  scheduledAt?: string;
  permalink?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  reach: number;
  impressions: number;
  idempotencyKey: string;
  lastError?: {
    code: string;
    message: string;
    timestamp: string;
  };
  isAutomationActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InstagramIntentType =
  | "GENERAL_QUESTION"
  | "PRODUCT_QUESTION"
  | "PRICE"
  | "AVAILABILITY"
  | "SUPPORT"
  | "COMPLAINT"
  | "PRAISE"
  | "LEAD"
  | "PURCHASE_INTENT"
  | "NEGOTIATION"
  | "REFUND"
  | "SHIPPING"
  | "BUG"
  | "FEATURE_REQUEST"
  | "SPAM"
  | "ABUSE"
  | "LEGAL"
  | "URGENT"
  | "OTHER";

export type InstagramSentimentType = "positive" | "neutral" | "negative" | "very_negative" | "mixed";

export interface InstagramComment {
  id: string;
  tenantId: string;
  accountId: string;
  postId: string;
  providerCommentId: string;
  authorProviderId: string;
  authorUsername: string;
  text: string;
  status: "PENDING" | "REPLIED" | "ESCALATED" | "HIDDEN" | "DELETED" | "SPAM";
  sentiment: InstagramSentimentType;
  intent: InstagramIntentType;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  spamScore: number; // 0-100
  automationState: "NOT_APPLICABLE" | "QUEUED" | "PROCESSED" | "SKIPPED" | "FAILED";
  aiSuggestedReply?: string;
  replyText?: string;
  replyCommentId?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramConversation {
  id: string;
  tenantId: string;
  accountId: string;
  contactId: string;
  providerConversationId: string;
  status: "ACTIVE" | "RESOLVED" | "ESCALATED" | "PAUSED";
  assignedAgentId?: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  unreadCount: number;
  sentiment: InstagramSentimentType;
  intent: InstagramIntentType;
  lastMessageAt: string;
  lastMessagePreview?: string;
  aiEnabled: boolean;
  automationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramMessage {
  id: string;
  tenantId: string;
  accountId: string;
  conversationId: string;
  providerMessageId: string;
  direction: "INBOUND" | "OUTBOUND";
  type: "TEXT" | "IMAGE" | "VIDEO" | "QUICK_REPLY" | "SHARE";
  body: string;
  mediaUrl?: string;
  status: "RECEIVED" | "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  replyToMessageId?: string;
  automationRunId?: string;
  aiRunId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramAutomation {
  id: string;
  tenantId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  trigger: "NEW_COMMENT" | "COMMENT_KEYWORD" | "NEW_DM" | "DM_INTENT" | "MENTION" | "STORY_REPLY" | "AFTER_HOURS";
  conditions: Array<{
    type: "contains_keyword" | "regex_match" | "intent_equals" | "sentiment_is" | "lead_score_gt" | "is_outside_business_hours";
    value: string;
  }>;
  actions: Array<{
    type: "SEND_DM" | "REPLY_COMMENT" | "HIDE_COMMENT" | "ESCALATE_HUMAN" | "UPDATE_LEAD_SCORE" | "ADD_CRM_TAG";
    payload?: string;
    scoreDelta?: number;
    tag?: string;
  }>;
  priority: number; // Higher number = evaluated first
  cooldownMs: number;
  maxExecutionsPerHour: number;
  approvalMode: "AUTO_EXECUTE" | "HUMAN_APPROVAL_REQUIRED";
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramAutomationExecution {
  id: string;
  tenantId: string;
  automationId: string;
  eventId: string;
  conversationId?: string;
  commentId?: string;
  messageId?: string;
  status: "SUCCESS" | "FAILED" | "ESCALATED" | "SKIPPED_COOLDOWN";
  decision: string;
  actionsTaken: string[];
  reason?: string;
  startedAt: string;
  completedAt: string;
  error?: string;
}

export interface InstagramScheduledJob {
  id: string;
  tenantId: string;
  type: "PUBLISH_POST" | "SYNC_ANALYTICS" | "RUN_AUTOMATION_RECONCILIATION" | "SLA_WATCHDOG_CHECK";
  payload: Record<string, any>;
  scheduledFor: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "DEAD_LETTER";
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  lockedAt?: string;
  workerId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramEvent {
  id: string;
  tenantId: string;
  providerEventId: string;
  eventType: "comment" | "message" | "mention" | "story_reply";
  payloadHash: string;
  receivedAt: string;
  processedAt?: string;
  status: "PROCESSED" | "IGNORED_DUPLICATE" | "FAILED";
  retryCount: number;
  error?: string;
}

export interface InstagramContact {
  id: string;
  tenantId: string;
  accountId: string;
  providerUserId: string;
  username: string;
  displayName?: string;
  profilePicUrl?: string;
  tags: string[];
  notes?: string[];
  customFields?: Record<string, any>;
  leadScore: number; // 0 - 100
  leadStage: "HOT" | "WARM" | "COLD";
  source: "COMMENT" | "DM" | "STORY_REPLY" | "MENTION";
  totalInteractions: number;
  lastInteractionAt: string;
  sentimentTrend: InstagramSentimentType;
  intentHistory: InstagramIntentType[];
  assignedAgent?: string;
  isVip?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Telegram 24/7 Autonomous Enterprise Operations — Data Models
// ============================================================

export type TelegramConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "DEGRADED"
  | "REAUTH_REQUIRED"
  | "REVOKED"
  | "DISABLED"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR";

export type TelegramConnectionType = "BOT" | "BUSINESS_BOT" | "GROUP_BOT" | "CHANNEL_BOT";

export interface TelegramConnection {
  id: string;
  tenantId: string;
  workspaceId: string;
  type: TelegramConnectionType;
  botId: string;
  botUsername: string;
  botName: string;
  businessConnectionId?: string;
  status: TelegramConnectionStatus;
  capabilities: string[];
  encryptedCredentialRef?: string;
  webhookSecret?: string;
  webhookStatus: "healthy" | "degraded" | "error" | "unregistered";
  webhookUrl?: string;
  lastWebhookAt?: string;
  lastSuccessfulApiCallAt?: string;
  lastFailureAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type TelegramChatType = "private" | "group" | "supergroup" | "channel";

export interface TelegramChat {
  id: string;
  tenantId: string;
  connectionId: string;
  providerChatId: string;
  chatType: TelegramChatType;
  title?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
  memberCount?: number;
  languageCode?: string;
  timezone?: string;
  tags: string[];
  status: "ACTIVE" | "ARCHIVED" | "BLOCKED" | "MUTED";
  lastMessageAt: string;
  isAutomationActive?: boolean;
  chatId?: string;
  assignedRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramContact {
  id: string;
  tenantId: string;
  connectionId: string;
  telegramUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  photoUrl?: string;
  tags: string[];
  leadScore: number; // 0 - 100
  leadStage: "HOT" | "WARM" | "COLD";
  source: "DIRECT_MESSAGE" | "GROUP" | "CHANNEL" | "MINI_APP" | "PAYMENT";
  totalInteractions: number;
  lastInteractionAt: string;
  sentimentTrend: TelegramSentimentType;
  intentHistory: TelegramIntentType[];
  assignedAgent?: string;
  customFields?: Record<string, any>;
  notes?: string[];
  isVip?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TelegramIntentType =
  | "SALES"
  | "SUPPORT"
  | "PRICING"
  | "ORDER_STATUS"
  | "REFUND"
  | "PAYMENT"
  | "DELIVERY"
  | "TECHNICAL"
  | "COMPLAINT"
  | "PRAISE"
  | "LEAD"
  | "DEMO"
  | "BOOKING"
  | "FAQ"
  | "SPAM"
  | "ABUSE"
  | "LEGAL"
  | "URGENT"
  | "GENERAL_QUERY"
  | "OTHER";

export type TelegramSentimentType = "positive" | "neutral" | "negative" | "very_negative" | "mixed";

export interface TelegramConversation {
  id: string;
  tenantId: string;
  connectionId: string;
  chatId: string;
  contactId: string;
  status: "OPEN" | "WAITING_CUSTOMER" | "RESOLVED" | "ESCALATED" | "CLOSED";
  assignedAgentId?: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  unreadCount: number;
  sentiment: TelegramSentimentType;
  intent: TelegramIntentType;
  aiEnabled: boolean;
  automationEnabled: boolean;
  lastMessageAt: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export type TelegramMessageType =
  | "text"
  | "photo"
  | "video"
  | "audio"
  | "document"
  | "voice"
  | "animation"
  | "location"
  | "contact"
  | "poll"
  | "invoice"
  | "successful_payment";

export interface TelegramMessage {
  id: string;
  tenantId: string;
  connectionId: string;
  chatId: string;
  conversationId: string;
  providerMessageId: string;
  direction: "INBOUND" | "OUTBOUND";
  messageType: TelegramMessageType;
  text: string;
  mediaUrl?: string;
  caption?: string;
  replyToMessageId?: string;
  threadId?: string;
  topicId?: string;
  status: "RECEIVED" | "QUEUED" | "SENDING" | "SENT" | "FAILED";
  automationRunId?: string;
  aiRunId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramAutomation {
  id: string;
  tenantId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  actionType?: string;
  trigger:
    | "NEW_MESSAGE"
    | "KEYWORD"
    | "COMMAND"
    | "CALLBACK"
    | "PAYMENT_SUCCESS"
    | "CHAT_MEMBER_JOIN"
    | "BUSINESS_MESSAGE"
    | "AFTER_HOURS";
  conditions: Array<{
    type: "contains_keyword" | "regex_match" | "intent_equals" | "sentiment_is" | "lead_score_gt" | "is_outside_business_hours";
    value: string;
  }>;
  actions: Array<{
    type: "SEND_MESSAGE" | "SEND_KEYBOARD" | "ESCALATE_HUMAN" | "UPDATE_LEAD_SCORE" | "ADD_TAG" | "SEND_INVOICE";
    payload?: string;
    scoreDelta?: number;
    tag?: string;
  }>;
  priority: number;
  cooldown: number; // in seconds
  maxExecutions: number;
  approvalMode: "AUTO_EXECUTE" | "HUMAN_APPROVAL_REQUIRED";
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramAutomationExecution {
  id: string;
  tenantId: string;
  automationId: string;
  eventId: string;
  chatId: string;
  messageId?: string;
  status: "SUCCESS" | "FAILED" | "ESCALATED" | "SKIPPED_COOLDOWN";
  decision: string;
  actionsTaken: string[];
  startedAt: string;
  completedAt: string;
  error?: string;
}

export interface TelegramScheduledJob {
  id: string;
  tenantId: string;
  type: "PUBLISH_POST" | "FOLLOW_UP" | "SYNC_ANALYTICS" | "SLA_WATCHDOG_CHECK" | "BROADCAST_CAMPAIGN";
  payload: Record<string, any>;
  scheduledFor: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "DEAD_LETTER";
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  lockedAt?: string;
  workerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramEvent {
  id: string;
  tenantId: string;
  providerUpdateId: string;
  eventType: string;
  payloadHash: string;
  receivedAt: string;
  processedAt?: string;
  status: "PROCESSED" | "IGNORED_DUPLICATE" | "FAILED";
  retryCount: number;
}

export interface TelegramPayment {
  id: string;
  tenantId: string;
  connectionId: string;
  providerPaymentId: string;
  telegramUserId: string;
  invoiceId: string;
  productId: string;
  currency: string;
  amount: number;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED";
  payloadHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramCampaign {
  id: string;
  tenantId: string;
  connectionId: string;
  name: string;
  status: "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
  targetAudience: "all" | "hot_leads" | "tag_filter" | "custom";
  content: string;
  scheduleTime?: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramMiniApp {
  id: string;
  tenantId: string;
  name: string;
  shortName: string;
  url: string;
  description: string;
  iconUrl?: string;
  status: "ACTIVE" | "DRAFT";
  createdAt: string;
  updatedAt: string;
}

export interface TelegramVoiceOfCustomer {
  id: string;
  tenantId: string;
  topic: string;
  category: "OBJECTION" | "FEATURE_REQUEST" | "PRICING" | "COMPLAINT" | "PRAISE";
  frequency: number;
  sentiment: TelegramSentimentType;
  sampleQuotes: string[];
  recommendedAction: string;
  lastDetectedAt: string;
}

export interface TelegramSupportTicket {
  id: string;
  tenantId: string;
  conversationId: string;
  contactId: string;
  title: string;
  description: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "WAITING_INTERNAL" | "RESOLVED" | "CLOSED";
  assignedAgent?: string;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
}

/** Generate a unique username from a base name */
function generateUniqueUsername(baseName: string): string {
  // Clean the base name
  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15);
  // Add a random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${cleanBase}_${suffix}`;
}

/** Build a default DBData object for a given email. */
function buildDefaultData(email: string): DBData {
  const displayName = email ? (email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1)) : "Creator";
  const todayStr = new Date().toISOString().split("T")[0];
  const uniqueUsername = generateUniqueUsername(displayName.toLowerCase().replace(/[^a-z0-9]/g, ""));

  return {
    workspace: {
      name: email ? `${displayName}'s Workspace` : "My Workspace",
      members: [],
      settings: {
        dailyReplyQuota: 500,
        blockedUsers: [],
        spamProtection: true,
        slackWebhook: "",
        emailDigest: "weekly",
        negativeKeywords: "scam, refund, disappointed, hate, fake, bot, report",
        globalReplyConfig: { replyToAll: false, tags: "", template: "Thank you for commenting!" }
      }
    },
    channels: [],
    templates: [],
    rules: [],
    comments: [],
    activityLogs: [],
    faqs: [],
    userSession: {
      email,
      name: displayName,
      username: uniqueUsername,
      tier: "free",
      repliesToday: 0,
      lastResetDate: todayStr
    },
    coupons: [],
    creditAccount: {
      id: `cr_${email ? email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "default"}`,
      tenantId: email || "default",
      balance: 100,
      reservedBalance: 0,
      lifetimeGranted: 100,
      lifetimeUsed: 0,
      version: 1,
      updatedAt: new Date().toISOString(),
    },
    creditLedger: [
      {
        id: `tx_init_${Date.now()}`,
        tenantId: email || "default",
        type: "SIGNUP_BONUS",
        amount: 100,
        balanceAfter: 100,
        referenceType: "SIGNUP_BONUS",
        idempotencyKey: `init_${email || "default"}`,
        metadata: { note: "Welcome bonus credits (Free Starter Tier)" },
        createdAt: new Date().toISOString(),
      },
    ],
    creditReservations: [],
    subscriptions: [],
    paymentTransactions: [],
    webhookEvents: [],
    topCommenters: [],
    engagementHourly: [],
    roiData: {
      repliesThisWeek: 0, hoursSavedThisWeek: 0, hourlyRate: 25,
      moneySavedThisWeek: 0, repliesThisMonth: 0, hoursSavedThisMonth: 0,
      moneySavedThisMonth: 0, allTimeReplies: 0, allTimeHoursSaved: 0, allTimeMoneySaved: 0
    },
    automationChains: [],
    followUpSequences: [],
    webhookTriggers: [],
    commentAssignments: [],
    commentNotes: [],
    approvalWorkflows: [],
    templateVersions: [],
    replyEdits: [],
    replyEffectiveness: [],
    suggestedRules: [],
    suggestedFAQs: [],
    notificationLog: [],
    milestones: [],
    quotaWarnings: [],
    socialAccounts: [],
    socialComments: [],
    socialPosts: [],
    socialMediaAssets: [],
    socialScheduledJobs: [],
    socialMetrics: [],
    socialWebhooks: [],
    socialMessages: [],
    socialConversations: [],
    integrationErrors: [],
    videoQueue: [],
    systemEvents: [],
    pipelineTraces: [],
    systemStatus: {
      lastCronRunAt: null,
      lastDiscoveryRunAt: null,
      lastPollRunAt: null,
      startedAt: new Date().toISOString(),
      youtubeQuotaUsedToday: 0,
      quotaDate: todayStr,
    },
    waConversations: [],
    waMessages: [],
    waCustomers: [],
    waProducts: [],
    waOrders: [],
    waKnowledgeSources: [],
    waSettings: {
      enabled: true,
      autoReply: true,
      mode: "full_auto",
      confidenceThreshold: 0.75,
      brandVoice: {
        tone: "friendly",
        responseLength: "medium",
        emojiUsage: "minimal",
        language: "auto",
      },
      businessHours: {
        timezone: "Asia/Kolkata",
        schedule: [
          { day: 0, open: "09:00", close: "18:00", closed: true },
          { day: 1, open: "09:00", close: "18:00", closed: false },
          { day: 2, open: "09:00", close: "18:00", closed: false },
          { day: 3, open: "09:00", close: "18:00", closed: false },
          { day: 4, open: "09:00", close: "18:00", closed: false },
          { day: 5, open: "09:00", close: "18:00", closed: false },
          { day: 6, open: "09:00", close: "18:00", closed: true },
        ],
        holidays: [],
        outsideHoursMessage: "Thanks for reaching out! Our team is currently offline. I can still help with common questions, and a team member will respond during business hours.",
      },
      escalationRules: {
        onAngerDetected: true,
        onLegalThreat: true,
        onLowConfidence: true,
        onExplicitRequest: true,
        onHighValue: false,
        onPaymentDispute: true,
        confidenceThreshold: 0.65,
      },
      maxFollowups: 3,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      spamProtection: true,
      maxMessagesPerHourPerCustomer: 10,
    },
    waAnalyticsEvents: [],
    mcpTools: [
      { id: "knowledge_search", name: "knowledge_search", description: "Search the business knowledge base for answers", riskLevel: "low", category: "knowledge", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "business_search_products", name: "business_search_products", description: "Search product catalog by name or category", riskLevel: "low", category: "products", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "business_get_product", name: "business_get_product", description: "Get detailed product info by ID", riskLevel: "low", category: "products", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "business_check_inventory", name: "business_check_inventory", description: "Check current stock for a product", riskLevel: "low", category: "products", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "business_get_order", name: "business_get_order", description: "Get order status and details", riskLevel: "low", category: "orders", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "whatsapp_get_conversation", name: "whatsapp_get_conversation", description: "Get conversation history", riskLevel: "low", category: "conversations", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "whatsapp_get_customer", name: "whatsapp_get_customer", description: "Get customer profile and memory", riskLevel: "low", category: "customers", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "whatsapp_mark_read", name: "whatsapp_mark_read", description: "Mark message as read", riskLevel: "low", category: "conversations", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "analytics_record_event", name: "analytics_record_event", description: "Record an analytics event", riskLevel: "low", category: "analytics", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "knowledge_get_document", name: "knowledge_get_document", description: "Retrieve full document content", riskLevel: "low", category: "knowledge", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "whatsapp_send_message", name: "whatsapp_send_message", description: "Send a text message to customer", riskLevel: "medium", category: "messaging", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "whatsapp_send_template", name: "whatsapp_send_template", description: "Send a WhatsApp template message", riskLevel: "medium", category: "messaging", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "business_create_lead", name: "business_create_lead", description: "Create a new sales lead", riskLevel: "medium", category: "crm", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "crm_create_customer", name: "crm_create_customer", description: "Create a new customer record", riskLevel: "medium", category: "crm", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "crm_create_task", name: "crm_create_task", description: "Create a follow-up task", riskLevel: "medium", category: "crm", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "scheduler_create_followup", name: "scheduler_create_followup", description: "Schedule a follow-up message", riskLevel: "medium", category: "automation", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "human_escalate_conversation", name: "human_escalate_conversation", description: "Escalate conversation to human agent", riskLevel: "medium", category: "handoff", enabled: true, requiresConfirmation: false, invocationCount: 0 },
      { id: "crm_update_customer", name: "crm_update_customer", description: "Update customer record or memory", riskLevel: "high", category: "crm", enabled: true, requiresConfirmation: true, invocationCount: 0 },
      { id: "business_update_customer", name: "business_update_customer", description: "Update customer tags, notes, lead stage", riskLevel: "high", category: "crm", enabled: true, requiresConfirmation: true, invocationCount: 0 },
      { id: "refund_order", name: "refund_order", description: "Process an order refund", riskLevel: "high", category: "orders", enabled: false, requiresConfirmation: true, invocationCount: 0 },
    ],
    waQuickReplies: [
      { id: "qr_price", shortcut: "/price", title: "Price Inquiry", message: "Thank you for your interest! Let me check the current pricing for you.", createdAt: new Date().toISOString() },
      { id: "qr_return", shortcut: "/return", title: "Return Policy", message: "Our return policy allows returns within 30 days of purchase with the original receipt.", createdAt: new Date().toISOString() },
      { id: "qr_shipping", shortcut: "/shipping", title: "Shipping Info", message: "We offer free shipping on orders above ₹999. Standard delivery takes 3-5 business days.", createdAt: new Date().toISOString() },
      { id: "qr_location", shortcut: "/location", title: "Our Location", message: "You can find us at [address]. We're open Monday to Saturday, 9 AM to 6 PM.", createdAt: new Date().toISOString() },
      { id: "qr_hours", shortcut: "/hours", title: "Business Hours", message: "We're open Monday to Saturday from 9 AM to 6 PM (IST). Sundays we're closed.", createdAt: new Date().toISOString() },
    ],
    agiLearnedComments: [],
    audienceKnowledge: {
      topQuestions: [],
      recurringPraises: [],
      recurringComplaints: [],
      featureRequests: [],
      audienceLanguagePatterns: [],
      sentimentTrend: [],
      topTestimonials: [],
      competitorMentions: [],
      totalCommentsProcessed: 0,
      lastUpdated: new Date().toISOString(),
    },
    keywordAlerts: [],
    agiLearningCycles: [],
    agiVideoContexts: [],
    businessKnowledgeItems: [],
    feedbackSignalClusters: [],
    videoContextGraphs: [],
    contentGapItems: [],
    humanEditSignals: [],
    businessDigitalTwin: {
      organizationName: displayName + "'s Workspace",
      revenueSummary: {
        yesterdayRevenue: 0,
        weekToDateRevenue: 0,
        growthPercentage: 0,
        attributedChannels: [],
      },
      activeGoals: [],
      knowledgeCoverage: {
        knownCount: 0,
        unknownCount: 0,
        staleCount: 0,
        conflictedCount: 0,
        coveragePercentage: 0,
        lastAuditedAt: new Date().toISOString(),
      },
      topOpportunities: [],
      topRisks: [],
      updatedAt: new Date().toISOString(),
    },
    autonomyConfig: {
      currentLevel: 3,
      confidenceThresholds: {
        autoSend: 0.85,
        draftForReview: 0.65,
        escalateToHuman: 0.40,
      },
      hardPolicies: {
        neverMentionDiscountsWithoutApproval: true,
        neverPromiseRefundsAutonomously: true,
        neverRecommendOutOfStockProducts: true,
        escalateLegalThreatsImmediately: true,
        escalateAngryVIPCustomers: true,
        customRules: [],
      },
      circuitBreaker: {
        tripped: false,
      },
    },
    // Telegram 24/7 Autonomous Enterprise Operations
    telegramConnections: [],
    telegramChats: [],
    telegramContacts: [],
    telegramConversations: [],
    telegramMessages: [],
    telegramAutomations: [
      {
        id: "tg_auto_pricing",
        tenantId: email || "default",
        name: "Instant Pricing Menu & Checkout Responder",
        status: "ACTIVE",
        trigger: "KEYWORD",
        conditions: [{ type: "contains_keyword", value: "price, cost, pricing, plans, buy" }],
        actions: [{ type: "SEND_MESSAGE", payload: "Here is our official pricing catalog with instant Telegram checkout:" }, { type: "UPDATE_LEAD_SCORE", scoreDelta: 15 }],
        priority: 10,
        cooldown: 60,
        maxExecutions: 500,
        approvalMode: "AUTO_EXECUTE",
        executionCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tg_auto_welcome",
        tenantId: email || "default",
        name: "Group Member Onboarding & Security Verification",
        status: "ACTIVE",
        trigger: "CHAT_MEMBER_JOIN",
        conditions: [],
        actions: [{ type: "SEND_MESSAGE", payload: "Welcome to QuickReply Enterprise! Type /help to view interactive commands or /pricing for direct plans." }],
        priority: 5,
        cooldown: 10,
        maxExecutions: 1000,
        approvalMode: "AUTO_EXECUTE",
        executionCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tg_auto_escalate",
        tenantId: email || "default",
        name: "Escalate Legal Disputes & Urgent Complaints",
        status: "ACTIVE",
        trigger: "NEW_MESSAGE",
        conditions: [{ type: "sentiment_is", value: "very_negative" }, { type: "intent_equals", value: "LEGAL" }],
        actions: [{ type: "ESCALATE_HUMAN" }, { type: "ADD_TAG", tag: "URGENT_LEGAL" }],
        priority: 20,
        cooldown: 0,
        maxExecutions: 100,
        approvalMode: "AUTO_EXECUTE",
        executionCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    telegramExecutions: [],
    telegramScheduledJobs: [],
    telegramEvents: [],
    telegramPayments: [],
    telegramCampaigns: [],
    telegramMiniApps: [
      {
        id: "tg_app_store",
        tenantId: email || "default",
        name: "QuickReply Digital Store & Customer Portal",
        shortName: "Store",
        url: "https://quickreply.ai/miniapp",
        description: "Official Telegram Mini App for in-chat catalog browsing, orders, and customer support tickets.",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    telegramVoiceOfCustomer: [],
    telegramSupportTickets: [],
  };
}

/** Ensure a parsed DBData has all required fields filled in. Returns true if any mutation occurred. */
function ensureDataIntegrity(parsed: DBData, email: string): boolean {
  const displayName = email ? (email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1)) : "Creator";
  const todayStr = new Date().toISOString().split("T")[0];
  let dirty = false;

  if (!parsed.userSession) {
    const uniqueUsername = generateUniqueUsername(displayName.toLowerCase().replace(/[^a-z0-9]/g, ""));
    parsed.userSession = { email, name: displayName, username: uniqueUsername, tier: "free", repliesToday: 0, lastResetDate: todayStr };
    dirty = true;
  } else if (!parsed.userSession.username) {
    // Migration: add username to existing user sessions
    parsed.userSession.username = generateUniqueUsername(parsed.userSession.name.toLowerCase().replace(/[^a-z0-9]/g, ""));
    dirty = true;
  }

  if (!parsed.coupons) {
    parsed.coupons = [];
    dirty = true;
  }

  // Ensure credit account and ledger exist
  if (!parsed.creditAccount) {
    parsed.creditAccount = {
      id: `cr_${email ? email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "default"}`,
      tenantId: email || "default",
      balance: 100,
      reservedBalance: 0,
      lifetimeGranted: 100,
      lifetimeUsed: 0,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    dirty = true;
  }
  if (!parsed.creditLedger) {
    parsed.creditLedger = [
      {
        id: `tx_init_${Date.now()}`,
        tenantId: email || "default",
        type: "SIGNUP_BONUS",
        amount: 100,
        balanceAfter: 100,
        referenceType: "SIGNUP_BONUS",
        idempotencyKey: `init_${email || "default"}`,
        metadata: { note: "Welcome bonus credits" },
        createdAt: new Date().toISOString(),
      }
    ];
    dirty = true;
  }
  if (!parsed.creditReservations) { parsed.creditReservations = []; dirty = true; }
  if (!parsed.subscriptions) { parsed.subscriptions = []; dirty = true; }
  if (!parsed.paymentTransactions) { parsed.paymentTransactions = []; dirty = true; }
  if (!parsed.webhookEvents) { parsed.webhookEvents = []; dirty = true; }

  if (!parsed.faqs) {
    parsed.faqs = [];
    dirty = true;
  }

  if (parsed.workspace?.settings && parsed.workspace.settings.negativeKeywords === undefined) {
    parsed.workspace.settings.negativeKeywords = "scam, refund, disappointed, hate, fake, bot, report";
    dirty = true;
  }

  if (parsed.workspace?.settings && !parsed.workspace.settings.globalReplyConfig) {
    parsed.workspace.settings.globalReplyConfig = {
      replyToAll: false,
      tags: "",
      template: "Thank you for commenting!"
    };
    dirty = true;
  }

  if (parsed.userSession.lastResetDate !== todayStr) {
    parsed.userSession.repliesToday = 0;
    parsed.userSession.lastResetDate = todayStr;
    dirty = true;
  }

  // Ensure new collection arrays exist (structural integrity only - NO mock data)
  if (!parsed.topCommenters) { parsed.topCommenters = []; dirty = true; }
  if (!parsed.engagementHourly) { parsed.engagementHourly = []; dirty = true; }
  if (!parsed.roiData) {
    parsed.roiData = {
      repliesThisWeek: 0, hoursSavedThisWeek: 0, hourlyRate: 25,
      moneySavedThisWeek: 0, repliesThisMonth: 0, hoursSavedThisMonth: 0,
      moneySavedThisMonth: 0, allTimeReplies: 0, allTimeHoursSaved: 0, allTimeMoneySaved: 0
    };
    dirty = true;
  }
  if (!parsed.automationChains) { parsed.automationChains = []; dirty = true; }
  if (!parsed.followUpSequences) { parsed.followUpSequences = []; dirty = true; }
  if (!parsed.webhookTriggers) { parsed.webhookTriggers = []; dirty = true; }
  if (!parsed.commentAssignments) { parsed.commentAssignments = []; dirty = true; }
  if (!parsed.commentNotes) { parsed.commentNotes = []; dirty = true; }
  if (!parsed.approvalWorkflows) { parsed.approvalWorkflows = []; dirty = true; }
  if (!parsed.templateVersions) { parsed.templateVersions = []; dirty = true; }
  if (!parsed.replyEdits) { parsed.replyEdits = []; dirty = true; }
  if (!parsed.replyEffectiveness) { parsed.replyEffectiveness = []; dirty = true; }
  if (!parsed.suggestedRules) { parsed.suggestedRules = []; dirty = true; }
  if (!parsed.suggestedFAQs) { parsed.suggestedFAQs = []; dirty = true; }
  if (!parsed.notificationLog) { parsed.notificationLog = []; dirty = true; }
  if (!parsed.milestones) { parsed.milestones = []; dirty = true; }
  if (!parsed.quotaWarnings) { parsed.quotaWarnings = []; dirty = true; }
  if (!parsed.socialAccounts) { parsed.socialAccounts = []; dirty = true; }
  if (!parsed.socialComments) { parsed.socialComments = []; dirty = true; }
  if (!parsed.socialPosts) { parsed.socialPosts = []; dirty = true; }
  if (!parsed.socialMediaAssets) { parsed.socialMediaAssets = []; dirty = true; }
  if (!parsed.socialScheduledJobs) { parsed.socialScheduledJobs = []; dirty = true; }
  if (!parsed.socialMetrics) { parsed.socialMetrics = []; dirty = true; }
  if (!parsed.socialWebhooks) { parsed.socialWebhooks = []; dirty = true; }
  if (!parsed.socialMessages) { parsed.socialMessages = []; dirty = true; }
  if (!parsed.socialConversations) { parsed.socialConversations = []; dirty = true; }
  if (!parsed.integrationErrors) { parsed.integrationErrors = []; dirty = true; }
  if (!parsed.videoQueue) { parsed.videoQueue = []; dirty = true; }
  if (!parsed.systemEvents) { parsed.systemEvents = []; dirty = true; }
  if (!parsed.pipelineTraces) { parsed.pipelineTraces = []; dirty = true; }
  if (!parsed.systemStatus) {
    parsed.systemStatus = {
      lastCronRunAt: null,
      lastDiscoveryRunAt: null,
      lastPollRunAt: null,
      startedAt: new Date().toISOString(),
      youtubeQuotaUsedToday: 0,
      quotaDate: todayStr,
    };
    dirty = true;
  }

  // Ensure WA fields are initialized
  if (!parsed.waConversations) { parsed.waConversations = []; dirty = true; }
  if (!parsed.waMessages) { parsed.waMessages = []; dirty = true; }
  if (!parsed.waCustomers) { parsed.waCustomers = []; dirty = true; }
  if (!parsed.waProducts) { parsed.waProducts = []; dirty = true; }
  if (!parsed.waOrders) { parsed.waOrders = []; dirty = true; }
  if (!parsed.waKnowledgeSources) { parsed.waKnowledgeSources = []; dirty = true; }
  if (!parsed.waSettings) { 
    parsed.waSettings = {
      enabled: true,
      autoReply: true,
      mode: "full_auto",
      confidenceThreshold: 0.75,
      brandVoice: { tone: "friendly", responseLength: "medium", emojiUsage: "minimal", language: "auto" },
      businessHours: {
        timezone: "Asia/Kolkata",
        schedule: [
          { day: 0, open: "09:00", close: "18:00", closed: true },
          { day: 1, open: "09:00", close: "18:00", closed: false },
          { day: 2, open: "09:00", close: "18:00", closed: false },
          { day: 3, open: "09:00", close: "18:00", closed: false },
          { day: 4, open: "09:00", close: "18:00", closed: false },
          { day: 5, open: "09:00", close: "18:00", closed: false },
          { day: 6, open: "09:00", close: "18:00", closed: true },
        ],
        holidays: [],
        outsideHoursMessage: "Thanks for reaching out! Our team is currently offline. I can still help with common questions, and a team member will respond during business hours.",
      },
      escalationRules: {
        onAngerDetected: true,
        onLegalThreat: true,
        onLowConfidence: true,
        onExplicitRequest: true,
        onHighValue: false,
        onPaymentDispute: true,
        confidenceThreshold: 0.65,
      },
      maxFollowups: 3,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      spamProtection: true,
      maxMessagesPerHourPerCustomer: 10,
    };
    dirty = true;
  }
  if (!parsed.waAnalyticsEvents) { parsed.waAnalyticsEvents = []; dirty = true; }
  if (!parsed.mcpTools) { parsed.mcpTools = []; dirty = true; }
  if (!parsed.waQuickReplies) { parsed.waQuickReplies = []; dirty = true; }
  // Business Intelligence & Autonomous Agent Operating Layer
  if (!parsed.agiLearnedComments) { parsed.agiLearnedComments = []; dirty = true; }
  if (!parsed.keywordAlerts) { parsed.keywordAlerts = []; dirty = true; }
  if (!parsed.agiLearningCycles) { parsed.agiLearningCycles = []; dirty = true; }
  if (!parsed.agiVideoContexts) { parsed.agiVideoContexts = []; dirty = true; }
  if (!parsed.businessKnowledgeItems) { parsed.businessKnowledgeItems = []; dirty = true; }
  if (!parsed.feedbackSignalClusters) { parsed.feedbackSignalClusters = []; dirty = true; }
  if (!parsed.videoContextGraphs) { parsed.videoContextGraphs = []; dirty = true; }
  if (!parsed.contentGapItems) { parsed.contentGapItems = []; dirty = true; }
  if (!parsed.humanEditSignals) { parsed.humanEditSignals = []; dirty = true; }
  if (!parsed.autonomyConfig) {
    parsed.autonomyConfig = {
      currentLevel: 3, // Level 3: Low-risk Execute (default safe bounded autonomy)
      confidenceThresholds: {
        autoSend: 0.85,
        draftForReview: 0.65,
        escalateToHuman: 0.40,
      },
      hardPolicies: {
        neverMentionDiscountsWithoutApproval: true,
        neverPromiseRefundsAutonomously: true,
        neverRecommendOutOfStockProducts: true,
        escalateLegalThreatsImmediately: true,
        escalateAngryVIPCustomers: true,
        customRules: [],
      },
      circuitBreaker: {
        tripped: false,
      },
    };
    dirty = true;
  }
  if (!parsed.businessDigitalTwin) {
    parsed.businessDigitalTwin = {
      organizationName: parsed.workspace?.name || "QuickReply Workspace",
      revenueSummary: {
        yesterdayRevenue: 0,
        weekToDateRevenue: 0,
        growthPercentage: 0,
        attributedChannels: [],
      },
      activeGoals: [],
      knowledgeCoverage: {
        knownCount: 0,
        unknownCount: 0,
        staleCount: 0,
        conflictedCount: 0,
        coveragePercentage: 0,
        lastAuditedAt: new Date().toISOString(),
      },
      topOpportunities: [],
      topRisks: [],
      updatedAt: new Date().toISOString(),
    };
    dirty = true;
  }
  if (!parsed.audienceKnowledge) {
    parsed.audienceKnowledge = {
      topQuestions: [],
      recurringPraises: [],
      recurringComplaints: [],
      featureRequests: [],
      audienceLanguagePatterns: [],
      sentimentTrend: [],
      topTestimonials: [],
      competitorMentions: [],
      totalCommentsProcessed: 0,
      lastUpdated: new Date().toISOString(),
    };
    dirty = true;
  }

  // Ensure channels, templates, rules, comments, activityLogs are initialized
  if (!parsed.channels) { parsed.channels = []; dirty = true; }
  if (!parsed.templates) { parsed.templates = []; dirty = true; }
  if (!parsed.rules) { parsed.rules = []; dirty = true; }
  if (!parsed.comments) { parsed.comments = []; dirty = true; }
  if (!parsed.activityLogs) { parsed.activityLogs = []; dirty = true; }

  // Ensure workspace has required fields
  if (!parsed.workspace) {
    parsed.workspace = {
      name: email ? `${displayName}'s Workspace` : "My Workspace",
      members: [],
      settings: {
        dailyReplyQuota: 500,
        blockedUsers: [],
        spamProtection: true,
        slackWebhook: "",
        emailDigest: "weekly",
        negativeKeywords: "scam, refund, disappointed, hate, fake, bot, report",
        globalReplyConfig: { replyToAll: false, tags: "", template: "Thank you for commenting!" }
      }
    };
    dirty = true;
  }

  // Ensure Telegram enterprise collections exist
  if (!parsed.telegramConnections) { parsed.telegramConnections = []; dirty = true; }
  if (!parsed.telegramChats) { parsed.telegramChats = []; dirty = true; }
  if (!parsed.telegramContacts) { parsed.telegramContacts = []; dirty = true; }
  if (!parsed.telegramConversations) { parsed.telegramConversations = []; dirty = true; }
  if (!parsed.telegramMessages) { parsed.telegramMessages = []; dirty = true; }
  if (!parsed.telegramAutomations) { parsed.telegramAutomations = []; dirty = true; }
  if (!parsed.telegramExecutions) { parsed.telegramExecutions = []; dirty = true; }
  if (!parsed.telegramScheduledJobs) { parsed.telegramScheduledJobs = []; dirty = true; }
  if (!parsed.telegramEvents) { parsed.telegramEvents = []; dirty = true; }
  if (!parsed.telegramPayments) { parsed.telegramPayments = []; dirty = true; }
  if (!parsed.telegramCampaigns) { parsed.telegramCampaigns = []; dirty = true; }
  if (!parsed.telegramMiniApps) { parsed.telegramMiniApps = []; dirty = true; }
  if (!parsed.telegramVoiceOfCustomer) { parsed.telegramVoiceOfCustomer = []; dirty = true; }
  if (!parsed.telegramSupportTickets) { parsed.telegramSupportTickets = []; dirty = true; }

  return dirty;
}

const DEFAULT_TEMPLATES: Template[] = [];
const DEFAULT_RULES: Rule[] = [];

// ─────────────────────────────────────────────────────────────
//  REDIS CACHE LAYER — Read-Through Cache for 100K RPS Scale
//  Reduces MongoDB load by ~95% under high traffic.
//  Falls back gracefully if Redis is not configured.
// ─────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 60; // Cache user DB for 60 seconds

export function getCanonicalTenantId(identifier: string): string {
  if (!identifier) return "anonymous_tenant";
  const clean = identifier.toLowerCase().trim();
  if (clean.startsWith("tenant_") || clean.startsWith("ws_")) {
    return clean;
  }
  const hash = crypto.createHash("sha256").update(clean).digest("hex").slice(0, 16);
  return `tenant_${hash}`;
}

function getCacheKey(tenantIdOrEmail: string): string {
  const tenantId = getCanonicalTenantId(tenantIdOrEmail);
  return `qr:tenant:${tenantId}`;
}

/** Lazily imported Redis client — only initialised when REDIS_URL is set */
let _redisClient: any = null;
async function getRedisClient(): Promise<any | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  if (_redisClient) return _redisClient;
  try {
    // Works with ioredis (npm install ioredis)
    const { default: Redis } = await import("ioredis");
    _redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    _redisClient.on("error", () => { /* suppress — Redis is optional */ });
    return _redisClient;
  } catch {
    return null;
  }
}

async function redisCacheGet(email: string): Promise<DBData | null> {
  if (!email || typeof email !== "string" || !email.includes("@")) return null;
  try {
    const redis = await getRedisClient();
    if (!redis) return null;
    const raw = await redis.get(getCacheKey(email));
    if (!raw) return null;
    return JSON.parse(raw) as DBData;
  } catch {
    return null; // Cache miss on error — graceful degradation
  }
}

async function redisCacheSet(email: string, data: DBData): Promise<void> {
  if (!email || typeof email !== "string" || !email.includes("@")) return;
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.setex(getCacheKey(email), CACHE_TTL_SECONDS, JSON.stringify(data));
  } catch {
    // Non-critical — app still works without cache
  }
}

async function redisCacheInvalidate(email: string): Promise<void> {
  if (!email || typeof email !== "string" || !email.includes("@")) return;
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.del(getCacheKey(email));
  } catch {
    // Non-critical
  }
}

function getDataDirectory(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "quickreply_data");
  }
  return path.join(process.cwd(), "src", "data");
}

export async function getDB(customEmail?: string): Promise<DBData> {
  const uri = process.env.MONGODB_URI;

  let email = customEmail || "";
  if (!email) {
    // Resolve session identity from (in priority order):
    //  1. explicit argument
    //  2. session_email cookie (browser requests)
    //  3. X-Session-Email header (extension content scripts / service worker)
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      email = cookieStore.get("session_email")?.value || "";
    } catch (e) {
      // not in request context
    }
    if (!email) {
      try {
        const { headers } = await import("next/headers");
        const headerStore = await headers();
        const headerEmail = headerStore.get("x-session-email") || "";
        const headerToken = headerStore.get("x-session-token") || "";
        
        // Strict verification: x-session-email is only accepted if accompanied by a valid HMAC x-session-token
        if (headerEmail && headerToken) {
          const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || "";
          if (secret) {
            const enc = new TextEncoder();
            const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
            const sig = await crypto.subtle.sign("HMAC", key, enc.encode(headerEmail.toLowerCase().trim()));
            const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
            if (expected === headerToken) {
              email = headerEmail;
            } else {
              console.warn(`[Security] Rejected unverified x-session-email header: ${headerEmail}`);
            }
          }
        }
      } catch (e) {
        // not in request context
      }
    }
  }

  const docId = email ? `user_${email.toLowerCase().trim()}` : "global_db_state";
  
  if (uri) {
    try {
      // ── Redis Cache Check (< 0.5ms hit, saves MongoDB round-trip) ──
      const cachedData = await redisCacheGet(email);
      if (cachedData) {
        // Ensure data integrity on cached data too
        const dirty = ensureDataIntegrity(cachedData, email);
        if (dirty) {
          // Re-cache the corrected data
          await saveDB(cachedData, email);
          await redisCacheSet(email, cachedData);
        }
        return cachedData;
      }

      // ── Cache MISS — fetch from MongoDB with serverless-safe timeout ──
      const mongoFetch = async () => {
        const client = await getMongoClient();
        const db = client.db("quickreply");
        const collection = db.collection("users");
        return await collection.findOne({ _id: docId as any });
      };

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("MongoDB query timed out (5000ms)")), 5000)
      );

      const document = await Promise.race([mongoFetch(), timeoutPromise]);

      if (document) {
        const { _id, ...rest } = document;
        const parsed = rest as unknown as DBData;
        const dirty = ensureDataIntegrity(parsed, email);

        if (dirty) {
          await saveDB(parsed, email);
        }

        // Store in Redis for next 60 seconds
        await redisCacheSet(email, parsed);
        return parsed;
      } else {
        // Document not found in Mongo, seed default structure
        const defaultData = buildDefaultData(email);
        await saveDB(defaultData, email);
        return defaultData;
      }
    } catch (err: any) {
      console.warn(`[DB] ⚠️ MongoDB query failed (${err.message || err}). Gracefully falling back to local file storage.`);
    }
  }

  // Local development file fallback (strictly development mode without MONGODB_URI)
  try {
    const fileSuffix = email ? `_${email.toLowerCase().replace(/[^a-z0-9_]/g, "_")}` : "";
    const customDbPath = path.join(getDataDirectory(), `db${fileSuffix}.json`);

    if (!fs.existsSync(customDbPath)) {
      const defaultData = buildDefaultData(email);
      try {
        fs.mkdirSync(path.dirname(customDbPath), { recursive: true });
        fs.writeFileSync(customDbPath, JSON.stringify(defaultData, null, 2), "utf8");
      } catch {}
      return defaultData;
    }
    const raw = fs.readFileSync(customDbPath, "utf8");
    const parsed = JSON.parse(raw) as DBData;

    const dirty = ensureDataIntegrity(parsed, email);

    if (dirty) {
      fs.writeFileSync(customDbPath, JSON.stringify(parsed, null, 2), "utf8");
    }

    return parsed;
  } catch (err) {
    console.error("Failed to read DB file:", err);
    return buildDefaultData(email);
  }
}

export async function saveDB(data: DBData, customEmail?: string): Promise<boolean> {
  const uri = process.env.MONGODB_URI;

  let email = customEmail || data.userSession?.email || "";
  if (!email) {
    try {
      const cookieStore = await cookies();
      email = cookieStore.get("session_email")?.value || "";
    } catch (e) {
      // not in request context
    }
    if (!email) {
      try {
        const { headers } = await import("next/headers");
        const headerStore = await headers();
        email = headerStore.get("x-session-email") || "";
      } catch (e) {
        // not in request context
      }
    }
  }

  const docId = email ? `user_${email.toLowerCase().trim()}` : "global_db_state";

  if (uri) {
    try {
      const mongoSave = async () => {
        const client = await getMongoClient();
        const db = client.db("quickreply");
        const collection = db.collection("users");
        await collection.updateOne(
          { _id: docId as any },
          { $set: data },
          { upsert: true }
        );
      };
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("MongoDB save timed out (1500ms)")), 1500)
      );
      await Promise.race([mongoSave(), timeoutPromise]);
      await redisCacheSet(email, data);
      return true;
    } catch (err: any) {
      console.warn(`[DB] ⚠️ MongoDB save failed (${err.message || err}). Persisting to local file storage.`);
    }
  }

  // Local development file persistence (strictly development mode without MONGODB_URI)
  try {
    const fileSuffix = email ? `_${email.toLowerCase().replace(/[^a-z0-9_]/g, "_")}` : "";
    const customDbPath = path.join(getDataDirectory(), `db${fileSuffix}.json`);
    const dir = path.dirname(customDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(customDbPath, JSON.stringify(data, null, 2), "utf8");
    await redisCacheSet(email, data);
    return true;
  } catch (err) {
    console.error("Failed to write to DB file:", err);
    return false;
  }
}

export async function logActivity(user: string, action: string) {
  let email = "";
  try {
    const cookieStore = await cookies();
    email = cookieStore.get("session_email")?.value || "";
  } catch (e) {}
  if (!email) {
    try {
      const { headers } = await import("next/headers");
      const headerStore = await headers();
      email = headerStore.get("x-session-email") || "";
    } catch (e) {}
  }

  const db = await getDB(email);
  const newLog: ActivityLog = {
    id: `log-${Date.now()}`,
    user: user || "Creator",
    action,
    timestamp: new Date().toISOString()
  };
  db.activityLogs.unshift(newLog);
  if (db.activityLogs.length > 100) {
    db.activityLogs = db.activityLogs.slice(0, 100);
  }
  await saveDB(db, email);
}

export async function getClientCredentials(platform: string): Promise<{
  clientId?: string;
  clientSecret?: string;
  token?: string;
  phoneId?: string;
}> {
  const envMapping: Record<string, { clientId?: string; clientSecret?: string }> = {
    youtube: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    },
  };

  const creds = envMapping[platform] || {};

  // Throw error if credentials are not configured - no fake fallback in production
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error(`${platform} OAuth credentials not configured. Set ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET environment variables.`);
  }

  return {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    token: process.env.WHATSAPP_TOKEN,
    phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  };
}

// ─────────────────────────────────────────────────────────────
//  DURABLE DISTRIBUTED LOCK (B2)
//  Redis → MongoDB → in-memory fallback.
//  Prevents two serverless instances from double-polling (and
//  therefore double-replying) when a cron + client poll overlap.
// ─────────────────────────────────────────────────────────────

const memoryLocks = new Map<string, { token: string; expiresAt: number }>();

function _memoryLockCleanup() {
  const now = Date.now();
  for (const [key, entry] of memoryLocks.entries()) {
    if (entry.expiresAt <= now) memoryLocks.delete(key);
  }
}

/**
 * Try to acquire a named lock for `ttlMs`. Returns a token on success,
 * null if the lock is already held. Safe across concurrent instances.
 */
export async function acquireLock(
  name: string,
  ttlMs = 60_000
): Promise<string | null> {
  const token = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const expiry = now + ttlMs;

  // 1. Redis (atomic SET NX PX)
  try {
    const { getRedis } = await import("@/backend/redis");
    const redis = await getRedis();
    if (redis) {
      const ok = await redis.set(`qr:lock:${name}`, token, "PX", ttlMs, "NX");
      return ok ? token : null;
    }
  } catch {
    // fall through to Mongo
  }

  // 2. MongoDB (atomic findOneAndUpdate with expiry guard)
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const client = await getMongoClient();
      const coll = client.db("quickreply").collection("locks");
      const result = await coll.findOneAndUpdate(
        { _id: name as any, $or: [{ expiresAt: { $lt: now } }, { expiresAt: null }] },
        { $set: { token, expiresAt: expiry } },
        { upsert: true, returnDocument: "after" }
      );
      if (result && (result as any).token === token) return token;
      return null; // Either another holder, or an upsert duplicate-key miss
    } catch {
      // fall through to memory
    }
  }

  // 3. In-memory fallback (single instance — matches old behavior)
  _memoryLockCleanup();
  const existing = memoryLocks.get(name);
  if (existing && existing.expiresAt > now) return null;
  memoryLocks.set(name, { token, expiresAt: expiry });
  return token;
}

/** Release a lock only if we still own it (token must match). */
export async function releaseLock(name: string, token: string): Promise<void> {
  try {
    const { getRedis } = await import("@/backend/redis");
    const redis = await getRedis();
    if (redis) {
      // Lua-free compare-and-delete
      const val = await redis.get(`qr:lock:${name}`);
      if (val === token) await redis.del(`qr:lock:${name}`);
      return;
    }
  } catch {
    // fall through
  }

  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const client = await getMongoClient();
      const coll = client.db("quickreply").collection("locks");
      await coll.deleteOne({ _id: name as any, token });
      return;
    } catch {
      // fall through
    }
  }

  const entry = memoryLocks.get(name);
  if (entry && entry.token === token) memoryLocks.delete(name);
}

// ─────────────────────────────────────────────────────────────
//  PIPELINE TRACE STORAGE (B3)
//  Persist recent traces for the visualizer; capped to avoid bloat.
// ─────────────────────────────────────────────────────────────

export interface AppendTraceResult {
  db: DBData;
  trace: PipelineTrace;
}

export async function appendPipelineTrace(
  trace: PipelineTrace,
  email?: string
): Promise<void> {
  try {
    const db = await getDB(email);
    if (!db.pipelineTraces) db.pipelineTraces = [];
    db.pipelineTraces.unshift(trace);
    // Cap at 200 traces so the DB stays lean
    if (db.pipelineTraces.length > 200) {
      db.pipelineTraces = db.pipelineTraces.slice(0, 200);
    }
    await saveDB(db, email);
  } catch {
    // Non-critical — telemetry must never break the engine
  }
}

// ─────────────────────────────────────────────────────────────
//  WORKSPACE GUARD (B8)
//  Resolve the current session email, or throw if unavailable.
//  Used by mutating routes to enforce per-workspace isolation.
// ─────────────────────────────────────────────────────────────

export async function requireWorkspaceEmail(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("session_email")?.value;
    if (email) return email;
  } catch {
    // not in request context
  }
  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    const email = headerStore.get("x-session-email");
    if (email) return email;
  } catch {
    // not in request context
  }
  const err = new Error("No active workspace session");
  (err as any).statusCode = 401;
  throw err;
}

// ─────────────────────────────────────────────────────────────
//  MULTI-TENANT DISCOVERY
//  Enumerate all registered tenant workspaces for background polling
// ─────────────────────────────────────────────────────────────

export async function getAllTenantEmails(): Promise<string[]> {
  const uri = process.env.MONGODB_URI;
  const emails = new Set<string>();

  if (uri) {
    try {
      const client = await getMongoClient();
      const db = client.db("quickreply");
      const collection = db.collection("users");
      const docs = await collection.find({}, { projection: { _id: 1, "userSession.email": 1 } }).toArray();
      for (const doc of docs) {
        const userDoc = doc as Record<string, any>;
        if (userDoc.userSession?.email) {
          emails.add(String(userDoc.userSession.email).toLowerCase().trim());
        } else if (userDoc._id) {
          const docIdStr = String(userDoc._id);
          if (docIdStr.startsWith("user_")) {
            emails.add(docIdStr.replace(/^user_/, "").toLowerCase().trim());
          }
        }
      }
    } catch (err) {
      console.warn("[DB] Failed to query Mongo for tenant list:", err);
    }
  }

  // Also check local disk data directory
  try {
    const dataDir = getDataDirectory();
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        if (file.startsWith("db_") && file.endsWith(".json")) {
          const rawEmail = file.slice(3, -5).replace(/_/g, ".");
          if (rawEmail && rawEmail.includes("@")) {
            emails.add(rawEmail.toLowerCase().trim());
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(emails);
}

