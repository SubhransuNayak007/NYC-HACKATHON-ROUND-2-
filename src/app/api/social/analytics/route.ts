import { NextResponse } from "next/server";
import { SocialProviderRegistry } from "@/channels/social/SocialProviderRegistry";
import { getDB } from "@/database/db";

export async function GET() {
  try {
    const db = await getDB();
    const accounts = db.socialAccounts || [];
    const analyticsMap: Record<string, any> = {};

    for (const acct of accounts) {
      if (!acct.isActive) continue;
      try {
        const provider = SocialProviderRegistry.getProvider(acct.platform);
        const analytics = await provider.getAnalytics(acct.id);
        analyticsMap[`${acct.platform}_${acct.id}`] = analytics;
      } catch (err: any) {
        analyticsMap[`${acct.platform}_${acct.id}`] = {
          platform: acct.platform,
          accountId: acct.id,
          error: err.message,
          lastUpdatedText: "Fetch error",
        };
      }
    }

    return NextResponse.json({
      success: true,
      analytics: analyticsMap,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
