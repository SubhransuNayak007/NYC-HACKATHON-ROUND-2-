import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";

export async function GET(req: NextRequest) {
  try {
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    if (!db.telegramChats || db.telegramChats.length === 0) {
      db.telegramChats = [
        {
          id: "tg_chat_1",
          tenantId: "t_default",
          workspaceId: "ws_default",
          chatId: "-1001892348912",
          chatType: "supergroup" as any,
          title: "QuickReply VIP Community",
          username: "quickreply_community",
          memberCount: 4280,
          isAutomationActive: true,
          assignedRuleId: "tr_1",
          assignedRuleName: "🛡️ Anti-Spam & Community AI Moderator",
          permissions: { canSendMessages: true, canDeleteMessages: true, canPinMessages: true } as any,
          status: "ACTIVE" as any,
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
        {
          id: "tg_chat_2",
          tenantId: "t_default",
          workspaceId: "ws_default",
          chatId: "-1001928374921",
          chatType: "channel" as any,
          title: "QuickReply Product Announcements",
          username: "quickreply_news",
          memberCount: 18900,
          isAutomationActive: true,
          assignedRuleId: "tr_2",
          assignedRuleName: "📢 Broadcast Discussion Helper",
          permissions: { canSendMessages: true, canPostMessages: true } as any,
          status: "ACTIVE" as any,
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
        {
          id: "tg_chat_3",
          tenantId: "t_default",
          workspaceId: "ws_default",
          chatId: "982347102",
          chatType: "private" as any,
          title: "Direct Customer Inquiries (@QuickReplyBot)",
          username: "QuickReplyBot",
          memberCount: 1,
          isAutomationActive: true,
          assignedRuleId: "tr_3",
          assignedRuleName: "⚡ Instant 24/7 AI Copilot & Star Checkout",
          status: "ACTIVE" as any,
          createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
        {
          id: "tg_chat_4",
          tenantId: "t_default",
          workspaceId: "ws_default",
          chatId: "-1002039482910",
          chatType: "group" as any,
          title: "Mini App Beta Testers",
          username: "quickreply_testers",
          memberCount: 650,
          isAutomationActive: false,
          assignedRuleId: "tr_default",
          assignedRuleName: "💬 General FAQ Assistant",
          status: "ACTIVE" as any,
          createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
      ];
      await saveDB(db, sessionEmail);
    }

    const conversations = db.telegramConversations || [];
    const chats = db.telegramChats || [];
    const contacts = db.telegramContacts || [];
    const messages = db.telegramMessages || [];

    return NextResponse.json({
      success: true,
      conversations,
      chats,
      contacts,
      messages,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load conversations" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/telegram/conversations
 * Updates automation state and assigned rules for a Telegram chat / channel
 */
export async function PATCH(req: NextRequest) {
  try {
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);
    const body = await req.json();
    const { chatId, isAutomationActive, assignedRuleId, assignedRuleName } = body;

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const chat = (db.telegramChats || []).find((c) => c.id === chatId);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (typeof isAutomationActive === "boolean") {
      (chat as any).isAutomationActive = isAutomationActive;
    }
    if (assignedRuleId !== undefined) {
      (chat as any).assignedRuleId = assignedRuleId;
    }
    if (assignedRuleName !== undefined) {
      (chat as any).assignedRuleName = assignedRuleName;
    }
    chat.updatedAt = new Date().toISOString();

    await saveDB(db, sessionEmail);

    return NextResponse.json({
      success: true,
      chat,
      message: `Automation ${chat.isAutomationActive ? "activated" : "paused"} for Telegram chat`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update Telegram chat" },
      { status: 500 }
    );
  }
}
