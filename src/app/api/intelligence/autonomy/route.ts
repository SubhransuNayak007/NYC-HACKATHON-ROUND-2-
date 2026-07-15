import { NextResponse } from "next/server";
import { getDB, saveDB, type AutonomyLevel } from "@/database/db";
import { AutonomyEngine } from "@/backend/intelligence/AutonomyEngine";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDB();
    return NextResponse.json({ ok: true, autonomyConfig: db.autonomyConfig });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await getDB();
    if (!db.autonomyConfig) {
      db.autonomyConfig = {
        currentLevel: 3,
        confidenceThresholds: { autoSend: 0.85, draftForReview: 0.65, escalateToHuman: 0.40 },
        hardPolicies: {
          neverMentionDiscountsWithoutApproval: true,
          neverPromiseRefundsAutonomously: true,
          neverRecommendOutOfStockProducts: true,
          escalateLegalThreatsImmediately: true,
          escalateAngryVIPCustomers: true,
          customRules: [],
        },
        circuitBreaker: { tripped: false },
      };
    }

    if (typeof body.level === "number" && body.level >= 0 && body.level <= 5) {
      db.autonomyConfig.currentLevel = body.level as AutonomyLevel;
    }
    if (body.resetCircuitBreaker) {
      await AutonomyEngine.resetCircuitBreaker(db.autonomyConfig.currentLevel);
    }

    await saveDB(db);
    return NextResponse.json({ ok: true, autonomyConfig: db.autonomyConfig });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
