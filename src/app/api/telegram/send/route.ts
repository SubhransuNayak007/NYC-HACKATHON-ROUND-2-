/**
 * ============================================================
 *  POST /api/telegram/send
 *
 *  Sends outbound message or media via Telegram Bot API,
 *  persists message in DB, and updates thread metrics.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB, type TelegramMessage } from "@/database/db";
import { TelegramApiClient } from "@/backend/telegram/TelegramApiClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, conversationId, text, mediaUrl, messageType = "text" } = body;

    if (!chatId || !text) {
      return NextResponse.json({ error: "Missing required chatId or text parameter." }, { status: 400 });
    }

    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    const connections = db.telegramConnections || [];
    const activeConn = connections.find((c) => c.status === "CONNECTED") || connections[0];

    const rawToken = TelegramApiClient.decryptToken(
      activeConn?.encryptedCredentialRef || process.env.TELEGRAM_BOT_TOKEN || ""
    );

    let providerMessageId = `prov_${Date.now()}`;

    if (rawToken) {
      const client = new TelegramApiClient(rawToken);
      try {
        if (messageType === "photo" && mediaUrl) {
          const res = await client.sendPhoto(chatId, mediaUrl, text, { parse_mode: "HTML" });
          providerMessageId = String(res.message_id || providerMessageId);
        } else if (messageType === "document" && mediaUrl) {
          const res = await client.sendDocument(chatId, mediaUrl, text, { parse_mode: "HTML" });
          providerMessageId = String(res.message_id || providerMessageId);
        } else {
          const res = await client.sendMessage(chatId, text, { parse_mode: "HTML" });
          providerMessageId = String(res.message_id || providerMessageId);
        }
      } catch (sendErr: any) {
        console.warn("[Telegram Send] Live provider call warning:", sendErr.message);
      }
    }

    // Persist Outbound Message
    if (!db.telegramMessages) db.telegramMessages = [];
    const newMsg: TelegramMessage = {
      id: `tgmsg_${uuidv4().substring(0, 8)}`,
      tenantId: sessionEmail,
      connectionId: activeConn?.id || "default_conn",
      chatId: String(chatId),
      conversationId: conversationId || `tgconv_${uuidv4().substring(0, 8)}`,
      providerMessageId,
      direction: "OUTBOUND",
      messageType: messageType as any,
      text,
      mediaUrl,
      status: "SENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.telegramMessages.unshift(newMsg);

    // Update conversation lastMessageAt & preview
    if (conversationId && db.telegramConversations) {
      const conv = db.telegramConversations.find((c) => c.id === conversationId);
      if (conv) {
        conv.lastMessageAt = new Date().toISOString();
        conv.lastMessagePreview = text.slice(0, 80);
      }
    }

    await saveDB(db, sessionEmail);

    return NextResponse.json({
      success: true,
      message: newMsg,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send Telegram message" },
      { status: 500 }
    );
  }
}
