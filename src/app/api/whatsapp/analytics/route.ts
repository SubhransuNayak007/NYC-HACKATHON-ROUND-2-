import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authModule = await import("@/backend/auth");
    const auth = authModule.getUserFromCookies(req.headers.get("cookie"));
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbModule = await import("@/database/db");
    const db = await dbModule.getDB(auth.sub);

    const events = db.waAnalyticsEvents || [];
    const conversations = db.waConversations || [];
    const messages = db.waMessages || [];

    // Compute summary stats
    const totalConversations = conversations.length;
    const activeConversations = conversations.filter((c: { status: string }) => c.status === "active").length;
    const escalatedConversations = conversations.filter((c: { status: string }) => c.status === "escalated").length;
    const resolvedConversations = conversations.filter((c: { status: string }) => c.status === "resolved").length;

    const totalMessages = messages.length;
    const inboundMessages = messages.filter((m: { direction: string }) => m.direction === "inbound").length;
    const outboundMessages = messages.filter((m: { direction: string }) => m.direction === "outbound").length;
    const aiMessages = messages.filter((m: { sender: string }) => m.sender === "ai").length;
    const humanMessages = messages.filter((m: { sender: string }) => m.sender === "human").length;

    // Intent breakdown
    const intentCounts: Record<string, number> = {};
    events
      .filter((e: { type: string }) => e.type === "intent_detected")
      .forEach((e: { intentDetected?: string }) => {
        if (e.intentDetected) {
          intentCounts[e.intentDetected] = (intentCounts[e.intentDetected] || 0) + 1;
        }
      });

    // Average confidence
    const aiReplies = events.filter((e: { type: string; aiConfidence?: number }) => e.type === "ai_reply" && e.aiConfidence != null);
    const avgConfidence = aiReplies.length > 0
      ? aiReplies.reduce((sum: number, e: { aiConfidence?: number }) => sum + (e.aiConfidence || 0), 0) / aiReplies.length
      : 0;

    // AI automation rate (ai messages / total outbound)
    const aiAutomationRate = outboundMessages > 0 ? aiMessages / outboundMessages : 0;

    return NextResponse.json({
      summary: {
        totalConversations,
        activeConversations,
        escalatedConversations,
        resolvedConversations,
        totalMessages,
        inboundMessages,
        outboundMessages,
        aiMessages,
        humanMessages,
        aiAutomationRate: Math.round(aiAutomationRate * 100),
        avgConfidence: Math.round(avgConfidence * 100),
        escalationRate: totalConversations > 0
          ? Math.round((escalatedConversations / totalConversations) * 100)
          : 0,
      },
      intentBreakdown: intentCounts,
      recentEvents: events
        .sort((a: { timestamp: string }, b: { timestamp: string }) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 50),
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
