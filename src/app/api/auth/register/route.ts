import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDB, saveDB } from "@/database/db";
import { generateTokenPair, generateHMACToken } from "@/backend/auth";
import { z } from "zod/v4";

// Generate unique username (copied from db.ts for use in this route)
function generateUniqueUsername(baseName: string): string {
  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${cleanBase}_${suffix}`;
}

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
});

// --- Password Hashing (scrypt — no external deps needed) ---

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = storedHash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      // Constant-time comparison
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
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const safeEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingDB = await getDB(safeEmail);
    if (existingDB.userSession?.email === safeEmail && existingDB.userSession?.name !== name) {
      // User already registered (has data from a prior session)
      // Check if they have a password hash — if so, they already have an account
      if ((existingDB as any).passwordHash) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Store the password hash on the user record
    (existingDB as any).passwordHash = passwordHash;

    // Update user session
    existingDB.userSession = {
      email: safeEmail,
      name: name || safeEmail.split("@")[0],
      username: generateUniqueUsername((name || safeEmail.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, "")),
      tier: existingDB.userSession?.tier || "free",
      repliesToday: existingDB.userSession?.repliesToday || 0,
      lastResetDate:
        existingDB.userSession?.lastResetDate ||
        new Date().toISOString().split("T")[0],
    };

    await saveDB(existingDB, safeEmail);

    // Generate tokens
    const tokens = generateTokenPair(
      safeEmail,
      name,
      existingDB.userSession.username,
      existingDB.userSession.tier
    );

    // Build response
    const response = NextResponse.json({
      success: true,
      user: { email: safeEmail, name: existingDB.userSession.name, tier: existingDB.userSession.tier },
    });

    // Set cookies — both JWT and legacy
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
    console.error("[Auth] Register error:", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
