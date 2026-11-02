/**
 * ============================================================================
 *  QuickReply — LinkedIn Real-Time Publish Executor API
 *  src/app/api/linkedin/publish/route.ts
 *
 *  HARD RULE: NEVER claims success until official LinkedIn API returns post URN.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenantAccess } from "@/backend/auth/guard";
import { getDB, saveDB, decryptToken, type LinkedInPost } from "@/database/db";
import { LinkedInApiClient } from "@/channels/linkedin/LinkedInApiClient";
import { LinkedInCapabilityService } from "@/channels/linkedin/LinkedInCapabilityService";

export async function POST(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "MEMBER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const body = await req.json().catch(() => ({}));
  const { postId } = body;

  if (!postId) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PARAM", message: "postId is required." } },
      { status: 400 }
    );
  }

  const db = await getDB(session.email);
  const postIndex = (db.linkedinPosts || []).findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Post not found." } },
      { status: 404 }
    );
  }

  const post = db.linkedinPosts![postIndex];

  // Already published check (Idempotency)
  if (post.status === "PUBLISHED" && post.providerPostUrn) {
    return NextResponse.json({
      success: true,
      post,
      message: "Post is already published to LinkedIn.",
    });
  }

  // Active Connection Verification
  const conn = (db.linkedinConnections || []).find((c) => c.status === "CONNECTED");
  if (!conn || !conn.accessTokenEncrypted) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_CONNECTED",
          message: "No active LinkedIn connection found. Please authenticate with LinkedIn first.",
        },
      },
      { status: 400 }
    );
  }

  // Capability Verification
  const orgs = (db.linkedinOrganizations || []).filter((o) => o.status === "ACTIVE");
  const manifest = LinkedInCapabilityService.evaluate(conn, orgs);

  const isOrgPost = post.authorUrn.includes(":organization:");
  if (isOrgPost && !manifest.canPublishOrg) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CAPABILITY_UNAVAILABLE",
          message: "Company Page publishing requires LinkedIn Administrator access and 'w_organization_social' scope.",
        },
      },
      { status: 403 }
    );
  }

  if (!isOrgPost && !manifest.canPublishMember) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CAPABILITY_UNAVAILABLE",
          message: "Member Profile publishing requires 'w_member_social' OAuth scope.",
        },
      },
      { status: 403 }
    );
  }

  // Mark as PUBLISHING
  post.status = "PUBLISHING";
  post.updatedAt = new Date().toISOString();
  db.linkedinPosts![postIndex] = post;
  await saveDB(db, session.email);

  const token = decryptToken(conn.accessTokenEncrypted);
  const apiClient = new LinkedInApiClient();

  try {
    const publishResult = await apiClient.createPost(token, {
      authorUrn: post.authorUrn,
      commentary: post.content,
      visibility: post.visibility,
      mediaAssetUrn: post.media?.assetUrn,
      mediaType: post.media?.type === "video" ? "video" : "image",
      mediaTitle: post.media?.title,
      articleUrl: post.article?.sourceUrl,
      articleTitle: post.article?.title,
      articleDescription: post.article?.description,
      articleThumbnailUrl: post.article?.thumbnailUrl,
    });

    if (!publishResult.success || !publishResult.postUrn) {
      post.status = "FAILED";
      post.lastError = {
        code: publishResult.error?.type || "PUBLISH_FAILED",
        message: publishResult.error?.message || "Failed to publish post to LinkedIn.",
        timestamp: new Date().toISOString(),
      };
      db.linkedinPosts![postIndex] = post;
      await saveDB(db, session.email);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: publishResult.error?.type || "PUBLISH_FAILED",
            message: publishResult.error?.message || "Failed to publish post to LinkedIn.",
            userFacingGuidance: publishResult.error?.userFacingGuidance || "LinkedIn API returned an error.",
          },
          post,
        },
        { status: publishResult.error?.statusCode || 500 }
      );
    }

    // Official LinkedIn Confirmation Received
    post.status = "PUBLISHED";
    post.providerPostUrn = publishResult.postUrn;
    post.publishedAt = new Date().toISOString();
    post.lastError = undefined;
    post.updatedAt = new Date().toISOString();
    db.linkedinPosts![postIndex] = post;

    await saveDB(db, session.email);

    return NextResponse.json({
      success: true,
      post,
      message: "Post successfully published to LinkedIn.",
    });
  } catch (err: any) {
    post.status = "FAILED";
    post.lastError = {
      code: "RUNTIME_EXCEPTION",
      message: err.message || "Unexpected exception during publication",
      timestamp: new Date().toISOString(),
    };
    db.linkedinPosts![postIndex] = post;
    await saveDB(db, session.email);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RUNTIME_EXCEPTION",
          message: err.message,
        },
      },
      { status: 500 }
    );
  }
}
