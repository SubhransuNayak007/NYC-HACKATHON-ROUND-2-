import { NextResponse } from "next/server";

/**
 * POST /api/demo/seed
 * Demo endpoint - only available in development mode.
 * In production, this endpoint returns 404.
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { requireWorkspaceEmail } = await import("@/database/db");
    const { seedDemoWorkspace } = await import("@/backend/demo");

    const email = await requireWorkspaceEmail();
    const result = await seedDemoWorkspace(email);
    return NextResponse.json(result);
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode === 401) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("[Demo] Seed failed:", err);
    return NextResponse.json({ error: "Failed to seed demo workspace" }, { status: 500 });
  }
}
