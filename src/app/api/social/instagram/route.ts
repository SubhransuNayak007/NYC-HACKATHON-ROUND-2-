import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, encryptToken, decryptToken, SocialComment } from "@/database/db";
import { cookies } from "next/headers";

/**
 * Instagram Comments API
 * GET /api/social/instagram - Fetch latest media + comments from Instagram Graph API
 * POST /api/social/instagram - Reply to a specific Instagram comment
 */

const IG_API = "https://graph.instagram.com";

async function getAccountToken(db: Awaited<ReturnType<typeof getDB>>) {
  const acct = db.socialAccounts?.find(a => a.platform === "instagram" && a.isActive);
  if (!acct?.accessToken) return null;
  return { acct, token: decryptToken(acct.accessToken) };
}

export async function GET() {
  const db = await getDB();
  const result = await getAccountToken(db);

  if (!result) {
    return NextResponse.json({ error: "Instagram not connected", connected: false }, { status: 404 });
  }

  const { acct, token } = result;

  try {
    // Fetch recent media (last 10 posts)
    const mediaRes = await fetch(
      `${IG_API}/me/media?fields=id,caption,media_type,timestamp,permalink&limit=10&access_token=${token}`
    );

    if (!mediaRes.ok) {
      const err = await mediaRes.json();
      return NextResponse.json({ error: err.error?.message || "Failed to fetch media" }, { status: 400 });
    }

    const mediaData = await mediaRes.json();
    const mediaItems: Array<{ id: string; caption?: string; timestamp: string; permalink: string }> = mediaData.data || [];

    // Fetch comments for each media item (up to 3 posts to stay within API limits)
    const allNewComments: SocialComment[] = [];
    const existingIds = new Set((db.socialComments || []).filter(c => c.platform === "instagram").map(c => c.id));

    for (const media of mediaItems.slice(0, 3)) {
      const commRes = await fetch(
        `${IG_API}/${media.id}/comments?fields=id,text,username,timestamp&limit=20&access_token=${token}`
      );
      if (!commRes.ok) continue;

      const commData = await commRes.json();
      for (const c of (commData.data || [])) {
        if (existingIds.has(c.id)) continue;

        allNewComments.push({
          id: c.id,
          platform: "instagram",
          accountId: acct.id,
          author: c.username || "Unknown",
          text: c.text || "",
          postId: media.id,
          postTitle: media.caption?.slice(0, 80) || "Instagram Post",
          postUrl: media.permalink,
          publishedAt: c.timestamp,
          status: "pending",
        });
      }
    }

    // Save new comments to DB
    if (allNewComments.length > 0) {
      if (!db.socialComments) db.socialComments = [];
      db.socialComments.push(...allNewComments);
      // Update lastSyncAt
      const accIdx = db.socialAccounts!.findIndex(a => a.platform === "instagram");
      if (accIdx >= 0) db.socialAccounts![accIdx].lastSyncAt = new Date().toISOString();
      await saveDB(db);
    }

    const igComments = db.socialComments?.filter(c => c.platform === "instagram") || [];
    return NextResponse.json({ connected: true, account: acct.name, newCount: allNewComments.length, comments: igComments });

  } catch (err) {
    console.error("[Instagram API]", err);
    return NextResponse.json({ error: "Failed to fetch Instagram comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { commentId, replyText, socialCommentId } = await req.json();
    if (!commentId || !replyText) {
      return NextResponse.json({ error: "commentId and replyText required" }, { status: 400 });
    }

    const db = await getDB();
    const result = await getAccountToken(db);
    if (!result) return NextResponse.json({ error: "Instagram not connected" }, { status: 404 });

    const { token } = result;

    // Post reply to Instagram comment
    const replyRes = await fetch(`${IG_API}/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: replyText, access_token: token }),
    });

    if (!replyRes.ok) {
      const err = await replyRes.json();
      return NextResponse.json({ error: err.error?.message || "Failed to post reply" }, { status: 400 });
    }

    const replyData = await replyRes.json();

    // Update local comment status
    if (socialCommentId && db.socialComments) {
      const idx = db.socialComments.findIndex(c => c.id === socialCommentId);
      if (idx >= 0) {
        db.socialComments[idx].status = "replied";
        db.socialComments[idx].replyText = replyText;
        db.socialComments[idx].repliedAt = new Date().toISOString();
      }
      await saveDB(db);
    }

    return NextResponse.json({ success: true, replyId: replyData.id });
  } catch (err) {
    return NextResponse.json({ error: "Failed to post Instagram reply" }, { status: 500 });
  }
}
