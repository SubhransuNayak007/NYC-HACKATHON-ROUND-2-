import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, TemplateVersion } from "@/database/db";

/**
 * GET /api/templates/versions - List all template versions
 * POST /api/templates/versions - Create a new template version
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.templateVersions || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateId, templateName, content, createdBy } = body;

    if (!templateName || !content) {
      return NextResponse.json({ error: "templateName and content are required" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.templateVersions) db.templateVersions = [];

    // Find existing versions for this template to determine next version number
    const existingVersions = db.templateVersions.filter(
      (v) => v.templateId === (templateId || templateName.toLowerCase().replace(/\s+/g, "-"))
    );
    const nextVersion = existingVersions.length + 1;

    const version: TemplateVersion = {
      id: `tv-${Date.now()}`,
      templateId: templateId || templateName.toLowerCase().replace(/\s+/g, "-"),
      templateName,
      version: nextVersion,
      body: content,
      editedBy: createdBy || db.userSession?.name || "Creator",
      createdAt: new Date().toISOString(),
    };

    // Unused as isLatest is not in the type anymore
    // existingVersions.forEach((v) => {
    //   v.isLatest = false;
    // });

    db.templateVersions.push(version);
    await saveDB(db);
    await logActivity(db.userSession?.name || "Creator", `Created template '${templateName}' v${nextVersion}`);

    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
