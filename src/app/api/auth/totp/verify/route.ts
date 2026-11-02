import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";
import { TOTP, Secret } from "otpauth";
import { generateTokenPair, generateHMACToken } from "@/backend/auth";

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export async function POST(req: NextRequest) {
  try {
    const { email, code, isLogin } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and 6-digit verification code are required" },
        { status: 400 }
      );
    }

    const safeEmail = email.toLowerCase().trim();
    const cleanCode = String(code).trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: "Verification code must be exactly 6 digits" },
        { status: 400 }
      );
    }

    const db = await getDB(safeEmail);
    const totpSecret = db.userSession?.quickLogin?.totpSecret;

    if (!totpSecret) {
      return NextResponse.json(
        {
          error:
            "Google Authenticator is not configured for this account. Please sign in with password or set up 2FA.",
        },
        { status: 404 }
      );
    }

    const totp = new TOTP({
      issuer: "QuickReply",
      label: safeEmail,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(totpSecret),
    });

    const delta = totp.validate({ token: cleanCode, window: 1 });

    if (delta === null) {
      return NextResponse.json(
        { error: "Invalid Google Authenticator code. Please check your time and try again." },
        { status: 401 }
      );
    }

    // Code is valid! Update session
    const displayName = db.userSession?.name || safeEmail.split("@")[0];
    if (db.userSession) {
      db.userSession.quickLogin = {
        ...(db.userSession.quickLogin || {}),
        totpEnabled: true,
        quickLoginEnabled: true,
      };
      await saveDB(db, safeEmail);
    }

    await logActivity(displayName, isLogin ? "Signed in with Google Authenticator" : "Configured Google Authenticator 2FA");

    // Generate tokens
    const tokens = generateTokenPair(
      safeEmail,
      displayName,
      db.userSession?.username || displayName.toLowerCase(),
      db.userSession?.tier || "free"
    );

    const response = NextResponse.json({
      success: true,
      message: isLogin ? "Authenticated successfully" : "2FA enabled successfully",
      user: {
        email: safeEmail,
        name: displayName,
        tier: db.userSession?.tier || "free",
      },
    });

    // Set auth cookies for login
    response.cookies.set("qr_access_token", tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60,
    });
    response.cookies.set("qr_refresh_token", tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 90 * 24 * 60 * 60,
    });
    response.cookies.set("session_email", safeEmail, {
      ...COOKIE_OPTIONS,
      maxAge: 90 * 24 * 60 * 60,
    });
    response.cookies.set("session_token", generateHMACToken(safeEmail), {
      ...COOKIE_OPTIONS,
      maxAge: 90 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("[TOTP Verify] Error:", err);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
