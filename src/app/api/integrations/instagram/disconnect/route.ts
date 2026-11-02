/**
 * ============================================================================
 *  QuickReply — Instagram Professional Disconnect & Credential Wipe Route
 *  src/app/api/integrations/instagram/disconnect/route.ts
 *
 *  Flow:
 *   1. Authenticates current user/tenant session.
 *   2. Revokes Meta API permissions where supported.
 *   3. Unsubscribes webhook applications from Meta Page.
 *   4. Deletes InstagramConnection, InstagramAccount, and encrypted tokens.
 *   5. Returns structured JSON confirmation.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/backend/auth";
import { getDB, saveDB, decryptToken } from "@/database/db";

export const dynamic = "force-dynamic";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDB(user.email);
  const connections = db.instagramConnections || [];
  const connection = connections.find((c) => c.status === "CONNECTED") || connections[0];

  if (!connection) {
    return NextResponse.json({
      success: true,
      message: "No active Instagram connection found to disconnect.",
    });
  }

  // 1. Attempt Best-Effort Remote Revocation
  if (connection.encryptedAccessToken) {
    try {
      const rawToken = decryptToken(connection.encryptedAccessToken);
      if (rawToken) {
        // Unsubscribe page webhook
        if (connection.facebookPageId) {
          await fetch(`${GRAPH_API_BASE}/${connection.facebookPageId}/subscribed_apps`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${rawToken}` },
          }).catch(() => null);
        }
        // Revoke user token permissions
        await fetch(`${GRAPH_API_BASE}/me/permissions`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${rawToken}` },
        }).catch(() => null);
      }
    } catch (revokeErr) {
      console.warn("[Instagram Disconnect] Remote permission revocation notice:", revokeErr);
    }
  }

  // 2. Wipe Local Connection Records
  const targetIgId = connection.instagramAccountId || connection.accountId || connection.id;
  db.instagramConnections = (db.instagramConnections || []).filter(
    (c) => c.id !== connection.id && c.instagramAccountId !== targetIgId
  );

  db.instagramAccounts = (db.instagramAccounts || []).filter(
    (a) => a.id !== targetIgId && a.id !== connection.id
  );

  db.socialAccounts = (db.socialAccounts || []).filter(
    (a) => a.platform !== "instagram" || (a.id !== targetIgId && a.id !== connection.id)
  );

  await saveDB(db, user.email);

  return NextResponse.json({
    success: true,
    message: "Instagram Professional account disconnected and credentials wiped.",
  });
}
