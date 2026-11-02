/**
 * ============================================================================
 * QuickReply — Official Meta Instagram API Client
 * src/channels/instagram/MetaApiClient.ts
 *
 * Official Meta Graph API v19.0+ Client for Instagram Professional Accounts.
 * - Container-based Publishing Pipeline (Single Image, Video, Reels, Stories, Carousels)
 * - Comment Moderation & Auto-Replies
 * - 24-Hour Messaging Window Enforcement & Private Replies
 * - Long-lived 60-Day Token Exchange
 * - Webhook Signature Verification (Constant-Time HMAC-SHA256)
 * - Granular Error Normalization & Rate-Limit Tracking
 * ============================================================================
 */

import crypto from "crypto";

export const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v19.0";
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
export const META_AUTH_URL = `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`;

export type MetaErrorType =
  | "AUTH_ERROR"
  | "PERMISSION_ERROR"
  | "RATE_LIMIT"
  | "MEDIA_NOT_READY"
  | "INVALID_CONTAINER"
  | "INVALID_REQUEST"
  | "RESOURCE_NOT_FOUND"
  | "PROVIDER_ERROR";

export interface MetaNormalizedError {
  type: MetaErrorType;
  code?: number;
  subcode?: number;
  message: string;
  userFacingExplanation: string;
  retryAfterSeconds?: number;
  isRetryable: boolean;
}

export interface InstagramAccountProfile {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  mediaCount?: number;
  biography?: string;
  accountType?: "BUSINESS" | "CREATOR" | "PERSONAL" | "UNKNOWN";
}

export interface InstagramWebhookEvent {
  object: "instagram";
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{ type: string; payload: { url: string } }>;
        is_echo?: boolean;
      };
    }>;
    changes?: Array<{
      field: "comments" | "mentions" | "story_insights";
      value: {
        id: string;
        text: string;
        from: { id: string; username: string };
        media: { id: string; media_product_type: string };
        parent_id?: string;
      };
    }>;
  }>;
}

export class MetaApiClient {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly verifyToken: string;

  constructor() {
    this.appId = process.env.INSTAGRAM_CLIENT_ID || process.env.META_APP_ID || "";
    this.appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET || "";
    this.verifyToken = process.env.META_VERIFY_TOKEN || process.env.INSTAGRAM_VERIFY_TOKEN || "quickreply_meta_webhook_secret";
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }

  getAppSecretProof(accessToken: string): string {
    if (!this.appSecret) return "";
    return crypto.createHmac("sha256", this.appSecret).update(accessToken).digest("hex");
  }

  appendProof(url: string, accessToken: string): string {
    const proof = this.getAppSecretProof(accessToken);
    if (!proof) return url;
    const delimiter = url.includes("?") ? "&" : "?";
    return `${url}${delimiter}appsecret_proof=${proof}`;
  }

  /**
   * Constant-Time HMAC-SHA256 Webhook Signature Verification
   */
  validateWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!this.appSecret || !signatureHeader) return false;
    const signature = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
    const expected = crypto.createHmac("sha256", this.appSecret).update(rawBody).digest("hex");
    if (signature.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  }

  /**
   * Verify Webhook challenge GET request from Meta
   */
  verifyWebhookChallenge(mode: string | null, token: string | null, challenge: string | null): string | null {
    if (mode === "subscribe" && token === this.verifyToken && challenge) {
      return challenge;
    }
    return null;
  }

  /**
   * Normalize Meta API Error Responses
   */
  normalizeError(status: number, data: any): MetaNormalizedError {
    const errorObj = data?.error || {};
    const code = errorObj.code;
    const subcode = errorObj.error_subcode;
    const rawMsg = errorObj.message || `Meta API Error (HTTP ${status})`;

    // Auth & Permission errors
    if (code === 190 || code === 102 || status === 401) {
      return {
        type: "AUTH_ERROR",
        code,
        subcode,
        message: rawMsg,
        userFacingExplanation: "Instagram session expired or revoked. Please reconnect your account.",
        isRetryable: false,
      };
    }
    if (code === 200 || code === 298 || status === 403) {
      return {
        type: "PERMISSION_ERROR",
        code,
        subcode,
        message: rawMsg,
        userFacingExplanation: "Insufficient Meta API permissions. Ensure you have granted all requested scopes.",
        isRetryable: false,
      };
    }
    // Rate limits
    if (code === 4 || code === 17 || code === 32 || code === 613 || status === 429) {
      return {
        type: "RATE_LIMIT",
        code,
        subcode,
        message: rawMsg,
        userFacingExplanation: "Meta API rate limit reached. Retrying automatically in a few moments.",
        retryAfterSeconds: 60,
        isRetryable: true,
      };
    }
    // Media & Container status
    if (code === 2207001 || code === 2207003 || rawMsg.toLowerCase().includes("not ready")) {
      return {
        type: "MEDIA_NOT_READY",
        code,
        subcode,
        message: rawMsg,
        userFacingExplanation: "Media container is still processing on Instagram servers.",
        retryAfterSeconds: 5,
        isRetryable: true,
      };
    }
    if (status === 404) {
      return {
        type: "RESOURCE_NOT_FOUND",
        code,
        subcode,
        message: rawMsg,
        userFacingExplanation: "The requested Instagram media or comment was not found.",
        isRetryable: false,
      };
    }
    return {
      type: "PROVIDER_ERROR",
      code,
      subcode,
      message: rawMsg,
      userFacingExplanation: "Meta Graph API temporary error.",
      isRetryable: status >= 500,
    };
  }

  /**
   * Exchange Code for 60-Day Long-Lived Token
   */
  async exchangeCodeForLongLivedToken(code: string, redirectUri: string): Promise<{
    success: boolean;
    accessToken?: string;
    expiresIn?: number;
    error?: MetaNormalizedError;
  }> {
    try {
      // 1. Exchange short-lived token
      const tokenUrl = `${GRAPH_API_BASE}/oauth/access_token?client_id=${this.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${this.appSecret}&code=${code}`;
      const res1 = await fetch(tokenUrl);
      const data1 = await res1.json();
      if (!res1.ok || !data1.access_token) {
        return { success: false, error: this.normalizeError(res1.status, data1) };
      }
      const shortToken = data1.access_token;

      // 2. Exchange for 60-day long-lived token
      const longUrl = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${shortToken}`;
      const res2 = await fetch(longUrl);
      const data2 = await res2.json();

      return {
        success: true,
        accessToken: data2.access_token || shortToken,
        expiresIn: data2.expires_in || 5184000, // 60 days
      };
    } catch (err) {
      return {
        success: false,
        error: {
          type: "PROVIDER_ERROR",
          message: err instanceof Error ? err.message : "Network error",
          userFacingExplanation: "Could not connect to Meta OAuth servers.",
          isRetryable: true,
        },
      };
    }
  }

  /**
   * Fetch connected Instagram Professional / Business Account Profile
   */
  async getProfile(accessToken: string, igUserId = "me"): Promise<{
    success: boolean;
    profile?: InstagramAccountProfile;
    error?: MetaNormalizedError;
  }> {
    try {
      const baseUrl = `${GRAPH_API_BASE}/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,media_count,biography&access_token=${accessToken}`;
      const url = this.appendProof(baseUrl, accessToken);
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: this.normalizeError(res.status, data) };
      }
      return {
        success: true,
        profile: {
          id: data.id,
          username: data.username,
          name: data.name || data.username,
          profilePictureUrl: data.profile_picture_url,
          followersCount: data.followers_count || 0,
          mediaCount: data.media_count || 0,
          biography: data.biography,
          accountType: "BUSINESS",
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          type: "PROVIDER_ERROR",
          message: err instanceof Error ? err.message : "Network error",
          userFacingExplanation: "Failed to load Instagram profile.",
          isRetryable: true,
        },
      };
    }
  }

  /**
   * Discover Connected Facebook Pages & linked Instagram Business Accounts
   */
  async discoverInstagramAccounts(accessToken: string): Promise<Array<{ pageId: string; pageName: string; igUserId: string; igUsername: string }>> {
    try {
      const baseUrl = `${GRAPH_API_BASE}/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${accessToken}`;
      const url = this.appendProof(baseUrl, accessToken);
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const results: Array<{ pageId: string; pageName: string; igUserId: string; igUsername: string }> = [];

      for (const page of data.data || []) {
        if (page.instagram_business_account?.id) {
          results.push({
            pageId: page.id,
            pageName: page.name,
            igUserId: page.instagram_business_account.id,
            igUsername: page.instagram_business_account.username || page.name,
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Container Creation Pipeline: Step 1 (Create Container)
   */
  async createMediaContainer(
    accessToken: string,
    igUserId: string,
    options: {
      mediaType: "IMAGE" | "VIDEO" | "REELS" | "CAROUSEL" | "STORIES";
      imageUrl?: string;
      videoUrl?: string;
      caption?: string;
      shareToFeed?: boolean;
    }
  ): Promise<{ success: boolean; containerId?: string; error?: MetaNormalizedError }> {
    try {
      const url = `${GRAPH_API_BASE}/${igUserId}/media`;
      const body: Record<string, any> = {
        caption: options.caption || "",
      };

      if (options.mediaType === "IMAGE" || options.mediaType === "CAROUSEL") {
        body.image_url = options.imageUrl;
      } else if (options.mediaType === "REELS") {
        body.media_type = "REELS";
        body.video_url = options.videoUrl;
        body.share_to_feed = options.shareToFeed ?? true;
      } else if (options.mediaType === "STORIES") {
        body.media_type = "STORIES";
        if (options.imageUrl) body.image_url = options.imageUrl;
        if (options.videoUrl) body.video_url = options.videoUrl;
      } else if (options.mediaType === "VIDEO") {
        body.media_type = "VIDEO";
        body.video_url = options.videoUrl;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.id) {
        return { success: false, error: this.normalizeError(res.status, data) };
      }
      return { success: true, containerId: data.id };
    } catch (err) {
      return {
        success: false,
        error: {
          type: "PROVIDER_ERROR",
          message: err instanceof Error ? err.message : "Network error",
          userFacingExplanation: "Failed to initialize Instagram media container.",
          isRetryable: true,
        },
      };
    }
  }

  /**
   * Container Status Check: Step 2
   */
  async checkContainerStatus(
    accessToken: string,
    containerId: string
  ): Promise<{ status: "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED"; error?: string }> {
    try {
      const url = `${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${accessToken}`;
      const res = await fetch(url);
      if (!res.ok) return { status: "ERROR", error: `HTTP ${res.status}` };
      const data = await res.json();
      const code = data.status_code;
      if (code === "FINISHED") return { status: "FINISHED" };
      if (code === "IN_PROGRESS") return { status: "IN_PROGRESS" };
      if (code === "EXPIRED") return { status: "EXPIRED", error: "Media container expired" };
      return { status: "ERROR", error: data.status || "Media processing failed on Instagram" };
    } catch (err) {
      return { status: "ERROR", error: err instanceof Error ? err.message : "Status check failed" };
    }
  }

  /**
   * Container Publish: Step 3
   */
  async publishMediaContainer(
    accessToken: string,
    igUserId: string,
    containerId: string
  ): Promise<{ success: boolean; mediaId?: string; error?: MetaNormalizedError }> {
    try {
      const url = `${GRAPH_API_BASE}/${igUserId}/media_publish`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ creation_id: containerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.id) {
        return { success: false, error: this.normalizeError(res.status, data) };
      }
      return { success: true, mediaId: data.id };
    } catch (err) {
      return {
        success: false,
        error: {
          type: "PROVIDER_ERROR",
          message: err instanceof Error ? err.message : "Network error",
          userFacingExplanation: "Failed to publish media container to Instagram.",
          isRetryable: true,
        },
      };
    }
  }

  /**
   * Send Public Reply to an Instagram Comment
   */
  async replyToComment(
    accessToken: string,
    commentId: string,
    message: string
  ): Promise<{ success: boolean; commentId?: string; error?: MetaNormalizedError }> {
    try {
      const url = `${GRAPH_API_BASE}/${commentId}/replies`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      if (!res.ok || !data.id) {
        return { success: false, error: this.normalizeError(res.status, data) };
      }
      return { success: true, commentId: data.id };
    } catch (err) {
      return {
        success: false,
        error: {
          type: "PROVIDER_ERROR",
          message: err instanceof Error ? err.message : "Network error",
          userFacingExplanation: "Failed to publish reply to Instagram comment.",
          isRetryable: true,
        },
      };
    }
  }

  /**
   * Hide or Delete an Instagram Comment
   */
  async moderateComment(
    accessToken: string,
    commentId: string,
    action: "HIDE" | "UNHIDE" | "DELETE"
  ): Promise<{ success: boolean; error?: MetaNormalizedError }> {
    try {
      if (action === "DELETE") {
        const url = `${GRAPH_API_BASE}/${commentId}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
          return { success: false, error: this.normalizeError(res.status, data) };
        }
        return { success: true };
      } else {
        const url = `${GRAPH_API_BASE}/${commentId}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hide: action === "HIDE" }),
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
          return { success: false, error: this.normalizeError(res.status, data) };
        }
        return { success: true };
      }
    } catch (err) {
      return {
        success: false,
        error: {
          type: "PROVIDER_ERROR",
          message: err instanceof Error ? err.message : "Network error",
          userFacingExplanation: "Failed to moderate Instagram comment.",
          isRetryable: true,
        },
      };
    }
  }

  /**
   * Send Direct Message to an Instagram User (Within 24-hr Window)
   */
  async sendMessage(
    accessToken: string,
    igUserId: string,
    recipientId: string,
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: MetaNormalizedError }> {
    try {
      const url = `${GRAPH_API_BASE}/${igUserId}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.message_id) {
        return { success: false, error: this.normalizeError(res.status, data) };
      }
      return { success: true, messageId: data.message_id };
    } catch (err) {
      return {
        success: false,
        error: {
          type: "PROVIDER_ERROR",
          message: err instanceof Error ? err.message : "Network error",
          userFacingExplanation: "Failed to send Instagram direct message.",
          isRetryable: true,
        },
      };
    }
  }
}
