/**
 * ============================================================
 *  QuickReply — Credit Balance API Endpoint
 *  GET /api/credits/balance
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/backend/auth/guard";
import { getCreditBalance } from "@/backend/credits/ledger";

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
    const balanceInfo = await getCreditBalance(session.email);
    return NextResponse.json({
      success: true,
      data: balanceInfo,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "BALANCE_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
