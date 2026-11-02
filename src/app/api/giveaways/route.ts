import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { v4 as uuidv4 } from "uuid";
import { AuditLogger } from "@/backend/audit/AuditLogger";

export const dynamic = "force-dynamic";

export interface GiveawayCampaign {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  platform: string;
  contentId: string;
  contentTitle: string;
  challengeRequired: boolean;
  expectedAnswer?: string;
  validationType?: string;
  status: "DRAFT" | "ACTIVE" | "DRAWN" | "COMPLETED";
  winnerCount: number;
  allowMultipleEntries: boolean;
  participantCount: number;
  eligibleCount: number;
  createdAt: string;
}

/**
 * GET /api/giveaways
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const db = await getDB(tenantId);
    const campaigns: GiveawayCampaign[] = db.giveawayCampaigns || [];
    const winners = db.giveawayWinners || [];

    return NextResponse.json({
      success: true,
      campaigns,
      winners,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load giveaways" }, { status: 500 });
  }
}

/**
 * POST /api/giveaways
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = getCanonicalTenantId(session.email);
    const body = await req.json();
    const { name, description, platform, contentId, contentTitle, challengeRequired, expectedAnswer, validationType, winnerCount } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
    }

    const campaignId = `giveaway_${uuidv4()}`;
    const now = new Date().toISOString();

    const campaign: GiveawayCampaign = {
      id: campaignId,
      tenantId,
      name: name.trim(),
      description: description || "",
      platform: platform || "youtube",
      contentId: contentId || "vid_101",
      contentTitle: contentTitle || "Summer Giveaway Event",
      challengeRequired: !!challengeRequired,
      expectedAnswer,
      validationType: validationType || "exact",
      status: "ACTIVE",
      winnerCount: winnerCount || 1,
      allowMultipleEntries: false,
      participantCount: 0,
      eligibleCount: 0,
      createdAt: now,
    };

    const db = await getDB(tenantId);
    if (!db.giveawayCampaigns) db.giveawayCampaigns = [];
    db.giveawayCampaigns.unshift(campaign);
    await saveDB(db, tenantId);

    await AuditLogger.log({
      tenantId,
      workspaceId: `ws_${tenantId}`,
      actorId: session.email,
      actorEmail: session.email,
      actorRole: "ADMIN",
      action: "giveaway.created",
      resourceType: "customer",
      resourceId: campaignId,
      description: `Giveaway campaign "${campaign.name}" created for content "${campaign.contentTitle}".`,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create giveaway" }, { status: 500 });
  }
}
