/**
 * ============================================================
 *  GET /api/telegram/status
 *
 *  Returns real-time Telegram system health, bot connections,
 *  webhook status, and capabilities matrix.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";

export async function GET(req: NextRequest) {
  try {
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    const connections = db.telegramConnections || [];
    const activeConnection = connections.find((c) => c.status === "CONNECTED") || connections[0] || null;
    const isConnected = !!activeConnection && activeConnection.status === "CONNECTED";

    const totalChats = (db.telegramChats || []).length;
    const totalMessages = (db.telegramMessages || []).length;
    const totalContacts = (db.telegramContacts || []).length;
    const hotLeads = (db.telegramContacts || []).filter((c) => c.leadStage === "HOT").length;
    const activeAutomations = (db.telegramAutomations || []).filter((a) => a.status === "ACTIVE").length;
    const totalExecutions = (db.telegramExecutions || []).length;

    return NextResponse.json({
      success: true,
      connected: isConnected,
      status: activeConnection?.status || "NOT_CONNECTED",
      connection: activeConnection
        ? {
            id: activeConnection.id,
            botId: activeConnection.botId,
            botUsername: activeConnection.botUsername,
            botName: activeConnection.botName,
            type: activeConnection.type,
            status: activeConnection.status,
            capabilities: activeConnection.capabilities,
            webhookStatus: activeConnection.webhookStatus,
            lastWebhookAt: activeConnection.lastWebhookAt,
            lastSuccessfulApiCallAt: activeConnection.lastSuccessfulApiCallAt,
          }
        : null,
      connections: connections.map((c) => ({
        id: c.id,
        botId: c.botId,
        botUsername: c.botUsername,
        botName: c.botName,
        type: c.type,
        status: c.status,
        capabilities: c.capabilities,
        webhookStatus: c.webhookStatus,
        lastWebhookAt: c.lastWebhookAt,
      })),
      metrics: {
        totalChats,
        totalMessages,
        totalContacts,
        hotLeads,
        activeAutomations,
        totalExecutions,
      },
      provider: "Official Telegram Bot API (v7.0 - 10.2+)",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal status error" },
      { status: 500 }
    );
  }
}
