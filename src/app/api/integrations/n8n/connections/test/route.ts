import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, decryptToken, N8nConnectionRecord } from "@/database/db";
import { N8nApiClient } from "@/backend/automation/n8n/N8nApiClient";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/n8n/connections/test
 * Test connectivity against a remote n8n instance
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let instanceUrl = body.instanceUrl;
    let apiKey = body.apiKey;

    // If connectionId is provided, look up stored credentials
    if (body.connectionId) {
      const session = getSessionUser(req);
      const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";
      const db = await getDB(tenantId);
      const connection = (db.n8nConnections || []).find(
        (c: N8nConnectionRecord) => c.id === body.connectionId
      );

      if (!connection) {
        return NextResponse.json({ error: "Connection not found." }, { status: 404 });
      }

      instanceUrl = connection.instanceUrl;
      try {
        apiKey = decryptToken(connection.encryptedApiKey);
      } catch {
        return NextResponse.json(
          { error: "Failed to decrypt credentials for the selected connection." },
          { status: 500 }
        );
      }
    }

    if (!instanceUrl || !apiKey) {
      return NextResponse.json(
        { error: "Both instanceUrl and apiKey are required for connection testing." },
        { status: 400 }
      );
    }

    const testResult = await N8nApiClient.testConnection(instanceUrl, apiKey);
    return NextResponse.json(testResult);
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err.message || "Failed to execute connection test.",
      },
      { status: 500 }
    );
  }
}
