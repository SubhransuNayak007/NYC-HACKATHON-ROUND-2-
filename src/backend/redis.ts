/**
 * Redis Connection Manager for Quick Reply
 *
 * Provides a shared Redis connection using ioredis.
 * Used by BullMQ job queue, rate limiter, and session store.
 * Falls back gracefully when Redis is not configured.
 *
 * IMPORTANT: ioredis is imported dynamically to prevent Turbopack/Webpack
 * from bundling it into client/Edge bundles (redis-errors uses Node.js
 * Buffer internally which breaks in non-Node runtimes).
 *
 * Process exit cleanup is handled in instrumentation.ts (Node.js only).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redis: any = null;
let redisAvailable = false;

async function loadRedis(): Promise<any> {
  if (RedisClass) return RedisClass;
  try {
    const mod = await import("ioredis");
    RedisClass = mod.default ?? mod;
    return RedisClass;
  } catch {
    return null;
  }
}

/**
 * Get or create the shared Redis connection.
 * Returns null if REDIS_URL is not set (graceful fallback).
 */
export async function getRedis(): Promise<any | null> {
  if (redis && redisAvailable) return redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    if (redisAvailable !== false) {
      console.warn("[Redis] REDIS_URL not set — running without Redis. Queue, rate limiting, and sessions will use in-memory fallback.");
    }
    redisAvailable = false;
    return null;
  }

  const RedisConstructor = await loadRedis();
  if (!RedisConstructor) {
    redisAvailable = false;
    return null;
  }

  try {
    redis = new RedisConstructor(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) {
          console.error("[Redis] Failed to connect after 3 retries");
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 5000,
    });

    redis.on("connect", () => {
      redisAvailable = true;
      console.log("[Redis] Connected successfully");
    });

    redis.on("error", (err: Error) => {
      if (redisAvailable) {
        console.error("[Redis] Connection error:", err.message);
      }
      redisAvailable = false;
    });

    redis.on("close", () => {
      redisAvailable = false;
    });

    // Try to connect
    redis.connect().catch(() => {
      redisAvailable = false;
    });

    return redis;
  } catch (err) {
    console.error("[Redis] Failed to initialize:", err);
    redisAvailable = false;
    return null;
  }
}

/**
 * Check if Redis is available and connected.
 */
export function isRedisAvailable(): boolean {
  return redisAvailable && redis !== null;
}

/**
 * Close the Redis connection gracefully.
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => {});
    redis = null;
    redisAvailable = false;
  }
}
