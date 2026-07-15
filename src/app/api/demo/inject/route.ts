import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/demo/inject
 * Demo endpoint - only available in development mode.
 * In production, this endpoint returns 404.
 */
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { requireWorkspaceEmail } = await import("@/database/db");
    const { injectDemoComments } = await import("@/backend/demo");

    await requireWorkspaceEmail();

    let count = 3;
    try {
      const body = await req.json();
      if (body && typeof body.count === "number" && Number.isFinite(body.count) && body.count > 0) {
        count = Math.min(Math.floor(body.count), 50);
      }
    } catch {
      // Empty or invalid body — use the default count
    }

    const result = await injectDemoComments(count);
    return NextResponse.json(result);
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode === 401) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("[Demo] Inject failed:", err);
    return NextResponse.json({ error: "Failed to inject demo comments" }, { status: 500 });
  }
}
