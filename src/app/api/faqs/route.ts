import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, FAQEntry } from "@/database/db";
import { sanitize, checkBodySize, safeError } from '@/backend/security';

// GET all FAQ entries for the authenticated user
export async function GET() {
  try {
    const db = await getDB();
    return NextResponse.json(db.faqs || []);
  } catch (err) {
    return safeError(err, "Failed to fetch FAQs");
  }
}

// POST create a new FAQ entry
export async function POST(req: NextRequest) {
  try {
    if (!checkBodySize(req)) {
      return NextResponse.json({ error: 'Request payload too large' }, { status: 413 });
    }
    const body = await req.json();
    const { question, answer, keywords, category } = body;

    const cleanQuestion = sanitize(question);
    const cleanAnswer = sanitize(answer);
    const cleanCategory = sanitize(category);

    if (!cleanQuestion || !cleanAnswer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 }
      );
    }

    if (cleanQuestion.length > 500) {
      return NextResponse.json(
        { error: "Question must be 500 characters or less" },
        { status: 400 }
      );
    }

    if (cleanAnswer.length > 2000) {
      return NextResponse.json(
        { error: "Answer must be 2000 characters or less" },
        { status: 400 }
      );
    }

    const db = await getDB();

    const newFAQ: FAQEntry = {
      id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      question: cleanQuestion,
      answer: cleanAnswer,
      keywords: Array.isArray(keywords)
        ? keywords.map((k: string) => sanitize(k).toLowerCase()).filter(Boolean).slice(0, 20)
        : [],
      category: cleanCategory || "general",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.faqs) db.faqs = [];
    db.faqs.push(newFAQ);
    await saveDB(db);

    await logActivity(
      db.userSession?.name || "Creator",
      `Created FAQ: "${cleanQuestion.substring(0, 60)}..."`
    );

    return NextResponse.json(newFAQ, { status: 201 });
  } catch (err) {
    return safeError(err, "Failed to create FAQ");
  }
}

// PUT bulk-import FAQs from JSON array
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { faqs } = body;

    if (!Array.isArray(faqs) || faqs.length === 0) {
      return NextResponse.json(
        { error: "Provide a non-empty array of FAQ entries" },
        { status: 400 }
      );
    }

    if (faqs.length > 200) {
      return NextResponse.json(
        { error: "Maximum 200 FAQ entries per import" },
        { status: 400 }
      );
    }

    const db = await getDB();
    if (!db.faqs) db.faqs = [];

    let imported = 0;
    for (const faq of faqs) {
      if (!faq.question || !faq.answer) continue;
      db.faqs.push({
        id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: sanitize(faq.question).slice(0, 500),
        answer: sanitize(faq.answer).slice(0, 2000),
        keywords: Array.isArray(faq.keywords)
          ? faq.keywords.map((k: string) => sanitize(k).toLowerCase()).filter(Boolean).slice(0, 20)
          : [],
        category: sanitize(faq.category || "general"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      imported++;
    }

    await saveDB(db);
    await logActivity(
      db.userSession?.name || "Creator",
      `Bulk imported ${imported} FAQ entries`
    );

    return NextResponse.json({ success: true, imported, total: db.faqs.length });
  } catch (err) {
    return safeError(err, "Failed to import FAQs");
  }
}
