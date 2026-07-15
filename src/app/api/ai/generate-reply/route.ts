import { NextRequest, NextResponse } from "next/server";
import { generateReply } from "@/backend/ai";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "AI features are not available",
          message:
            "ANTHROPIC_API_KEY is not configured. Add your Anthropic API key to the environment variables to enable AI-powered reply generation.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { commentText, author, videoTitle, channelName, tone, faqContext } =
      body;

    if (!commentText || !author || !videoTitle || !channelName) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["commentText", "author", "videoTitle", "channelName"],
        },
        { status: 400 }
      );
    }

    const result = await generateReply({
      commentText,
      author,
      videoTitle,
      channelName,
      tone,
      faqContext,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate reply. The AI service may be temporarily unavailable." },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI] generate-reply error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
