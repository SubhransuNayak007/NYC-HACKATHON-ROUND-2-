import { NextRequest, NextResponse } from "next/server";
import { VideoRAGEvaluationSuite } from "@/backend/video_rag/eval/VideoRAGEvaluationSuite";

export async function GET(req: NextRequest) {
  try {
    const report = await VideoRAGEvaluationSuite.runSuite();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err) {
    console.error("[API:video-rag:eval] error:", err);
    return NextResponse.json({ error: "Failed to run evaluation suite" }, { status: 500 });
  }
}
