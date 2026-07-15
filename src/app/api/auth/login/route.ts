import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDB, saveDB, logActivity } from "@/database/db";
import { generateTokenPair, generateHMACToken } from "@/backend/auth";
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders } from "@/backend/ratelimit";

// Generate unique username
function generateUniqueUsername(baseName: string): string {
  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${cleanBase}_${suffix}`;
}

// --- Password Verification (scrypt — matches register endpoint) ---

async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = storedHash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(hash, "hex"), derivedKey));
    });
  });
}

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rl = await checkRateLimit(`login:${ip}`, RATE_LIMITS.AUTH);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429, headers: rateLimitHeaders(rl) });
    }
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const safeEmail = email.toLowerCase().trim();

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Get user data
    const db = await getDB(safeEmail);
    const passwordHash = (db as any).passwordHash;

    if (!passwordHash) {
      // No password set — this user registered via Google only
      return NextResponse.json(
        {
          error:
            "This account uses Google Sign-In. Please use Google to sign in, or create a new account with a password.",
          code: "NO_PASSWORD",
        },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await verifyPassword(password, passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update session
    const displayName =
      db.userSession?.name || safeEmail.split("@")[0];
    db.userSession = {
      email: safeEmail,
      name: displayName,
      username: db.userSession?.username || generateUniqueUsername(displayName.toLowerCase().replace(/[^a-z0-9]/g, "")),
      tier: db.userSession?.tier || "free",
      repliesToday: db.userSession?.repliesToday || 0,
      lastResetDate:
        db.userSession?.lastResetDate ||
        new Date().toISOString().split("T")[0],
    };

    await saveDB(db, safeEmail);
    await logActivity(displayName, "Signed in with email/password");

    // Generate tokens
    const tokens = generateTokenPair(
      safeEmail,
      displayName,
      db.userSession.username,
      db.userSession.tier
    );

    // Build response
    const response = NextResponse.json({
      success: true,
      user: {
        email: safeEmail,
        name: displayName,
        tier: db.userSession.tier,
      },
    });

    // Set all auth cookies
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
    response.cookies.set(
      "session_token",
      generateHMACToken(safeEmail),
      { ...COOKIE_OPTIONS, maxAge: 90 * 24 * 60 * 60 }
    );

    return response;
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
