/**
 * ============================================================
 *  QuickReply — Credit Ledger History API Endpoint
 *  GET /api/credits/ledger
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/backend/auth/guard";
import { getDB } from "@/database/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const db = await getDB(session.email);
    const ledger = db.creditLedger || [];
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10));
    const offset = (page - 1) * limit;

    const items = ledger.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: ledger.length,
        page,
        limit,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "LEDGER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
