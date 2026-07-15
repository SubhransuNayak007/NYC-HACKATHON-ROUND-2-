/**
 * JWT Authentication System for Quick Reply
 *
 * Replaces the old cookie-based email auth with proper JWT access tokens
 * and refresh tokens. Tokens are signed with HMAC-SHA256 and include
 * expiration, issuer, and audience claims for security.
 *
 * Flow:
 * 1. User signs in via Google OAuth
 * 2. Server generates JWT access token (15 min) + refresh token (7 days)
 * 3. Both stored in httpOnly secure cookies
 * 4. Middleware verifies access token on every request
 * 5. When access token expires, client uses refresh token to get new pair
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { cookies } from "next/headers";

// --- Configuration ---

const ACCESS_TOKEN_EXPIRY = "15m";    // 15 minutes
const REFRESH_TOKEN_EXPIRY = "90d";   // 90 days (3 months) - remember me
const TOKEN_ISSUER = "quick-reply";
const TOKEN_AUDIENCE = "quick-reply-api";

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET or SESSION_SECRET environment variable is required for authentication");
  }
  // Ensure secret is at least 32 bytes (256 bits) for HS256
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long for HS256 security");
  }
  return secret;
}

function getRefreshSecret(): string {
  // Use a separate secret for refresh tokens to prevent cross-token attacks
  const base = getJWTSecret();
  return crypto.createHash("sha256").update(`refresh:${base}`).digest("hex");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns false immediately only on length mismatch (leaks length only,
 * which is public for fixed-format hashes anyway).
 */
function safeTimingEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// --- Token Payloads ---

export interface AccessTokenPayload {
  sub: string;        // email (subject)
  name: string;       // display name
  username: string;   // unique username
  tier: "free" | "premium" | "pro";
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface RefreshTokenPayload {
  sub: string;        // email
  jti: string;        // unique token ID for revocation
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

// --- Token Generation ---

/**
 * Generate a JWT access + refresh token pair for a user.
 */
export function generateTokenPair(
  email: string,
  name: string,
  username: string,
  tier: "free" | "premium" | "pro" = "free"
): TokenPair {
  const secret = getJWTSecret();
  const refreshSecret = getRefreshSecret();

  const now = Math.floor(Date.now() / 1000);
  const accessExp = now + 15 * 60; // 15 minutes
  const refreshExp = now + 90 * 24 * 60 * 60; // 90 days (3 months)

  const accessToken = jwt.sign(
    {
      sub: email.toLowerCase().trim(),
      name,
      username,
      tier,
    } satisfies Omit<AccessTokenPayload, "iat" | "exp" | "iss" | "aud">,
    secret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    }
  );

  const refreshToken = jwt.sign(
    {
      sub: email.toLowerCase().trim(),
      jti: crypto.randomUUID(),
    } satisfies Omit<RefreshTokenPayload, "iat" | "exp" | "iss" | "aud">,
    refreshSecret,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    }
  );

  return {
    accessToken,
    refreshToken,
    accessExpiresAt: accessExp,
    refreshExpiresAt: refreshExp,
  };
}

// --- Token Verification ---

/**
 * Verify and decode an access token. Returns the payload or null if invalid.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const secret = getJWTSecret();
    const payload = jwt.verify(token, secret, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    }) as AccessTokenPayload;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token. Returns the payload or null if invalid.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const refreshSecret = getRefreshSecret();
    const payload = jwt.verify(token, refreshSecret, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    }) as RefreshTokenPayload;
    return payload;
  } catch {
    return null;
  }
}

// --- Cookie Management ---

const ACCESS_COOKIE = "qr_access_token";
const REFRESH_COOKIE = "qr_refresh_token";
const SESSION_EMAIL = "session_email"; // Legacy compat
const SESSION_TOKEN = "session_token"; // Legacy compat

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

/**
 * Set auth cookies on a NextResponse object.
 */
export function setAuthCookies(
  response: Response,
  tokens: TokenPair
): void {
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };

  // Build cookie string for Set-Cookie header
  // Extract email from the access token payload for the session_email cookie
  const userEmail = tokens.accessToken ? (() => {
    try {
      const payload = jwt.decode(tokens.accessToken) as AccessTokenPayload;
      return payload?.sub || "";
    } catch { return ""; }
  })() : "";

  const cookies = [
    `${ACCESS_COOKIE}=${tokens.accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${15 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    `${REFRESH_COOKIE}=${tokens.refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${90 * 24 * 60 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    // Legacy compat: keep session_email for old code paths (SSE, Socket.io, etc.)
    `${SESSION_EMAIL}=${encodeURIComponent(userEmail)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${90 * 24 * 60 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  ];

  response.headers.set("Set-Cookie", cookies.join(", "));
}

/**
 * Clear all auth cookies.
 */
export function clearAuthCookies(response: Response): void {
  const cookies = [
    `${ACCESS_COOKIE}=; Path=/; HttpOnly; Max-Age=0`,
    `${REFRESH_COOKIE}=; Path=/; HttpOnly; Max-Age=0`,
    `${SESSION_EMAIL}=; Path=/; HttpOnly; Max-Age=0`,
    `${SESSION_TOKEN}=; Path=/; HttpOnly; Max-Age=0`,
  ];
  response.headers.set("Set-Cookie", cookies.join(", "));
}

/**
 * Extract the access token from request cookies.
 * Supports both new JWT cookies and legacy session cookies.
 */
export function extractTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );

  // New JWT token
  if (cookies[ACCESS_COOKIE]) {
    return cookies[ACCESS_COOKIE];
  }

  // Legacy: reconstruct HMAC from session_email + session_token
  const sessionEmail = cookies[SESSION_EMAIL];
  const sessionToken = cookies[SESSION_TOKEN];
  if (sessionEmail && sessionToken) {
    try {
      const decoded = decodeURIComponent(sessionEmail);
      // Verify the legacy HMAC token
      const secret = process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(decoded.toLowerCase().trim());
      const expected = hmac.digest("hex");
      // Constant-time comparison to prevent timing attacks
      if (safeTimingEqual(expected, sessionToken)) {
        // For middleware Edge compat: return the email so the caller knows the user
        // For API route handlers: generate a short-lived JWT on the fly
        // We use a sentinel format that getUserFromCookies can detect and upgrade
        return `__legacy__:${decoded}`;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get the current user's email from request cookies.
 * Returns null if not authenticated.
 */
export function getUserFromCookies(cookieHeader: string | null): AccessTokenPayload | null {
  const token = extractTokenFromCookies(cookieHeader);
  if (!token) return null;

  // Handle legacy session tokens
  if (token.startsWith("__legacy__:")) {
    const email = token.slice("__legacy__:".length).toLowerCase().trim();
    // Generate an in-memory payload for legacy sessions (not a real JWT)
    // This allows API routes to work with legacy cookies
    return {
      sub: email,
      name: email.split("@")[0],
      username: email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, ""),
      tier: "free" as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
      iss: TOKEN_ISSUER,
      aud: TOKEN_AUDIENCE,
    };
  }

  return verifyAccessToken(token);
}

/**
 * Helper for API routes: extract user from request or throw 401.
 */
export async function requireAuth(cookieHeader: string | null): Promise<AccessTokenPayload> {
  const user = getUserFromCookies(cookieHeader);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

// --- Legacy HMAC Token (for middleware Edge compatibility) ---
// The middleware runs on Edge runtime where we can't use jsonwebtoken.
// We keep HMAC as a lightweight check for the Edge, and do full JWT
// verification in API route handlers.

/**
 * Generate a legacy HMAC session token (Edge-compatible).
 */
export function generateHMACToken(email: string): string {
  const secret = process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET || "session-fallback-secret";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(email.toLowerCase().trim());
  return hmac.digest("hex");
}

/**
 * Verify a legacy HMAC session token (Edge-compatible, async for Web Crypto).
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyHMACToken(email: string, token: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET || "session-fallback-secret";
  try {
    if (!email || !token) return false;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(email.toLowerCase().trim()));

    if (!signature) return false;

    const expected = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

    // Constant-time comparison to prevent timing attacks
    if (!expected || !token) return false;
    if (typeof expected !== "string" || typeof token !== "string") return false;
    if (expected.length !== token.length) return false;
    
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ token.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}
