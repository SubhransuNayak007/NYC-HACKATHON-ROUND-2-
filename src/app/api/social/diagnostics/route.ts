import { NextResponse } from "next/server";
import { SocialProviderRegistry } from "@/channels/social/SocialProviderRegistry";
import { getDB } from "@/database/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { platform, accountId } = body;

    if (!platform) {
      return NextResponse.json({ success: false, error: "platform is required" }, { status: 400 });
    }

    const provider = SocialProviderRegistry.getProvider(platform);
    const db = await getDB();
    const targetAccountId = accountId || db.socialAccounts?.find((a) => a.platform === platform)?.id;

    if (!targetAccountId) {
      return NextResponse.json({
        success: false,
        diagnostics: {
          platform,
          connected: false,
          status: "disconnected",
          tokenValid: false,
          accountDiscovered: false,
          permissionsVerified: false,
          apiReachable: false,
          webhookActive: false,
          details: `No ${platform} account connected in database.`,
        },
      });
    }

    const diagnostics = await provider.testConnection(targetAccountId);

    return NextResponse.json({
      success: true,
      diagnostics,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
