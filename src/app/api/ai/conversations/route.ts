import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/conversations
 * List automation studio conversations for authenticated tenant
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const db = await getDB(tenantId);
    const conversations = (db.aiConversations || []).filter(
      (c: any) => c.tenantId === tenantId
    );

    return NextResponse.json({
      success: true,
      conversations: conversations.sort(
        (a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load conversations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/conversations
 * Initialize a new automation studio conversation session
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const body = await req.json().catch(() => ({}));
    const title = (body.title || "New Automation Conversation").trim();

    const conversationId = `conv_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const newConversation = {
      id: conversationId,
      tenantId,
      workspaceId: `ws_${tenantId}`,
      title,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    };

    const db = await getDB(tenantId);
    if (!db.aiConversations) db.aiConversations = [];
    db.aiConversations.unshift(newConversation);

    // Initial greeting system/assistant message
    if (!db.aiMessages) db.aiMessages = [];
    db.aiMessages.push({
      id: `msg_${uuidv4().substring(0, 8)}`,
      conversationId,
      tenantId,
      role: "assistant",
      content:
        "Welcome to QuickReply Automation OS. Describe any business workflow in natural language (e.g., 'Every morning at 9 AM, check my Gmail for new invoices, extract amount and vendor, log to Google Sheets, and notify on Telegram if amount > ₹50,000'). I'll design the architecture, clarify details, build the workflow, and test it for you.",
      createdAt: now,
    });

    await saveDB(db, tenantId);

    return NextResponse.json({
      success: true,
      conversation: newConversation,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create conversation" },
      { status: 500 }
    );
  }
}
