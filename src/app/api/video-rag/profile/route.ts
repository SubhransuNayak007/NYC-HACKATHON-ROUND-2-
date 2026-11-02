import { NextRequest, NextResponse } from "next/server";
import { VideoIngestionService } from "@/backend/video_rag/services/VideoIngestionService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const [profile, config] = await Promise.all([
      VideoIngestionService.getContentProfile(videoId),
      VideoIngestionService.getVideoRAGConfig(videoId),
    ]);

    return NextResponse.json({
      profile: profile || null,
      config,
    });
  } catch (err) {
    console.error("[API:video-rag:profile] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, title, description, rawTranscript, configUpdates, forceReprocess } = body;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    // Process or update profile
    const profile = await VideoIngestionService.processVideo({
      videoId,
      title: title || `Video ${videoId}`,
      description,
      rawTranscript,
      forceReprocess: !!forceReprocess,
    });

    // Update config if supplied
    let config;
    if (configUpdates) {
      config = await VideoIngestionService.updateVideoRAGConfig(videoId, configUpdates);
    } else {
      config = await VideoIngestionService.getVideoRAGConfig(videoId);
    }

    return NextResponse.json({
      success: true,
      profile,
      config,
    });
  } catch (err) {
    console.error("[API:video-rag:profile] POST error:", err);
    return NextResponse.json({ error: "Failed to process video profile" }, { status: 500 });
  }
}
