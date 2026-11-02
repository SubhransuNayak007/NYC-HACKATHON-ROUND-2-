/**
 * ============================================================
 *  POST /api/telegram/poll
 *  GET  /api/telegram/poll
 *
 *  Real-Time Live Polling Engine for Telegram.
 *  - Calls getUpdates directly on Telegram Bot API
 *  - Feeds updates into TelegramRuntimeEngine
 *  - Enables 100% functional live bot interactions on localhost
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";
import { TelegramApiClient } from "@/backend/telegram/TelegramApiClient";
import { TelegramRuntimeEngine } from "@/backend/telegram/TelegramRuntimeEngine";

// In-memory poll offset tracker
let globalLastUpdateId = 0;

export async function GET(req: NextRequest) {
  return handlePoll(req);
}

export async function POST(req: NextRequest) {
  return handlePoll(req);
}

async function handlePoll(req: NextRequest) {
  try {
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    const connections = db.telegramConnections || [];
    const activeConn = connections.find((c) => c.status === "CONNECTED") || connections[0];

    if (!activeConn) {
      return NextResponse.json({
        success: false,
        message: "No connected Telegram Bot found.",
        updatesCount: 0,
      });
    }

    const rawToken = TelegramApiClient.decryptToken(
      activeConn.encryptedCredentialRef || process.env.TELEGRAM_BOT_TOKEN || ""
    );

    if (!rawToken || rawToken.startsWith("SANDBOX_")) {
      return NextResponse.json({
        success: true,
        isSandbox: true,
        message: "Sandbox Bot active. Use /api/telegram/simulate for simulated inbound updates.",
        updatesCount: 0,
      });
    }

    const client = new TelegramApiClient(rawToken);
    const offset = globalLastUpdateId > 0 ? globalLastUpdateId + 1 : undefined;

    let updates: any[] = [];
    try {
      updates = await client.getUpdates(offset, 25, 0);
    } catch (pollErr: any) {
      return NextResponse.json({
        success: false,
        error: `Telegram polling error: ${pollErr.message}`,
        updatesCount: 0,
      });
    }

    const processedResults: any[] = [];

    if (Array.isArray(updates) && updates.length > 0) {
      for (const update of updates) {
        if (update.update_id) {
          globalLastUpdateId = Math.max(globalLastUpdateId, update.update_id);
        }
        const res = await TelegramRuntimeEngine.processUpdate(update, activeConn.botId, sessionEmail);
        processedResults.push(res);
      }

      activeConn.lastWebhookAt = new Date().toISOString();
      activeConn.lastSuccessfulApiCallAt = new Date().toISOString();
      await saveDB(db, sessionEmail);
    }

    return NextResponse.json({
      success: true,
      updatesCount: updates.length,
      processed: processedResults,
      lastUpdateId: globalLastUpdateId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to poll Telegram updates" },
      { status: 500 }
    );
  }
}
