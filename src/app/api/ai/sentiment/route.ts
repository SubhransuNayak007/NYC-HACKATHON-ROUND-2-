import { NextRequest, NextResponse } from "next/server";
import { analyzeSentiment, batchAnalyzeSentiment } from "@/backend/ai";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "AI features are not available",
          message:
            "ANTHROPIC_API_KEY is not configured. Add your Anthropic API key to the environment variables to enable sentiment analysis.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { comments, text } = body;

    // Batch mode
    if (Array.isArray(comments) && comments.length > 0) {
      const results = await batchAnalyzeSentiment(comments);
      return NextResponse.json({ results });
    }

    // Single mode
    if (typeof text === "string" && text.trim().length > 0) {
      const result = await analyzeSentiment(text);
      if (!result) {
        return NextResponse.json(
          { error: "Failed to analyze sentiment. The AI service may be temporarily unavailable." },
          { status: 502 }
        );
      }
      return NextResponse.json(result);
    }

    return NextResponse.json(
      {
        error: "Invalid request body",
        message:
          "Provide either { text } for single analysis or { comments: Array<{id, text}> } for batch analysis.",
      },
      { status: 400 }
    );
  } catch (err) {
    console.error("[AI] sentiment error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
