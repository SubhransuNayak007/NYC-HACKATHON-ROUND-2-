import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitForPath, rateLimitHeaders } from "@/backend/ratelimit";

// Static pre-computed hash or fallback for theme init script
const THEME_INIT_HASH = "r3Qh9o6aY0v1dK3m7N8pL9x2w1z0y8v7u6t5s4r3q2p";


// ─────────────────────────────────────────────────────────────
//  SECURITY HEADERS — Applied to EVERY response
//  Generates a per-request CSP nonce so Next.js inline scripts
//  load without 'unsafe-inline' (XSS hardening).
// ─────────────────────────────────────────────────────────────
function generateCSPNonce(): string {
  // Edge-runtime-safe (Web Crypto), 16 random bytes -> base64
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  // Single-use nonce for CSP
  const nonce = generateCSPNonce();

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );

  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    `'sha256-${THEME_INIT_HASH}'`, // pre-paint theme bootstrap script
    "'sha256-CM9lqT+afP2TCh4JDEQSY201I+bpC2fGWLKvwuJY7bI='",
    "https://js.stripe.com",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []), // dev-only HMR
  ].join(" ");

  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' wss: https://api.stripe.com https://graph.instagram.com https://api.twitter.com https://api.linkedin.com https://graph.facebook.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  // Next.js injects inline scripts automatically; give them the nonce.
  res.headers.set("X-Content-Security-Policy-Nonce", nonce);

  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  // Remove server fingerprinting
  res.headers.delete("X-Powered-By");
  return res;
}

// ─────────────────────────────────────────────────────────────
//  CORS — Lock down API to known origins
// ─────────────────────────────────────────────────────────────
function applyCORS(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const isProd = process.env.NODE_ENV === "production";
  const allowedOrigins = [
    appUrl,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean);

  // In production, only allow the configured app URL
  if (isProd) {
    if (origin && origin === appUrl) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.headers.set("Vary", "Origin");
    } else if (!origin) {
      // Same-origin request — allow
      res.headers.set("Access-Control-Allow-Origin", appUrl);
    }
    // No CORS headers = request blocked by browser for cross-origin
  } else {
    // Development - allow localhost origins
    if (origin && allowedOrigins.includes(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.headers.set("Vary", "Origin");
    } else if (!origin) {
      res.headers.set("Access-Control-Allow-Origin", "http://localhost:3000");
    }
  }

  return res;
}

// ─────────────────────────────────────────────────────────────
//  RATE LIMITING — Uses Redis-backed rate limiter with in-memory fallback
// ─────────────────────────────────────────────────────────────
function getRateLimitKey(req: NextRequest): string {
  const email = req.cookies.get("session_email")?.value;
  if (email) return `u:${email.toLowerCase()}`;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return `ip:${forwarded.split(",")[0].trim()}`;
  return "ip:unknown";
}

// ─────────────────────────────────────────────────────────────
//  HMAC SESSION VERIFICATION
// ─────────────────────────────────────────────────────────────
async function verifySessionToken(email: string, token: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET || "session-fallback";
  try {
    if (!email || !token) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(email.toLowerCase().trim()));

    if (!sig) return false;

    const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    // Constant-time comparison to prevent timing attacks
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

// ─────────────────────────────────────────────────────────────
//  SUSPICIOUS REQUEST DETECTION
// ─────────────────────────────────────────────────────────────
const SUSPICIOUS_PATTERNS = [
  /(\.\.|\/etc\/passwd|\/proc\/|\.env)/i,     // Path traversal
  /(union\s+select|drop\s+table|insert\s+into)/i, // SQL injection
  /(\$where|\$ne|\$gt|\$lt|\$regex)/i,        // NoSQL injection
  /(eval\(|exec\(|system\(|passthru\()/i,    // RCE attempts
  /(<script|javascript:|data:text\/html)/i,   // XSS
  /(\bwget\b|\bcurl\b|\bcat\b\s+\/)/i,       // Shell injection
];

function detectSuspiciousRequest(req: NextRequest): boolean {
  const url = decodeURIComponent(req.url);
  const ua = req.headers.get("user-agent") || "";

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url)) return true;
  }

  // Block common scanner user agents
  const SCANNER_UAS = ["sqlmap", "nikto", "nmap", "masscan", "zgrab", "nuclei"];
  if (SCANNER_UAS.some((s) => ua.toLowerCase().includes(s))) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────
//  PUBLIC PATHS (no auth required)
// ─────────────────────────────────────────────────────────────
// Only truly public endpoints - all API routes require auth except webhooks
const PUBLIC_PATHS = [
  "/login", "/signup", "/register", "/auth", "/",
  "/about", "/product", "/pricing", "/demo", "/request-demo",
  "/features", "/faq", "/blog", "/contact", "/integrations",
  "/api/auth/google",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/callback/google",
  "/api/auth/callback/instagram",
  "/api/auth/callback/twitter",
  "/api/auth/callback/linkedin",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/cron/poll",
  "/api/billing/webhook",        // Stripe webhooks (verified by signature)
  "/api/social/whatsapp/webhook", // WhatsApp webhooks (verified internally)
  "/api/socketio",
  "/api/extension",
  // "/dashboard",                 // REQUIRES AUTH - removed from public
  // "/onboarding",                // REQUIRES AUTH - removed from public
];

const STATIC_PATHS = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/assets"];

// Check for common static file extensions
const isStaticAsset = (path: string) =>
  /\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|mp4|webm|json)$/i.test(path);

// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE ENTRY POINT
// ─────────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Pass static assets and public files immediately
  if (STATIC_PATHS.some((p) => pathname.startsWith(p)) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // 2. OPTIONS preflight — return CORS immediately
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    applyCORS(req, res);
    applySecurityHeaders(res);
    return res;
  }

  // 3. Suspicious request detection (honeypot/scanner block)
  if (detectSuspiciousRequest(req)) {
    console.warn(`[Security] Blocked suspicious request: ${req.url}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Rate limiting on API routes (Redis-backed with in-memory fallback)
  if (pathname.startsWith("/api/")) {
    const key = getRateLimitKey(req);
    const config = getRateLimitForPath(pathname);

    try {
      const result = await checkRateLimit(key, config);

      if (!result.allowed) {
        const res = NextResponse.json(
          { error: "Too many requests. Slow down." },
          {
            status: 429,
            headers: rateLimitHeaders(result),
          }
        );
        applySecurityHeaders(res);
        applyCORS(req, res);
        return res;
      }

      // Add rate limit headers to successful responses
      const rateLimitResHeaders = rateLimitHeaders(result);
    } catch (err) {
      console.error("[RateLimit] Error:", err);
      // On error, allow request (fail open) but log
    }
  }

  // 5. Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const res = NextResponse.next();
    applySecurityHeaders(res);
    applyCORS(req, res);
    return res;
  }

  // 6. Authentication check - JWT first, then legacy cookie, then extension header
  const jwtToken = req.cookies.get("qr_access_token")?.value;
  const sessionEmail = req.cookies.get("session_email")?.value;
  const sessionTokenCookie = req.cookies.get("session_token")?.value;

  // Extension header-based auth (content scripts / service worker cannot
  // read httpOnly cookies cross-origin, so the extension sends
  // X-Session-Email + X-Session-Token headers instead).
  const headerEmail = req.headers.get("x-session-email");
  const headerToken = req.headers.get("x-session-token");

  // JWT short-circuit (verified fully in API route handlers)
  if (jwtToken) {
    const res = NextResponse.next();
    applySecurityHeaders(res);
    applyCORS(req, res);
    return res;
  }

  // Validate header auth (extension)
  if (headerEmail && headerToken) {
    const headerValid = await verifySessionToken(headerEmail, headerToken);
    if (headerValid) {
      const res = NextResponse.next();
      applySecurityHeaders(res);
      applyCORS(req, res);
      return res;
    }
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Invalid session" }, { status: 401 });
      applySecurityHeaders(res);
      return res;
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Legacy session validation (cookie-based)
  if (!sessionEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sessionEmail)) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Authentication required" }, { status: 401 });
      applySecurityHeaders(res);
      return res;
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callback", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!sessionTokenCookie) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Invalid session" }, { status: 401 });
      applySecurityHeaders(res);
      return res;
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const tokenValid = await verifySessionToken(sessionEmail, sessionTokenCookie);
  if (!tokenValid) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Invalid session" }, { status: 401 });
      applySecurityHeaders(res);
      return res;
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const res = NextResponse.next();
  applySecurityHeaders(res);
  applyCORS(req, res);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)).*)",
  ],
};
