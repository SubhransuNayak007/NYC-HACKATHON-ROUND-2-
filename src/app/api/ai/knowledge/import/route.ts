import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDB, saveDB, logActivity, type FAQEntry } from "@/database/db";
import { sanitize, safeError } from "@/backend/security";

/**
 * POST /api/ai/knowledge/import
 * Auto-generates FAQ entries from raw text (docs, descriptions, transcripts).
 * Uses Claude to intelligently extract FAQs when ANTHROPIC_API_KEY is set,
 * otherwise falls back to a sentence-level heuristic.
 */

const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

interface ExtractedFAQ {
  question: string;
  answer: string;
  keywords: string[];
  category: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const sourceName = typeof body?.sourceName === "string" ? body.sourceName.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.faqs) db.faqs = [];

    // 1. Claude-assisted extraction when an API key is configured
    let extracted: ExtractedFAQ[] = [];
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        extracted = await extractFAQsWithClaude(text);
      } catch (err) {
        console.error("[KnowledgeImport] Claude extraction failed, falling back to heuristic:", err);
      }
    }

    // 2. Simple heuristic fallback
    if (extracted.length === 0) {
      extracted = extractFAQsHeuristic(text, sourceName);
    }

    if (extracted.length === 0) {
      return NextResponse.json(
        { error: "No FAQ entries could be extracted from the text" },
        { status: 422 }
      );
    }

    // 3. Persist created entries
    const created: FAQEntry[] = [];
    for (const item of extracted) {
      const cleanQuestion = sanitize(item.question).slice(0, 500);
      const cleanAnswer = sanitize(item.answer).slice(0, 2000);
      if (!cleanQuestion || !cleanAnswer) continue;

      const keywordsSource =
        Array.isArray(item.keywords) && item.keywords.length > 0
          ? item.keywords
          : deriveKeywords(`${cleanQuestion} ${cleanAnswer}`);

      const faq: FAQEntry = {
        id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: cleanQuestion,
        answer: cleanAnswer,
        keywords: keywordsSource
          .map((k: string) => sanitize(k).toLowerCase())
          .filter((k: string) => k.length > 0)
          .slice(0, 20),
        category: sanitize(item.category || sourceName || "imported").slice(0, 50) || "imported",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.faqs.push(faq);
      created.push(faq);
    }

    if (created.length === 0) {
      return NextResponse.json(
        { error: "No valid FAQ entries could be created from the text" },
        { status: 422 }
      );
    }

    await saveDB(db);
    await logActivity(
      db.userSession?.name || "Creator",
      `Imported ${created.length} FAQ${created.length === 1 ? "" : "s"}${sourceName ? ` from "${sourceName}"` : ""}`
    );

    return NextResponse.json(
      { success: true, imported: created.length, entries: created },
      { status: 201 }
    );
  } catch (err) {
    return safeError(err, "Failed to import knowledge");
  }
}

/** Use Claude to extract structured FAQ entries from raw text. */
async function extractFAQsWithClaude(text: string): Promise<ExtractedFAQ[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: "Extract FAQ entries from this text. Return JSON array of {question, answer, keywords, category}",
    messages: [{ role: "user", content: text }],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (item) =>
        item &&
        typeof item.question === "string" &&
        item.question.trim() &&
        typeof item.answer === "string" &&
        item.answer.trim()
    )
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
      keywords: Array.isArray(item.keywords)
        ? item.keywords.filter((k: unknown) => typeof k === "string" && k.trim())
        : [],
      category:
        typeof item.category === "string" && item.category.trim()
          ? item.category.trim()
          : "imported",
    }));
}

/**
 * Heuristic extraction:
 * - Split text into paragraphs.
 * - A paragraph becomes a FAQ entry when its first sentence contains "?" —
 *   the question is the first sentence, the answer is the rest.
 * - If no paragraph has a question, create a single FAQ entry with the
 *   whole text as the answer.
 */
function extractFAQsHeuristic(text: string, sourceName: string): ExtractedFAQ[] {
  const paragraphs = text
    .split(/\n\s*\n|(?:\r?\n)+/)
    .map((p) => p.replace(/\r?\n+/g, " ").trim())
    .filter((p) => p.length > 0);

  const entries: ExtractedFAQ[] = [];
  let foundQuestion = false;

  for (const paragraph of paragraphs) {
    const boundary = findFirstSentenceBoundary(paragraph);
    const firstSentence = paragraph.slice(0, boundary).trim();
    if (!firstSentence.includes("?")) continue;

    foundQuestion = true;
    const answer = paragraph.slice(boundary).trim();
    entries.push({
      question: firstSentence,
      answer: answer || paragraph,
      keywords: deriveKeywords(paragraph),
      category: "imported",
    });
  }

  if (!foundQuestion) {
    const boundary = findFirstSentenceBoundary(text);
    const firstSentence = text.slice(0, boundary).trim();
    entries.push({
      question: firstSentence || sourceName || "Imported content",
      answer: text,
      keywords: deriveKeywords(text),
      category: sourceName || "imported",
    });
  }

  return entries;
}

/** Index just past the first sentence-ending punctuation ("." / "!" / "?"). */
function findFirstSentenceBoundary(text: string): number {
  const match = text.match(/[.!?]+(?:\s|$)/);
  if (!match || typeof match.index !== "number") return text.length;
  return match.index + match[0].length;
}

/** Simple keyword extractor: lowercased words longer than 3 chars. */
function deriveKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 3);
}
