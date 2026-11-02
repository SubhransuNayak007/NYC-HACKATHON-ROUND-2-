/**
 * /api/youtube/feed
 * GET — paginated historical comment feed from yt_comments collection
 * Supports cursor-based pagination via `before` (ISO timestamp) param.
 * Returns real ingested data — never mock or in-memory state.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDB } from "@/database/db";
import {
  getYTCommentsCollection,
  getYTOutboxCollection,
  ensureYouTubeIndexes,
} from "@/database/youtube-collections";

async function getWorkspaceId(req: NextRequest): Promise<string | null> {
  try {
    const session = req.cookies.get("qr_session")?.value;
    if (session) {
      const db = await getDB();
      if (db.userSession?.email) return db.userSession.email.toLowerCase().trim();
      return "default_workspace";
    }
    const db = await getDB();
    if (db.userSession?.email) return db.userSession.email.toLowerCase().trim();
  } catch {}
  return "default_workspace";
}

export async function GET(req: NextRequest) {
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureYouTubeIndexes();
    const { searchParams } = new URL(req.url);
    const before = searchParams.get("before");   // ISO timestamp cursor
    const videoId = searchParams.get("videoId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const commentsCol = await getYTCommentsCollection();
    if (!commentsCol) {
      return NextResponse.json({ comments: [], count: 0, hasMore: false, nextCursor: null });
    }

    const filter: any = { workspaceId };
    if (before) filter.ingestedAt = { $lt: before };
    if (videoId) filter.videoId = videoId;
    if (status) filter.status = status;

    const comments = await commentsCol
      .find(filter)
      .sort({ ingestedAt: -1 })
      .limit(limit)
      .toArray();

    const hasMore = comments.length === limit;
    const nextCursor = hasMore ? comments[comments.length - 1].ingestedAt : null;

    // Strip internal DB fields for API response
    const safe = comments.map(({ _id, rawSourceHash, ...c }) => c);

    return NextResponse.json({
      comments: safe,
      count: safe.length,
      hasMore,
      nextCursor,
    });
  } catch (err: any) {
    console.error("[YT-Feed] GET error:", err);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}

