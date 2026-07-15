/**
 * ============================================================
 *  QuickReply — LinkedIn Community Management API Client
 *  src/channels/linkedin/LinkedInApiClient.ts
 *
 *  Official LinkedIn Community Management REST API Client.
 *  Uses versioned requests (LinkedIn-Version header) for Organization/Page posts,
 *  comments, reactions, and analytics.
 *
 *  HARD PLATFORM BOUNDARY:
 *  Personal DM automation is NOT supported and will return an explicit error.
 * ============================================================
 */

export const DEFAULT_LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION || "202401";
const REST_API_BASE = "https://api.linkedin.com/rest";
const V2_API_BASE = "https://api.linkedin.com/v2";

export interface LinkedInOrganization {
  id: string;
  name?: string;
  urn: string;
  role: string;
}

export class LinkedInApiClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiVersion: string;

  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID || "";
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";
    this.apiVersion = DEFAULT_LINKEDIN_API_VERSION;
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Helper to perform versioned REST API calls
   */
  private async restFetch(endpoint: string, token: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": this.apiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
      ...options.headers,
    };

    return fetch(`${REST_API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  }

  /**
   * Fetch organizations the authenticated member is authorized to manage
   */
  async getManageableOrganizations(token: string): Promise<{
    success: boolean;
    organizations?: LinkedInOrganization[];
    error?: string;
  }> {
    try {
      const url = `${V2_API_BASE}/organizationalEntityAcls?q=roleAssignee&state=APPROVED`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `Failed to fetch organizations: ${err}` };
      }

      const data = await res.json();
      const orgs: LinkedInOrganization[] = (data.elements || []).map((el: any) => {
        const urn = el.organizationalTarget; // e.g. "urn:li:organization:12345"
        const id = urn?.split(":").pop() || "";
        return {
          id,
          urn,
          role: el.role,
        };
      });

      return { success: true, organizations: orgs };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "ACL fetch error" };
    }
  }

  /**
   * Publish an organic post to a LinkedIn Company Page
   */
  async createCompanyPost(
    orgUrn: string,
    commentary: string,
    token: string
  ): Promise<{ success: boolean; postUrn?: string; error?: string }> {
    try {
      const body = {
        author: orgUrn.startsWith("urn:li:organization:") ? orgUrn : `urn:li:organization:${orgUrn}`,
        commentary,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      const res = await this.restFetch("/posts", token, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `Post creation failed: ${err}` };
      }

      const postUrn = res.headers.get("x-restli-id") || res.headers.get("x-linkedin-id") || `post_${Date.now()}`;
      return { success: true, postUrn };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Create post error" };
    }
  }

  /**
   * Reply to a comment on a LinkedIn post
   */
  async replyToComment(
    postUrn: string,
    commentText: string,
    actorUrn: string,
    token: string
  ): Promise<{ success: boolean; commentUrn?: string; error?: string }> {
    try {
      const encodedPostUrn = encodeURIComponent(postUrn);
      const url = `${V2_API_BASE}/socialActions/${encodedPostUrn}/comments`;

      const body = {
        actor: actorUrn,
        message: {
          text: commentText,
        },
      };

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
        const err = await res.text();
        return { success: false, error: `Comment reply failed: ${err}` };
      }

      const data = await res.json();
      return { success: true, commentUrn: data.id || data.createdComment?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Comment reply error" };
    }
  }

  /**
   * Hard platform boundary check for personal DM automation
   */
  rejectPersonalMessaging(): { success: false; error: string; supported: false } {
    return {
      success: false,
      supported: false,
      error:
        "DIRECT MESSAGE AUTOMATION NOT AVAILABLE FOR THIS CONNECTION. Standard LinkedIn Community Management APIs support Organization Page publishing, comments, and analytics only. Personal inbox automation is restricted by LinkedIn and prohibited.",
    };
  }
}
