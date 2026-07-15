import { NextRequest, NextResponse } from "next/server";
import { fetchChannelVideos } from "@/backend/youtube";
import { getDB } from "@/database/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json({ error: "Missing channelId parameter" }, { status: 400 });
  }

  const db = await getDB();
  const channelExists = db.channels.some((c) => c.id === channelId);

  if (!channelExists) {
    return NextResponse.json({ error: "Channel not found in database" }, { status: 404 });
  }

  try {
    const videos = await fetchChannelVideos(channelId);
    return NextResponse.json(videos);
  } catch (err) {
    console.error("Failed to fetch videos via API route:", err);
    return NextResponse.json({ error: "Failed to load channel videos" }, { status: 500 });
  }
}
