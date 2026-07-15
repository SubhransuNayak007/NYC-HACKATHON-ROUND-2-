import { NextResponse } from "next/server";
import { SocialProviderRegistry } from "@/channels/social/SocialProviderRegistry";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.INSTAGRAM_VERIFY_TOKEN || "quickreply_verify_token";

  if (mode === "subscribe" && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headersList: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersList[key.toLowerCase()] = value;
    });

    const provider = SocialProviderRegistry.getProvider("instagram");
    const event = await provider.handleWebhook(rawBody, headersList);

    return NextResponse.json({ ok: true, received: !!event });
  } catch (err: any) {
    console.error("[Instagram Webhook Error]:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}
