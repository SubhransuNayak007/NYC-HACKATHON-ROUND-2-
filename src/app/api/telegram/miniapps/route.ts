/**
 * ============================================================
 *  GET  /api/telegram/miniapps
 *  POST /api/telegram/miniapps
 *
 *  Manages Telegram Mini Apps & Validates WebApp initData.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB, type TelegramMiniApp } from "@/database/db";
import { TelegramMiniAppValidator } from "@/backend/telegram/TelegramMiniAppValidator";
import { TelegramApiClient } from "@/backend/telegram/TelegramApiClient";

export async function GET(req: NextRequest) {
  try {
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    return NextResponse.json({
      success: true,
      miniapps: db.telegramMiniApps || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load mini apps" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, initData, name, shortName, url, description } = body;

    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    // 1. Cryptographic Validation Action
    if (action === "validate_auth" && initData) {
      const activeConn = db.telegramConnections?.find((c) => c.status === "CONNECTED");
      const rawToken = TelegramApiClient.decryptToken(
        activeConn?.encryptedCredentialRef || process.env.TELEGRAM_BOT_TOKEN || ""
      );

      const validation = TelegramMiniAppValidator.validate(initData, rawToken || "SANDBOX_TOKEN");
      return NextResponse.json(validation);
    }

    // 2. Register New Mini App
    if (!db.telegramMiniApps) db.telegramMiniApps = [];

    const newApp: TelegramMiniApp = {
      id: `tgapp_${uuidv4().substring(0, 8)}`,
      tenantId: sessionEmail,
      name: name || "QuickReply App",
      shortName: shortName || "App",
      url: url || "https://quickreply.ai/miniapp",
      description: description || "In-Chat Interactive Experience",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.telegramMiniApps.unshift(newApp);
    await saveDB(db, sessionEmail);

    return NextResponse.json({
      success: true,
      miniapp: newApp,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save mini app" },
      { status: 500 }
    );
  }
}
