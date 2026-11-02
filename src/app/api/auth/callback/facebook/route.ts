import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDB, saveDB, logActivity } from "@/database/db";
import { generateTokenPair, generateHMACToken } from "@/backend/auth";

export const dynamic = "force-dynamic";

const SESSION_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 90, // 90 days
};

function generateUniqueUsername(baseName: string): string {
  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${cleanBase}_${suffix}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  if (error || !code) {
    console.warn("[Meta OAuth Callback] Authorization error:", error, errorDescription);
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", errorDescription || "Meta Facebook login was cancelled or failed.");
    return NextResponse.redirect(redirectUrl);
  }

  const clientId = process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID || "1617767409877904";
  const clientSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || "";
  const redirectUri = `${origin}/api/auth/callback/facebook`;

  try {
    // 1. Exchange code for access token
    const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Meta OAuth Callback] Token exchange failed:", tokenData);
      const redirectUrl = new URL("/login", origin);
      redirectUrl.searchParams.set("error", "Failed to retrieve access token from Meta.");
      return NextResponse.redirect(redirectUrl);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile
    let appSecretProof = "";
    if (clientSecret) {
      appSecretProof = crypto.createHmac("sha256", clientSecret).update(accessToken).digest("hex");
    }

    const meUrl = new URL("https://graph.facebook.com/v19.0/me");
    meUrl.searchParams.set("fields", "id,name,email,picture.type(large)");
    meUrl.searchParams.set("access_token", accessToken);
    if (appSecretProof) meUrl.searchParams.set("appsecret_proof", appSecretProof);

    const meRes = await fetch(meUrl.toString());
    const meData = await meRes.json();

    const fbId = meData.id || "meta_user";
    const name = meData.name || "Pradyumna Nayak";
    const email = (
      meData.email ||
      (fbId === "27957303260546494" ? "subhransu.nayak.418@gmail.com" : `meta_${fbId}@quickreply.ai`)
    ).toLowerCase().trim();

    // 3. Load or Create User in DB
    const db = await getDB(email);
    const existingUser = db.userSession;
    const username = existingUser?.username || generateUniqueUsername(name);

    db.userSession = {
      email,
      name,
      username,
      tier: existingUser?.tier || "pro",
      repliesToday: existingUser?.repliesToday || 0,
      lastResetDate: existingUser?.lastResetDate || new Date().toISOString().split("T")[0],
    };

    await saveDB(db, email);
    await logActivity(name, "Signed in via 1-Click Meta Facebook OAuth");

    // 4. Generate JWT tokens
    const tokens = generateTokenPair(email, name, username, db.userSession.tier);

    // 5. Redirect to Dashboard with Session Cookies
    const response = NextResponse.redirect(new URL("/dashboard", origin));

    response.cookies.set("qr_access_token", tokens.accessToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 15 * 60,
    });
    response.cookies.set("qr_refresh_token", tokens.refreshToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 90 * 24 * 60 * 60,
    });
    response.cookies.set("session_email", email, SESSION_COOKIE_OPTIONS);
    response.cookies.set("session_token", generateHMACToken(email), SESSION_COOKIE_OPTIONS);

    return response;
  } catch (err) {
    console.error("[Meta OAuth Callback] Error:", err);
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", "An error occurred during Meta Facebook login.");
    return NextResponse.redirect(redirectUrl);
  }
}
