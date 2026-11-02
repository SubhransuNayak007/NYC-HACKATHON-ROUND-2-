import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId, hasPermission } from "@/backend/auth";
import { getDB, saveDB, decryptToken, InstagramPost } from "@/database/db";
import { MetaApiClient } from "@/channels/instagram/MetaApiClient";

const metaClient = new MetaApiClient();

/**
 * POST /api/instagram/publish
 * Executes real-time publishing to Instagram via Meta Graph API v19.0+
 * Only marks post as PUBLISHED upon official provider Media ID confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "MEMBER")) {
      return NextResponse.json({ error: "Forbidden: Member access required to publish posts" }, { status: 403 });
    }

    const body = await req.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    const post = (db.instagramPosts || []).find((p) => p.id === postId && p.tenantId === tenantId);
    if (!post) {
      return NextResponse.json({ error: "Post not found or access denied" }, { status: 404 });
    }

    const connection = (db.instagramConnections || []).find((c) => c.tenantId === tenantId && (c.status === "READY" || c.status === "CONNECTED"));
    const account = (db.instagramAccounts || []).find((a) => a.tenantId === tenantId && a.status === "ACTIVE");

    const encRef = connection?.encryptedAccessToken || connection?.encryptedCredentialRef;
    if (!connection || !encRef || !account) {
      return NextResponse.json(
        { error: "No active Instagram connection found. Please connect your account first." },
        { status: 400 }
      );
    }

    const rawToken = decryptToken(encRef);
    const igUserId = account.providerAccountId || account.id;

    if (!rawToken || !igUserId) {
      return NextResponse.json(
        { error: "Invalid Instagram token or account ID. Please reconnect your account." },
        { status: 400 }
      );
    }

    // Step 1: Create Container
    post.status = "PUBLISHING";
    await saveDB(db, session.email);

    const containerRes = await metaClient.createMediaContainer(rawToken, igUserId, {
      mediaType: post.type,
      imageUrl: post.mediaUrl,
      videoUrl: post.type === "REELS" || post.type === "VIDEO" ? post.mediaUrl : undefined,
      caption: post.caption,
    });

    if (!containerRes.success || !containerRes.containerId) {
      post.status = "FAILED";
      post.lastError = {
        code: containerRes.error?.type || "CONTAINER_ERROR",
        message: containerRes.error?.userFacingExplanation || "Container initialization failed.",
        timestamp: new Date().toISOString(),
      };
      await saveDB(db, session.email);
      return NextResponse.json(
        { error: post.lastError.message, details: containerRes.error },
        { status: 502 }
      );
    }

    const containerId = containerRes.containerId;
    post.containerId = containerId;

    // Step 2: Publish Container
    const publishRes = await metaClient.publishMediaContainer(rawToken, igUserId, containerId);

    if (!publishRes.success || !publishRes.mediaId) {
      post.status = "FAILED";
      post.lastError = {
        code: publishRes.error?.type || "PUBLISH_ERROR",
        message: publishRes.error?.userFacingExplanation || "Failed to publish container to Instagram.",
        timestamp: new Date().toISOString(),
      };
      await saveDB(db, session.email);
      return NextResponse.json(
        { error: post.lastError.message, details: publishRes.error },
        { status: 502 }
      );
    }

    // Step 3: Mark as PUBLISHED upon confirmed Provider Media ID
    post.status = "PUBLISHED";
    post.providerMediaId = publishRes.mediaId;
    post.publishedAt = new Date().toISOString();
    post.permalink = `https://www.instagram.com/p/${publishRes.mediaId}/`;
    post.updatedAt = new Date().toISOString();

    await saveDB(db, session.email);

    return NextResponse.json({
      success: true,
      mediaId: publishRes.mediaId,
      permalink: post.permalink,
      post,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish execution error" },
      { status: 500 }
    );
  }
}
