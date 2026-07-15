/**
 * GET /api/queue/status — Queue health and status
 *
 * Shows BullMQ queue stats when Redis is available.
 */

import { NextResponse } from "next/server";
import { getQueueStatus } from "@/backend/queue";
import { isRedisAvailable } from "@/backend/redis";

export async function GET() {
  const redisOk = isRedisAvailable();
  const queues = redisOk ? await getQueueStatus() : {};

  return NextResponse.json({
    redis: redisOk ? "connected" : "unavailable",
    queues,
    timestamp: new Date().toISOString(),
  });
}
