/**
 * Rate Limiter for Quick Reply
 *
 * Per-user, per-channel rate limiting backed by Redis when available,
 * with an in-memory sliding window fallback. Prevents abuse while
 * allowing legitimate high-volume usage.
 *
 * Limits:
 * - General API: 120 req/min per user
 * - YouTube poll: 10 req/min per user
 * - Reply posting: 30 req/min per user
 * - Auth endpoints: 10 req/min per IP
 * - Webhook endpoints: 100 req/min per IP
 */

import { getRedis, isRedisAvailable } from "./redis";

// --- Configuration ---

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix: string;     // Redis key prefix
}

export const RATE_LIMITS = {
  /** General API requests */
  API: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 120,
    keyPrefix: "rl:api",
  },
  /** YouTube comment polling (heavy operation) */
  YOUTUBE_POLL: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,
    keyPrefix: "rl:yt-poll",
  },
  /** Reply posting */
  REPLY: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 30,
    keyPrefix: "rl:reply",
  },
  /** Authentication endpoints (per IP) */
  AUTH: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,
    keyPrefix: "rl:auth",
  },
  /** Webhook / cron endpoints (per IP) */
  WEBHOOK: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 100,
    keyPrefix: "rl:webhook",
  },
  /** Comment creation / reply posting per channel */
  CHANNEL: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 60,
    keyPrefix: "rl:channel",
  },
} satisfies Record<string, RateLimitConfig>;

// --- In-Memory Sliding Window (fallback when Redis unavailable) ---

interface WindowEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, WindowEntry>();
let lastMemoryCleanup = Date.now();
const MEMORY_CLEANUP_INTERVAL = 60_000;

function cleanupMemoryStore() {
  const now = Date.now();
  if (now - lastMemoryCleanup < MEMORY_CLEANUP_INTERVAL) return;
  lastMemoryCleanup = now;
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}

// --- Redis Rate Limiter (Sliding Window Counter) ---

async function checkRedisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const redis = await getRedis();
  if (!redis || !isRedisAvailable()) {
    return checkMemoryRateLimit(key, config);
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;
  const redisKey = `${config.keyPrefix}:${key}`;

  try {
    // Use a Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(redisKey, 0, windowStart);

    // Count current window requests
    pipeline.zcard(redisKey);

    // Add current request
    pipeline.zadd(redisKey, now.toString(), `${now}:${Math.random().toString(36).slice(2, 10)}`);

    // Set expiry on the key
    pipeline.pexpire(redisKey, config.windowMs);

    const results = await pipeline.exec();

    if (!results) {
      return { allowed: false, remaining: 0, resetMs: config.windowMs };
    }

    const count = (results[1]?.[1] as number) || 0;
    const allowed = count < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count - 1);
    const resetMs = config.windowMs;

    return { allowed, remaining, resetMs };
  } catch (err) {
    console.error("[RateLimit] Redis error, falling back to memory:", err);
    return checkMemoryRateLimit(key, config);
  }
}

// --- In-Memory Rate Limiter (Fallback) ---

function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetMs: number } {
  cleanupMemoryStore();

  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetMs: config.windowMs };
  }

  entry.count++;
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return { allowed, remaining, resetMs: entry.resetTime - now };
}

// --- Public API ---

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  retryAfterMs: number;
}

/**
 * Check rate limit for a given key and config.
 * Returns whether the request is allowed and metadata for response headers.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const result = await checkRedisRateLimit(key, config);
  return {
    ...result,
    retryAfterMs: result.allowed ? 0 : result.resetMs,
  };
}

/**
 * Get the appropriate rate limit config for a given API path.
 */
export function getRateLimitForPath(pathname: string): RateLimitConfig {
  if (pathname === "/api/youtube/poll") return RATE_LIMITS.YOUTUBE_POLL;
  if (pathname.startsWith("/api/auth/")) return RATE_LIMITS.AUTH;
  if (pathname.includes("/reply")) return RATE_LIMITS.REPLY;
  if (pathname.startsWith("/api/cron/")) return RATE_LIMITS.WEBHOOK;
  if (pathname.includes("/channels")) return RATE_LIMITS.CHANNEL;
  return RATE_LIMITS.API;
}

/**
 * Build rate limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetMs / 1000).toString(),
    ...(result.retryAfterMs > 0
      ? { "Retry-After": Math.ceil(result.retryAfterMs / 1000).toString() }
      : {}),
  };
}
