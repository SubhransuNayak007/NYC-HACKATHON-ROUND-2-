/**
 * ============================================================
 *  GET  /api/whatsapp/campaigns
 *  POST /api/whatsapp/campaigns
 *
 *  Manages official WhatsApp Business Broadcast Campaigns & Scheduler.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB, WhatsAppCampaign } from "@/database/db";

export async function GET(req: NextRequest) {
  const db = await getDB();
  // Filter legacy mock seeds
  if (db.waCampaigns && db.waCampaigns.some((c: any) => c.id?.startsWith("camp_enterprise") || c.id?.startsWith("camp_cart"))) {
    db.waCampaigns = db.waCampaigns.filter((c: any) => !c.id?.startsWith("camp_enterprise") && !c.id?.startsWith("camp_cart") && !c.id?.startsWith("camp_catalog"));
    await saveDB(db);
  }
  const campaigns = db.waCampaigns || [];
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, templateId, templateName, targetAudience, recipientCount, scheduledTime } = body;

    if (!name || !templateId) {
      return NextResponse.json({ error: "Campaign name and template ID are required." }, { status: 400 });
    }

    const db = await getDB();
    if (!db.waCampaigns) db.waCampaigns = [];

    const newCampaign: WhatsAppCampaign = {
      id: `camp_${uuidv4().substring(0, 8)}`,
      tenantId: "default",
      name,
      templateId,
      templateName: templateName || "welcome_discount_20",
      targetAudience: targetAudience || "VIP Customers",
      recipientCount: Number(recipientCount) || 100,
      scheduledTime: scheduledTime || new Date(Date.now() + 3600000).toISOString(),
      status: "scheduled",
      rateLimitPerMinute: 60,
      metrics: {
        sent: 0,
        delivered: 0,
        read: 0,
        replied: 0,
        failed: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.waCampaigns.unshift(newCampaign);
    await saveDB(db);

    return NextResponse.json({ success: true, campaign: newCampaign });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
