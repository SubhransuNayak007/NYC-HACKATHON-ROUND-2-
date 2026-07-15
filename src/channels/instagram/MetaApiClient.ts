/**
 * ============================================================
 *  QuickReply — Meta Instagram API Client
 *  src/channels/instagram/MetaApiClient.ts
 *
 *  Official Meta Graph API v19.0 Client for Instagram Professional.
 *  Handles authentications, permissions, DMs, comments, private replies,
 *  media container creation, and post publishing.
 * ============================================================
 */

import crypto from "crypto";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaTokenInfo {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
}

export interface InstagramAccountProfile {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  mediaCount?: number;
  biography?: string;
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
      field: "comments" | "mentions";
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
    this.appId = process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID || "";
    this.appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || "";
    this.verifyToken = process.env.META_VERIFY_TOKEN || process.env.INSTAGRAM_VERIFY_TOKEN || "quickreply_meta_webhook_secret";
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
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
   * Validate webhook payload SHA-256 HMAC signature (X-Hub-Signature-256)
   */
  validateWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!this.appSecret || !signatureHeader) return false;
    const signature = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
    const expected = crypto.createHmac("sha256", this.appSecret).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  /**
   * Exchange OAuth code for long-lived access token
   */
  async exchangeCodeForLongLivedToken(code: string, redirectUri: string): Promise<{
    success: boolean;
    accessToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    try {
      // Step 1: Exchange code for short-lived token
      const tokenUrl = `https://api.instagram.com/oauth/access_token`;
      const formData = new FormData();
      formData.append("client_id", this.appId);
      formData.append("client_secret", this.appSecret);
      formData.append("grant_type", "authorization_code");
      formData.append("redirect_uri", redirectUri);
      formData.append("code", code);

      const res1 = await fetch(tokenUrl, { method: "POST", body: formData });
      if (!res1.ok) {
        const err = await res1.json();
        return { success: false, error: err.error_message || err.error?.message || "Failed to exchange code" };
      }

      const data1 = await res1.json();
      const shortToken = data1.access_token;

      // Step 2: Exchange short token for 60-day long-lived token
      const longUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${this.appSecret}&access_token=${shortToken}`;
      const res2 = await fetch(longUrl);
      if (!res2.ok) {
        return { success: true, accessToken: shortToken, expiresIn: 3600 };
      }

      const data2 = await res2.json();
      return {
        success: true,
        accessToken: data2.access_token || shortToken,
        expiresIn: data2.expires_in || 5184000, // 60 days
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "OAuth exchange error" };
    }
  }

  /**
   * Fetch connected Instagram Professional account details
   */
  async getProfile(accessToken: string): Promise<{ success: boolean; profile?: InstagramAccountProfile; error?: string }> {
    try {
      const url = `https://graph.instagram.com/me?fields=id,username,account_type,profile_picture_url,followers_count,media_count&access_token=${accessToken}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error?.message || `HTTP ${res.status}` };
      }
      const data = await res.json();
      return {
        success: true,
        profile: {
          id: data.id,
          username: data.username,
          name: data.username,
          profilePictureUrl: data.profile_picture_url,
          followersCount: data.followers_count,
          mediaCount: data.media_count,
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Profile fetch error" };
    }
  }

  /**
   * Send Direct Message to an Instagram user (Within 24-hr window)
   */
  async sendMessage(
    igUserId: string,
    recipientId: string,
    text: string,
    accessToken: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error?.message || `HTTP ${res.status}` };
      }

      const data = await res.json();
      return { success: true, messageId: data.message_id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Send DM error" };
    }
  }

  /**
   * Reply publicly to an Instagram comment
   */
  async replyToComment(
    commentId: string,
    message: string,
    accessToken: string
  ): Promise<{ success: boolean; commentId?: string; error?: string }> {
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

      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error?.message || `HTTP ${res.status}` };
      }

      const data = await res.json();
      return { success: true, commentId: data.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Comment reply error" };
    }
  }

  /**
   * Send a private reply to an Instagram comment
   */
  async sendPrivateCommentReply(
    igUserId: string,
    commentId: string,
    text: string,
    accessToken: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `${GRAPH_API_BASE}/${igUserId}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error?.message || `HTTP ${res.status}` };
      }

      const data = await res.json();
      return { success: true, messageId: data.message_id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Private reply error" };
    }
  }

  /**
   * Publish an Image post to Instagram
   * 1. Create container -> 2. Poll status -> 3. Publish container
   */
  async publishImagePost(
    igUserId: string,
    imageUrl: string,
    caption: string,
    accessToken: string
  ): Promise<{ success: boolean; mediaId?: string; error?: string }> {
    try {
      // 1. Create media container
      const containerRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
        }),
      });

      if (!containerRes.ok) {
        const err = await containerRes.json();
        return { success: false, error: err.error?.message || "Container creation failed" };
      }

      const containerData = await containerRes.json();
      const creationId = containerData.id;

      // 2. Poll status until READY
      let isReady = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(`${GRAPH_API_BASE}/${creationId}?fields=status_code&access_token=${accessToken}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status_code === "FINISHED") {
            isReady = true;
            break;
          } else if (statusData.status_code === "ERROR") {
            return { success: false, error: "Media container processing failed" };
          }
        }
      }

      if (!isReady) {
        return { success: false, error: "Timed out waiting for media container processing" };
      }

      // 3. Publish container
      const publishRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ creation_id: creationId }),
      });

      if (!publishRes.ok) {
        const err = await publishRes.json();
        return { success: false, error: err.error?.message || "Publishing media container failed" };
      }

      const publishData = await publishRes.json();
      return { success: true, mediaId: publishData.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Publish post error" };
    }
  }
}
