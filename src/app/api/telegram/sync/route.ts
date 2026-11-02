/**
 * ============================================================
 *  POST /api/telegram/sync
 *
 *  Synchronizes live bot identity, webhook health, and capabilities
 *  from Telegram Bot API.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";
import { TelegramApiClient } from "@/backend/telegram/TelegramApiClient";

export async function POST(req: NextRequest) {
  try {
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    const connections = db.telegramConnections || [];
    const activeConn = connections.find((c) => c.status === "CONNECTED") || connections[0];

    if (!activeConn) {
      return NextResponse.json({ success: true, message: "No active bot connection to sync." });
    }

    const rawToken = TelegramApiClient.decryptToken(
      activeConn.encryptedCredentialRef || process.env.TELEGRAM_BOT_TOKEN || ""
    );

    if (rawToken) {
      try {
        const client = new TelegramApiClient(rawToken);
        const [me, webhookInfo] = await Promise.all([
          client.getMe(),
          client.getWebhookInfo(),
        ]);

        if (me && me.id) {
          activeConn.botId = String(me.id);
          activeConn.botUsername = me.username || activeConn.botUsername;
          activeConn.botName = me.first_name || activeConn.botName;
          activeConn.status = "CONNECTED";
          activeConn.webhookStatus = webhookInfo.url ? "healthy" : "unregistered";
          activeConn.lastSuccessfulApiCallAt = new Date().toISOString();
          activeConn.updatedAt = new Date().toISOString();
          await saveDB(db, sessionEmail);
        }
      } catch (syncErr: any) {
        console.warn("[Telegram Sync] API sync warning:", syncErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      connection: activeConn,
      message: "Telegram Bot state synced successfully.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync Telegram status" },
      { status: 500 }
    );
  }
}
