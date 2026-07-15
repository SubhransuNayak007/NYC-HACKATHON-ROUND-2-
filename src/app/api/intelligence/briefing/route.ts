import { NextResponse } from "next/server";
import { BusinessCopilot } from "@/backend/intelligence/BusinessCopilot";

export const runtime = "nodejs";

export async function GET() {
  try {
    const briefing = await BusinessCopilot.getDailyBriefing();
    return NextResponse.json({ ok: true, briefing });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
