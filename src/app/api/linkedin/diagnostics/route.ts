/**
 * ============================================================================
 *  QuickReply — LinkedIn Connection Diagnostics & Health API
 *  src/app/api/linkedin/diagnostics/route.ts
 *
 *  Provides real-time inspection of:
 *   - Official API Version Headers
 *   - OAuth Token Validity & Expiry Countdown
 *   - Granular Capability Matrix (Granted vs Denied vs Unavailable)
 *   - Administered Organization ACL Health
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenantAccess } from "@/backend/auth/guard";
import { getDB } from "@/database/db";
import { LINKEDIN_API_VERSION } from "@/channels/linkedin/LinkedInApiClient";
import { LinkedInCapabilityService } from "@/channels/linkedin/LinkedInCapabilityService";

export async function GET(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "VIEWER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const db = await getDB(session.email);

  const connection = (db.linkedinConnections || []).find((c) => c.status === "CONNECTED") || null;
  const organizations = (db.linkedinOrganizations || []).filter((o) => o.status === "ACTIVE");

  const manifest = LinkedInCapabilityService.evaluate(connection, organizations);

  const clientIdConfigured = Boolean(process.env.LINKEDIN_CLIENT_ID);
  const clientSecretConfigured = Boolean(process.env.LINKEDIN_CLIENT_SECRET);

  let tokenStatus = "NOT_CONFIGURED";
  let tokenRemainingDays = 0;

  if (connection?.tokenExpiresAt) {
    const diffMs = new Date(connection.tokenExpiresAt).getTime() - Date.now();
    if (diffMs > 0) {
      tokenStatus = "VALID";
      tokenRemainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } else {
      tokenStatus = "EXPIRED";
    }
  }

  return NextResponse.json({
    success: true,
    diagnostics: {
      provider: "LinkedIn Community Management & Posts REST API",
      apiVersion: LINKEDIN_API_VERSION,
      restliProtocol: "2.0.0",
      environment: {
        clientIdSet: clientIdConfigured,
        clientSecretSet: clientSecretConfigured,
      },
      connection: connection
        ? {
            id: connection.id,
            status: connection.status,
            memberId: connection.memberId,
            memberUrn: connection.memberUrn,
            memberName: connection.memberName,
            memberEmail: connection.memberEmail,
            tokenStatus,
            tokenExpiresAt: connection.tokenExpiresAt,
            tokenRemainingDays,
            authorizedScopes: connection.authorizedScopes,
            organizationsCount: organizations.length,
            lastSuccessfulRequestAt: connection.lastSuccessfulRequestAt,
            lastError: connection.errorMessage
              ? { code: connection.errorCode, message: connection.errorMessage }
              : null,
          }
        : null,
      manifest,
      healthPillars: {
        oauthConfig: clientIdConfigured && clientSecretConfigured ? "HEALTHY" : "MISSING_ENV",
        tokenHealth: tokenStatus === "VALID" ? "HEALTHY" : connection ? "EXPIRED" : "NOT_CONNECTED",
        organizationAcl: organizations.length > 0 ? "ATTACHED" : "NO_PAGES_FOUND",
        publishingReady: manifest.isReadyToPublish ? "READY" : "RESTRICTED",
        commentsReady: manifest.canManageComments ? "READY" : "RESTRICTED",
        analyticsReady: manifest.canViewAnalytics ? "READY" : "RESTRICTED",
      },
    },
  });
}
