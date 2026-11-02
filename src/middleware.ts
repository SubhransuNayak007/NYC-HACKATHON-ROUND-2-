import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitForPath, rateLimitHeaders } from "@/backend/ratelimit";

// ─────────────────────────────────────────────────────────────
//  SECURITY REALITY BASELINE
//  This middleware is engineered for:
//    - Attack resistance via explicit allowlists
//    - Least privilege (deny-by-default for authenticated routes)
//    - Defense in depth (multiple independent controls)
//    - Observable failures (structured log events with correlation IDs)
//  It does NOT claim to be breach-proof or zero-day immune.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  CORS — Strict allowlist. Never wildcard for authenticated APIs.
// ─────────────────────────────────────────────────────────────

function buildAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();

  // Always allow localhost variants for local development
  if (process.env.NODE_ENV !== "production") {
    ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"].forEach((o) => allowed.add(o));
  }

  // Production origins from environment variable (comma-separated)
  const envOrigins = process.env.ALLOWED_ORIGINS || "";
  envOrigins.split(",").map((o) => o.trim()).filter(Boolean).forEach((o) => allowed.add(o));

  // App URL as final fallback
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  if (appUrl) allowed.add(appUrl.replace(/\/$/, ""));

  return allowed;
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

function applyCORS(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    // Explicit allowlist match — permit with credentials
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Request-ID");
    res.headers.set("Vary", "Origin");
  } else if (origin) {
    // Origin present but NOT allowlisted — deny credentials, no Allow-Origin
    // (browser will block the response due to missing header)
    res.headers.set("Vary", "Origin");
  }
  // No origin header = direct request (curl/server) — no CORS headers needed

  return res;
}

// ─────────────────────────────────────────────────────────────
//  SECURITY HEADERS — Applied to EVERY response
//  CSP: eval is strictly disallowed; inline styles permitted for UI themes.
// ─────────────────────────────────────────────────────────────
function applySecurityHeaders(res: NextResponse, requestId: string): NextResponse {
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );

  // Correlation ID for distributed tracing — never contains sensitive values
  res.headers.set("X-Request-ID", requestId);

  const isProd = process.env.NODE_ENV === "production";
  
  // React / Next.js / Turbopack requires eval for Fast Refresh and dev callstack reconstruction in development mode.
  // In production, eval is strictly forbidden for zero-trust security.
  const scriptDirectives = isProd
    ? "script-src 'self' 'unsafe-inline' https://apis.google.com https://connect.facebook.net https://www.googletagmanager.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://connect.facebook.net https://www.googletagmanager.com";

  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      scriptDirectives,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      // Connect-src: real-time ws/wss for Socket.io, https for API calls, http for local dev
      "connect-src 'self' wss: ws: https: http:",
      "frame-src 'self' https://www.facebook.com https://web.facebook.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      isProd ? "upgrade-insecure-requests" : "",
    ].filter(Boolean).join("; ")
  );

  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Remove server fingerprinting
  res.headers.delete("X-Powered-By");
  res.headers.delete("Server");

  return res;
}

// ─────────────────────────────────────────────────────────────
//  RATE LIMITING — Redis-backed with in-memory fallback
// ─────────────────────────────────────────────────────────────
function getRateLimitKey(req: NextRequest): string {
  const jwtEmail = req.cookies.get("qr_access_token_email")?.value;
  const sessionEmail = req.cookies.get("session_email")?.value;
  const email = jwtEmail || sessionEmail;
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return `u:${email.toLowerCase().trim()}`;
  }
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "localhost";
  return `ip:${ip}`;
}

// ─────────────────────────────────────────────────────────────
//  HMAC SESSION VERIFICATION — Requires SESSION_SECRET env var.
//  Hard fails if secret is absent (never falls back to a default).
// ─────────────────────────────────────────────────────────────
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Do not throw here (middleware cannot throw to user) — return empty string
    // which will cause all HMAC verifications to fail safely.
    console.error("[Security] CRITICAL: SESSION_SECRET is missing or too short. All session verifications will fail.");
    return "";
  }
  return secret;
}

async function verifySessionToken(email: string, token: string): Promise<boolean> {
  const secret = getSessionSecret();
  if (!secret) return false;
  try {
    if (!email || !token) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(email.toLowerCase().trim()));

    const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (expected.length !== token.length) return false;

    // Constant-time comparison
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ token.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
//  SUSPICIOUS REQUEST DETECTION
// ─────────────────────────────────────────────────────────────
const SUSPICIOUS_PATTERNS = [
  /(\.\.|\.\.%2f|\.%2e)/i,                        // Path traversal
  /(\/etc\/passwd|\/proc\/|\.env\b)/i,           // Sensitive file access
  /(union\s+select|drop\s+table|insert\s+into)/i, // SQL injection
  /(\$where|\$ne|\$gt|\$lt|\$regex)/i,           // NoSQL injection
  /(eval\(|exec\(|system\(|passthru\()/i,         // RCE attempts
  /(<script|javascript:|data:text\/html)/i,        // XSS
];

const SCANNER_UAS = ["sqlmap", "nikto", "nmap", "masscan", "zgrab", "nuclei", "dirbuster", "gobuster"];

function detectSuspiciousRequest(req: NextRequest): boolean {
  try {
    const url = decodeURIComponent(req.url);
    const ua = (req.headers.get("user-agent") || "").toLowerCase();
    if (SUSPICIOUS_PATTERNS.some((p) => p.test(url))) return true;
    if (SCANNER_UAS.some((s) => ua.includes(s))) return true;
  } catch {
    // decodeURIComponent can throw on malformed URLs — treat as suspicious
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
//  PUBLIC PATHS — Unauthenticated access explicitly allowed
//
//  SECURITY NOTE:
//  • Webhooks are listed here because Meta/Telegram/Stripe call them
//    without session cookies. Each webhook handler MUST verify the
//    provider's own signature internally.
//  • Instagram integration routes are NOT public — they require an
//    authenticated session and are handled inside the route handlers.
// ─────────────────────────────────────────────────────────────
const PUBLIC_PATHS = new Set([
  // Pages
  "/login", "/signup", "/register", "/auth", "/",
  "/about", "/product", "/pricing", "/demo", "/request-demo",
  "/features", "/faq", "/blog", "/contact", "/integrations",
  "/privacy", "/terms",

  // Health / readiness probes
  "/api/health",
  "/api/ready",
  "/api/system/status",

  // Authentication flows (these routes perform their own credential validation)
  "/api/auth/google",
  "/api/auth/facebook",
  "/api/auth/linkedin",
  "/api/auth/twitter",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/callback/google",
  "/api/auth/callback/facebook",
  "/api/auth/callback/twitter",
  "/api/auth/callback/linkedin",
  "/api/auth/logout",
  "/api/auth/refresh",

  // Cron jobs (validated by CRON_SECRET internally)
  "/api/cron/poll",

  // Provider webhooks — these must verify their own signatures internally
  "/api/billing/webhook",
  "/api/webhooks/whatsapp",
  "/api/webhooks/telegram",
  "/api/webhooks/instagram",
  "/api/webhooks/linkedin",
  "/api/social/whatsapp/webhook",

  // WhatsApp embedded signup (Meta-initiated, has its own token validation)
  "/api/whatsapp/embedded-signup",
  "/api/whatsapp/embedded-signup/start",
  "/api/whatsapp/embedded-signup/callback",

  // Extension session status/validation
  "/api/extension/session",

  // Socket.io health check
  "/api/socketio",

  // Automation OS Public APIs for Guest Playground & Catalog Discovery
  "/api/integrations/catalog",
]);

// Prefix-based public paths (startsWith check)
const PUBLIC_PATH_PREFIXES = [
  "/api/auth/",
  "/api/webhooks/",
  "/api/ai/",
  "/api/workflows/",
  "/api/automations/",
];

const STATIC_PATHS = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/assets"];
const isStaticAsset = (path: string) =>
  /\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|mp4|webm)$/i.test(path);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Exact prefix match for webhooks and auth sub-routes
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE ENTRY POINT
// ─────────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Generate correlation ID for this request — propagated via response header
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // 1. Static assets pass immediately — no auth, no rate limiting
  if (STATIC_PATHS.some((p) => pathname.startsWith(p)) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // 2. OPTIONS preflight — return CORS headers without authentication
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    applyCORS(req, res);
    applySecurityHeaders(res, requestId);
    return res;
  }

  // 3. Suspicious request detection — block scanners and injection probes
  if (detectSuspiciousRequest(req)) {
    console.warn(`[Security] Blocked suspicious request: ${req.method} ${pathname} [${requestId}]`);
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Forbidden", request_id: requestId } },
      { status: 403 }
    );
  }

  // 4. Rate limiting on API routes (enforced strictly in production; relaxed in dev for Fast Refresh)
  if (pathname.startsWith("/api/") && process.env.NODE_ENV === "production") {
    const key = getRateLimitKey(req);
    const config = getRateLimitForPath(pathname);
    try {
      const result = await checkRateLimit(key, config);
      if (!result.allowed) {
        console.warn(`[RateLimit] Hit for ${key} on ${pathname} [${requestId}]`);
        const res = NextResponse.json(
          { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please slow down.", request_id: requestId } },
          { status: 429, headers: rateLimitHeaders(result) }
        );
        applySecurityHeaders(res, requestId);
        applyCORS(req, res);
        return res;
      }
    } catch (err) {
      // Rate limiter failure — fail open (log only), do not block traffic
      console.error(`[RateLimit] Error: ${err} [${requestId}]`);
    }
  }

  // 5. Public paths — pass through without authentication check
  if (isPublicPath(pathname)) {
    const res = NextResponse.next();
    applySecurityHeaders(res, requestId);
    applyCORS(req, res);
    return res;
  }

  // ─────────────────────────────────────────────────────────────
  //  AUTHENTICATION CHECK
  //  Priority: JWT access token > Extension header auth > Legacy cookie
  //
  //  SECURITY NOTE: Middleware only determines "is there a plausible
  //  authenticated session?" — fine-grained authorization (can this
  //  user access this specific resource?) happens inside route handlers.
  // ─────────────────────────────────────────────────────────────

  const jwtToken = req.cookies.get("qr_access_token")?.value;
  const sessionEmail = req.cookies.get("session_email")?.value;
  const sessionTokenCookie = req.cookies.get("session_token")?.value;
  const headerEmail = req.headers.get("x-session-email");
  const headerToken = req.headers.get("x-session-token");

  // JWT path — full verification happens inside route handlers
  if (jwtToken) {
    const res = NextResponse.next();
    applySecurityHeaders(res, requestId);
    applyCORS(req, res);
    return res;
  }

  // Extension header auth (content scripts)
  if (headerEmail && headerToken) {
    const headerValid = await verifySessionToken(headerEmail, headerToken);
    if (headerValid) {
      const res = NextResponse.next();
      applySecurityHeaders(res, requestId);
      applyCORS(req, res);
      return res;
    }
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: { code: "INVALID_SESSION", message: "Authentication required", request_id: requestId } },
        { status: 401 }
      );
      applySecurityHeaders(res, requestId);
      return res;
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Legacy session cookie path
  if (!sessionEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sessionEmail)) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required", request_id: requestId } },
        { status: 401 }
      );
      applySecurityHeaders(res, requestId);
      return res;
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callback", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!sessionTokenCookie) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: { code: "INVALID_SESSION", message: "Session token missing", request_id: requestId } },
        { status: 401 }
      );
      applySecurityHeaders(res, requestId);
      return res;
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const decodedEmail = decodeURIComponent(sessionEmail);
  const tokenValid = await verifySessionToken(decodedEmail, sessionTokenCookie);
  if (!tokenValid) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: { code: "INVALID_SESSION", message: "Session invalid or expired", request_id: requestId } },
        { status: 401 }
      );
      applySecurityHeaders(res, requestId);
      return res;
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const res = NextResponse.next();
  applySecurityHeaders(res, requestId);
  applyCORS(req, res);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)).*)",
  ],
};
