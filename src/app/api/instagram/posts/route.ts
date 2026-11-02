import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getSessionUser, getCanonicalTenantId, hasPermission } from "@/backend/auth";
import { getDB, saveDB, InstagramPost } from "@/database/db";

/**
 * GET /api/instagram/posts
 * Lists posts, drafts, published reels, and scheduled media for the tenant
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);
    
    // Clean any legacy mock seed posts if present
    if (db.instagramPosts && db.instagramPosts.some((p: any) => p.id?.startsWith("ig_post_reel") || p.id?.startsWith("ig_post_img"))) {
      db.instagramPosts = db.instagramPosts.filter((p: any) => !p.id?.startsWith("ig_post_reel") && !p.id?.startsWith("ig_post_img"));
      await saveDB(db, session.email);
    }

    const posts = (db.instagramPosts || []).filter((p) => p.tenantId === tenantId);

    return NextResponse.json({
      success: true,
      posts: posts.reverse(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load posts" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/instagram/posts
 * Updates automation state and assigned rules for a specific Reel or Post
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { postId, isAutomationActive, assignedRuleId, assignedRuleName } = body;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);
    const post = (db.instagramPosts || []).find((p) => p.id === postId && p.tenantId === tenantId);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (typeof isAutomationActive === "boolean") {
      (post as any).isAutomationActive = isAutomationActive;
    }
    if (assignedRuleId !== undefined) {
      (post as any).assignedRuleId = assignedRuleId;
    }
    if (assignedRuleName !== undefined) {
      (post as any).assignedRuleName = assignedRuleName;
    }
    post.updatedAt = new Date().toISOString();

    await saveDB(db, session.email);

    return NextResponse.json({
      success: true,
      post,
      message: `Automation ${post.isAutomationActive ? "activated" : "paused"} for post`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update post" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/instagram/posts
 * Creates a post draft or scheduled post with idempotency key
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "MEMBER")) {
      return NextResponse.json({ error: "Forbidden: Member access required to create posts" }, { status: 403 });
    }

    const body = await req.json();
    const { type, caption, mediaUrl, scheduledAt } = body;

    if (!type || !caption) {
      return NextResponse.json({ error: "Missing type or caption" }, { status: 400 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);
    const workspaceId = (db.workspace as any)?.id || db.workspace?.name || `ws_${tenantId}`;
    const account = (db.instagramAccounts || []).find((a) => a.tenantId === tenantId && a.status === "ACTIVE");

    if (!account) {
      return NextResponse.json({ error: "No active Instagram account connected" }, { status: 400 });
    }

    // Compute idempotency key
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${tenantId}:${caption}:${scheduledAt || "now"}`)
      .digest("hex");

    if (!db.instagramPosts) db.instagramPosts = [];
    const existing = db.instagramPosts.find(
      (p) => p.tenantId === tenantId && p.idempotencyKey === idempotencyKey
    );
    if (existing) {
      return NextResponse.json({ success: true, post: existing, idempotentDuplicate: true });
    }

    const post: InstagramPost = {
      id: `ig_post_${uuidv4().substring(0, 8)}`,
      tenantId,
      workspaceId,
      accountId: account.id,
      type: type || "IMAGE",
      caption,
      mediaUrl,
      status: scheduledAt ? "SCHEDULED" : "DRAFT",
      scheduledAt,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      saveCount: 0,
      reach: 0,
      impressions: 0,
      idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.instagramPosts.push(post);
    await saveDB(db, session.email);

    return NextResponse.json({ success: true, post });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create post" },
      { status: 500 }
    );
  }
}
