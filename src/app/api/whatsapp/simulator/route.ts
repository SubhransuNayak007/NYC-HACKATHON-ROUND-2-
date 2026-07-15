/**
 * POST /api/whatsapp/simulator
 * Developer-only endpoint to simulate incoming WhatsApp messages.
 * Processes through the full production AI pipeline without real WhatsApp credentials.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { processWhatsAppMessage } from "@/backend/wa_engine";

async function getAuth(req: NextRequest): Promise<{ success: boolean; email?: string }> {
  try {
    const authModule = await import("@/backend/auth");
    const user = authModule.getUserFromCookies(req.headers.get("cookie"));
    if (user) {
      return { success: true, email: user.sub };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

async function getDB(email: string) {
  try {
    const dbModule = await import("@/database/db");
    return { load: dbModule.getDB, save: dbModule.saveDB };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if (!auth.success || !auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customerPhone, customerName, text, mediaType } = body;

    if (!customerPhone || !text) {
      return NextResponse.json(
        { error: "customerPhone and text are required" },
        { status: 400 }
      );
    }

    const dbHelpers = await getDB(auth.email);
    if (!dbHelpers) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const db = await dbHelpers.load(auth.email);

    // Find or create conversation
    let conversation = (db.waConversations || []).find(
      (c: { customerPhone: string }) => c.customerPhone === customerPhone
    );

    if (!conversation) {
      conversation = {
        id: uuidv4(),
        channelPhone: "+919999999999",
        customerPhone,
        status: "active" as const,
        mode: "ai" as const,
        priority: "normal" as const,
        tags: [],
        unreadCount: 0,
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: text.substring(0, 100),
        intentHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true,
      };
      db.waConversations = [...(db.waConversations || []), conversation];
    }

    // Process through the full 13-stage AI engine
    const result = await processWhatsAppMessage({
      waMessageId: `sim_${uuidv4()}`,
      conversationId: conversation.id,
      customerPhone,
      customerName,
      text,
      mediaType,
      timestamp: new Date().toISOString(),
      db,
      organizationId: auth.email,
    });

    // Persist new messages
    if (result.newMessages.length > 0) {
      db.waMessages = [...(db.waMessages || []), ...result.newMessages];
    }

    // Persist analytics events
    if (result.analyticsEvents.length > 0) {
      db.waAnalyticsEvents = [...(db.waAnalyticsEvents || []), ...result.analyticsEvents];
    }

    // Update conversation metadata
    const convIdx = (db.waConversations || []).findIndex(
      (c: { id: string }) => c.id === conversation.id
    );
    if (convIdx >= 0 && db.waConversations) {
      db.waConversations[convIdx] = {
        ...db.waConversations[convIdx],
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: text.substring(0, 100),
        status: result.shouldEscalate ? "escalated" : "active",
        updatedAt: new Date().toISOString(),
        intentHistory: [
          result.intent,
          ...(db.waConversations[convIdx].intentHistory || []).slice(0, 4),
        ],
      };
    }

    await dbHelpers.save(db, auth.email);

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      intent: result.intent,
      confidence: Math.round(result.confidence * 100),
      responseText: result.responseText,
      shouldSend: result.shouldSend,
      shouldEscalate: result.shouldEscalate,
      escalationReason: result.escalationReason,
      toolsUsed: result.toolsUsed,
      knowledgeChunksUsed: result.knowledgeChunksUsed,
      processingMs: result.processingMs,
      stages: result.stageResults.map((s) => ({
        stage: s.stage,
        status: s.status,
        latencyMs: s.latencyMs,
        detail: s.detail,
      })),
      messagesCreated: result.newMessages.length,
    });
  } catch (err) {
    console.error("[WA Simulator]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
