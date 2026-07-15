import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, decryptToken, SocialComment } from "@/database/db";

/**
 * LinkedIn Comments API
 * GET /api/social/linkedin - Fetch recent post comments from LinkedIn
 * POST /api/social/linkedin - Reply to a LinkedIn comment
 */

const LI_API = "https://api.linkedin.com/v2";

async function getAccountInfo(db: Awaited<ReturnType<typeof getDB>>) {
  const acct = db.socialAccounts?.find(a => a.platform === "linkedin" && a.isActive);
  if (!acct?.accessToken) return null;
  return { acct, token: decryptToken(acct.accessToken) };
}

export async function GET() {
  const db = await getDB();
  const result = await getAccountInfo(db);

  if (!result) {
    return NextResponse.json({ error: "LinkedIn not connected", connected: false }, { status: 404 });
  }

  const { acct, token } = result;
  const personUrn = encodeURIComponent(`urn:li:person:${acct.id}`);

  try {
    // Fetch recent UGC Posts authored by this member
    const postsRes = await fetch(
      `${LI_API}/ugcPosts?q=authors&authors=List(${personUrn})&count=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    if (!postsRes.ok) {
      const errText = await postsRes.text();
      return NextResponse.json({ error: "Failed to fetch LinkedIn posts: " + errText, connected: true }, { status: 400 });
    }

    const postsData = await postsRes.json();
    const posts: any[] = postsData.elements || [];

    const existingIds = new Set((db.socialComments || []).filter(c => c.platform === "linkedin").map(c => c.id));
    const newComments: SocialComment[] = [];

    for (const post of posts.slice(0, 3)) {
      const postUrn = post.id; // e.g. "urn:li:ugcPost:123"
      const encodedPostUrn = encodeURIComponent(postUrn);

      // Fetch comments for this post
      const commRes = await fetch(
        `${LI_API}/socialActions/${encodedPostUrn}/comments?count=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );
      if (!commRes.ok) continue;

      const commData = await commRes.json();
      const caption = post.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "LinkedIn Post";

      for (const c of (commData.elements || [])) {
        const commentId = c.id;
        if (existingIds.has(commentId)) continue;

        newComments.push({
          id: commentId,
          platform: "linkedin",
          accountId: acct.id,
          author: c.commenter?.replace("urn:li:person:", "LI User ") || "LinkedIn User",
          authorId: c.commenter,
          text: c.message?.text || "",
          postId: postUrn,
          postTitle: caption.slice(0, 80),
          postUrl: `https://www.linkedin.com/feed/update/${postUrn}`,
          publishedAt: new Date(c.created?.time || Date.now()).toISOString(),
          status: "pending",
        });
      }
    }

    if (newComments.length > 0) {
      if (!db.socialComments) db.socialComments = [];
      db.socialComments.push(...newComments);
      const accIdx = db.socialAccounts!.findIndex(a => a.platform === "linkedin");
      if (accIdx >= 0) db.socialAccounts![accIdx].lastSyncAt = new Date().toISOString();
      await saveDB(db);
    }

    const liComments = db.socialComments?.filter(c => c.platform === "linkedin") || [];
    return NextResponse.json({ connected: true, account: acct.name, newCount: newComments.length, comments: liComments });

  } catch (err) {
    console.error("[LinkedIn API]", err);
    return NextResponse.json({ error: "Failed to fetch LinkedIn comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { postUrn, replyText, socialCommentId, parentCommentUrn } = await req.json();
    if (!postUrn || !replyText) {
      return NextResponse.json({ error: "postUrn and replyText required" }, { status: 400 });
    }

    const db = await getDB();
    const result = await getAccountInfo(db);
    if (!result) return NextResponse.json({ error: "LinkedIn not connected" }, { status: 404 });

    const { acct, token } = result;
    const encodedPostUrn = encodeURIComponent(postUrn);

    // Post comment/reply on LinkedIn post
    const body: any = {
      actor: `urn:li:person:${acct.id}`,
      message: { text: replyText },
    };
    if (parentCommentUrn) {
      body.parentComment = parentCommentUrn;
    }

    const replyRes = await fetch(`${LI_API}/socialActions/${encodedPostUrn}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!replyRes.ok) {
      const errText = await replyRes.text();
      return NextResponse.json({ error: "Failed to post comment: " + errText }, { status: 400 });
    }

    const replyData = await replyRes.json();

    if (socialCommentId && db.socialComments) {
      const idx = db.socialComments.findIndex(c => c.id === socialCommentId);
      if (idx >= 0) {
        db.socialComments[idx].status = "replied";
        db.socialComments[idx].replyText = replyText;
        db.socialComments[idx].repliedAt = new Date().toISOString();
      }
      await saveDB(db);
    }

    return NextResponse.json({ success: true, commentUrn: replyData.id });
  } catch (err) {
    return NextResponse.json({ error: "Failed to post LinkedIn reply" }, { status: 500 });
  }
}
