import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const auth = getUserFromCookies(req.headers.get("cookie"));
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDB(auth.sub);
    const conversations = (db.waConversations || [])
      .sort((a: any, b: any) => b.lastMessageAt.localeCompare(a.lastMessageAt));

    const customers = db.waCustomers || [];
    const customerMap: Record<string, any> = {};
    for (const c of customers) {
      customerMap[c.phone] = c;
      customerMap[c.id] = c;
    }

    // Map messages grouped by conversationId
    const messages = db.waMessages || [];
    const messagesByConv: Record<string, any[]> = {};
    for (const m of messages) {
      if (!messagesByConv[m.conversationId]) {
        messagesByConv[m.conversationId] = [];
      }
      messagesByConv[m.conversationId].push(m);
    }

    // Sort messages in each conversation chronologically
    for (const cId in messagesByConv) {
      messagesByConv[cId].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    return NextResponse.json({
      conversations,
      customers: customerMap,
      messages: messagesByConv,
      total: conversations.length,
    });
  } catch (err) {
    console.error("[WA Conversations GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getUserFromCookies(req.headers.get("cookie"));
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const db = await getDB(auth.sub);

    const conversation = {
      id: uuidv4(),
      channelPhone: body.channelPhone || "",
      customerPhone: body.customerPhone || "",
      status: "active" as const,
      mode: "ai" as const,
      priority: "normal" as const,
      tags: [],
      unreadCount: 0,
      lastMessageAt: new Date().toISOString(),
      lastMessagePreview: "",
      intentHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.waConversations = [...(db.waConversations || []), conversation];
    await saveDB(db, auth.sub);

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    console.error("[WA Conversations POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
