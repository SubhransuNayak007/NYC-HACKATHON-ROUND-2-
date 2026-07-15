import { NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";
import { SocialProviderRegistry } from "@/channels/social/SocialProviderRegistry";

export async function GET() {
  try {
    const db = await getDB();
    const accounts = (db.socialAccounts || []).map((a) => ({
      platform: a.platform,
      id: a.id,
      name: a.name,
      username: a.username,
      avatar: a.avatar,
      followers: a.followers,
      connectedAt: a.connectedAt,
      isActive: a.isActive,
      status: a.status || (a.isActive ? "connected" : "disconnected"),
      lastSyncAt: a.lastSyncAt,
      capabilities: a.capabilities,
      error: a.error,
      hasToken: !!a.accessToken,
    }));

    return NextResponse.json({
      success: true,
      accounts,
      count: accounts.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { platform, accountId } = await req.json();
    if (!platform || !accountId) {
      return NextResponse.json({ success: false, error: "platform and accountId are required" }, { status: 400 });
    }

    const provider = SocialProviderRegistry.getProvider(platform);
    await provider.disconnect(accountId);

    return NextResponse.json({ success: true, message: `${platform} account disconnected` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
