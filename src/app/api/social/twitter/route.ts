import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, decryptToken, SocialComment } from "@/database/db";

/**
 * X (Twitter) API v2 - Mentions & Replies
 * GET /api/social/twitter - Fetch recent mentions
 * POST /api/social/twitter - Reply to a tweet
 */

const TWITTER_API = "https://api.twitter.com/2";

async function getAccountInfo(db: Awaited<ReturnType<typeof getDB>>) {
  const acct = db.socialAccounts?.find(a => a.platform === "twitter" && a.isActive);
  if (!acct?.accessToken) return null;
  return { acct, token: decryptToken(acct.accessToken) };
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + "M";
  if (count >= 1_000) return Math.round(count / 1_000) + "K";
  return count.toString();
}

export async function GET() {
  const db = await getDB();
  const result = await getAccountInfo(db);

  if (!result) {
    return NextResponse.json({ error: "X (Twitter) not connected", connected: false }, { status: 404 });
  }

  const { acct, token } = result;

  try {
    // Get user ID (stored as acct.id)
    const userId = acct.id;

    // Fetch recent mentions (last 20)
    const mentionsRes = await fetch(
      `${TWITTER_API}/users/${userId}/mentions?max_results=20&tweet.fields=id,text,author_id,created_at,conversation_id&expansions=author_id&user.fields=name,username,profile_image_url`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!mentionsRes.ok) {
      const err = await mentionsRes.json();
      // Token might be expired — mark account with error
      const accIdx = db.socialAccounts!.findIndex(a => a.platform === "twitter");
      if (accIdx >= 0) db.socialAccounts![accIdx].error = err.detail || "Token expired";
      await saveDB(db);
      return NextResponse.json({ error: err.detail || "Failed to fetch mentions", connected: true }, { status: 400 });
    }

    const mentionsData = await mentionsRes.json();
    const tweets: any[] = mentionsData.data || [];
    const userMap: Record<string, any> = {};
    for (const u of (mentionsData.includes?.users || [])) {
      userMap[u.id] = u;
    }

    const existingIds = new Set((db.socialComments || []).filter(c => c.platform === "twitter").map(c => c.id));
    const newComments: SocialComment[] = [];

    for (const tweet of tweets) {
      if (existingIds.has(tweet.id)) continue;
      const author = userMap[tweet.author_id];
      newComments.push({
        id: tweet.id,
        platform: "twitter",
        accountId: acct.id,
        author: author?.name || "Unknown",
        authorId: tweet.author_id,
        authorAvatar: author?.profile_image_url,
        text: tweet.text,
        postId: tweet.conversation_id,
        postTitle: "X Mention",
        postUrl: `https://twitter.com/i/web/status/${tweet.id}`,
        publishedAt: tweet.created_at,
        status: "pending",
      });
    }

    if (newComments.length > 0) {
      if (!db.socialComments) db.socialComments = [];
      db.socialComments.push(...newComments);
      const accIdx = db.socialAccounts!.findIndex(a => a.platform === "twitter");
      if (accIdx >= 0) {
        db.socialAccounts![accIdx].lastSyncAt = new Date().toISOString();
        db.socialAccounts![accIdx].error = undefined;
      }
      await saveDB(db);
    }

    const twitterComments = db.socialComments?.filter(c => c.platform === "twitter") || [];
    return NextResponse.json({ connected: true, account: acct.username, newCount: newComments.length, comments: twitterComments });

  } catch (err) {
    console.error("[Twitter API]", err);
    return NextResponse.json({ error: "Failed to fetch X mentions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tweetId, replyText, socialCommentId } = await req.json();
    if (!tweetId || !replyText) {
      return NextResponse.json({ error: "tweetId and replyText required" }, { status: 400 });
    }

    const db = await getDB();
    const result = await getAccountInfo(db);
    if (!result) return NextResponse.json({ error: "X not connected" }, { status: 404 });

    const { token } = result;

    // Post reply tweet
    const tweetRes = await fetch(`${TWITTER_API}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: replyText,
        reply: { in_reply_to_tweet_id: tweetId },
      }),
    });

    if (!tweetRes.ok) {
      const err = await tweetRes.json();
      return NextResponse.json({ error: err.detail || "Failed to post reply" }, { status: 400 });
    }

    const tweetData = await tweetRes.json();

    if (socialCommentId && db.socialComments) {
      const idx = db.socialComments.findIndex(c => c.id === socialCommentId);
      if (idx >= 0) {
        db.socialComments[idx].status = "replied";
        db.socialComments[idx].replyText = replyText;
        db.socialComments[idx].repliedAt = new Date().toISOString();
      }
      await saveDB(db);
    }

    return NextResponse.json({ success: true, tweetId: tweetData.data?.id });
  } catch (err) {
    return NextResponse.json({ error: "Failed to post X reply" }, { status: 500 });
  }
}
