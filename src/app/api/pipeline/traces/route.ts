import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";

/**
 * GET /api/pipeline/traces
 *
 * Returns the latest pipeline traces (per-stage telemetry) from the engine.
 * Used by the Live Pipeline visualizer.
 *
 * Query params:
 *   ?limit=N  Max traces to return (default 50, capped at 50)
 */
export async function GET(req: NextRequest) {
  const db = await getDB();
  const traces = db.pipelineTraces || [];

  const limitParam = req.nextUrl.searchParams.get("limit");
  const parsed = parseInt(limitParam || "50", 10);
  const limit = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 50, 1), 50);

  return NextResponse.json({
    traces: traces.slice(0, limit),
    total: traces.length,
    limit,
  });
}
