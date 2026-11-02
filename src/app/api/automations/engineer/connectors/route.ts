import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import { IntegrationCatalog } from "@/backend/automation/catalog/IntegrationCatalog";
import { DynamicConnectorOnboarding } from "@/backend/automation/intelligence/DynamicConnectorOnboarding";
import { getDB } from "@/database/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    const tenantId = session ? getCanonicalTenantId(session.email) : "guest_demo";

    const db = await getDB(tenantId);
    const connectedApps: string[] = [];

    if (db.channels) {
      for (const ch of db.channels) {
        const plat = (ch as any).platform;
        if (plat === "whatsapp") connectedApps.push("whatsapp");
        if (plat === "telegram") connectedApps.push("telegram");
      }
    }
    if (db.socialAccounts) {
      for (const sa of db.socialAccounts) {
        const plat = (sa as any).platform;
        if (plat === "google") {
          connectedApps.push("gmail");
          connectedApps.push("google_sheets");
        }
      }
    }

    const catalog = IntegrationCatalog.getAll().map((app) => ({
      appId: app.appId,
      name: app.name,
      category: app.category,
      description: app.description,
      iconName: app.iconName,
      authType: app.authType,
      isConnected: connectedApps.includes(app.appId),
      onboarding: DynamicConnectorOnboarding.getOnboardingPlan(app.appId),
      actionsCount: app.actions.length,
    }));

    return NextResponse.json({
      success: true,
      connectedApps: Array.from(new Set(connectedApps)),
      catalog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
