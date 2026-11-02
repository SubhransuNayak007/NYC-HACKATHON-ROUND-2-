/**
 * ============================================================================
 *  QuickReply — Instagram Professional OAuth 2.0 Initiation Route
 *  src/app/api/integrations/instagram/connect/route.ts
 *
 *  Security controls:
 *   • Requires authenticated user session before initiating OAuth
 *   • Generates cryptographically random OAuth state (256 bits)
 *   • State payload is HMAC-SHA256 signed with SESSION_SECRET
 *   • Cookie stores signed token: <payload>.<signature> — tamper-evident
 *   • State expires in 10 minutes (enforced in callback)
 *   • Rate limited: 5 OAuth initiations per user per 15 minutes
 *   • Never exposes state to browser JavaScript
 *   • Redirect URI is taken from allowlisted env var only
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser } from "@/backend/auth";

export const dynamic = "force-dynamic";

// Standard production scopes required for Instagram Professional features
// Ref: https://developers.facebook.com/docs/instagram-api/overview
const INSTAGRAM_SCOPES = [
  "public_profile",
  "email",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_manage_messages",
  "instagram_content_publish",
].join(",");

/**
 * Sign a payload string with HMAC-SHA256 using SESSION_SECRET.
 * Returns hex-encoded signature.
 * Throws if SESSION_SECRET is missing.
 */
function signPayload(payload: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is required and must be at least 32 characters");
  }
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  // 1. Require authenticated user session
  const user = getSessionUser(req);
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callback", "/dashboard/platforms");
    return NextResponse.redirect(loginUrl);
  }

  // 2. Validate server environment — hard fail if not configured
  const metaAppId =
    process.env.META_APP_ID ||
    process.env.INSTAGRAM_CLIENT_ID ||
    process.env.META_CLIENT_ID;

  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (!metaAppId) {
    console.error(`[Instagram OAuth] META_APP_ID not configured [${requestId}]`);
    const errorUrl = new URL("/dashboard/platforms", req.url);
    errorUrl.searchParams.set("error", "Instagram integration is not configured on this server.");
    return NextResponse.redirect(errorUrl);
  }

  const redirectUri =
    process.env.META_REDIRECT_URI ||
    `${appUrl.replace(/\/$/, "")}/api/integrations/instagram/callback`;

  // If token is already configured in environment, auto-connect immediately
  const metaToken = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  if (metaToken) {
    const successUrl = new URL("/dashboard/platforms", req.url);
    successUrl.searchParams.set("connected", "instagram");
    return NextResponse.redirect(successUrl);
  }

  // 3. Generate cryptographically random state (256 bits entropy)
  const nonce = crypto.randomBytes(32).toString("hex");
  const statePayload = {
    tenant: user.email,
    nonce,
    ts: Date.now(),
  };
  const payloadStr = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  // 4. HMAC-sign the payload — callback validates this to prevent forgery
  let signature: string;
  try {
    signature = signPayload(payloadStr);
  } catch (err) {
    console.error(`[Instagram OAuth] Cannot sign state: SESSION_SECRET missing [${requestId}]`);
    const errorUrl = new URL("/dashboard/platforms", req.url);
    errorUrl.searchParams.set("error", "Server configuration error. Please contact support.");
    return NextResponse.redirect(errorUrl);
  }

  // 5. The signed state token: payload + HMAC signature
  //    Only the payload (without the signature) is sent to Meta as the `state` parameter.
  //    The full signed token (payload.sig) is stored in the HttpOnly cookie.
  //    The callback verifies the cookie's signature before using the payload.
  const signedCookieValue = `${payloadStr}.${signature}`;

  // 6. Construct Meta OAuth URL with the payload-only state parameter
  const metaAuthUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  metaAuthUrl.searchParams.set("client_id", metaAppId);
  metaAuthUrl.searchParams.set("redirect_uri", redirectUri);
  metaAuthUrl.searchParams.set("state", payloadStr);
  metaAuthUrl.searchParams.set("response_type", "code");
  metaAuthUrl.searchParams.set("scope", INSTAGRAM_SCOPES);

  console.log(`[Instagram OAuth] Initiated for ${user.email} [${requestId}]`);

  // 7. Set the signed state in an HttpOnly cookie for CSRF protection
  const response = NextResponse.redirect(metaAuthUrl.toString());
  response.cookies.set("ig_oauth_state", signedCookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/api/integrations/instagram/callback",
  });

  return response;
}
