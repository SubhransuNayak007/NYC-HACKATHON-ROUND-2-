import { NextResponse } from "next/server";
import { SocialProviderRegistry } from "@/channels/social/SocialProviderRegistry";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = (body.botToken || body.token || "").trim();

    if (!botToken) {
      return NextResponse.json(
        { success: false, error: "Bot Token is required. Obtain it from @BotFather on Telegram." },
        { status: 400 }
      );
    }

    const provider = SocialProviderRegistry.getProvider("telegram");
    const result = await provider.callback({ botToken });

    if (result.success) {
      // Auto-register webhook if base URL configured
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      if (baseUrl && !baseUrl.includes("localhost")) {
        const webhookUrl = `${baseUrl}/api/webhooks/social/telegram`;
        await provider.registerWebhooks(result.account!.id, webhookUrl);
      }

      return NextResponse.json({
        success: true,
        account: result.account,
        message: "Telegram Bot connected successfully!",
      });
    }

    return NextResponse.json(
      { success: false, error: result.error, userFacingExplanation: result.userFacingExplanation },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
