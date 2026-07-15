import { NextResponse } from "next/server";
import { SocialProviderRegistry } from "@/channels/social/SocialProviderRegistry";
import { getDB } from "@/database/db";

export async function GET() {
  try {
    const db = await getDB();
    const providers = SocialProviderRegistry.getAllProviders();
    const matrix: Record<string, any> = {};

    for (const provider of providers) {
      const acct = db.socialAccounts?.find((a) => a.platform === provider.platform && a.isActive);
      const caps = await provider.getCapabilities(acct?.id || "unconnected");
      matrix[provider.platform] = {
        platform: provider.platform,
        displayName: provider.displayName,
        connected: !!acct && acct.status === "connected",
        accountUsername: acct?.username || null,
        capabilities: caps,
        pricingModel: {
          officialApi: "Official",
          thirdPartyAggregator: "None",
          userCost: provider.platform === "telegram" ? "100% Free (Telegram Bot API)" : "Platform-dependent",
          ourIntegrationFee: "₹0",
        },
      };
    }

    return NextResponse.json({
      success: true,
      matrix,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
