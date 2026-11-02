/**
 * ============================================================
 *  POST /api/telegram/disconnect
 *
 *  Disconnects a Telegram bot connection, removes webhooks,
 *  and updates status.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";
import { TelegramApiClient } from "@/backend/telegram/TelegramApiClient";

export async function POST(req: NextRequest) {
  try {
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    if (db.telegramConnections && db.telegramConnections.length > 0) {
      for (const conn of db.telegramConnections) {
        if (conn.encryptedCredentialRef) {
          try {
            const rawToken = TelegramApiClient.decryptToken(conn.encryptedCredentialRef);
            if (rawToken) {
              const client = new TelegramApiClient(rawToken);
              await client.deleteWebhook();
            }
          } catch {
            // Ignore failure on cleanup
          }
        }
        conn.status = "NOT_CONNECTED";
        conn.webhookStatus = "unregistered";
        conn.updatedAt = new Date().toISOString();
      }
      await saveDB(db, sessionEmail);
    }

    return NextResponse.json({
      success: true,
      message: "Telegram Bot disconnected successfully.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disconnect bot" },
      { status: 500 }
    );
  }
}
