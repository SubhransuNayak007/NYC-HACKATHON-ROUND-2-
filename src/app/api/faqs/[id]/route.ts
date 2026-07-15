import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

// GET single FAQ entry
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const faq = (db.faqs || []).find((f) => f.id === id);

    if (!faq) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json(faq);
  } catch (err) {
    console.error("FAQ GET [id] error:", err);
    return NextResponse.json({ error: "Failed to fetch FAQ" }, { status: 500 });
  }
}

// PUT update a single FAQ entry
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await getDB();

    if (!db.faqs) db.faqs = [];
    const index = db.faqs.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    const existing = db.faqs[index];

    db.faqs[index] = {
      ...existing,
      question: body.question?.trim() || existing.question,
      answer: body.answer?.trim() || existing.answer,
      keywords: Array.isArray(body.keywords)
        ? body.keywords.map((k: string) => String(k).trim().toLowerCase()).filter(Boolean).slice(0, 20)
        : existing.keywords,
      category: body.category?.trim() || existing.category,
      updatedAt: new Date().toISOString(),
    };

    await saveDB(db);
    await logActivity(
      db.userSession?.name || "Creator",
      `Updated FAQ: "${db.faqs[index].question.substring(0, 60)}..."`
    );

    return NextResponse.json(db.faqs[index]);
  } catch (err) {
    console.error("FAQ PUT [id] error:", err);
    return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
  }
}

// DELETE a single FAQ entry
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();

    if (!db.faqs) db.faqs = [];
    const index = db.faqs.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    const removed = db.faqs.splice(index, 1)[0];
    await saveDB(db);

    await logActivity(
      db.userSession?.name || "Creator",
      `Deleted FAQ: "${removed.question.substring(0, 60)}..."`
    );

    return NextResponse.json({ success: true, deleted: removed.id });
  } catch (err) {
    console.error("FAQ DELETE [id] error:", err);
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
  }
}
