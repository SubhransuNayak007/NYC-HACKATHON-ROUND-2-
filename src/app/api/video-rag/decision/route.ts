import { NextRequest, NextResponse } from "next/server";
import { ActionQueueService } from "@/backend/video_rag/execution/ActionQueueService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, videoId, author, text, videoTitle, parentCommentId } = body;

    if (!videoId || !text) {
      return NextResponse.json({ error: "videoId and text are required" }, { status: 400 });
    }

    const trace = await ActionQueueService.processComment({
      commentId: commentId || `sim_${Date.now()}`,
      videoId,
      author: author || "Viewer",
      text,
      videoTitle,
      parentCommentId,
    });

    return NextResponse.json({
      success: true,
      trace,
    });
  } catch (err) {
    console.error("[API:video-rag:decision] error:", err);
    return NextResponse.json({ error: "Failed to process comment decision" }, { status: 500 });
  }
}
