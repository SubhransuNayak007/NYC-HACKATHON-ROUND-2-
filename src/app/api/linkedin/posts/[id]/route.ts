/**
 * ============================================================================
 *  QuickReply — LinkedIn Post Detail, Mutation & Deletion API
 *  src/app/api/linkedin/posts/[id]/route.ts
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenantAccess } from "@/backend/auth/guard";
import { getDB, saveDB, decryptToken } from "@/database/db";
import { LinkedInApiClient } from "@/channels/linkedin/LinkedInApiClient";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTenantAccess(req, undefined, "VIEWER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { id } = await context.params;
  const { session } = authResult;
  const db = await getDB(session.email);

  const post = (db.linkedinPosts || []).find((p) => p.id === id);
  if (!post) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "LinkedIn post not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, post });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTenantAccess(req, undefined, "MEMBER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { id } = await context.params;
  const { session } = authResult;
  const db = await getDB(session.email);
  const body = await req.json().catch(() => ({}));

  const postIndex = (db.linkedinPosts || []).findIndex((p) => p.id === id);
  if (postIndex === -1) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "LinkedIn post not found." } },
      { status: 404 }
    );
  }

  const post = db.linkedinPosts![postIndex];

  // Update allowed fields
  if (body.content !== undefined) post.content = String(body.content).trim();
  if (body.scheduledAt !== undefined) post.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt).toISOString() : undefined;
  if (body.visibility !== undefined) post.visibility = body.visibility;
  if (body.media !== undefined) post.media = body.media;
  if (body.article !== undefined) post.article = body.article;

  // Approval workflow transitions
  if (body.action === "APPROVE") {
    post.status = post.scheduledAt ? "SCHEDULED" : "APPROVED";
    post.approvedBy = session.email;
    post.approvedAt = new Date().toISOString();
  } else if (body.action === "REJECT") {
    post.status = "DRAFT";
    post.rejectedReason = body.reason || "Changes requested by reviewer";
  } else if (body.status !== undefined) {
    post.status = body.status;
  }

  post.updatedAt = new Date().toISOString();
  db.linkedinPosts![postIndex] = post;

  await saveDB(db, session.email);

  return NextResponse.json({ success: true, post });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTenantAccess(req, undefined, "MEMBER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { id } = await context.params;
  const { session } = authResult;
  const db = await getDB(session.email);

  const postIndex = (db.linkedinPosts || []).findIndex((p) => p.id === id);
  if (postIndex === -1) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "LinkedIn post not found." } },
      { status: 404 }
    );
  }

  const post = db.linkedinPosts![postIndex];

  // If post was already published to LinkedIn and has a provider URN, delete it from LinkedIn via API
  if (post.status === "PUBLISHED" && post.providerPostUrn) {
    const conn = (db.linkedinConnections || []).find((c) => c.status === "CONNECTED");
    if (conn?.accessTokenEncrypted) {
      const token = decryptToken(conn.accessTokenEncrypted);
      const apiClient = new LinkedInApiClient();
      await apiClient.deletePost(token, post.providerPostUrn);
    }
  }

  // Remove from database
  db.linkedinPosts!.splice(postIndex, 1);
  await saveDB(db, session.email);

  return NextResponse.json({
    success: true,
    message: "LinkedIn post removed successfully.",
  });
}
