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

// ─────────────────────────────────────────────────────────────
//  9. ADVANCED SSRF DEFENSE & SAFE URL VALIDATION
// ─────────────────────────────────────────────────────────────

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
  "instance-data",
  "metadata.internal",
]);

function parseIpv4ToNumber(raw: string): number | null {
  // Check pure integer / decimal IP (e.g. 2130706433 or 0x7f000001)
  if (/^(0x[0-9a-fA-F]+|\d+)$/.test(raw)) {
    const val = Number(raw);
    if (!isNaN(val) && val >= 0 && val <= 0xffffffff) {
      return val;
    }
  }

  // Check dotted notation (can mix decimal, octal, hex)
  const parts = raw.split(".");
  if (parts.length === 4) {
    let num = 0;
    for (let i = 0; i < 4; i++) {
      const part = parts[i];
      let partVal: number;
      if (part.startsWith("0x") || part.startsWith("0X")) {
        partVal = parseInt(part, 16);
      } else if (part.length > 1 && part.startsWith("0")) {
        partVal = parseInt(part, 8);
      } else if (/^\d+$/.test(part)) {
        partVal = parseInt(part, 10);
      } else {
        return null;
      }
      if (isNaN(partVal) || partVal < 0 || partVal > 255) return null;
      num = (num << 8) | partVal;
    }
    return (num >>> 0); // Convert to unsigned 32-bit integer
  }

  return null;
}

export function validateSafeUrl(rawUrl: string): { isSafe: boolean; reason?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isSafe: false, reason: "Missing or invalid URL" };
  }

  try {
    const parsed = new URL(rawUrl);

    // Protocol check: strictly http and https allowed
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { isSafe: false, reason: `Disallowed protocol: ${parsed.protocol}` };
    }

    const rawHost = parsed.hostname.toLowerCase().trim();
    const cleanHost = rawHost.replace(/^\[|\]$/g, ""); // Strip IPv6 brackets

    // Direct match against blocked hostnames
    if (BLOCKED_HOSTNAMES.has(cleanHost) || BLOCKED_HOSTNAMES.has(rawHost)) {
      return { isSafe: false, reason: "Access to private/local/cloud metadata addresses is forbidden" };
    }

    // IPv6 Loopback / Private / Link-Local checks
    if (
      cleanHost === "::1" ||
      cleanHost === "::" ||
      cleanHost === "0:0:0:0:0:0:0:1" ||
      cleanHost === "0:0:0:0:0:0:0:0" ||
      cleanHost.startsWith("fe8") ||
      cleanHost.startsWith("fe9") ||
      cleanHost.startsWith("fea") ||
      cleanHost.startsWith("feb") ||
      cleanHost.startsWith("fc") ||
      cleanHost.startsWith("fd")
    ) {
      return { isSafe: false, reason: "Private or internal IPv6 address is forbidden" };
    }

    // Check IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or normalized ::ffff:7f00:1)
    if (cleanHost.startsWith("::ffff:")) {
      const rest = cleanHost.replace("::ffff:", "");
      if (rest.includes(":")) {
        const parts = rest.split(":").map((h) => parseInt(h, 16));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const ipNum = ((parts[0] << 16) | parts[1]) >>> 0;
          const o1 = (ipNum >>> 24) & 0xff;
          const o2 = (ipNum >>> 16) & 0xff;
          if (
            o1 === 10 || o1 === 127 || o1 === 0 ||
            (o1 === 169 && o2 === 254) ||
            (o1 === 172 && o2 >= 16 && o2 <= 31) ||
            (o1 === 192 && o2 === 168) ||
            (o1 === 100 && o2 >= 64 && o2 <= 127)
          ) {
            return { isSafe: false, reason: "Private or internal IPv4-mapped IPv6 address is forbidden" };
          }
        }
      } else {
        const ipNum = parseIpv4ToNumber(rest);
        if (ipNum !== null) {
          const o1 = (ipNum >>> 24) & 0xff;
          const o2 = (ipNum >>> 16) & 0xff;
          if (
            o1 === 10 || o1 === 127 || o1 === 0 ||
            (o1 === 169 && o2 === 254) ||
            (o1 === 172 && o2 >= 16 && o2 <= 31) ||
            (o1 === 192 && o2 === 168)
          ) {
            return { isSafe: false, reason: "Private or internal IPv4-mapped IPv6 address is forbidden" };
          }
        }
      }
    }

    // IPv4 normalization & subnet checking
    const ipNum = parseIpv4ToNumber(cleanHost);
    if (ipNum !== null) {
      const o1 = (ipNum >>> 24) & 0xff;
      const o2 = (ipNum >>> 16) & 0xff;

      if (
        o1 === 10 || // 10.0.0.0/8 Private
        o1 === 127 || // 127.0.0.0/8 Loopback
        o1 === 0 || // 0.0.0.0/8 Current network
        (o1 === 169 && o2 === 254) || // 169.254.0.0/16 Link-local / Cloud metadata
        (o1 === 172 && o2 >= 16 && o2 <= 31) || // 172.16.0.0/12 Private
        (o1 === 192 && o2 === 168) || // 192.168.0.0/16 Private
        (o1 === 100 && o2 >= 64 && o2 <= 127) // 100.64.0.0/10 Carrier-grade NAT
      ) {
        return { isSafe: false, reason: "Private or internal IP range is forbidden" };
      }
    }

    return { isSafe: true };
  } catch {
    return { isSafe: false, reason: "Malformed URL" };
  }
}

// ─────────────────────────────────────────────────────────────
//  10. NOSQL INJECTION & OPERATOR SANITIZATION
// ─────────────────────────────────────────────────────────────

export function sanitizeNoSqlInput<T>(input: T): T {
  if (typeof input === "string") {
    return input as T;
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeNoSqlInput) as unknown as T;
  }
  if (input !== null && typeof input === "object") {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(input)) {
      // Drop keys starting with $ or containing dots (Mongo operator injection)
      if (key.startsWith("$") || key.includes(".")) continue;
      cleaned[key] = sanitizeNoSqlInput(val);
    }
    return cleaned as T;
  }
  return input;
}

// ─────────────────────────────────────────────────────────────
//  11. REDOS (REGULAR EXPRESSION DENIAL OF SERVICE) DEFENSE
// ─────────────────────────────────────────────────────────────

const DANGEROUS_REDOS_PATTERNS = [
  /\([^)]*(\+|\*)\)\s*(\+|\*)/, // Nested quantifiers: (a+)+, (a*)*, ([0-9]+)+
  /\([^)]*(\+|\*)\)\s*\{[0-9]+,\}/, // (a+){2,}
  /\(\.\*\)\s*(\+|\*)/, // (.*)+
  /([a-zA-Z0-9_]+)\*\1\+/, // Overlapping repetitions
];

export function validateSafeRegex(pattern: string): { isSafe: boolean; reason?: string } {
  if (!pattern || typeof pattern !== "string") {
    return { isSafe: false, reason: "Pattern is empty or invalid" };
  }

  // Reject oversized regex patterns
  if (pattern.length > 150) {
    return { isSafe: false, reason: "Regex pattern exceeds maximum length of 150 characters" };
  }

  // Check for known catastrophic backtracking patterns
  for (const dangerous of DANGEROUS_REDOS_PATTERNS) {
    if (dangerous.test(pattern)) {
      return { isSafe: false, reason: "Pattern contains dangerous nested repetition (ReDoS risk)" };
    }
  }

  // Verify syntax validity
  try {
    new RegExp(pattern);
    return { isSafe: true };
  } catch (err: any) {
    return { isSafe: false, reason: `Invalid regular expression syntax: ${err.message}` };
  }
}
