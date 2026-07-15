/**
 * POST /api/whatsapp/handoff
 * Escalate conversation to human or return it to AI.
 */

import { NextRequest, NextResponse } from "next/server";
import { escalateToHuman, returnToAI } from "@/backend/wa_handoff";

export async function POST(req: NextRequest) {
  try {
    const authModule = await import("@/backend/auth");
    const auth = authModule.getUserFromCookies(req.headers.get("cookie"));
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { conversationId, action, reason } = body;

    if (!conversationId || !action) {
      return NextResponse.json({ error: "conversationId and action are required" }, { status: 400 });
    }

    const dbModule = await import("@/database/db");
    const db = await dbModule.getDB(auth.sub);

    let result;
    if (action === "escalate") {
      result = await escalateToHuman(conversationId, reason || "Manual escalation", db, auth.sub);
    } else if (action === "return_to_ai") {
      result = await returnToAI(conversationId, db);
    } else {
      return NextResponse.json({ error: "action must be 'escalate' or 'return_to_ai'" }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    // Persist changes
    if (result.conversation) {
      const convIdx = (db.waConversations || []).findIndex(
        (c: { id: string }) => c.id === conversationId
      );
      if (convIdx >= 0 && db.waConversations) {
        db.waConversations[convIdx] = result.conversation;
      }
    }
    if (result.systemMessage) {
      db.waMessages = [...(db.waMessages || []), result.systemMessage];
    }
    if (result.analyticsEvent) {
      db.waAnalyticsEvents = [...(db.waAnalyticsEvents || []), result.analyticsEvent];
    }

    await dbModule.saveDB(db, auth.sub);

    return NextResponse.json({
      success: true,
      conversation: result.conversation,
      systemMessage: result.systemMessage,
    });
  } catch (err) {
    console.error("[WA Handoff]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
