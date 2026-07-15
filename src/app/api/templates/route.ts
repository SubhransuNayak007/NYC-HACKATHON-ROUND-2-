import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, Template } from "@/database/db";
import { sanitize, checkBodySize, safeError } from '@/backend/security';

export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.templates);
}

export async function POST(req: NextRequest) {
  try {
    if (!checkBodySize(req)) {
      return NextResponse.json({ error: 'Request payload too large' }, { status: 413 });
    }
    const body = await req.json();
    const { name, emoji, body: templateBody, variants } = body;

    const cleanName = sanitize(name);
    const cleanBody = sanitize(templateBody);

    if (!cleanName || !cleanBody) {
      return NextResponse.json({ error: "Missing name or body" }, { status: 400 });
    }

    const db = await getDB();

    const newTemplate: Template = {
      id: `tpl-${Date.now()}`,
      name: cleanName,
      emoji: emoji || "💬",
      body: cleanBody,
      variants: variants || [],
      usageCount: 0,
      lastEdited: new Date().toISOString(),
    };

    db.templates.push(newTemplate);
    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Created template '${cleanName}'`);

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (err) {
    return safeError(err, "Failed to create template");
  }
}
