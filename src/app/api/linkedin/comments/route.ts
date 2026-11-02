/**
 * ============================================================================
 *  QuickReply — LinkedIn Social Actions & Comments API
 *  src/app/api/linkedin/comments/route.ts
 *
 *  GET  - Sync/fetch comments for posts
 *  POST - Submit comment reply via official LinkedIn Social Actions API
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireTenantAccess } from "@/backend/auth/guard";
import { getDB, saveDB, decryptToken, type LinkedInSocialAction } from "@/database/db";
import { LinkedInApiClient } from "@/channels/linkedin/LinkedInApiClient";

export async function GET(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "VIEWER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const db = await getDB(session.email);
  const { searchParams } = req.nextUrl;
  const postId = searchParams.get("postId");

  let comments = db.linkedinSocialActions || [];
  if (postId) {
    comments = comments.filter((c) => c.postId === postId);
  }

  comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    success: true,
    total: comments.length,
    comments,
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "MEMBER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const body = await req.json().catch(() => ({}));
  const { postUrn, commentText, actionId } = body;

  if (!postUrn || !commentText) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PARAM", message: "postUrn and commentText are required." } },
      { status: 400 }
    );
  }

  const db = await getDB(session.email);
  const conn = (db.linkedinConnections || []).find((c) => c.status === "CONNECTED");

  if (!conn || !conn.accessTokenEncrypted) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_CONNECTED",
          message: "LinkedIn connection is required to reply to comments.",
        },
      },
      { status: 400 }
    );
  }

  const token = decryptToken(conn.accessTokenEncrypted);
  const apiClient = new LinkedInApiClient();
  const actorUrn = conn.memberUrn;

  const result = await apiClient.replyToComment(token, postUrn, commentText, actorUrn);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: result.error?.type || "COMMENT_FAILED",
          message: result.error?.message || "Failed to post comment reply to LinkedIn.",
          userFacingGuidance: result.error?.userFacingGuidance,
        },
      },
      { status: result.error?.statusCode || 500 }
    );
  }

  // Update existing comment or record new action
  if (!db.linkedinSocialActions) db.linkedinSocialActions = [];
  if (actionId) {
    const actIdx = db.linkedinSocialActions.findIndex((a) => a.id === actionId);
    if (actIdx >= 0) {
      db.linkedinSocialActions[actIdx].replyUrn = result.commentUrn;
      db.linkedinSocialActions[actIdx].replyContent = commentText;
      db.linkedinSocialActions[actIdx].repliedAt = new Date().toISOString();
    }
  } else {
    db.linkedinSocialActions.push({
      id: `li_act_${crypto.randomBytes(6).toString("hex")}`,
      tenantId: conn.tenantId,
      postId: postUrn,
      providerActionUrn: result.commentUrn || `urn:li:comment:${Date.now()}`,
      type: "COMMENT",
      actorUrn,
      actorName: conn.memberName || "LinkedIn Profile",
      content: commentText,
      replyContent: commentText,
      repliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  await saveDB(db, session.email);

  return NextResponse.json({
    success: true,
    commentUrn: result.commentUrn,
    message: "Reply successfully published to LinkedIn.",
  });
}
