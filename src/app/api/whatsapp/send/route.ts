/**
 * POST /api/whatsapp/send
 * Send a message from human agent or as a manual reply.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getWhatsAppProvider } from "@/channels/whatsapp/WhatsAppProviderFactory";
import { broadcastEvent } from "@/backend/socket";

export async function POST(req: NextRequest) {
  try {
    const authModule = await import("@/backend/auth");
    const auth = authModule.getUserFromCookies(req.headers.get("cookie"));
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { conversationId, customerPhone, text, templateName, templateParams } = body;

    if (!customerPhone || !text) {
      return NextResponse.json({ error: "customerPhone and text are required" }, { status: 400 });
    }

    const provider = getWhatsAppProvider();
    const result = await provider.sendMessage(customerPhone, text);
    const messageId = result.messageId;

    // Load DB and save the outbound message
    const dbModule = await import("@/database/db");
    const db = await dbModule.getDB(auth.sub);

    const outboundMsg = {
      id: uuidv4(),
      waMessageId: messageId || undefined,
      conversationId: conversationId || "",
      direction: "outbound" as const,
      sender: "human" as const,
      senderName: auth.sub,
      text,
      status: (result.success ? "sent" : "failed") as "sent" | "failed",
      timestamp: new Date().toISOString(),
      metadata: {},
    };

    db.waMessages = [...(db.waMessages || []), outboundMsg];

    // Update conversation last message
    const convIdx = (db.waConversations || []).findIndex(
      (c: { id: string }) => c.id === conversationId
    );
    if (convIdx >= 0 && db.waConversations) {
      db.waConversations[convIdx] = {
        ...db.waConversations[convIdx],
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: text.substring(0, 100),
        updatedAt: new Date().toISOString(),
      };
    }

    // Analytics event
    db.waAnalyticsEvents = [
      ...(db.waAnalyticsEvents || []),
      {
        id: uuidv4(),
        type: "human_reply" as const,
        conversationId,
        agentEmail: auth.sub,
        timestamp: new Date().toISOString(),
      },
    ];

    await dbModule.saveDB(db, auth.sub);

    // Broadcast real-time update to all connected dashboard clients
    broadcastEvent("wa:message:new", outboundMsg);
    if (convIdx >= 0 && db.waConversations) {
      broadcastEvent("wa:conversation:update", db.waConversations[convIdx]);
    }

    return NextResponse.json({ success: result.success, messageId, message: outboundMsg, error: result.error });
  } catch (err) {
    console.error("[WA Send]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
