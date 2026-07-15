import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

/**
 * PUT /api/ai/suggest/[id] - Accept or dismiss a suggestion
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { action } = body; // "accept" or "dismiss"

    const db = await getDB();

    // Check rules
    const suggestedRules = db.suggestedRules || [];
    const ruleIdx = suggestedRules.findIndex((s) => s.id === id);
    if (ruleIdx >= 0) {
      const suggestion = suggestedRules[ruleIdx];
      suggestion.status = action === "accept" ? "accepted" : "dismissed";

      if (action === "accept") {
        const newRule = {
          id: `r-${Date.now()}`,
          name: `AI: ${suggestion.pattern}`,
          enabled: true,
          priority: 5,
          conditions: [
            {
              type: "contains" as const,
              value: suggestion.pattern,
            },
          ],
          operator: "AND" as const,
          filters: {},
          replyMode: "instant" as const,
          replyTemplate: suggestion.suggestedReply,
          replyTone: "friendly" as const,
          customReplyText: suggestion.suggestedReply,
          sendEmoji: true,
          sendGif: false,
          gifSearch: "",
          effectivenessScore: 0,
          totalTriggers: 0,
          totalSuccesses: 0,
        };
        db.rules.push(newRule as any);
        await logActivity(db.userSession?.name || "Creator", `Accepted AI rule suggestion for "${suggestion.pattern}"`);
      }

      await saveDB(db);
      return NextResponse.json(suggestion);
    }

    // Check FAQs
    const suggestedFAQs = db.suggestedFAQs || [];
    const faqIdx = suggestedFAQs.findIndex((s) => s.id === id);
    if (faqIdx >= 0) {
      const suggestion = suggestedFAQs[faqIdx];
      suggestion.status = action === "accept" ? "accepted" : "dismissed";

      if (action === "accept") {
        const newFaq = {
          id: `faq-${Date.now()}`,
          question: suggestion.question,
          answer: suggestion.suggestedAnswer,
          keywords: suggestion.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
          tone: "friendly" as const,
          useAI: true,
          customReply: suggestion.suggestedAnswer,
          priority: 5,
          tags: ["ai-suggested"],
          variables: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (!db.faqs) db.faqs = [];
        db.faqs.push(newFaq as any);
        await logActivity(db.userSession?.name || "Creator", `Accepted AI FAQ suggestion`);
      }

      await saveDB(db);
      return NextResponse.json(suggestion);
    }

    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
