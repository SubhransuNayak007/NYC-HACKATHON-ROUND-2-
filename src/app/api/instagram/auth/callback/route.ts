import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB, encryptToken, InstagramAccount, InstagramConnection } from "@/database/db";
import { MetaApiClient } from "@/channels/instagram/MetaApiClient";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const dashboardUrl = `${req.nextUrl.origin}/dashboard/instagram`;

  if (error) {
    return NextResponse.redirect(`${dashboardUrl}?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${dashboardUrl}?error=${encodeURIComponent("Missing authorization code or state parameter.")}`);
  }

  // Verify CSRF state token
  const cookieState = req.cookies.get("meta_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${dashboardUrl}?error=${encodeURIComponent("CSRF state validation failed.")}`);
  }

  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.redirect(`${dashboardUrl}?error=${encodeURIComponent("Session expired. Please log in first.")}`);
    }

    const metaClient = new MetaApiClient();
    const redirectUri = `${req.nextUrl.origin}/api/instagram/auth/callback`;

    // 1. Exchange Code for 60-day Long-Lived Token
    const exchangeRes = await metaClient.exchangeCodeForLongLivedToken(code, redirectUri);
    if (!exchangeRes.success || !exchangeRes.accessToken) {
      const errMsg = exchangeRes.error?.message || "Failed to exchange authorization code with Meta.";
      return NextResponse.redirect(`${dashboardUrl}?error=${encodeURIComponent(errMsg)}`);
    }

    const rawToken = exchangeRes.accessToken;
    const expiresIn = exchangeRes.expiresIn || 5184000;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 2. Discover Linked Instagram Accounts
    const discovered = await metaClient.discoverInstagramAccounts(rawToken);
    let igUserId = "me";
    let igUsername = "instagram_business_user";

    if (discovered.length > 0) {
      igUserId = discovered[0].igUserId;
      igUsername = discovered[0].igUsername;
    } else {
      // Fallback to me profile
      const profRes = await metaClient.getProfile(rawToken);
      if (profRes.success && profRes.profile) {
        igUserId = profRes.profile.id;
        igUsername = profRes.profile.username;
      }
    }

    // 3. Encrypt Token (AES-256-GCM)
    const encryptedToken = encryptToken(rawToken);

    // 4. Save to Multi-Tenant DB
    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);
    const workspaceId = (db.workspace as any)?.id || db.workspace?.name || `ws_${tenantId}`;

    if (!db.instagramConnections) db.instagramConnections = [];
    if (!db.instagramAccounts) db.instagramAccounts = [];

    // Remove existing connections for this tenant
    db.instagramConnections = db.instagramConnections.filter((c) => c.tenantId !== tenantId);
    db.instagramAccounts = db.instagramAccounts.filter((a) => a.tenantId !== tenantId);

    const connectionId = `ig_conn_${crypto.randomBytes(8).toString("hex")}`;
    const accountId = `ig_acc_${crypto.randomBytes(8).toString("hex")}`;

    const newConnection: InstagramConnection = {
      id: connectionId,
      tenantId,
      workspaceId,
      accountId,
      encryptedCredentialRef: encryptedToken,
      status: "READY",
      expiresAt,
      scopes: [
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_comments",
        "instagram_manage_messages",
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
      ],
      lastSuccessfulCallAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newAccount: InstagramAccount = {
      id: accountId,
      tenantId,
      workspaceId,
      providerAccountId: igUserId,
      username: igUsername,
      displayName: igUsername,
      accountType: "BUSINESS",
      status: "ACTIVE",
      capabilities: ["CONTENT_PUBLISH", "COMMENT_REPLY", "DM_REPLY", "INSIGHTS"],
      followersCount: 0,
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.instagramConnections.push(newConnection);
    db.instagramAccounts.push(newAccount);

    await saveDB(db, session.email);

    const res = NextResponse.redirect(`${dashboardUrl}?connected=true`);
    res.cookies.delete("meta_oauth_state");
    return res;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal OAuth error";
    return NextResponse.redirect(`${dashboardUrl}?error=${encodeURIComponent(errorMsg)}`);
  }
}
