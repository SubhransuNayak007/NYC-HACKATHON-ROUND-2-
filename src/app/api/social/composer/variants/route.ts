import { NextResponse } from "next/server";
import { SocialComposer } from "@/channels/social/composer/SocialComposer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { intent, mediaUrls, tone } = body;

    if (!intent) {
      return NextResponse.json({ success: false, error: "Intent text is required" }, { status: 400 });
    }

    const variants = SocialComposer.generatePlatformVariants({
      intent,
      mediaUrls,
      tone,
    });

    return NextResponse.json({
      success: true,
      variants,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
