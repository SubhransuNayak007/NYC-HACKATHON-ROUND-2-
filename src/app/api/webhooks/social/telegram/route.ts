import { NextResponse } from "next/server";
import { SocialProviderRegistry } from "@/channels/social/SocialProviderRegistry";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const headersList: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersList[key.toLowerCase()] = value;
    });

    const provider = SocialProviderRegistry.getProvider("telegram");
    const event = await provider.handleWebhook(payload, headersList);

    return NextResponse.json({ ok: true, received: !!event });
  } catch (err: any) {
    console.error("[Telegram Webhook Error]:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 }); // Always 200 to Telegram
  }
}
