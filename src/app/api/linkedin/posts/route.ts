/**
 * ============================================================================
 *  QuickReply — LinkedIn Posts & Scheduling API Route
 *  src/app/api/linkedin/posts/route.ts
 *
 *  GET  - List posts (drafts, scheduled, published) with tenant isolation
 *  POST - Create post, draft, or schedule with idempotency key & Quality Gate
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireTenantAccess } from "@/backend/auth/guard";
import { getDB, saveDB, getCanonicalTenantId, type LinkedInPost } from "@/database/db";
import { LinkedInContentEngine } from "@/channels/linkedin/LinkedInContentEngine";

export async function GET(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "VIEWER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const db = await getDB(session.email);
  const tenantId = getCanonicalTenantId(session.email);
  const { searchParams } = req.nextUrl;

  const statusFilter = searchParams.get("status");
  const orgFilter = searchParams.get("organizationId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  if (!db.linkedinPosts || db.linkedinPosts.length === 0) {
    db.linkedinPosts = [
      {
        id: "li_post_1",
        tenantId,
        workspaceId: `ws_${tenantId}`,
        connectionId: "li_conn_primary",
        authorUrn: "urn:li:person:subhransu",
        authorName: "Subhransu Nayak",
        content: "🚀 We automated 12,000+ customer inquiries across LinkedIn, Instagram, and WhatsApp using our multi-channel AI RAG architecture. Here are the 5 architectural lessons we learned while scaling zero-latency reply daemons.",
        visibility: "PUBLIC",
        status: "PUBLISHED",
        likes: 342,
        comments: 68,
        reactions: 412,
        shares: 29,
        impressions: 14200,
        isAutomationActive: true,
        assignedRuleId: "lr_1",
        assignedRuleName: "🧠 Thought Leadership B2B Copilot",
        publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date().toISOString(),
      } as any,
      {
        id: "li_post_2",
        tenantId,
        workspaceId: `ws_${tenantId}`,
        connectionId: "li_conn_primary",
        organizationId: "98765432",
        authorUrn: "urn:li:organization:98765432",
        authorName: "QuickReply AI Official",
        content: "📢 Exciting news: QuickReply Enterprise is officially launching 1-click sandbox integrations! Comment 'DEMO' or connect with our founders to get private alpha access.",
        visibility: "PUBLIC",
        status: "PUBLISHED",
        likes: 580,
        comments: 114,
        reactions: 720,
        shares: 54,
        impressions: 28400,
        isAutomationActive: true,
        assignedRuleId: "lr_2",
        assignedRuleName: "💼 Inbound Lead Magnet & Demo Dispatch",
        publishedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        updatedAt: new Date().toISOString(),
      } as any,
      {
        id: "li_post_3",
        tenantId,
        workspaceId: `ws_${tenantId}`,
        connectionId: "li_conn_primary",
        authorUrn: "urn:li:person:subhransu",
        authorName: "Subhransu Nayak",
        content: "What's the #1 bottleneck holding your team back from deploying customer-facing AI agents this year? Let's discuss in the comments.",
        visibility: "PUBLIC",
        status: "PUBLISHED",
        likes: 195,
        comments: 42,
        reactions: 230,
        shares: 11,
        impressions: 6800,
        isAutomationActive: false,
        assignedRuleId: "lr_default",
        assignedRuleName: "⚡ Standard Professional Auto-Reply",
        publishedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        updatedAt: new Date().toISOString(),
      } as any,
    ];
    await saveDB(db, session.email);
  }

  let posts = db.linkedinPosts || [];

  if (statusFilter) {
    posts = posts.filter((p) => p.status === statusFilter);
  }
  if (orgFilter) {
    posts = posts.filter((p) => p.organizationId === orgFilter);
  }

  posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    success: true,
    total: posts.length,
    posts: posts.slice(0, limit),
  });
}

/**
 * PATCH /api/linkedin/posts
 * Updates automation state and assigned rules for a specific LinkedIn post
 */
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireTenantAccess(req, undefined, "MEMBER");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }

    const { session } = authResult;
    const body = await req.json();
    const { postId, isAutomationActive, assignedRuleId, assignedRuleName } = body;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const db = await getDB(session.email);
    const post = (db.linkedinPosts || []).find((p) => p.id === postId);

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
      message: `Automation ${post.isAutomationActive ? "activated" : "paused"} for LinkedIn post`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "MEMBER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const body = await req.json().catch(() => ({}));

  const {
    content,
    authorUrn,
    authorName,
    organizationId,
    visibility = "PUBLIC",
    status = "DRAFT",
    scheduledAt,
    media,
    article,
    idempotencyKey: providedKey,
  } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_BODY", message: "Post content is required." } },
      { status: 400 }
    );
  }

  const db = await getDB(session.email);
  const tenantId = getCanonicalTenantId(session.email);
  const workspaceId = (db.workspace as any)?.id || db.workspace?.name || `ws_${tenantId}`;

  // Find active connection
  const conn = (db.linkedinConnections || []).find((c) => c.status === "CONNECTED");
  if (!conn) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_CONNECTED",
          message: "No active LinkedIn connection found for this workspace. Please connect LinkedIn first.",
        },
      },
      { status: 400 }
    );
  }

  // Quality Gate Evaluation
  const existingTexts = (db.linkedinPosts || []).map((p) => p.content);
  const qualityGate = LinkedInContentEngine.evaluateQualityGate(content, existingTexts);

  // Idempotency check
  const idempotencyKey =
    providedKey ||
    `idem_${crypto.createHash("sha256").update(`${tenantId}:${content.trim()}:${scheduledAt || ""}`).digest("hex").slice(0, 16)}`;

  const duplicate = (db.linkedinPosts || []).find((p) => p.idempotencyKey === idempotencyKey);
  if (duplicate) {
    return NextResponse.json({
      success: true,
      post: duplicate,
      idempotentReplay: true,
      message: "Post already registered with this idempotency key.",
    });
  }

  const postId = `li_post_${crypto.randomBytes(8).toString("hex")}`;
  const targetAuthorUrn = authorUrn || (organizationId ? `urn:li:organization:${organizationId}` : conn.memberUrn);

  const newPost: LinkedInPost = {
    id: postId,
    tenantId,
    workspaceId,
    connectionId: conn.id,
    organizationId,
    authorUrn: targetAuthorUrn,
    authorName: authorName || (organizationId ? "Company Page" : conn.memberName || "LinkedIn Profile"),
    content: content.trim(),
    visibility,
    status: scheduledAt ? "SCHEDULED" : (status as any),
    idempotencyKey,
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    media,
    article,
    likes: 0,
    comments: 0,
    reactions: 0,
    shares: 0,
    impressions: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.linkedinPosts) db.linkedinPosts = [];
  db.linkedinPosts.push(newPost);
  await saveDB(db, session.email);

  return NextResponse.json({
    success: true,
    post: newPost,
    qualityGate,
  });
}
