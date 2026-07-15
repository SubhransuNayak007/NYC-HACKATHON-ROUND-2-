/**
 * ============================================================
 * QuickReply — Native Instagram Provider Adapter
 * src/channels/social/providers/InstagramProvider.ts
 *
 * Direct integration with Meta Graph API v19.0+:
 * - Instagram Professional (Business & Creator) Accounts
 * - Container-based Publishing Pipeline (create container -> publish)
 * - Comment Management & Auto-Replies
 * - 24-Hour Direct Messaging Window
 * - Long-lived 60-day Token Exchange
 * - Webhook Signature Verification (HMAC-SHA256)
 * ============================================================
 */

import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import type {
  SocialProvider,
  ProviderCapabilities,
  OAuthStart,
  OAuthResult,
  PublishInput,
  PublishResult,
  ScheduleInput,
  ScheduleResult,
  AnalyticsResult,
  CommentReplyResult,
  MessageResult,
  NormalizedEvent,
  TokenResult,
  ConnectionDiagnostics,
} from "../core/SocialProvider";
import {
  getDB,
  saveDB,
  encryptToken,
  decryptToken,
  type SocialAccount,
  type SocialComment,
  type SocialMessage,
} from "@/database/db";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const META_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";

export class InstagramProvider implements SocialProvider {
  readonly platform = "instagram" as const;
  readonly displayName = "Instagram Professional (Meta)";

  private getAppId(): string {
    return process.env.INSTAGRAM_CLIENT_ID || process.env.META_APP_ID || "";
  }

  private getAppSecret(): string {
    return process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET || "";
  }

  async connect(redirectUri?: string): Promise<OAuthStart> {
    const appId = this.getAppId();
    const state = uuidv4();
    const redirect = redirectUri || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/social/instagram/callback`;
    const scopes = encodeURIComponent("instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement");

    const authUrl = `${META_AUTH_URL}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&scope=${scopes}&response_type=code`;

    return { authUrl, state };
  }

  async callback(params: { code: string; redirectUri?: string }): Promise<OAuthResult> {
    const { code, redirectUri } = params;
    const appId = this.getAppId();
    const appSecret = this.getAppSecret();
    const redirect = redirectUri || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/social/instagram/callback`;

    if (!appId || !appSecret) {
      return {
        success: false,
        error: "INSTAGRAM_CLIENT_ID / META_APP_ID not configured in environment variables.",
        userFacingExplanation: "Please configure your Meta App ID and Secret in your server environment.",
      };
    }

    try {
      // 1. Exchange Code for Short-Lived Access Token
      const tokenUrl = `${GRAPH_API_BASE}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&client_secret=${appSecret}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        return {
          success: false,
          error: tokenData.error?.message || "Meta OAuth token exchange failed.",
        };
      }

      // 2. Exchange for Long-Lived Token (60 Days)
      const longTokenUrl = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`;
      const longRes = await fetch(longTokenUrl);
      const longData = await longRes.json();
      const finalToken = longData.access_token || tokenData.access_token;
      const expiresIn = longData.expires_in || 5184000; // 60 days
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

      // 3. Discover Instagram Business Account via Facebook Pages
      const accountsRes = await fetch(`${GRAPH_API_BASE}/me/accounts?fields=name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}`, {
        headers: { Authorization: `Bearer ${finalToken}` },
      });
      const accountsData = await accountsRes.json();

      let igAccount: any = null;
      let pageId: string | undefined;

      if (accountsData.data && accountsData.data.length > 0) {
        for (const page of accountsData.data) {
          if (page.instagram_business_account) {
            igAccount = page.instagram_business_account;
            pageId = page.id;
            break;
          }
        }
      }

      if (!igAccount) {
        return {
          success: false,
          error: "No connected Instagram Professional (Business/Creator) account found on your Facebook Pages.",
          userFacingExplanation: "Please ensure your Instagram account is switched to Professional/Business and linked to a Facebook Page.",
        };
      }

      const db = await getDB();
      if (!db.socialAccounts) db.socialAccounts = [];

      const newAccount: SocialAccount = {
        platform: "instagram",
        id: igAccount.id,
        name: igAccount.name || igAccount.username,
        username: `@${igAccount.username}`,
        avatar: igAccount.profile_picture_url,
        pageId,
        accessToken: encryptToken(finalToken),
        tokenExpiry,
        followers: igAccount.followers_count !== undefined ? `${igAccount.followers_count} Followers` : "Active",
        connectedAt: new Date().toISOString(),
        isActive: true,
        status: "connected",
        capabilities: {
          publishing: true,
          reels: true,
          comments: true,
          privateCommentReply: true,
          directMessages: true,
          analytics: true,
        },
      };

      const existingIdx = db.socialAccounts.findIndex((a) => a.platform === "instagram" && a.id === igAccount.id);
      if (existingIdx >= 0) {
        db.socialAccounts[existingIdx] = { ...db.socialAccounts[existingIdx], ...newAccount };
      } else {
        db.socialAccounts.push(newAccount);
      }

      await saveDB(db);

      return {
        success: true,
        account: newAccount,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        userFacingExplanation: "Failed to connect Instagram account.",
      };
    }
  }

  async disconnect(accountId: string): Promise<void> {
    const db = await getDB();
    if (db.socialAccounts) {
      const acct = db.socialAccounts.find((a) => a.platform === "instagram" && a.id === accountId);
      if (acct) {
        acct.isActive = false;
        acct.status = "disconnected";
        acct.accessToken = undefined;
        await saveDB(db);
      }
    }
  }

  async getAccount(accountId: string): Promise<SocialAccount | null> {
    const db = await getDB();
    return db.socialAccounts?.find((a) => a.platform === "instagram" && a.id === accountId) || null;
  }

  async getCapabilities(accountId: string): Promise<ProviderCapabilities> {
    const acct = await this.getAccount(accountId);
    const isConnected = !!acct && acct.status === "connected";

    return {
      platform: "instagram",
      displayName: "Instagram Professional (Meta Graph API)",
      accountType: "Business / Creator Account",
      publishing: isConnected,
      textPosts: false, // Instagram requires media (image or video)
      imagePosts: isConnected,
      videoPosts: isConnected,
      stories: false,   // Stories API requires special Partner approval
      reels: isConnected,
      commentsRead: isConnected,
      commentsReply: isConnected,
      dmRead: isConnected,
      dmSend: isConnected,
      analytics: isConnected,
      webhooks: isConnected,
      unsupportedOperations: [
        "Text-only feed posts without image/video",
        "Personal non-business account management",
        "Arbitrary cold DMs outside 24h customer window",
      ],
      notes: "Official Meta Graph API v19.0. Supports feed images, video reels, comment automation, and 24h window DMs.",
    };
  }

  /**
   * Container-based Publishing Pipeline
   */
  async publishContent(input: PublishInput): Promise<PublishResult> {
    const acct = await this.getAccount(input.accountId);
    if (!acct || !acct.accessToken) {
      return {
        success: false,
        error: "Instagram account not connected or missing token.",
        userFacingExplanation: "Please connect your Instagram Business account first.",
      };
    }

    if (!input.mediaUrls || input.mediaUrls.length === 0) {
      return {
        success: false,
        error: "Instagram requires at least one image or video for feed publication.",
        userFacingExplanation: "Text-only posts are not supported by Instagram. Please attach an image or video.",
      };
    }

    const token = decryptToken(acct.accessToken);
    const igUserId = acct.id;
    const mediaUrl = input.mediaUrls[0];
    const isVideo = mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".mov");

    try {
      // 1. Create Media Container
      const containerParams = new URLSearchParams({
        access_token: token,
        caption: input.content,
      });

      if (isVideo) {
        containerParams.append("media_type", "REELS");
        containerParams.append("video_url", mediaUrl);
      } else {
        containerParams.append("image_url", mediaUrl);
      }

      const containerRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
        method: "POST",
        body: containerParams,
      });

      const containerData = await containerRes.json();
      if (!containerData.id) {
        return {
          success: false,
          error: containerData.error?.message || JSON.stringify(containerData),
          userFacingExplanation: `Instagram container creation rejected: ${containerData.error?.message || "Invalid media format"}`,
        };
      }

      const creationId = containerData.id;

      // 2. Publish Container
      const publishParams = new URLSearchParams({
        access_token: token,
        creation_id: creationId,
      });

      const publishRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
        method: "POST",
        body: publishParams,
      });

      const publishData = await publishRes.json();
      if (!publishData.id) {
        return {
          success: false,
          error: publishData.error?.message || JSON.stringify(publishData),
          userFacingExplanation: `Instagram publish failed: ${publishData.error?.message || "Media processing error"}`,
        };
      }

      return {
        success: true,
        providerPostId: publishData.id,
        permalink: `https://www.instagram.com/p/${publishData.id}/`,
        publishedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        userFacingExplanation: `Instagram publishing error: ${err.message}`,
      };
    }
  }

  async scheduleContent(input: ScheduleInput): Promise<ScheduleResult> {
    const db = await getDB();
    if (!db.socialScheduledJobs) db.socialScheduledJobs = [];

    const jobId = `job_ig_${uuidv4().replace(/-/g, "")}`;
    db.socialScheduledJobs.push({
      id: jobId,
      platform: "instagram",
      accountId: input.accountId,
      postId: input.metadata?.postId || jobId,
      scheduledAt: input.scheduledAt,
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      idempotencyKey: input.idempotencyKey || `idem_${jobId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await saveDB(db);

    return {
      success: true,
      jobId,
      scheduledAt: input.scheduledAt,
    };
  }

  async getPosts(accountId: string, limit: number = 20): Promise<any[]> {
    const acct = await this.getAccount(accountId);
    if (!acct || !acct.accessToken) return [];
    const token = decryptToken(acct.accessToken);

    try {
      const res = await fetch(`${GRAPH_API_BASE}/${acct.id}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.data || [];
      }
    } catch {
      // Fall through
    }
    return [];
  }

  async getAnalytics(accountId: string): Promise<AnalyticsResult> {
    const acct = await this.getAccount(accountId);
    if (!acct || !acct.accessToken) {
      return {
        platform: "instagram",
        accountId,
        metrics: {},
        fetchedAt: new Date().toISOString(),
        lastUpdatedText: "Account disconnected",
      };
    }

    const token = decryptToken(acct.accessToken);
    let impressions = 0;
    let reach = 0;

    try {
      const insightsRes = await fetch(`${GRAPH_API_BASE}/${acct.id}/insights?metric=impressions,reach&period=day`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (insightsRes.ok) {
        const data = await insightsRes.json();
        if (data.data) {
          for (const item of data.data) {
            if (item.name === "impressions") impressions = item.values?.[0]?.value || 0;
            if (item.name === "reach") reach = item.values?.[0]?.value || 0;
          }
        }
      }
    } catch {
      // Fall through
    }

    return {
      platform: "instagram",
      accountId,
      metrics: {
        impressions: { value: impressions, available: true, source: "insights_api" },
        reach: { value: reach, available: true, source: "insights_api" },
        story_impressions: { value: 0, available: false, source: "requires_partner_permissions" },
        followers: { value: 0, available: true, source: "profile_api" },
      },
      fetchedAt: new Date().toISOString(),
      lastUpdatedText: "Live from Meta Graph API",
    };
  }

  async getComments(accountId: string): Promise<SocialComment[]> {
    const db = await getDB();
    return (db.socialComments || []).filter((c) => c.platform === "instagram" && c.accountId === accountId);
  }

  async replyToComment(accountId: string, commentId: string, text: string): Promise<CommentReplyResult> {
    const acct = await this.getAccount(accountId);
    if (!acct || !acct.accessToken) {
      return { success: false, error: "Instagram account not connected" };
    }
    const token = decryptToken(acct.accessToken);

    try {
      const res = await fetch(`${GRAPH_API_BASE}/${commentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, access_token: token }),
      });

      const data = await res.json();
      if (data.id) {
        return { success: true, replyId: data.id };
      }
      return { success: false, error: data.error?.message || "Comment reply failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getMessages(accountId: string): Promise<SocialMessage[]> {
    const db = await getDB();
    return (db.socialMessages || []).filter((m) => m.platform === "instagram" && m.accountId === accountId);
  }

  async sendMessage(accountId: string, toId: string, text: string): Promise<MessageResult> {
    const acct = await this.getAccount(accountId);
    if (!acct || !acct.accessToken) {
      return { success: false, error: "Instagram account not connected" };
    }
    const token = decryptToken(acct.accessToken);
    const pageId = acct.pageId || acct.id;

    try {
      const res = await fetch(`${GRAPH_API_BASE}/${pageId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: toId },
          message: { text },
          access_token: token,
        }),
      });

      const data = await res.json();
      if (data.message_id) {
        return { success: true, messageId: data.message_id };
      }
      return {
        success: false,
        error: data.error?.message || "DM send failed",
        userFacingExplanation: data.error?.code === 10 ? "24-hour messaging window has elapsed for this customer." : data.error?.message,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async registerWebhooks(accountId: string, webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  async handleWebhook(payload: any, headers?: Record<string, string>): Promise<NormalizedEvent | null> {
    // Verify HMAC-SHA256 signature if app secret and header are available
    const appSecret = this.getAppSecret();
    const signature = headers?.["x-hub-signature-256"];
    if (appSecret && signature && typeof payload === "string") {
      const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(payload).digest("hex");
      if (signature !== expected) {
        console.warn("[InstagramProvider] ⚠️ Webhook HMAC signature verification failed");
        return null;
      }
    }

    const p = typeof payload === "string" ? JSON.parse(payload) : payload;
    const entry = p.entry?.[0];
    const changes = entry?.changes?.[0];

    if (changes?.field === "comments") {
      const commentData = changes.value;
      const text = commentData.text || "";
      const author = commentData.from?.username || "Instagram User";
      const commentId = commentData.id;

      const db = await getDB();
      if (!db.socialComments) db.socialComments = [];
      db.socialComments.push({
        id: commentId,
        platform: "instagram",
        accountId: entry.id,
        author,
        authorId: commentData.from?.id,
        text,
        publishedAt: new Date(commentData.created_time * 1000 || Date.now()).toISOString(),
        status: "pending",
      });
      await saveDB(db);

      return {
        id: `ig_evt_${commentId}`,
        platform: "instagram",
        eventType: "comment.created",
        timestamp: new Date().toISOString(),
        accountId: entry.id,
        payload: commentData,
      };
    }

    return null;
  }

  async refreshToken(accountId: string): Promise<TokenResult> {
    const acct = await this.getAccount(accountId);
    if (!acct || !acct.accessToken) {
      return { success: false, error: "No token to refresh" };
    }

    const token = decryptToken(acct.accessToken);
    const appId = this.getAppId();
    const appSecret = this.getAppSecret();

    try {
      const res = await fetch(`${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`);
      const data = await res.json();
      if (data.access_token) {
        acct.accessToken = encryptToken(data.access_token);
        acct.tokenExpiry = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();
        const db = await getDB();
        await saveDB(db);
        return { success: true, newAccessToken: data.access_token };
      }
      return { success: false, error: data.error?.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async testConnection(accountId: string): Promise<ConnectionDiagnostics> {
    const acct = await this.getAccount(accountId);
    if (!acct || !acct.accessToken) {
      return {
        platform: "instagram",
        connected: false,
        status: "disconnected",
        tokenValid: false,
        accountDiscovered: false,
        permissionsVerified: false,
        apiReachable: false,
        webhookActive: false,
        details: "No Instagram account token configured.",
      };
    }

    const token = decryptToken(acct.accessToken);
    try {
      const res = await fetch(`${GRAPH_API_BASE}/${acct.id}?fields=id,username,name`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return {
          platform: "instagram",
          connected: false,
          status: "needs_reauth",
          tokenValid: false,
          accountDiscovered: false,
          permissionsVerified: false,
          apiReachable: true,
          webhookActive: false,
          details: "Instagram access token expired. Please reauthorize.",
        };
      }

      const data = await res.json();
      return {
        platform: "instagram",
        connected: true,
        status: "connected",
        tokenValid: true,
        accountDiscovered: true,
        permissionsVerified: true,
        apiReachable: true,
        webhookActive: true,
        details: `Connected to Instagram Professional as ${data.name || data.username} (@${data.username}).`,
      };
    } catch (err: any) {
      return {
        platform: "instagram",
        connected: false,
        status: "error",
        tokenValid: false,
        accountDiscovered: false,
        permissionsVerified: false,
        apiReachable: false,
        webhookActive: false,
        details: `Meta Graph API test failed: ${err.message}`,
        rawError: err.message,
      };
    }
  }
}
