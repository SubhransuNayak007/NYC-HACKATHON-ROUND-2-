/**
 * ============================================================================
 *  QuickReply — LinkedIn OAuth v2 Callback Route
 *  src/app/api/linkedin/auth/callback/route.ts
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/backend/auth/guard";
import {
  getDB,
  saveDB,
  encryptToken,
  getCanonicalTenantId,
  type LinkedInConnection,
  type LinkedInOrganization,
} from "@/database/db";
import { LinkedInApiClient, LINKEDIN_API_VERSION } from "@/channels/linkedin/LinkedInApiClient";

const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=session_required", req.url));
  }

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("LinkedIn OAuth error received:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/dashboard/linkedin?error=${encodeURIComponent(errorDescription || error)}`, req.url)
    );
  }

  const storedState = req.cookies.get("linkedin_oauth_state")?.value;
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard/linkedin?error=invalid_csrf_state", req.url)
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${origin}/api/linkedin/auth/callback`;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/dashboard/linkedin?error=missing_server_credentials", req.url)
    );
  }

  try {
    // 1. Exchange code for Access Token
    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("LinkedIn Token Exchange Failed:", errText);
      return NextResponse.redirect(
        new URL("/dashboard/linkedin?error=token_exchange_failed", req.url)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 5184000; // 60 days default
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const authorizedScopes = (tokenData.scope || "openid profile email w_member_social r_organization_social w_organization_social").split(/[\s,]+/);

    // 2. Discover Profile via official client
    const apiClient = new LinkedInApiClient();
    const userResult = await apiClient.getUserInfo(accessToken);
    if (!userResult.success || !userResult.user) {
      return NextResponse.redirect(
        new URL("/dashboard/linkedin?error=userinfo_fetch_failed", req.url)
      );
    }

    const user = userResult.user;
    const memberUrn = `urn:li:person:${user.sub}`;

    // 3. Discover Member Network Size
    const followerCount = await apiClient.getMemberNetworkSize(accessToken, user.sub);

    // 4. Discover Administered Organizations (Company Pages)
    const orgResult = await apiClient.getManageableOrganizations(accessToken);
    const discoveredAcls = orgResult.acls || [];

    // 5. Encrypt Credentials & Commit Multi-Tenant State
    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);
    const workspaceId = (db.workspace as any)?.id || db.workspace?.name || `ws_${tenantId}`;
    const connectionId = `li_conn_${crypto.randomBytes(8).toString("hex")}`;

    const newConnection: LinkedInConnection = {
      id: connectionId,
      tenantId,
      workspaceId,
      provider: "linkedin_official_rest",
      status: "CONNECTED",
      memberId: user.sub,
      memberUrn,
      memberName: user.name,
      memberEmail: user.email,
      memberAvatarUrl: user.picture,
      organizationIds: discoveredAcls.map((a) => a.organizationId),
      authorizedScopes,
      accessTokenEncrypted: encryptToken(accessToken),
      refreshTokenEncrypted: refreshToken ? encryptToken(refreshToken) : undefined,
      tokenExpiresAt,
      apiVersion: LINKEDIN_API_VERSION,
      lastSuccessfulRequestAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.linkedinConnections) db.linkedinConnections = [];
    // Mark old connections as superseded
    for (const c of db.linkedinConnections) {
      c.status = "DISCONNECTED";
    }
    db.linkedinConnections.push(newConnection);

    // Persist Discovered Organizations
    if (!db.linkedinOrganizations) db.linkedinOrganizations = [];
    const orgsToSave: LinkedInOrganization[] = discoveredAcls.map((acl) => ({
      id: `li_org_${acl.organizationId}`,
      tenantId,
      connectionId,
      organizationId: acl.organizationId,
      organizationUrn: acl.organizationUrn,
      name: `LinkedIn Organization (${acl.organizationId})`,
      role: acl.role,
      permissions: ["w_organization_social", "r_organization_social"],
      status: "ACTIVE",
      lastSyncedAt: new Date().toISOString(),
    }));

    // Merge or replace active orgs for this tenant
    db.linkedinOrganizations = [
      ...db.linkedinOrganizations.filter((o) => o.connectionId !== connectionId),
      ...orgsToSave,
    ];

    await saveDB(db, session.email);

    const res = NextResponse.redirect(
      new URL("/dashboard/linkedin?connected=true", req.url)
    );
    res.cookies.delete("linkedin_oauth_state");
    return res;
  } catch (err: any) {
    console.error("LinkedIn OAuth Callback Exception:", err);
    return NextResponse.redirect(
      new URL(`/dashboard/linkedin?error=${encodeURIComponent(err.message || "internal_error")}`, req.url)
    );
  }
}
