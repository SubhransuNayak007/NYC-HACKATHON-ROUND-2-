import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId, hasPermission } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { InstagramCapabilityService } from "@/channels/instagram/InstagramCapabilityService";
import { InstagramWorkerRuntime } from "@/channels/instagram/InstagramWorkerRuntime";

/**
 * GET /api/instagram
 * Returns overview connection state, capabilities, CRM highlights, and 24/7 runtime stats
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    const account = (db.instagramAccounts || []).find(
      (a) => a.tenantId === tenantId && (a.status === "ACTIVE" || (a.status as string) === "CONNECTED")
    );
    const connection = (db.instagramConnections || []).find(
      (c) => c.tenantId === tenantId && (c.status === "CONNECTED" || c.status === "READY")
    );
    const capabilities = InstagramCapabilityService.evaluate(account, connection);
    const runtimeStats = await InstagramWorkerRuntime.getRuntimeDiagnostics();

    const posts = (db.instagramPosts || []).filter((p) => p.tenantId === tenantId);
    const comments = (db.instagramComments || []).filter((c) => c.tenantId === tenantId);
    const conversations = (db.instagramConversations || []).filter((cv) => cv.tenantId === tenantId);
    const contacts = (db.instagramContacts || []).filter((ct) => ct.tenantId === tenantId);
    const automations = (db.instagramAutomations || []).filter((a) => a.tenantId === tenantId);

    return NextResponse.json({
      success: true,
      account: account || null,
      connection: connection
        ? {
            id: connection.id,
            status: connection.status,
            scopes: connection.scopes,
            expiresAt: connection.tokenExpiresAt || connection.expiresAt || null,
            lastWebhookAt: connection.lastWebhookAt || null,
            lastSuccessfulCallAt: connection.lastSuccessfulCallAt || connection.lastSyncedAt || null,
          }
        : null,
      capabilities,
      metrics: {
        totalPosts: posts.length,
        publishedPosts: posts.filter((p) => p.status === "PUBLISHED").length,
        scheduledPosts: posts.filter((p) => p.status === "SCHEDULED").length,
        totalComments: comments.length,
        pendingComments: comments.filter((c) => c.status === "PENDING").length,
        totalConversations: conversations.length,
        unreadConversations: conversations.filter((cv) => cv.unreadCount > 0).length,
        totalContacts: contacts.length,
        hotLeadsCount: contacts.filter((ct) => ct.leadStage === "HOT").length,
        activeAutomations: automations.filter((a) => a.status === "ACTIVE").length,
      },
      runtimeStats,
      recentPosts: posts.slice(-5).reverse(),
      recentComments: comments.slice(-5).reverse(),
      recentConversations: conversations.slice(-5).reverse(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load Instagram overview" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/instagram
 * Disconnects Instagram account and wipes credentials safely
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admin required to disconnect Instagram" }, { status: 403 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    if (db.instagramConnections) {
      db.instagramConnections = db.instagramConnections.filter((c) => c.tenantId !== tenantId);
    }
    if (db.instagramAccounts) {
      db.instagramAccounts = db.instagramAccounts.filter((a) => a.tenantId !== tenantId);
    }

    await saveDB(db, session.email);

    return NextResponse.json({
      success: true,
      message: "Instagram account disconnected and credentials purged.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disconnect Instagram" },
      { status: 500 }
    );
  }
}
