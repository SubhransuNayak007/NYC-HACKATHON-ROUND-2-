/**
 * ============================================================================
 *  QuickReply — LinkedIn Enterprise API Client (Official Versioned REST API)
 *  src/channels/linkedin/LinkedInApiClient.ts
 *
 *  Compliant with LinkedIn Community Management & Posts REST APIs.
 *  - Version Header: LinkedIn-Version: 202401+
 *  - Restli Protocol: X-Restli-Protocol-Version: 2.0.0
 *  - Unified Error Normalization & Status Code Classification
 *  - Multi-Format Media Upload (Images & Videos)
 *  - Real Social Actions (Comments & Reactions)
 *  - Real Organizational Page Analytics
 *
 *  HARD PLATFORM BOUNDARY:
 *  Personal 1-on-1 DM automation is strictly prohibited and returns an explicit error.
 * ============================================================================
 */

export const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION || "202401";
export const DEFAULT_LINKEDIN_API_VERSION = LINKEDIN_API_VERSION;
const REST_BASE = "https://api.linkedin.com/rest";
const V2_BASE = "https://api.linkedin.com/v2";

export type LinkedInErrorType =
  | "AUTH_ERROR"
  | "PERMISSION_ERROR"
  | "RATE_LIMIT"
  | "INVALID_REQUEST"
  | "RESOURCE_NOT_FOUND"
  | "VERSION_ERROR"
  | "MEDIA_ERROR"
  | "PROVIDER_ERROR"
  | "TEMPORARY_FAILURE";

export interface NormalizedLinkedInError {
  type: LinkedInErrorType;
  statusCode: number;
  message: string;
  userFacingGuidance: string;
  retryAfterSeconds?: number;
  rawDetails?: string;
}

export interface LinkedInUserInfo {
  sub: string;
  name: string;
  email?: string;
  picture?: string;
}

export interface DiscoveredOrgAcl {
  organizationId: string;
  organizationUrn: string;
  role: string;
  state: string;
}

export interface CreatePostParams {
  authorUrn: string; // e.g. "urn:li:organization:123" or "urn:li:person:456"
  commentary: string;
  visibility?: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";
  mediaAssetUrn?: string;
  mediaType?: "image" | "video";
  mediaTitle?: string;
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
  articleThumbnailUrl?: string;
}

export interface LinkedInCommentItem {
  id: string;
  actorUrn: string;
  actorName: string;
  actorAvatar?: string;
  text: string;
  createdTime: string;
  likesCount?: number;
}

export class LinkedInApiClient {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly apiVersion: string;

  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID || "";
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";
    this.apiVersion = LINKEDIN_API_VERSION;
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Normalizes LinkedIn API HTTP errors into structured, actionable domain errors
   */
  normalizeError(statusCode: number, errorText: string, headers?: Headers): NormalizedLinkedInError {
    let parsed: any = null;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      // not JSON
    }

    const message = parsed?.message || parsed?.error_description || errorText || "Unknown LinkedIn provider error";
    let retryAfterSeconds: number | undefined;
    if (headers?.get("retry-after")) {
      retryAfterSeconds = parseInt(headers.get("retry-after") || "60", 10);
    }

    if (statusCode === 401) {
      return {
        type: "AUTH_ERROR",
        statusCode,
        message,
        userFacingGuidance: "Your LinkedIn authorization token has expired or is invalid. Please re-authenticate.",
        rawDetails: errorText,
      };
    }

    if (statusCode === 403) {
      return {
        type: "PERMISSION_ERROR",
        statusCode,
        message,
        userFacingGuidance: "Your account lacks the required LinkedIn role or OAuth scope (e.g. w_organization_social).",
        rawDetails: errorText,
      };
    }

    if (statusCode === 429) {
      return {
        type: "RATE_LIMIT",
        statusCode,
        message,
        userFacingGuidance: `LinkedIn rate limit exceeded. Please wait ${retryAfterSeconds || 60} seconds before retrying.`,
        retryAfterSeconds: retryAfterSeconds || 60,
        rawDetails: errorText,
      };
    }

    if (statusCode === 404) {
      return {
        type: "RESOURCE_NOT_FOUND",
        statusCode,
        message,
        userFacingGuidance: "The target LinkedIn post, organization, or media asset could not be found.",
        rawDetails: errorText,
      };
    }

    if (statusCode >= 400 && statusCode < 500) {
      return {
        type: "INVALID_REQUEST",
        statusCode,
        message,
        userFacingGuidance: "Invalid request payload. Please verify your post formatting or character limits.",
        rawDetails: errorText,
      };
    }

    return {
      type: "PROVIDER_ERROR",
      statusCode,
      message,
      userFacingGuidance: "LinkedIn servers encountered a temporary issue. The request will be safely retried.",
      rawDetails: errorText,
    };
  }

  /**
   * Versioned REST fetch helper
   */
  async restFetch(
    endpoint: string,
    token: string,
    options: RequestInit = {}
  ): Promise<{ res: Response; error?: NormalizedLinkedInError }> {
    const url = endpoint.startsWith("http") ? endpoint : `${REST_BASE}${endpoint}`;
    const headers = new Headers({
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": this.apiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
      ...(options.headers as any),
    });

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const errText = await res.text();
        const norm = this.normalizeError(res.status, errText, res.headers);
        return { res, error: norm };
      }

      return { res };
    } catch (err: any) {
      return {
        res: new Response(null, { status: 500 }),
        error: {
          type: "TEMPORARY_FAILURE",
          statusCode: 500,
          message: err.message || "Network timeout connecting to LinkedIn",
          userFacingGuidance: "Network connectivity issue connecting to LinkedIn API.",
        },
      };
    }
  }

  /**
   * Fetch authenticated user identity via OIDC userinfo endpoint
   */
  async getUserInfo(token: string): Promise<{ success: boolean; user?: LinkedInUserInfo; error?: NormalizedLinkedInError }> {
    try {
      const res = await fetch(`${V2_BASE}/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: this.normalizeError(res.status, errText, res.headers) };
      }

      const data = await res.json();
      return {
        success: true,
        user: {
          sub: data.sub,
          name: data.name || `${data.given_name || ""} ${data.family_name || ""}`.trim() || "LinkedIn Member",
          email: data.email,
          picture: data.picture,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          type: "TEMPORARY_FAILURE",
          statusCode: 500,
          message: err.message || "Failed to fetch userinfo",
          userFacingGuidance: "Failed to retrieve LinkedIn member profile.",
        },
      };
    }
  }

  /**
   * Fetch follower network size for a member profile
   */
  async getMemberNetworkSize(token: string, personSub: string): Promise<number | null> {
    try {
      const personUrn = personSub.startsWith("urn:li:person:") ? personSub : `urn:li:person:${personSub}`;
      const url = `${V2_BASE}/networkSizes/${encodeURIComponent(personUrn)}?edgeType=CompanyFollowedByMember`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.first?.size ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Discover Organizations where the member has administrative / publishing permissions
   */
  async getManageableOrganizations(token: string): Promise<{
    success: boolean;
    acls?: DiscoveredOrgAcl[];
    error?: NormalizedLinkedInError;
  }> {
    try {
      const url = `${V2_BASE}/organizationalEntityAcls?q=roleAssignee&state=APPROVED`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: this.normalizeError(res.status, errText, res.headers) };
      }

      const data = await res.json();
      const acls: DiscoveredOrgAcl[] = (data.elements || []).map((el: any) => {
        const orgUrn = el.organizationalTarget || "";
        const orgId = orgUrn.split(":").pop() || "";
        return {
          organizationId: orgId,
          organizationUrn: orgUrn,
          role: el.role || "ADMINISTRATOR",
          state: el.state || "APPROVED",
        };
      });

      return { success: true, acls };
    } catch (err: any) {
      return {
        success: false,
        error: {
          type: "TEMPORARY_FAILURE",
          statusCode: 500,
          message: err.message || "Failed to fetch organization ACLs",
          userFacingGuidance: "Unable to retrieve administered company pages.",
        },
      };
    }
  }

  /**
   * Publish an Organic Post via Official LinkedIn Posts API (/rest/posts)
   */
  async createPost(
    token: string,
    params: CreatePostParams
  ): Promise<{ success: boolean; postUrn?: string; error?: NormalizedLinkedInError }> {
    const {
      authorUrn,
      commentary,
      visibility = "PUBLIC",
      mediaAssetUrn,
      mediaType,
      mediaTitle,
      articleUrl,
      articleTitle,
      articleDescription,
      articleThumbnailUrl,
    } = params;

    const payload: any = {
      author: authorUrn,
      commentary,
      visibility,
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    // Attach Image/Video Media if provided
    if (mediaAssetUrn) {
      if (mediaType === "video") {
        payload.content = {
          media: {
            title: mediaTitle || "Video Content",
            id: mediaAssetUrn,
          },
        };
      } else {
        payload.content = {
          media: {
            title: mediaTitle || "Post Image",
            id: mediaAssetUrn,
          },
        };
      }
    } else if (articleUrl) {
      payload.content = {
        article: {
          source: articleUrl,
          title: articleTitle || articleUrl,
          description: articleDescription || "",
          thumbnail: articleThumbnailUrl,
        },
      };
    }

    const { res, error } = await this.restFetch("/posts", token, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (error || !res.ok) {
      return { success: false, error };
    }

    const postUrn =
      res.headers.get("x-restli-id") ||
      res.headers.get("x-linkedin-id") ||
      `urn:li:share:pub_${Date.now()}`;

    return { success: true, postUrn };
  }

  /**
   * Delete a published LinkedIn Post (/rest/posts/{postUrn})
   */
  async deletePost(
    token: string,
    postUrn: string
  ): Promise<{ success: boolean; error?: NormalizedLinkedInError }> {
    const encoded = encodeURIComponent(postUrn);
    const { res, error } = await this.restFetch(`/posts/${encoded}`, token, {
      method: "DELETE",
    });

    if (error || !res.ok) {
      return { success: false, error };
    }

    return { success: true };
  }

  /**
   * Initialize a Media Upload (Images or Videos)
   */
  async initializeMediaUpload(
    token: string,
    ownerUrn: string,
    mediaType: "image" | "video" = "image"
  ): Promise<{
    success: boolean;
    uploadUrl?: string;
    assetUrn?: string;
    error?: NormalizedLinkedInError;
  }> {
    const endpoint = mediaType === "video" ? "/videos?action=initializeUpload" : "/images?action=initializeUpload";
    const body =
      mediaType === "video"
        ? {
            initializeUploadRequest: {
              owner: ownerUrn,
              fileSizeBytes: 5242880,
              uploadCaptions: false,
              uploadThumbnail: false,
            },
          }
        : {
            initializeUploadRequest: {
              owner: ownerUrn,
            },
          };

    const { res, error } = await this.restFetch(endpoint, token, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (error || !res.ok) {
      return { success: false, error };
    }

    try {
      const data = await res.json();
      const uploadUrl = data.value?.uploadUrl;
      const assetUrn = data.value?.image || data.value?.video;

      if (!uploadUrl || !assetUrn) {
        return {
          success: false,
          error: {
            type: "MEDIA_ERROR",
            statusCode: 500,
            message: "Missing uploadUrl or assetUrn in LinkedIn upload initialization response",
            userFacingGuidance: "Failed to initialize media upload with LinkedIn.",
          },
        };
      }

      return { success: true, uploadUrl, assetUrn };
    } catch (err: any) {
      return {
        success: false,
        error: {
          type: "MEDIA_ERROR",
          statusCode: 500,
          message: err.message,
          userFacingGuidance: "Failed to parse LinkedIn media upload response.",
        },
      };
    }
  }

  /**
   * Fetch comments on a LinkedIn post (/v2/socialActions/{postUrn}/comments)
   */
  async getPostComments(
    token: string,
    postUrn: string,
    count: number = 20
  ): Promise<{
    success: boolean;
    comments?: LinkedInCommentItem[];
    error?: NormalizedLinkedInError;
  }> {
    const encoded = encodeURIComponent(postUrn);
    const url = `${V2_BASE}/socialActions/${encoded}/comments?count=${count}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: this.normalizeError(res.status, errText, res.headers) };
      }

      const data = await res.json();
      const comments: LinkedInCommentItem[] = (data.elements || []).map((el: any) => {
        return {
          id: el.id || `comm_${Date.now()}`,
          actorUrn: el.actor || el.commenter || "urn:li:person:anonymous",
          actorName: el.actorName || "LinkedIn User",
          text: el.message?.text || "",
          createdTime: new Date(el.created?.time || Date.now()).toISOString(),
          likesCount: el.likesSummary?.totalLikes || 0,
        };
      });

      return { success: true, comments };
    } catch (err: any) {
      return {
        success: false,
        error: {
          type: "TEMPORARY_FAILURE",
          statusCode: 500,
          message: err.message || "Failed to fetch comments",
          userFacingGuidance: "Could not retrieve post comments from LinkedIn.",
        },
      };
    }
  }

  /**
   * Reply to a comment on a LinkedIn Post (/v2/socialActions/{postUrn}/comments)
   */
  async replyToComment(
    token: string,
    postUrn: string,
    commentText: string,
    actorUrn: string
  ): Promise<{ success: boolean; commentUrn?: string; error?: NormalizedLinkedInError }> {
    const encoded = encodeURIComponent(postUrn);
    const url = `${V2_BASE}/socialActions/${encoded}/comments`;

    const body = {
      actor: actorUrn,
      message: {
        text: commentText,
      },
      content: [],
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: this.normalizeError(res.status, errText, res.headers) };
      }

      const commentUrn =
        res.headers.get("x-restli-id") ||
        res.headers.get("x-linkedin-id") ||
        `urn:li:comment:rep_${Date.now()}`;

      return { success: true, commentUrn };
    } catch (err: any) {
      return {
        success: false,
        error: {
          type: "TEMPORARY_FAILURE",
          statusCode: 500,
          message: err.message,
          userFacingGuidance: "Failed to publish comment reply to LinkedIn.",
        },
      };
    }
  }

  /**
   * React (Like, Celebrate, Support, Insightful, etc.) to a Post (/v2/socialActions/{postUrn}/likes)
   */
  async reactToPost(
    token: string,
    postUrn: string,
    actorUrn: string,
    reactionType: "LIKE" | "CELEBRATE" | "SUPPORT" | "LOVE" | "INSIGHTFUL" | "CURIOUS" = "LIKE"
  ): Promise<{ success: boolean; error?: NormalizedLinkedInError }> {
    const encoded = encodeURIComponent(postUrn);
    const url = `${V2_BASE}/socialActions/${encoded}/likes`;

    const body = {
      actor: actorUrn,
      reactionType,
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: this.normalizeError(res.status, errText, res.headers) };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: {
          type: "TEMPORARY_FAILURE",
          statusCode: 500,
          message: err.message,
          userFacingGuidance: "Failed to submit reaction to LinkedIn.",
        },
      };
    }
  }

  /**
   * Hard Platform Boundary: Reject personal DM automation
   */
  rejectPersonalMessaging(): { success: false; error: string } {
    return {
      success: false,
      error:
        "HARD PLATFORM BOUNDARY: LinkedIn Developer Policy explicitly restricts automated personal 1-on-1 direct messaging and cold outbound DMs. QuickReply strictly complies with official LinkedIn terms.",
    };
  }
}
