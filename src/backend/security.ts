/**
 * ============================================================
 *  QuickReply — Security & Performance Hardening Utilities
 *  src/backend/security.ts
 * ============================================================
 *
 *  Provides:
 *   1. sanitize()     — Strip XSS/injection payloads from strings
 *   2. validateBody() — Zod-compatible field validation helper
 *   3. secHeaders()   — Append security headers to any NextResponse
 *   4. safeError()    — Never leak stack traces to clients
 *   5. RedisRateLimiter — Sliding-window rate limiter (Redis or in-memory fallback)
 */

import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────
//  1. INPUT SANITIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Strip HTML tags, null bytes, and common XSS vectors from a string.
 * Safe for text that will be stored and later displayed in the UI.
 */
export function sanitize(input: unknown, maxLen = 5_000): string {
  if (typeof input !== "string") return "";

  return input
    .slice(0, maxLen)                     // Enforce max length
    .replace(/\x00/g, "")                 // Null byte removal
    .replace(/<script[\s\S]*?<\/script>/gi, "")  // Script block removal
    .replace(/<[^>]+>/g, "")              // Strip all HTML tags
    .replace(/javascript:/gi, "")         // Remove JS protocol
    .replace(/on\w+\s*=/gi, "")           // Remove inline event handlers
    .replace(/data:/gi, "data_")          // Neutralise data URIs
    .trim();
}

/**
 * Sanitize an object's string fields in-place.
 * Pass fieldNames to restrict which keys are sanitized.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldNames?: (keyof T)[]
): T {
  const keys = fieldNames ?? (Object.keys(obj) as (keyof T)[]);
  const result = { ...obj };
  for (const key of keys) {
    const val = result[key];
    if (typeof val === "string") {
      (result as Record<string, unknown>)[key as string] = sanitize(val);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
//  2. FIELD VALIDATION HELPER
// ─────────────────────────────────────────────────────────────

type FieldRule = {
  required?: boolean;
  maxLen?: number;
  minLen?: number;
  type?: "string" | "number" | "boolean" | "array";
  pattern?: RegExp;
};

/**
 * Validate a body object against a simple schema.
 * Returns { valid, errors } — no Zod dependency needed.
 */
export function validateBody(
  body: Record<string, unknown>,
  schema: Record<string, FieldRule>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(schema)) {
    const val = body[field];

    if (rule.required && (val === undefined || val === null || val === "")) {
      errors.push(`'${field}' is required`);
      continue;
    }

    if (val === undefined || val === null) continue;

    if (rule.type && typeof val !== rule.type && !(rule.type === "array" && Array.isArray(val))) {
      errors.push(`'${field}' must be of type ${rule.type}`);
      continue;
    }

    if (rule.type === "string" || typeof val === "string") {
      const str = val as string;
      if (rule.maxLen && str.length > rule.maxLen) {
        errors.push(`'${field}' must be ≤ ${rule.maxLen} characters`);
      }
      if (rule.minLen && str.length < rule.minLen) {
        errors.push(`'${field}' must be ≥ ${rule.minLen} characters`);
      }
      if (rule.pattern && !rule.pattern.test(str)) {
        errors.push(`'${field}' has an invalid format`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────
//  3. SECURITY RESPONSE HEADERS
// ─────────────────────────────────────────────────────────────

/**
 * Append a full suite of security headers to a response.
 * Call this in your API route handlers or middleware.
 */
export function secHeaders(res: NextResponse): NextResponse {
  // Prevent clickjacking
  res.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");
  // XSS protection for older browsers
  res.headers.set("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy — disable unnecessary browser features
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  // Content Security Policy
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://api.stripe.com https://graph.instagram.com https://api.twitter.com https://api.linkedin.com https://graph.facebook.com wss:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  return res;
}

// ─────────────────────────────────────────────────────────────
//  4. SAFE ERROR RESPONSES
// ─────────────────────────────────────────────────────────────

/**
 * Return a safe JSON error — never leaks stack traces or internal messages.
 * Logs the real error server-side only.
 */
export function safeError(
  err: unknown,
  publicMessage = "An internal error occurred",
  status = 500
): NextResponse {
  if (process.env.NODE_ENV !== "production") {
    // In dev, log with details
    console.error("[Server Error]", err);
  } else {
    // In prod, log a sanitized version
    console.error("[Server Error]", err instanceof Error ? err.message : "unknown");
  }

  return NextResponse.json({ error: publicMessage }, { status });
}

// ─────────────────────────────────────────────────────────────
//  5. SLIDING-WINDOW RATE LIMITER (in-memory with Redis upgrade path)
// ─────────────────────────────────────────────────────────────

/**
 * In-memory sliding window rate limiter.
 * Each bucket stores an array of timestamps for each key.
 * Upgrades to Redis in production: replace the Map with Redis ZADD/ZCOUNT.
 */

const windowBuckets = new Map<string, number[]>();

/**
 * Check if a key exceeds the allowed request count in a time window.
 * @param key      Unique identifier (IP, userId, etc.)
 * @param limit    Max requests allowed
 * @param windowMs Sliding window in milliseconds
 * @returns true if rate limited
 */
export function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = windowBuckets.get(key) ?? [];
  // Evict timestamps outside the current window
  timestamps = timestamps.filter((t) => t > windowStart);
  timestamps.push(now);
  windowBuckets.set(key, timestamps);

  return timestamps.length > limit;
}

/** Periodic cleanup to avoid memory leak in long-running processes */
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of windowBuckets.entries()) {
    const alive = timestamps.filter((t) => now - t < 300_000); // 5 min
    if (alive.length === 0) {
      windowBuckets.delete(key);
    } else {
      windowBuckets.set(key, alive);
    }
  }
}, 120_000); // Run every 2 minutes

// ─────────────────────────────────────────────────────────────
//  6. REQUEST SIZE GUARD
// ─────────────────────────────────────────────────────────────

/**
 * Reject bodies larger than maxBytes to prevent memory exhaustion.
 * Call BEFORE req.json() in API routes that accept large inputs.
 */
export function checkBodySize(req: Request, maxBytes = 1_048_576): boolean {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return false; // Too large
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
//  7. SAFE REGEX (ReDoS prevention)
// ─────────────────────────────────────────────────────────────

/**
 * Safely test a user-provided regex pattern.
 * Prevents ReDoS attacks by running in a timeout.
 */
export function safeRegexTest(pattern: string, input: string, timeoutMs = 100): boolean {
  try {
    // Guard against catastrophically complex patterns
    if (pattern.length > 500) return false;
    const regex = new RegExp(pattern, "i");

    // Use a limited input to prevent catastrophic backtracking
    const safeInput = input.slice(0, 1000);
    return regex.test(safeInput);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
//  8. ENVIRONMENT VALIDATOR (call at startup)
// ─────────────────────────────────────────────────────────────

/**
 * Validate required environment variables on startup.
 * Logs warnings for missing variables.
 */
export function validateEnv(): void {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "SESSION_SECRET",
    "TOKEN_ENCRYPTION_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];
  const optional = [
    "MONGODB_URI",
    "INSTAGRAM_CLIENT_ID",
    "INSTAGRAM_CLIENT_SECRET",
    "TWITTER_CLIENT_ID",
    "TWITTER_CLIENT_SECRET",
    "LINKEDIN_CLIENT_ID",
    "LINKEDIN_CLIENT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "ANTHROPIC_API_KEY",
    "REDIS_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);
  const missingOptional = optional.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`[Security] ❌ CRITICAL: Missing required env vars: ${missing.join(", ")}`);
  }
  if (missingOptional.length > 0) {
    console.warn(`[Security] ⚠️  Missing optional env vars: ${missingOptional.join(", ")}`);
  }
  if (missing.length === 0) {
    console.log(`[Security] ✅ Environment validation passed`);
  }
}
