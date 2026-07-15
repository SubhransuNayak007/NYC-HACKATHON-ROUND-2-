import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, SuggestedRule, SuggestedFAQ } from "@/database/db";

/**
 * Feature 8: Auto-suggest rules and FAQs from patterns
 * GET /api/ai/suggest - List suggestions
 * POST /api/ai/suggest - Generate suggestions from current data
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json({
    rules: db.suggestedRules || [],
    faqs: db.suggestedFAQs || [],
  });
}

export async function POST() {
  try {
    const db = await getDB();
    if (!db.suggestedRules) db.suggestedRules = [];
    if (!db.suggestedFAQs) db.suggestedFAQs = [];

    // Analyze recent comments for patterns
    const recentComments = db.comments ? db.comments.slice(-100) : [];
    const suggestions: SuggestedRule[] = [];
    const faqSuggestions: SuggestedFAQ[] = [];

    // Pattern 1: Detect frequently asked questions
    const questionComments = recentComments.filter((c) =>
      c.text?.includes("?")
    );
    const questionGroups = groupByKeyword(questionComments.map((c) => c.text || ""));
    const topQuestions = Object.entries(questionGroups)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);

    topQuestions.forEach(([keyword, data]) => {
      if (data.count >= 2) {
        faqSuggestions.push({
          id: `sfq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          question: data.samples[0],
          suggestedAnswer: `Thank you for your question about "${keyword}". This is a common topic — we'll add a detailed response soon.`,
          exampleComments: data.samples,
          frequency: data.count,
          confidence: Math.min(90, 40 + data.count * 10),
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Pattern 2: Detect common keywords for new rules
    const nonQuestionComments = recentComments
      .filter((c) => !c.text?.includes("?"));
    const keywordGroups = groupByKeyword(nonQuestionComments.map((c) => c.text || ""));
    const topKeywords = Object.entries(keywordGroups)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);

    topKeywords.forEach(([keyword, data]) => {
      if (data.count >= 3) {
        const existingRule = db.rules.find((r) =>
          r.conditions.some((c) => c.value.toLowerCase().includes(keyword.toLowerCase()))
        );
        if (!existingRule) {
          suggestions.push({
            id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            pattern: keyword,
            exampleComments: data.samples,
            suggestedCondition: `contains "${keyword}"`,
            suggestedReply: `Thanks for your comment about "${keyword}"! We appreciate your feedback. 🙏`,
            confidence: Math.min(85, 30 + data.count * 8),
            reason: `"${keyword}" appears ${data.count} times in recent comments`,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    db.suggestedRules.push(...suggestions);
    db.suggestedFAQs.push(...faqSuggestions);
    await saveDB(db);

    return NextResponse.json({
      rules: suggestions,
      faqs: faqSuggestions,
      analyzedCount: recentComments.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}

function groupByKeyword(texts: string[]): Record<string, { count: number; samples: string[] }> {
  const groups: Record<string, { count: number; samples: string[] }> = {};
  const stopWords = new Set([
    "the", "a", "an", "is", "it", "to", "and", "or", "but", "in", "on", "at",
    "for", "of", "my", "i", "you", "your", "this", "that", "was", "are", "be",
    "have", "has", "can", "do", "so", "if", "no", "not", "with", "me", "we",
    "they", "just", "like", "very", "much", "more", "really", "also", "from",
  ]);

  texts.forEach((text) => {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    words.forEach((word) => {
      if (!groups[word]) groups[word] = { count: 0, samples: [] };
      groups[word].count++;
      if (groups[word].samples.length < 3) groups[word].samples.push(text);
    });
  });

  return groups;
}
