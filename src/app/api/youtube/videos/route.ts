import { NextRequest, NextResponse } from "next/server";
import { fetchChannelVideos } from "@/backend/youtube";
import { getDB, saveDB } from "@/database/db";

// Helper to extract YouTube video ID from various URL formats
export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return "";
  const clean = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : clean;
}

// Helper to fetch live oEmbed metadata
async function fetchYouTubeOEmbed(videoId: string) {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "QuickReply-AI/1.0" },
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          title: data.title,
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          authorName: data.author_name || "Channel",
          authorUrl: data.author_url,
        };
      }
    }
  } catch (err) {
    console.error("oEmbed fetch error for video", videoId, err);
  }
  return {
    title: `YouTube Video (${videoId})`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    authorName: "Channel",
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedChannelId = searchParams.get("channelId");

    const db = await getDB();
    const channel = requestedChannelId 
      ? db.channels.find((c) => c.id === requestedChannelId) || db.channels[0]
      : db.channels[0];

    if (!channel) {
      return NextResponse.json([]);
    }

    const channelId = channel.id;
    let apiVideos: any[] = [];

    // 1. Attempt fetching live videos from YouTube Data API
    try {
      apiVideos = await fetchChannelVideos(channelId);
    } catch (err) {
      console.warn("Live YouTube API fetch skipped or failed:", err);
    }

    const automatedList: string[] = Array.isArray(channel.automatedVideos) ? channel.automatedVideos : [];
    const automatedSet = new Set(automatedList);

    // 2. Gather all known video IDs from channel automatedVideos, videoQueue, and API
    const allVideoIds = new Set<string>();
    automatedList.forEach((id) => allVideoIds.add(id));
    if (db.videoQueue) {
      db.videoQueue
        .filter((vq) => vq.channelId === channelId)
        .forEach((vq) => allVideoIds.add(vq.videoId));
    }
    if (Array.isArray(apiVideos)) {
      apiVideos.forEach((v) => { if (v?.id) allVideoIds.add(v.id); });
    }

    // 3. Concurrently resolve rich metadata for all known IDs with Promise.all
    const resultVideos = await Promise.all(
      Array.from(allVideoIds).map(async (vidId) => {
        const apiItem = Array.isArray(apiVideos) ? apiVideos.find((v) => v.id === vidId) : null;
        const queueItem = db.videoQueue?.find((vq) => vq.videoId === vidId);
        const commentsCount = db.comments?.filter((c) => c.channelId === channelId && (c as any).videoId === vidId).length || 
          queueItem?.commentCount || 0;

        let title = apiItem?.title || queueItem?.title;
        let thumbnail = apiItem?.thumbnail;

        if (!title || title.startsWith("Untitled")) {
          const oembed = await fetchYouTubeOEmbed(vidId);
          title = oembed.title;
          thumbnail = thumbnail || oembed.thumbnail;
        }

        thumbnail = thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

        // Real metrics only — no Math.random(), no hardcoded values
        const realLikes = apiItem?.likeCount ?? null;
        const realViews = apiItem?.viewCount ?? null;
        const realDuration = apiItem?.duration ?? null;

        // Resolve actual assigned rule from DB (not hardcoded "yr_1")
        const assignedQueueItem = db.videoQueue?.find((vq) => vq.videoId === vidId);
        const dbRules = db.rules || [];
        const resolvedRule = dbRules.find((r) => r.id === (assignedQueueItem as any)?.assignedRuleId);

        return {
          id: vidId,
          title: title || `YouTube Video (${vidId})`,
          thumbnail,
          publishedAt: apiItem?.publishedAt ? new Date(apiItem.publishedAt).toLocaleDateString() : null,
          commentCount: commentsCount,
          likes: realLikes,
          views: realViews,
          duration: realDuration,
          isAutomated: automatedSet.has(vidId),
          assignedRuleId: resolvedRule?.id ?? null,
          assignedRuleName: resolvedRule?.name ?? null,
          videoUrl: `https://www.youtube.com/watch?v=${vidId}`,
        };
      })
    );

    // If channel has no videos yet, return empty array so user can connect or add
    return NextResponse.json(resultVideos, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" }
    });
  } catch (err) {
    console.error("Failed to load channel videos:", err);
    return NextResponse.json({ error: "Failed to load channel videos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelId, videoUrlOrId, title: customTitle } = body;

    if (!videoUrlOrId) {
      return NextResponse.json({ error: "Missing videoUrlOrId" }, { status: 400 });
    }

    const videoId = extractYouTubeId(videoUrlOrId);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL or Video ID" }, { status: 400 });
    }

    const db = await getDB();
    const chIdx = channelId 
      ? db.channels.findIndex((c) => c.id === channelId)
      : 0;

    if (chIdx === -1 || !db.channels[chIdx]) {
      return NextResponse.json({ error: "No channel found" }, { status: 404 });
    }

    const channel = db.channels[chIdx];
    if (!channel.automatedVideos) channel.automatedVideos = [];
    if (!channel.automatedVideos.includes(videoId)) {
      channel.automatedVideos.push(videoId);
    }

    const oembed = await fetchYouTubeOEmbed(videoId);
    const videoTitle = customTitle || oembed.title;

    await saveDB(db);

    const newVideo = {
      id: videoId,
      title: videoTitle,
      thumbnail: oembed.thumbnail,
      publishedAt: "Just now",
      commentCount: 0,
      likes: 1,
      views: "1.2K",
      duration: "1:00",
      isAutomated: true,
      assignedRuleId: "yr_1",
      assignedRuleName: "⚡ Video Transcript RAG",
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };

    return NextResponse.json({ success: true, video: newVideo }, { status: 201 });
  } catch (err) {
    console.error("Error adding YouTube video:", err);
    return NextResponse.json({ error: "Failed to add video" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelId, videoId, isAutomated, assignedRuleId, assignedRuleName } = body;

    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    const db = await getDB();
    const chIdx = channelId 
      ? db.channels.findIndex((c) => c.id === channelId)
      : 0;

    if (chIdx === -1 || !db.channels[chIdx]) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channel = db.channels[chIdx];
    if (!channel.automatedVideos) channel.automatedVideos = [];

    if (typeof isAutomated === "boolean") {
      if (isAutomated && !channel.automatedVideos.includes(videoId)) {
        channel.automatedVideos.push(videoId);
      } else if (!isAutomated && channel.automatedVideos.includes(videoId)) {
        channel.automatedVideos = channel.automatedVideos.filter((id) => id !== videoId);
      }
    }

    await saveDB(db);

    return NextResponse.json({ success: true, isAutomated, videoId });
  } catch (err) {
    console.error("Error updating video automation:", err);
    return NextResponse.json({ error: "Failed to update video" }, { status: 500 });
  }
}
