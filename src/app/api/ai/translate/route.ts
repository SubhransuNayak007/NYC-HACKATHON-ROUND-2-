import { NextRequest, NextResponse } from "next/server";
import { detectLanguage, translateText } from "@/backend/ai";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "AI features are not available",
          message:
            "ANTHROPIC_API_KEY is not configured. Add your Anthropic API key to the environment variables to enable translation.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { text, targetLanguage, detectOnly } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Missing required field",
          message: "Provide { text } in the request body.",
        },
        { status: 400 }
      );
    }

    // Detect-only mode
    if (detectOnly) {
      const result = await detectLanguage(text);
      if (!result) {
        return NextResponse.json(
          { error: "Failed to detect language. The AI service may be temporarily unavailable." },
          { status: 502 }
        );
      }
      return NextResponse.json(result);
    }

    // Full translation
    const result = await translateText(text, targetLanguage || "en");
    if (!result) {
      return NextResponse.json(
        { error: "Failed to translate text. The AI service may be temporarily unavailable." },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI] translate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
