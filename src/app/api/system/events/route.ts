import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";

/**
 * System events endpoint for the dashboard audit trail.
 * Returns paginated system events sorted by most recent first.
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    const systemEvents = db.systemEvents || [];

    // Pagination
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
    const type = req.nextUrl.searchParams.get("type") || null;

    let filtered = systemEvents;

    // Filter by type if specified
    if (type) {
      filtered = filtered.filter((e) => e.type === type);
    }

    // Paginate
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return NextResponse.json({
      events: paginated,
      total: filtered.length,
      page,
      limit,
      hasMore: start + limit < filtered.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch system events", details: err.message },
      { status: 500 }
    );
  }
}
