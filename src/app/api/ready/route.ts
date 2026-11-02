/**
 * ============================================================
 *  QuickReply — Readiness Probe Endpoint
 *  GET /api/ready
 * ============================================================
 */

import { NextResponse } from "next/server";
import { getDB, getMongoClient } from "@/database/db";
import { isRedisAvailable } from "@/backend/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = {
    status: "ready",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: "unknown",
      redis: "unknown",
      encryption: "unknown",
      aiProvider: "unknown",
    },
  };

  // 1. Database connection check
  try {
    const uri = process.env.MONGODB_URI;
    if (uri) {
      const client = await getMongoClient();
      await client.db("quickreply").command({ ping: 1 });
      readiness.services.database = "mongodb_connected";
    } else {
      await getDB();
      readiness.services.database = "local_json_ready";
    }
  } catch (err: any) {
    readiness.services.database = `error: ${err.message}`;
    readiness.status = "not_ready";
  }

  // 2. Redis check
  readiness.services.redis = isRedisAvailable() ? "connected" : "fallback_memory";

  // 3. Encryption key check
  const encKey = process.env.TOKEN_ENCRYPTION_KEY;
  readiness.services.encryption = encKey ? "configured" : "fallback_dev";

  // 4. AI Provider check
  if (process.env.GEMINI_API_KEY) {
    readiness.services.aiProvider = "gemini_ready";
  } else if (process.env.ANTHROPIC_API_KEY) {
    readiness.services.aiProvider = "anthropic_ready";
  } else if (process.env.OPENAI_API_KEY) {
    readiness.services.aiProvider = "openai_ready";
  } else {
    readiness.services.aiProvider = "rule_fallback_only";
  }

  const isReady = readiness.status === "ready";
  return NextResponse.json(readiness, { status: isReady ? 200 : 503 });
}
