import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();
  const template = db.templates.find((t) => t.id === id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json(template);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await getDB();
    const index = db.templates.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const updatedTemplate = {
      ...db.templates[index],
      ...body,
      id: db.templates[index].id, // Ensure ID doesn't change
      lastEdited: new Date().toISOString(),
    };

    db.templates[index] = updatedTemplate;
    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Updated template '${updatedTemplate.name}'`);

    return NextResponse.json(updatedTemplate);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const template = db.templates.find((t) => t.id === id);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    db.templates = db.templates.filter((t) => t.id !== id);
    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Deleted template '${template.name}'`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
