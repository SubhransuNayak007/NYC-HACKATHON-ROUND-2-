import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/backend/auth";
import { DurableEventBus } from "@/backend/events/EventBus";
import { ReliabilityEngine } from "@/backend/reliability/ReliabilityEngine";
import { VerifiableAuditLedger } from "@/backend/audit/VerifiableAuditLedger";

/**
 * GET /api/system/reliability
 * Returns live Autonomous Business OS telemetry: EventBus, Circuit Breakers, DLQ, Audit Ledger
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getUserFromCookies(req.headers.get("cookie"));
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventBus = DurableEventBus.getInstance();
    const reliability = ReliabilityEngine.getInstance();
    const chainIntegrity = VerifiableAuditLedger.verifyChainIntegrity();
    const merkleRoot = VerifiableAuditLedger.getMerkleRoot();
    const recentBlocks = VerifiableAuditLedger.getRecentBlocks(10);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      eventBus: eventBus.getMetrics(),
      reliability: reliability.getDiagnostics(),
      dlq: reliability.getDLQ(),
      auditLedger: {
        integrity: chainIntegrity,
        merkleRoot,
        totalBlocks: chainIntegrity.totalBlocks,
        recentBlocks,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "System diagnostics error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
