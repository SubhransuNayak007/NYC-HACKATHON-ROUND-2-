/**
 * ============================================================
 *  GET  /api/whatsapp/templates
 *  POST /api/whatsapp/templates (Sync from Meta)
 *
 *  Manages official WhatsApp Business Message Templates.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";
import { MetaCloudApiService } from "@/backend/whatsapp/MetaCloudApiService";

export async function GET(req: NextRequest) {
  const db = await getDB();
  const templates = db.waTemplates || [];
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const db = await getDB();
  const conn = db.waConnections?.[0];
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const wabaId = conn?.wabaId || process.env.WHATSAPP_WABA_ID || "";

  if (wabaId && accessToken) {
    try {
      const syncedTemplates = await MetaCloudApiService.fetchTemplates(wabaId, accessToken);
      if (syncedTemplates.length > 0) {
        db.waTemplates = syncedTemplates;
        await saveDB(db);
        return NextResponse.json({ success: true, count: syncedTemplates.length, templates: syncedTemplates });
      }
    } catch (err) {
      console.warn("[Templates Sync] Meta fetch error:", err);
    }
  }

  return NextResponse.json({
    success: true,
    count: db.waTemplates?.length || 0,
    templates: db.waTemplates || [],
  });
}
