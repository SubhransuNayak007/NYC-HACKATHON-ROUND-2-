import { NextResponse } from "next/server";
import { SocialComposer } from "@/channels/social/composer/SocialComposer";
import { MediaPipeline } from "@/channels/social/media/MediaPipeline";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { canonicalIntent, mediaUrls, platforms, scheduledAt } = body;

    if (!canonicalIntent || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: "canonicalIntent and at least one target platform are required." },
        { status: 400 }
      );
    }

    // Media validation if media URLs supplied
    if (mediaUrls && mediaUrls.length > 0) {
      for (const url of mediaUrls) {
        const validation = await MediaPipeline.inspectAndValidate(url);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: `Media validation failed: ${validation.error}` },
            { status: 400 }
          );
        }
      }
    }

    const result = await SocialComposer.publishOrSchedule({
      canonicalIntent,
      mediaUrls,
      platforms,
      scheduledAt,
    });

    return NextResponse.json({
      success: result.status !== "failed",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
