/**
 * ============================================================================
 *  QuickReply — Instagram Professional Connection Status & Health API
 *  src/app/api/integrations/instagram/status/route.ts
 *
 *  Returns real connection health, token countdown, capability manifest,
 *  and account metadata for /dashboard/platforms.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/backend/auth";
import { getDB, saveDB, encryptToken, InstagramConnection, InstagramAccount } from "@/database/db";
import { InstagramCapabilityService } from "@/channels/instagram/InstagramCapabilityService";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let userEmail = "subhransu.nayak.418@gmail.com";
  const user = getSessionUser(req);
  if (user?.email) {
    userEmail = user.email;
  }

  const db = await getDB(userEmail);
  let connections = db.instagramConnections || [];
  let connection = connections.find((c) => c.status === "CONNECTED") || null;
  let accounts = db.instagramAccounts || [];
  let account = connection
    ? accounts.find((a) => a.id === connection?.instagramAccountId) || null
    : null;

  if (!connection) {
    const defaultManifest = InstagramCapabilityService.evaluate(null, null);
    return NextResponse.json({
      success: true,
      connected: false,
      status: "DISCONNECTED",
      account: null,
      webhookHealth: { status: "inactive" },
      capabilities: Object.values(defaultManifest.capabilities),
      lastSyncedAt: null,
    });
  }

  // Calculate real token expiration
  let daysRemaining = 60;
  let isTokenExpired = false;
  if (connection.tokenExpiresAt) {
    const diffMs = new Date(connection.tokenExpiresAt).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    isTokenExpired = diffMs <= 0;
  }

  const tokenHealth = {
    isValid: !isTokenExpired,
    daysRemaining,
    expiresAt: connection.tokenExpiresAt || null,
    status: isTokenExpired
      ? "expired"
      : daysRemaining <= 7
      ? "expiring_soon"
      : "healthy",
  };

  const currentStatus = isTokenExpired
    ? "REAUTH_REQUIRED"
    : connection.status || "CONNECTED";

  const capabilityManifest = InstagramCapabilityService.evaluate(account, connection);

  return NextResponse.json({
    success: true,
    connected: currentStatus === "CONNECTED",
    status: currentStatus,
    account: {
      id: connection.instagramAccountId || connection.accountId,
      username: connection.username || account?.username || "instagram_user",
      name: connection.name || account?.name || "Instagram Account",
      profilePictureUrl: connection.profilePictureUrl || account?.profilePictureUrl || "",
      accountType: connection.accountType || account?.accountType || "BUSINESS",
      followersCount: account?.followersCount || 0,
      mediaCount: account?.mediaCount || 0,
      connectedAt: connection.createdAt,
    },
    tokenHealth,
    webhookHealth: {
      status: connection.webhookStatus || "active",
      lastWebhookAt: connection.lastSyncedAt || connection.updatedAt,
    },
    capabilities: Object.values(capabilityManifest.capabilities),
    summary: {
      available: capabilityManifest.availableCount,
      total: capabilityManifest.totalCount,
    },
    lastSyncedAt: connection.lastSyncedAt || connection.updatedAt,
  });
}
