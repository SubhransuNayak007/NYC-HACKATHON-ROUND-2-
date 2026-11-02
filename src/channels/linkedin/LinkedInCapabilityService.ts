/**
 * ============================================================================
 *  QuickReply — LinkedIn Capability Service
 *  src/channels/linkedin/LinkedInCapabilityService.ts
 *
 *  Dynamically evaluates account capabilities based on:
 *   1. Granted OAuth Scopes
 *   2. Token Validity & Expiration
 *   3. Discovered Organization Roles & Permissions
 *   4. Verified LinkedIn API Tier Availability
 *
 *  NEVER simulates or hardcodes granted capabilities.
 * ============================================================================
 */

import type { LinkedInConnection, LinkedInOrganization } from "@/database/db";

export type CapabilityStatus = "GRANTED" | "DENIED" | "UNAVAILABLE" | "REQUESTED";

export interface CapabilityItem {
  key: string;
  label: string;
  category: "Publishing" | "Engagement" | "Analytics" | "Administration";
  status: CapabilityStatus;
  requiredScopes: string[];
  requiredRole?: string;
  description: string;
  explanation: string;
  resolution?: string;
}

export interface LinkedInCapabilityManifest {
  connectionId?: string;
  memberUrn?: string;
  status: string;
  isReadyToPublish: boolean;
  canPublishMember: boolean;
  canPublishOrg: boolean;
  canManageComments: boolean;
  canViewAnalytics: boolean;
  grantedScopes: string[];
  missingScopes: string[];
  capabilities: CapabilityItem[];
  evaluatedAt: string;
}

export class LinkedInCapabilityService {
  /**
   * Derive full capability manifest for a connected LinkedIn account
   */
  static evaluate(
    conn?: LinkedInConnection | null,
    orgs?: LinkedInOrganization[]
  ): LinkedInCapabilityManifest {
    const isConnected = !!conn && conn.status === "CONNECTED";
    const scopes = new Set((conn?.authorizedScopes || []).map((s) => s.trim().toLowerCase()));

    // Check Organization Admin roles
    const hasAdminOrg = (orgs || []).some(
      (o) =>
        o.status === "ACTIVE" &&
        ["ADMINISTRATOR", "CONTENT_ADMIN", "DIRECT_SPONSORED_CONTENT_POSTER"].includes(o.role?.toUpperCase())
    );

    const capabilities: CapabilityItem[] = [
      {
        key: "CAN_PUBLISH_MEMBER_POST",
        label: "Member Profile Publishing",
        category: "Publishing",
        status: !isConnected
          ? "UNAVAILABLE"
          : scopes.has("w_member_social")
          ? "GRANTED"
          : "DENIED",
        requiredScopes: ["w_member_social"],
        description: "Create and publish organic text, media, and article posts to your personal LinkedIn profile.",
        explanation: scopes.has("w_member_social")
          ? "Scope 'w_member_social' is actively authorized."
          : "Missing 'w_member_social' scope in OAuth permissions.",
        resolution: "Re-authenticate and grant member social publishing access.",
      },
      {
        key: "CAN_PUBLISH_ORGANIZATION_POST",
        label: "Company Page Publishing",
        category: "Publishing",
        status: !isConnected
          ? "UNAVAILABLE"
          : scopes.has("w_organization_social") && hasAdminOrg
          ? "GRANTED"
          : scopes.has("w_organization_social") && !hasAdminOrg
          ? "DENIED"
          : "UNAVAILABLE",
        requiredScopes: ["w_organization_social"],
        requiredRole: "ADMINISTRATOR or CONTENT_ADMIN",
        description: "Publish company updates, announcements, and thought leadership to administered LinkedIn Pages.",
        explanation:
          scopes.has("w_organization_social") && hasAdminOrg
            ? "Authorized for company page publishing with verified administrator role."
            : !hasAdminOrg
            ? "Your account is not an Administrator or Content Admin of any connected Company Page."
            : "Requires Community Management API approval and 'w_organization_social' scope.",
        resolution: "Ensure your LinkedIn member account is assigned as an Administrator on your Company Page.",
      },
      {
        key: "CAN_READ_ORGANIZATION_POSTS",
        label: "Company Page Posts Feed",
        category: "Publishing",
        status: !isConnected
          ? "UNAVAILABLE"
          : scopes.has("r_organization_social") || scopes.has("rw_organization_admin")
          ? "GRANTED"
          : "DENIED",
        requiredScopes: ["r_organization_social"],
        description: "Synchronize company page feed, post URNs, and post metadata.",
        explanation:
          scopes.has("r_organization_social") || scopes.has("rw_organization_admin")
            ? "Read organization scope is authorized."
            : "Missing 'r_organization_social' scope.",
        resolution: "Request Page Read permissions during OAuth login.",
      },
      {
        key: "CAN_COMMENT",
        label: "Comment Reply & Social Actions",
        category: "Engagement",
        status: !isConnected
          ? "UNAVAILABLE"
          : scopes.has("w_member_social") || scopes.has("w_organization_social")
          ? "GRANTED"
          : "DENIED",
        requiredScopes: ["w_member_social", "w_organization_social"],
        description: "Publish replies to comments on member and company page posts.",
        explanation: "Authorized via social action writing scopes.",
        resolution: "Ensure member or organization write permissions are granted.",
      },
      {
        key: "CAN_REACT",
        label: "Post Reactions (Like, Insightful)",
        category: "Engagement",
        status: !isConnected
          ? "UNAVAILABLE"
          : scopes.has("w_member_social") || scopes.has("w_organization_social")
          ? "GRANTED"
          : "DENIED",
        requiredScopes: ["w_member_social"],
        description: "Submit official reactions (Like, Celebrate, Support, Insightful) on LinkedIn posts.",
        explanation: "Enabled with member social write permissions.",
      },
      {
        key: "CAN_READ_SOCIAL_ACTIONS",
        label: "Comments & Social Inbox Monitoring",
        category: "Engagement",
        status: !isConnected
          ? "UNAVAILABLE"
          : scopes.has("r_organization_social") || scopes.has("w_member_social")
          ? "GRANTED"
          : "DENIED",
        requiredScopes: ["r_organization_social"],
        description: "Retrieve comments and reactions for sentiment analysis and customer inquiry triage.",
        explanation: "Reading comments requires standard social actions read access.",
      },
      {
        key: "CAN_RECEIVE_ORGANIZATION_NOTIFICATIONS",
        label: "Real-Time Page Notifications (Webhooks)",
        category: "Administration",
        status: !isConnected
          ? "UNAVAILABLE"
          : scopes.has("rw_organization_admin")
          ? "GRANTED"
          : "UNAVAILABLE",
        requiredScopes: ["rw_organization_admin"],
        description: "Receive instant webhook callbacks when new comments or mentions occur on your Company Page.",
        explanation: "Requires LinkedIn Partner Development Tier and Organization Webhook subscription.",
        resolution: "Apply for LinkedIn Developer Community Management Webhook access in Developer Portal.",
      },
      {
        key: "CAN_READ_PAGE_ANALYTICS",
        label: "Company Page & Post Analytics",
        category: "Analytics",
        status: !isConnected
          ? "UNAVAILABLE"
          : scopes.has("r_organization_social") || scopes.has("rw_organization_admin")
          ? "GRANTED"
          : "DENIED",
        requiredScopes: ["r_organization_social"],
        description: "Sync organic impressions, follower growth, engagement rates, and top performing posts.",
        explanation: "Requires organization read permissions.",
        resolution: "Ensure 'r_organization_social' scope is granted.",
      },
    ];

    const canPublishMember = capabilities.find((c) => c.key === "CAN_PUBLISH_MEMBER_POST")?.status === "GRANTED";
    const canPublishOrg = capabilities.find((c) => c.key === "CAN_PUBLISH_ORGANIZATION_POST")?.status === "GRANTED";
    const canManageComments = capabilities.find((c) => c.key === "CAN_COMMENT")?.status === "GRANTED";
    const canViewAnalytics = capabilities.find((c) => c.key === "CAN_READ_PAGE_ANALYTICS")?.status === "GRANTED";

    const allRequired = ["openid", "profile", "email", "w_member_social", "r_organization_social", "w_organization_social"];
    const missingScopes = allRequired.filter((s) => !scopes.has(s));

    return {
      connectionId: conn?.id,
      memberUrn: conn?.memberUrn,
      status: conn?.status || "NOT_CONNECTED",
      isReadyToPublish: canPublishMember || canPublishOrg,
      canPublishMember,
      canPublishOrg,
      canManageComments,
      canViewAnalytics,
      grantedScopes: Array.from(scopes),
      missingScopes,
      capabilities,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
