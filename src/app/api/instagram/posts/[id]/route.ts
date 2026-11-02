import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId, hasPermission } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";

/**
 * GET /api/instagram/posts/[id]
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    const post = (db.instagramPosts || []).find((p) => p.id === id && p.tenantId === tenantId);
    if (!post) {
      return NextResponse.json({ error: "Post not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load post" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/instagram/posts/[id]
 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "MEMBER")) {
      return NextResponse.json({ error: "Forbidden: Member role required" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    const post = (db.instagramPosts || []).find((p) => p.id === id && p.tenantId === tenantId);
    if (!post) {
      return NextResponse.json({ error: "Post not found or access denied" }, { status: 404 });
    }

    if (body.caption !== undefined) post.caption = body.caption;
    if (body.mediaUrl !== undefined) post.mediaUrl = body.mediaUrl;
    if (body.scheduledAt !== undefined) post.scheduledAt = body.scheduledAt;
    if (body.status !== undefined) post.status = body.status;
    post.updatedAt = new Date().toISOString();

    await saveDB(db, session.email);
    return NextResponse.json({ success: true, post });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update post" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/instagram/posts/[id]
 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "MEMBER")) {
      return NextResponse.json({ error: "Forbidden: Member role required" }, { status: 403 });
    }

    const { id } = await context.params;
    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    const postIndex = (db.instagramPosts || []).findIndex((p) => p.id === id && p.tenantId === tenantId);
    if (postIndex === -1) {
      return NextResponse.json({ error: "Post not found or access denied" }, { status: 404 });
    }

    db.instagramPosts!.splice(postIndex, 1);
    await saveDB(db, session.email);

    return NextResponse.json({ success: true, message: "Post deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete post" },
      { status: 500 }
    );
  }
}
