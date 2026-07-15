import { NextResponse } from "next/server";
import { getDB } from "@/database/db";
import { getRedis, isRedisAvailable } from "@/backend/redis";

/**
 * Health check endpoint for load balancers and monitoring.
 * Returns basic system health without sensitive data.
 */
export async function GET() {
  try {
    const checks = {
      database: false,
      redis: false,
      youtube_oauth: false,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
    };

    // Check database
    try {
      await getDB();
      checks.database = true;
    } catch {
      checks.database = false;
    }

    // Check Redis
    try {
      checks.redis = isRedisAvailable();
    } catch {
      checks.redis = false;
    }

    // Check YouTube OAuth (if channels exist)
    try {
      const db = await getDB();
      const hasChannels = db.channels.some(
        (c) => c.status === "active" && (c.refreshToken || c.accessToken)
      );
      checks.youtube_oauth = hasChannels;
    } catch {
      checks.youtube_oauth = false;
    }

    const healthy = checks.database;

    return NextResponse.json(
      {
        status: healthy ? "healthy" : "degraded",
        checks,
      },
      { status: healthy ? 200 : 503 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}