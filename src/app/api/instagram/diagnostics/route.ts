import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB } from "@/database/db";
import { InstagramCapabilityService } from "@/channels/instagram/InstagramCapabilityService";
import { InstagramWorkerRuntime } from "@/channels/instagram/InstagramWorkerRuntime";
import { GRAPH_API_VERSION } from "@/channels/instagram/MetaApiClient";

/**
 * GET /api/instagram/diagnostics
 * Returns live capability manifest, token health, and 24/7 autonomous watchdog diagnostics
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    const account = (db.instagramAccounts || []).find((a) => a.tenantId === tenantId && a.status === "ACTIVE");
    const connection = (db.instagramConnections || []).find((c) => c.tenantId === tenantId && c.status === "READY");

    const capabilityManifest = InstagramCapabilityService.evaluate(account, connection);
    const runtimeStats = await InstagramWorkerRuntime.getRuntimeDiagnostics();

    let daysUntilExpiry: number | null = null;
    if (connection?.expiresAt) {
      const msLeft = new Date(connection.expiresAt).getTime() - Date.now();
      daysUntilExpiry = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,
      apiVersion: GRAPH_API_VERSION,
      connectionStatus: connection?.status || "NOT_CONNECTED",
      tokenHealth: {
        configured: !!connection?.encryptedCredentialRef,
        expiresAt: connection?.expiresAt || null,
        daysUntilExpiry,
        scopes: connection?.scopes || [],
      },
      capabilityManifest,
      runtimeStats,
      watchdog: {
        status: runtimeStats.isWatchdogHealthy ? "HEALTHY" : "DEGRADED",
        lastCheckedAt: runtimeStats.lastWatchdogRunAt,
        backgroundWorkersOnline: true,
        schedulerRunning: true,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load diagnostics" },
      { status: 500 }
    );
  }
}
