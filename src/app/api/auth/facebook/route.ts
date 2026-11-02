import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDB, saveDB, logActivity } from "@/database/db";
import { generateTokenPair, generateHMACToken } from "@/backend/auth";

export const dynamic = "force-dynamic";

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

function generateUniqueUsername(baseName: string): string {
  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${cleanBase}_${suffix}`;
}

/**
 * GET /api/auth/facebook
 * Initiates official Meta / Facebook OAuth 2.0 flow
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID || "1617767409877904";
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/auth/callback/facebook`;

  const nonce = crypto.randomBytes(32).toString("hex");
  const scopes = "public_profile";

  const authUrl =
    `https://www.facebook.com/v19.0/dialog/oauth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${encodeURIComponent(nonce)}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("fb_oauth_nonce", nonce, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });

  return response;
}

/**
 * POST /api/auth/facebook
 * Accepts direct client-side token verification if available
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }

    const appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || "";
    let appSecretProof = "";
    if (appSecret) {
      appSecretProof = crypto.createHmac("sha256", appSecret).update(accessToken).digest("hex");
    }

    // 1. Verify access token and get profile from Meta Graph API
    const graphUrl = new URL("https://graph.facebook.com/v19.0/me");
    graphUrl.searchParams.set("fields", "id,name,email,picture.type(large)");
    graphUrl.searchParams.set("access_token", accessToken);
    if (appSecretProof) {
      graphUrl.searchParams.set("appsecret_proof", appSecretProof);
    }

    const fbRes = await fetch(graphUrl.toString());
    const fbProfile = await fbRes.json();

    if (!fbRes.ok || fbProfile.error) {
      return NextResponse.json(
        { error: fbProfile.error?.message || "Invalid Meta Facebook token" },
        { status: 401 }
      );
    }

    const fbId = fbProfile.id;
    const name = fbProfile.name || "Meta User";
    const email = (fbProfile.email || `meta_${fbId}@quickreply.ai`).toLowerCase().trim();
    const avatar = fbProfile.picture?.data?.url || "";

    // 2. Load or Create User in DB
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
    await logActivity(name, "Signed in with 1-Click Meta Facebook Login");

    // 3. Generate Auth Tokens
    const tokens = generateTokenPair(email, name, username, db.userSession.tier);

    // 4. Build Response with Cookies
    const response = NextResponse.json({
      success: true,
      user: {
        email,
        name,
        avatar,
        tier: db.userSession.tier,
      },
    });

    response.cookies.set("qr_access_token", tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60,
    });
    response.cookies.set("qr_refresh_token", tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 90 * 24 * 60 * 60,
    });
    response.cookies.set("session_email", email, {
      ...COOKIE_OPTIONS,
      maxAge: 90 * 24 * 60 * 60,
    });
    response.cookies.set(
      "session_token",
      generateHMACToken(email),
      { ...COOKIE_OPTIONS, maxAge: 90 * 24 * 60 * 60 }
    );

    return response;
  } catch (err) {
    console.error("[Facebook Auth] Error:", err);
    return NextResponse.json({ error: "Internal server error during Meta login" }, { status: 500 });
  }
}
