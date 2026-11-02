/**
 * ============================================================================
 *  QuickReply — Instagram Professional OAuth 2.0 Callback Route
 *  src/app/api/integrations/instagram/callback/route.ts
 *
 *  Flow:
 *   1. Reads authorization code & CSRF state.
 *   2. Validates state cookie against incoming state (Timing-safe comparison).
 *   3. Exchanges authorization code with Meta Graph API v19.0+.
 *   4. Exchanges short-lived token for 60-day Long-Lived User Token.
 *   5. Discovers linked Facebook Pages and Instagram Professional Accounts.
 *   6. Encrypts token using AES-256-GCM.
 *   7. Persists InstagramConnection with multi-tenant isolation.
 *   8. Redirects to /dashboard/platforms?connected=instagram
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB, encryptToken, InstagramConnection, InstagramAccount } from "@/database/db";

export const dynamic = "force-dynamic";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

function safeCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(req: NextRequest) {
  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  const platformsUrl = new URL("/dashboard/platforms", appUrl);

  // Helper: expire the ig_oauth_state cookie with correct path on all redirect responses
  const deleteStateCookieFn = (res: NextResponse) => {
    res.cookies.set("ig_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/api/integrations/instagram/callback",
    });
    return res;
  };

  // 1. Check for Meta OAuth Errors / User Cancellation
  if (error || errorReason) {
    console.warn(`[Instagram OAuth] Meta returned error: ${error} (${errorDescription || errorReason})`);
    platformsUrl.searchParams.set(
      "error",
      errorDescription || errorReason || "Instagram authorization was declined or cancelled."
    );
    return deleteStateCookieFn(NextResponse.redirect(platformsUrl));
  }

  // 2. Validate Code and State Presence
  if (!code || !state) {
    platformsUrl.searchParams.set("error", "Missing authorization code or state from Meta.");
    return deleteStateCookieFn(NextResponse.redirect(platformsUrl));
  }

  // 3. Validate HMAC-Signed State Cookie (Constant-Time, Single-Use)
  const storedSignedState = req.cookies.get("ig_oauth_state")?.value;
  const deleteStateCookie = (res: NextResponse) => {
    res.cookies.set("ig_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/api/integrations/instagram/callback",
    });
    return res;
  };

  if (!storedSignedState) {
    console.error("[Instagram OAuth] Missing ig_oauth_state cookie");
    platformsUrl.searchParams.set("error", "OAuth state verification failed. Please try connecting again.");
    return deleteStateCookie(NextResponse.redirect(platformsUrl));
  }

  // Cookie format: <payload>.<signature>
  const lastDot = storedSignedState.lastIndexOf(".");
  if (lastDot === -1) {
    console.error("[Instagram OAuth] Malformed ig_oauth_state cookie");
    platformsUrl.searchParams.set("error", "OAuth state verification failed. Please try connecting again.");
    return deleteStateCookie(NextResponse.redirect(platformsUrl));
  }

  const cookiePayload = storedSignedState.slice(0, lastDot);
  const cookieSignature = storedSignedState.slice(lastDot + 1);

  // The `state` query param from Meta should match the payload portion of the cookie
  if (!safeCompare(cookiePayload, state)) {
    console.error("[Instagram OAuth] State mismatch: query param does not match cookie payload");
    platformsUrl.searchParams.set("error", "OAuth state verification failed. Please try connecting again.");
    return deleteStateCookie(NextResponse.redirect(platformsUrl));
  }

  // Verify HMAC signature on the cookie payload
  const sessionSecret = process.env.SESSION_SECRET || "";
  if (!sessionSecret || sessionSecret.length < 32) {
    console.error("[Instagram OAuth] SESSION_SECRET missing — cannot verify state signature");
    platformsUrl.searchParams.set("error", "Server configuration error.");
    return deleteStateCookie(NextResponse.redirect(platformsUrl));
  }

  const expectedSig = crypto.createHmac("sha256", sessionSecret).update(cookiePayload).digest("hex");
  if (!safeCompare(expectedSig, cookieSignature)) {
    console.error("[Instagram OAuth] HMAC signature verification failed — possible cookie tampering");
    platformsUrl.searchParams.set("error", "OAuth state verification failed. Please try connecting again.");
    return deleteStateCookie(NextResponse.redirect(platformsUrl));
  }

  // 4. Decode & Validate State Payload (Expiry check)
  let tenantEmail = "";
  try {
    const decoded = JSON.parse(Buffer.from(cookiePayload, "base64url").toString("utf8"));
    if (decoded.ts && Date.now() - decoded.ts > 10 * 60 * 1000) {
      platformsUrl.searchParams.set("error", "OAuth authorization session expired. Please retry.");
      return deleteStateCookie(NextResponse.redirect(platformsUrl));
    }
    tenantEmail = decoded.tenant || "";
  } catch (parseErr) {
    console.error("[Instagram OAuth] State payload decode error:", parseErr);
    platformsUrl.searchParams.set("error", "Invalid OAuth state. Please try connecting again.");
    return deleteStateCookie(NextResponse.redirect(platformsUrl));
  }

  // Require verified tenant from state — no fallback to unverified cookie
  if (!tenantEmail) {
    console.error("[Instagram OAuth] State payload missing tenant email");
    platformsUrl.searchParams.set("error", "Unauthorized: Cannot identify the connecting user.");
    return deleteStateCookie(NextResponse.redirect(platformsUrl));
  }

  const metaAppId =
    process.env.META_APP_ID ||
    process.env.INSTAGRAM_CLIENT_ID ||
    process.env.META_CLIENT_ID;

  const metaAppSecret =
    process.env.META_APP_SECRET ||
    process.env.INSTAGRAM_CLIENT_SECRET ||
    process.env.META_CLIENT_SECRET;

  const redirectUri =
    process.env.META_REDIRECT_URI ||
    `${appUrl.replace(/\/$/, "")}/api/integrations/instagram/callback`;

  if (!metaAppId || !metaAppSecret) {
    platformsUrl.searchParams.set(
      "error",
      "Server configuration error: META_APP_ID or META_APP_SECRET missing."
    );
    return NextResponse.redirect(platformsUrl);
  }

  try {
    // 5. Exchange Authorization Code for Short-Lived User Token
    const tokenUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", metaAppId);
    tokenUrl.searchParams.set("client_secret", metaAppSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });
    if (!tokenRes.ok) {
      const errBody = await tokenRes.json().catch(() => ({}));
      console.error("[Instagram OAuth] Code exchange failed:", errBody);
      platformsUrl.searchParams.set(
        "error",
        errBody?.error?.message || "Failed to exchange authorization code with Meta."
      );
      return NextResponse.redirect(platformsUrl);
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    // 6. Exchange Short-Lived Token for 60-Day Long-Lived User Token
    const longLivedUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", metaAppId);
    longLivedUrl.searchParams.set("client_secret", metaAppSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString(), { method: "GET" });
    let accessToken = shortLivedToken;
    let expiresInSec = tokenData.expires_in || 5184000; // 60 days default

    if (longLivedRes.ok) {
      const longLivedData = await longLivedRes.json();
      if (longLivedData.access_token) {
        accessToken = longLivedData.access_token;
        expiresInSec = longLivedData.expires_in || 5184000;
      }
    }

    // 7. Discover Facebook Pages & Linked Instagram Professional Accounts
    const accountsUrl = `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${accessToken}`;
    const accountsRes = await fetch(accountsUrl);
    if (!accountsRes.ok) {
      const errBody = await accountsRes.json().catch(() => ({}));
      console.error("[Instagram OAuth] Account discovery failed:", errBody);
      platformsUrl.searchParams.set(
        "error",
        "Unable to retrieve Facebook Pages linked to this account. Ensure you have Admin access."
      );
      return NextResponse.redirect(platformsUrl);
    }

    const accountsData = await accountsRes.json();
    const pages = accountsData.data || [];

    // Find first Page with linked Instagram Business / Creator Account
    let linkedPage: any = null;
    let igAccountData: any = null;

    for (const page of pages) {
      if (page.instagram_business_account?.id) {
        linkedPage = page;
        igAccountData = page.instagram_business_account;
        break;
      }
    }

    if (!linkedPage || !igAccountData) {
      console.warn("[Instagram OAuth] No Instagram Business Account connected to any Facebook Page.");
      platformsUrl.searchParams.set(
        "error",
        "No Instagram Professional (Business/Creator) account was found linked to your Facebook Pages. Please convert your Instagram profile to Professional and connect it to a Facebook Page in Meta Business Suite."
      );
      return NextResponse.redirect(platformsUrl);
    }

    // Use page access token if available (has perpetual access to the IG account)
    const effectiveToken = linkedPage.access_token || accessToken;

    // 8. Fetch detailed Instagram Profile info
    const igProfileUrl = `${GRAPH_API_BASE}/${igAccountData.id}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${effectiveToken}`;
    const profileRes = await fetch(igProfileUrl).catch(() => null);
    let profileData = igAccountData;
    if (profileRes && profileRes.ok) {
      profileData = await profileRes.json().catch(() => igAccountData);
    }

    // 9. Encrypt Access Token using AES-256-GCM
    const encryptedToken = encryptToken(effectiveToken);
    const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    // 10. Persist to Multi-Tenant Database
    const db = await getDB(tenantEmail);
    if (!db.instagramConnections) db.instagramConnections = [];
    if (!db.instagramAccounts) db.instagramAccounts = [];
    if (!db.socialAccounts) db.socialAccounts = [];

    // Check unique constraint per workspace/Instagram account ID
    const existingIndex = db.instagramConnections.findIndex(
      (c) => c.instagramAccountId === igAccountData.id && c.tenantId === tenantEmail
    );

    const connectionId =
      existingIndex >= 0 ? db.instagramConnections[existingIndex].id : `ig_conn_${uuidv4().substring(0, 8)}`;

    const connectionRecord: InstagramConnection = {
      id: connectionId,
      tenantId: tenantEmail,
      workspaceId: "ws_default",
      instagramAccountId: igAccountData.id,
      facebookPageId: linkedPage.id,
      accountType: "BUSINESS",
      username: profileData.username || igAccountData.username || "instagram_user",
      name: profileData.name || linkedPage.name,
      profilePictureUrl: profileData.profile_picture_url || "",
      encryptedAccessToken: encryptedToken,
      tokenExpiresAt,
      scopes: [
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_comments",
        "instagram_manage_messages",
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
      ],
      status: "CONNECTED",
      webhookStatus: "active",
      lastSyncedAt: new Date().toISOString(),
      createdAt: existingIndex >= 0 ? db.instagramConnections[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      db.instagramConnections[existingIndex] = connectionRecord;
    } else {
      db.instagramConnections.push(connectionRecord);
    }

    // Update Instagram Account record
    const igAccIdx = db.instagramAccounts.findIndex((a) => a.id === igAccountData.id);
    const igAccRecord: InstagramAccount = {
      id: igAccountData.id,
      tenantId: tenantEmail,
      username: profileData.username || igAccountData.username,
      name: profileData.name || linkedPage.name,
      profilePictureUrl: profileData.profile_picture_url || "",
      accountType: "BUSINESS",
      followersCount: profileData.followers_count || 0,
      mediaCount: profileData.media_count || 0,
      connectedAt: new Date().toISOString(),
      status: "ACTIVE",
    };
    if (igAccIdx >= 0) {
      db.instagramAccounts[igAccIdx] = igAccRecord;
    } else {
      db.instagramAccounts.push(igAccRecord);
    }

    // Update SocialAccounts list
    const socialIdx = db.socialAccounts.findIndex(
      (a) => a.platform === "instagram" && a.id === igAccountData.id
    );
    const socialRecord = {
      platform: "instagram" as const,
      id: igAccountData.id,
      name: profileData.name || linkedPage.name || "Instagram Account",
      username: `@${profileData.username || igAccountData.username}`,
      avatar: profileData.profile_picture_url || "",
      followers: `${profileData.followers_count || 0} Followers`,
      connectedAt: new Date().toISOString(),
      isActive: true,
      status: "connected" as const,
      lastSyncAt: new Date().toISOString(),
      dailyReplies: 0,
      totalReplies: 0,
    };
    if (socialIdx >= 0) {
      db.socialAccounts[socialIdx] = socialRecord;
    } else {
      db.socialAccounts.push(socialRecord);
    }

    await saveDB(db, tenantEmail);

    // 11. Subscribe Page to Meta Webhooks (Asynchronous Best-effort)
    try {
      const subscribeUrl = `${GRAPH_API_BASE}/${linkedPage.id}/subscribed_apps?subscribed_fields=messages,message_reactions,feed,comments&access_token=${effectiveToken}`;
      await fetch(subscribeUrl, { method: "POST" });
    } catch (subErr) {
      console.warn("[Instagram OAuth] Auto webhook subscription notice:", subErr);
    }

    // 12. Cleanup state cookie and redirect back to platforms dashboard
    platformsUrl.searchParams.set("connected", "instagram");
    platformsUrl.searchParams.set("account", profileData.username || igAccountData.username);

    const res = NextResponse.redirect(platformsUrl);
    return deleteStateCookie(res);
  } catch (err: any) {
    console.error("[Instagram OAuth] Exception in callback handler:", err);
    platformsUrl.searchParams.set(
      "error",
      `Instagram connection error: ${err.message || "An unexpected error occurred."}`
    );
    const res = NextResponse.redirect(platformsUrl);
    return deleteStateCookie(res);
  }
}
