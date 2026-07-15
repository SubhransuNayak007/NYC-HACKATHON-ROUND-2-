import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isLogin = searchParams.get("login") === "true";
  const stateVal = searchParams.get("state") || "dashboard";

  const finalState = isLogin ? `login:${stateVal}` : stateVal;

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({
      error: "YouTube integration is temporarily unavailable. Please contact support."
    }, { status: 503 });
  }

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/api/auth/callback/google`;

  const scopes = isLogin
    ? ["openid", "email", "profile"]
    : [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/youtube.force-ssl",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
        "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
      ];

  // Generate a cryptographic nonce and store it in a signed cookie for CSRF protection
  const nonce = crypto.randomBytes(32).toString("hex");
  const stateWithNonce = `${finalState}|${nonce}`;

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(" "))}&` +
    `access_type=offline&` +
    `state=${encodeURIComponent(stateWithNonce)}&` +
    `prompt=consent`;

  const response = NextResponse.redirect(authUrl);

  // Store the nonce in a cookie so we can verify it on callback
  response.cookies.set("oauth_nonce", nonce, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600 // 10 minutes expiry
  });

  return response;
}
