import { NextRequest, NextResponse } from "next/server";
import { pollAndReply } from "@/backend/scheduler";

/**
 * YouTube comment polling endpoint.
 *
 * Called by:
 * - Client-side 30-second auto-refresh in LiveCommentFeed
 * - Background scheduler (via pollAndReply directly)
 * - Cron endpoint (/api/cron/poll) for external triggers
 *
 * Uses the shared pollAndReply() function to ensure consistent
 * processing across all entry points — rules, RAG matching,
 * negative keyword filtering, and YouTube API replies.
 */
export async function GET(_req: NextRequest) {
  try {
    const result = await pollAndReply();

    return NextResponse.json({
      success: result.success,
      summary: result.summary,
    });
  } catch (err: any) {
    console.error("Poller endpoint exception:", err);
    return NextResponse.json(
      { error: "An internal error occurred while polling comments." },
      { status: 500 }
    );
  }
}
