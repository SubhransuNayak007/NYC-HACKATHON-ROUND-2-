/**
 * ============================================================
 *  POST /api/telegram/connect
 *
 *  Validates Bot Token with @BotFather / Telegram Bot API,
 *  configures webhook, encrypts token at rest, and saves connection.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { getDB, saveDB, type TelegramConnection } from "@/database/db";
import { TelegramApiClient } from "@/backend/telegram/TelegramApiClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, isSandbox, botType } = body;

    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);
    if (!db.telegramConnections) db.telegramConnections = [];

    // 1. Sandbox Line Auto-Fill
    if (isSandbox || token === "SANDBOX_TELEGRAM_LINE") {
      const sandboxConn: TelegramConnection = {
        id: `tgconn_${uuidv4().substring(0, 8)}`,
        tenantId: sessionEmail,
        workspaceId: "default",
        type: botType || "BOT",
        botId: "7182938491",
        botUsername: "QuickReplyAIBot",
        botName: "QuickReply Enterprise AI Bot",
        status: "CONNECTED",
        capabilities: ["MESSAGING", "COMMANDS", "GROUPS", "CHANNELS", "MINI_APPS", "PAYMENTS", "AI", "BUSINESS"],
        webhookStatus: "healthy",
        lastWebhookAt: new Date().toISOString(),
        lastSuccessfulApiCallAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.telegramConnections = [sandboxConn, ...db.telegramConnections.filter((c) => c.id !== sandboxConn.id)];
      await saveDB(db, sessionEmail);

      return NextResponse.json({
        success: true,
        connection: sandboxConn,
        message: "Developer Sandbox Bot Line Activated!",
      });
    }

    // 2. Real Telegram Bot API Verification
    const cleanToken = TelegramApiClient.cleanToken(token || "");
    if (!cleanToken) {
      return NextResponse.json(
        { error: "Valid Bot Token is required (format: 123456789:ABCdefGhI...). Copy it directly from @BotFather." },
        { status: 400 }
      );
    }

    const client = new TelegramApiClient(cleanToken);
    let botInfo: any;

    try {
      botInfo = await client.getMe();
    } catch (apiErr: any) {
      console.error("[Telegram Connect] Verification error:", apiErr);
      return NextResponse.json(
        {
          error: `Telegram verification failed: ${apiErr.message || "Invalid bot token"}. Please ensure your bot token was copied accurately from @BotFather.`,
        },
        { status: 400 }
      );
    }

    if (!botInfo || !botInfo.id) {
      return NextResponse.json({ error: "Invalid bot identity returned by Telegram." }, { status: 400 });
    }

    // 3. Encrypt Token & Generate Webhook Secret
    const encryptedRef = TelegramApiClient.encryptToken(cleanToken);
    const webhookSecret = crypto.randomBytes(24).toString("hex");

    // Configure Webhook if host is configured
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    if (host && !host.includes("localhost")) {
      try {
        const proto = req.headers.get("x-forwarded-proto") || "https";
        const webhookUrl = `${proto}://${host}/api/webhooks/telegram/${botInfo.id}`;
        await client.setWebhook(webhookUrl, webhookSecret);
      } catch (whErr) {
        console.warn("[Telegram Connect] Webhook registration warning:", whErr);
      }
    }

    // 4. Save Connection
    const newConn: TelegramConnection = {
      id: `tgconn_${uuidv4().substring(0, 8)}`,
      tenantId: sessionEmail,
      workspaceId: "default",
      type: botType || (botInfo.can_connect_to_business ? "BUSINESS_BOT" : "BOT"),
      botId: String(botInfo.id),
      botUsername: botInfo.username || "Bot",
      botName: botInfo.first_name || "Telegram Bot",
      status: "CONNECTED",
      capabilities: [
        "MESSAGING",
        "COMMANDS",
        ...(botInfo.can_join_groups ? ["GROUPS"] : []),
        "CHANNELS",
        "MINI_APPS",
        "PAYMENTS",
        "AI",
        ...(botInfo.can_connect_to_business ? ["BUSINESS"] : []),
      ],
      encryptedCredentialRef: encryptedRef,
      webhookSecret,
      webhookStatus: "healthy",
      lastWebhookAt: new Date().toISOString(),
      lastSuccessfulApiCallAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.telegramConnections = [newConn, ...db.telegramConnections.filter((c) => c.botId !== newConn.botId)];

    // Sync to SocialAccounts
    if (!db.socialAccounts) db.socialAccounts = [];
    const socialRecord = {
      platform: "telegram" as const,
      id: String(botInfo.id),
      name: botInfo.first_name || "Telegram Bot",
      username: `@${botInfo.username || "bot"}`,
      avatar: "",
      followers: "Live Operational",
      connectedAt: new Date().toISOString(),
      isActive: true,
      status: "connected" as const,
      lastSyncAt: new Date().toISOString(),
      dailyReplies: 0,
      totalReplies: 0,
    };
    db.socialAccounts = [
      socialRecord,
      ...db.socialAccounts.filter((a) => !(a.platform === "telegram" && a.id === String(botInfo.id))),
    ];

    await saveDB(db, sessionEmail);

    return NextResponse.json({
      success: true,
      connection: newConn,
      message: `Connected successfully to @${botInfo.username || botInfo.first_name}!`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to connect Telegram Bot" },
      { status: 500 }
    );
  }
}
