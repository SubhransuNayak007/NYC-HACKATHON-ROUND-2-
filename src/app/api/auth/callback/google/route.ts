import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, encryptToken } from "@/database/db";
import { cookies } from "next/headers";
import crypto from "crypto";
import { generateTokenPair, generateHMACToken } from "@/backend/auth";

// Generate unique username (copied from db.ts for use in this route)
function generateUniqueUsername(baseName: string): string {
  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${cleanBase}_${suffix}`;
}

function clearNonceCookie(res: NextResponse): void {
  res.cookies.set("oauth_nonce", "", { path: "/", maxAge: 0 });
}

// Cookie configuration helper for consistent session cookies
const SESSION_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 90, // 90 days (3 months)
};

/**
 * Set both legacy HMAC cookies AND new JWT cookies for backward compatibility.
 */
async function setSessionCookies(response: NextResponse, email: string): Promise<void> {
  const safeEmail = email.toLowerCase().trim();

  // Clear obsolete channels backup cookie
  response.cookies.set("qr_channels_backup", "", { path: "/", maxAge: 0 });

  // Legacy cookies (for Edge middleware compatibility)
  response.cookies.set("session_email", safeEmail, SESSION_COOKIE_OPTIONS);
  response.cookies.set("session_token", generateHMACToken(safeEmail), SESSION_COOKIE_OPTIONS);

  // New JWT tokens
  try {
    // Get the user's DB to fetch username
    const userDb = await getDB(safeEmail);
    const username = userDb.userSession?.username || safeEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const name = userDb.userSession?.name || safeEmail.split("@")[0];
    const tier = userDb.userSession?.tier || "free";

    const tokens = generateTokenPair(safeEmail, name, username, tier);
    response.cookies.set("qr_access_token", tokens.accessToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 15 * 60, // 15 minutes
    });
    response.cookies.set("qr_refresh_token", tokens.refreshToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 90, // 90 days (3 months)
    });
  } catch (err) {
    console.error("[Auth] Failed to generate JWT tokens:", err);
    // Fall back to legacy cookies only
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state") || "dashboard";
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  // Validate OAuth state nonce to prevent CSRF attacks
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("oauth_nonce")?.value;

  // Parse the state parameter: format is "destination|nonce"
  const pipeIndex = stateParam.lastIndexOf("|");
  let actualState = stateParam;
  let providedNonce = "";
  if (pipeIndex !== -1) {
    actualState = stateParam.substring(0, pipeIndex);
    providedNonce = stateParam.substring(pipeIndex + 1);
  }

  if (!storedNonce || !providedNonce || storedNonce !== providedNonce) {
    console.error("OAuth state nonce validation failed - possible CSRF attack");
    const dest = actualState === "onboarding" ? "onboarding" : "dashboard/channels";
    const errorResponse = NextResponse.redirect(`${origin}/${dest}?error=invalid_state`);
    clearNonceCookie(errorResponse);
    return errorResponse;
  }

  const isLogin = actualState.startsWith("login:");
  const state = isLogin ? actualState.substring(6) : actualState;

  if (error) {
    const dest = state === "onboarding" ? "onboarding" : "dashboard/channels";
    const errorResponse = NextResponse.redirect(`${origin}/${dest}?error=${encodeURIComponent(error)}`);
    clearNonceCookie(errorResponse);
    return errorResponse;
  }

  if (!code) {
    const dest = state === "onboarding" ? "onboarding" : "dashboard/channels";
    const errorResponse = NextResponse.redirect(`${origin}/${dest}?error=missing_code`);
    clearNonceCookie(errorResponse);
    return errorResponse;
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/callback/google`;

    if (!clientId || !clientSecret) {
      const errorResponse = NextResponse.redirect(`${origin}/dashboard/channels?error=credentials_not_configured`);
      clearNonceCookie(errorResponse);
      return errorResponse;
    }

    // 1. Exchange Auth Code for Access & Refresh Tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed");
      const errorResponse = NextResponse.redirect(`${origin}/dashboard/channels?error=token_exchange_failed`);
      clearNonceCookie(errorResponse);
      return errorResponse;
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token } = tokenData;

    // 2. Fetch User Profile Info from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    let email = "";
    let profileName = "";
    if (profileRes.ok) {
      const profile = await profileRes.json();
      email = profile.email;
      profileName = profile.name;
    }

    if (!email) {
      console.error("Failed to fetch email from userinfo");
      const errorResponse = NextResponse.redirect(`${origin}/login?error=email_fetch_failed`);
      clearNonceCookie(errorResponse);
      return errorResponse;
    }

    // Load/create the isolated DB for this email
    const db = await getDB(email);

    // Sync session details
    db.userSession = {
      email: email,
      name: profileName || email.split("@")[0],
      username: db.userSession?.username || generateUniqueUsername((profileName || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, "")),
      tier: db.userSession?.tier || "free",
      repliesToday: db.userSession?.repliesToday || 0,
      lastResetDate: db.userSession?.lastResetDate || new Date().toISOString().split("T")[0]
    };

    if (isLogin) {
      // Login flow: just log in and redirect
      await saveDB(db, email);
      await logActivity(db.userSession.name, "Signed in with Google");

      const hasChannels = db.channels && db.channels.length > 0;
      const hasQuickLogin = db.userSession?.quickLogin?.quickLoginEnabled;

      // If new user or user without quick login set up, redirect to setup
      if (!hasQuickLogin && !hasChannels) {
        console.log("[OAuth Callback] New user without quick login. Redirecting to setup.");
        const setupResponse = NextResponse.redirect(`${origin}/quick-login/setup`);
        await setSessionCookies(setupResponse, email);
        clearNonceCookie(setupResponse);
        return setupResponse;
      }

      const redirectDest = hasChannels ? "dashboard" : "onboarding";
      const loginResponse = NextResponse.redirect(`${origin}/${redirectDest}`);
      await setSessionCookies(loginResponse, email);
      clearNonceCookie(loginResponse);
      return loginResponse;
    }

    // 3. Fetch Channel Metadata from YouTube API (channel connection flow)
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      {
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    if (!channelRes.ok) {
      const channelErrBody = await channelRes.text();
      console.error(`YouTube Channel fetch failed: ${channelRes.status} — ${channelErrBody.slice(0, 500)}`);

      let ytError = "youtube_metadata_failed";
      if (channelRes.status === 403) {
        if (channelErrBody.includes("accessNotConfigured") || channelErrBody.includes("youtube.googleapis.com")) {
          ytError = "youtube_api_not_enabled";
        } else if (channelErrBody.includes("quota")) {
          ytError = "youtube_quota_exceeded";
        }
      }

      await saveDB(db, email);
      const errorResponse = NextResponse.redirect(`${origin}/dashboard/channels?error=${ytError}`);
      await setSessionCookies(errorResponse, email);
      clearNonceCookie(errorResponse);
      return errorResponse;
    }

    const channelData = await channelRes.json();
    if (!channelData.items || channelData.items.length === 0) {
      await saveDB(db, email);
      const errorResponse = NextResponse.redirect(`${origin}/dashboard/channels?error=no_youtube_channel_found`);
      await setSessionCookies(errorResponse, email);
      clearNonceCookie(errorResponse);
      return errorResponse;
    }

    const ytChannel = channelData.items[0];
    const channelId = ytChannel.id;
    const name = ytChannel.snippet.title;
    const handle = ytChannel.snippet.customUrl || `@channel_${channelId}`;
    const avatar = ytChannel.snippet.thumbnails?.default?.url || "";
    const subsCount = ytChannel.statistics?.subscriberCount;

    // Format subscriber count
    let subscribers = "0";
    if (subsCount) {
      const num = parseInt(subsCount, 10);
      if (num >= 1000000) {
        subscribers = (num / 1000000).toFixed(1) + "M";
      } else if (num >= 1000) {
        subscribers = Math.round(num / 1000) + "K";
      } else {
        subscribers = num.toString();
      }
    }

    const existingIndex = db.channels.findIndex((c) => c.id === channelId);
    const updatedChannel = {
      id: channelId,
      name,
      handle,
      avatar,
      status: "active" as const,
      subscribers,
      accessToken: encryptToken(access_token),
      refreshToken: refresh_token ? encryptToken(refresh_token) : (existingIndex >= 0 ? db.channels[existingIndex].refreshToken : undefined),
      automatedVideos: existingIndex >= 0 ? (db.channels[existingIndex].automatedVideos || []) : []
    };

    if (existingIndex >= 0) {
      db.channels[existingIndex] = updatedChannel;
    } else {
      db.channels.push(updatedChannel);
    }

    await saveDB(db, email);
    await logActivity(db.userSession.name, `Linked YouTube channel: ${name} (${handle})`);

    const dest = state === "onboarding" ? "onboarding" : "dashboard/channels";
    const successResponse = NextResponse.redirect(`${origin}/${dest}?success=connected&channel=${encodeURIComponent(name)}`);
    await setSessionCookies(successResponse, email);
    clearNonceCookie(successResponse);
    return successResponse;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : "";
    console.error("OAuth callback exception:", errMsg);
    if (errStack) console.error("Stack:", errStack);
    const dest = state === "onboarding" ? "onboarding" : "dashboard/channels";
    const errorResponse = NextResponse.redirect(`${origin}/${dest}?error=callback_exception&detail=${encodeURIComponent(errMsg.slice(0, 200))}`);
    clearNonceCookie(errorResponse);
    return errorResponse;
  }
}
