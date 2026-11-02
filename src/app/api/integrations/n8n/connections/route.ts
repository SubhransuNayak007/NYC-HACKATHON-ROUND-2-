import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB, encryptToken, decryptToken, N8nConnectionRecord } from "@/database/db";
import { N8nApiClient } from "@/backend/automation/n8n/N8nApiClient";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

/**
 * Helper to mask sensitive API keys for client delivery
 */
function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

/**
 * GET /api/integrations/n8n/connections
 * Lists configured n8n instances with masked API keys
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const db = await getDB(tenantId);
    const connections: N8nConnectionRecord[] = db.n8nConnections || [];

    const sanitized = connections.map((conn) => {
      let maskedKey = "••••••••";
      try {
        const decrypted = decryptToken(conn.encryptedApiKey);
        maskedKey = maskApiKey(decrypted);
      } catch {
        // Keep masked
      }

      return {
        id: conn.id,
        name: conn.name || "Default n8n Instance",
        instanceUrl: conn.instanceUrl,
        maskedApiKey: maskedKey,
        status: conn.status,
        lastTestedAt: conn.lastTestedAt,
        createdAt: conn.createdAt,
        isDefault: Boolean(conn.isDefault),
      };
    });

    return NextResponse.json({
      success: true,
      connections: sanitized,
      hasConnectedInstance: sanitized.length > 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to list n8n connections.", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/n8n/connections
 * Test & store an encrypted n8n instance connection
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { instanceUrl, apiKey, name, isDefault } = body;

    if (!instanceUrl || typeof instanceUrl !== "string") {
      return NextResponse.json(
        { error: "n8n instance URL is required (e.g. https://workspace.app.n8n.cloud)." },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "n8n API key is required. Generate one in n8n under Settings > n8n API." },
        { status: 400 }
      );
    }

    // SSRF-safe URL validation
    let normalizedUrl: string;
    try {
      normalizedUrl = await N8nApiClient.validateAndNormalizeUrl(instanceUrl);
    } catch (urlErr: any) {
      return NextResponse.json(
        { error: urlErr.message || "Invalid or restricted instance URL." },
        { status: 400 }
      );
    }

    // Verify live connectivity against n8n's official REST API
    const testResult = await N8nApiClient.testConnection(normalizedUrl, apiKey);
    if (!testResult.ok) {
      return NextResponse.json(
        {
          error: testResult.error || "Could not verify connection to n8n instance.",
          details: testResult,
        },
        { status: 422 }
      );
    }

    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const db = await getDB(tenantId);
    if (!db.n8nConnections) db.n8nConnections = [];

    // Mark previous connections as non-default if this one is marked default
    if (isDefault || db.n8nConnections.length === 0) {
      for (const existing of db.n8nConnections) {
        existing.isDefault = false;
      }
    }

    const now = new Date().toISOString();
    const newConnection: N8nConnectionRecord = {
      id: `n8n_conn_${uuidv4().substring(0, 8)}`,
      tenantId,
      name: (name && name.trim()) || "Personal n8n Instance",
      instanceUrl: normalizedUrl,
      encryptedApiKey: encryptToken(apiKey.trim()),
      status: "connected",
      lastTestedAt: now,
      createdAt: now,
      updatedAt: now,
      isDefault: isDefault !== undefined ? Boolean(isDefault) : db.n8nConnections.length === 0,
    };

    db.n8nConnections.push(newConnection);
    await saveDB(db, tenantId);

    return NextResponse.json({
      success: true,
      message: "n8n connection successfully verified and encrypted.",
      connection: {
        id: newConnection.id,
        name: newConnection.name,
        instanceUrl: newConnection.instanceUrl,
        maskedApiKey: maskApiKey(apiKey.trim()),
        status: newConnection.status,
        lastTestedAt: newConnection.lastTestedAt,
        isDefault: newConnection.isDefault,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to save n8n connection.", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/n8n/connections
 * Disconnect and remove an n8n connection
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing connection id parameter." }, { status: 400 });
    }

    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const db = await getDB(tenantId);
    if (!db.n8nConnections) db.n8nConnections = [];

    const initialLength = db.n8nConnections.length;
    db.n8nConnections = db.n8nConnections.filter((c) => c.id !== id);

    if (db.n8nConnections.length === initialLength) {
      return NextResponse.json({ error: "Connection record not found." }, { status: 404 });
    }

    // If deleted connection was default, appoint first remaining as default
    if (db.n8nConnections.length > 0 && !db.n8nConnections.some((c) => c.isDefault)) {
      db.n8nConnections[0].isDefault = true;
    }

    await saveDB(db, tenantId);

    return NextResponse.json({
      success: true,
      message: "n8n connection removed.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to remove n8n connection.", details: err.message },
      { status: 500 }
    );
  }
}
