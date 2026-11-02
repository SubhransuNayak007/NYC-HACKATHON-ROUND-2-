import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId, hasPermission } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";

/**
 * GET /api/instagram/crm
 * Lists CRM contacts, lead stages, notes, and sentiment trends
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const stage = searchParams.get("stage"); // HOT, WARM, COLD

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    let contacts = (db.instagramContacts || []).filter((c) => c.tenantId === tenantId);
    if (stage) {
      contacts = contacts.filter((c) => c.leadStage === stage);
    }

    return NextResponse.json({
      success: true,
      contacts: contacts.reverse(),
      summary: {
        total: contacts.length,
        hot: contacts.filter((c) => c.leadStage === "HOT").length,
        warm: contacts.filter((c) => c.leadStage === "WARM").length,
        cold: contacts.filter((c) => c.leadStage === "COLD").length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load CRM contacts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/instagram/crm
 * Updates contact notes, tags, or lead stage
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "MEMBER")) {
      return NextResponse.json({ error: "Forbidden: Member role required" }, { status: 403 });
    }

    const body = await req.json();
    const { contactId, note, tag, leadStage, isVip } = body;

    if (!contactId) {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    const contact = (db.instagramContacts || []).find((c) => c.id === contactId && c.tenantId === tenantId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (note) {
      if (!contact.notes) contact.notes = [];
      contact.notes.push(note);
    }
    if (tag && !contact.tags.includes(tag)) {
      contact.tags.push(tag);
    }
    if (leadStage) {
      contact.leadStage = leadStage;
    }
    if (isVip !== undefined) {
      contact.isVip = isVip;
    }
    contact.updatedAt = new Date().toISOString();

    await saveDB(db, session.email);

    return NextResponse.json({ success: true, contact });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update contact" },
      { status: 500 }
    );
  }
}
