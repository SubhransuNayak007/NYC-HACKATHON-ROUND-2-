/**
 * ============================================================================
 *  QuickReply — LinkedIn Platform Overview & Connection Management API
 *  src/app/api/linkedin/route.ts
 *
 *  GET  - Fetch active connection, organizations, capabilities & summary stats
 *  DELETE - Disconnect LinkedIn account, wipe credentials, and cancel jobs
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";
import { requireTenantAccess } from "@/backend/auth/guard";
import { LinkedInCapabilityService } from "@/channels/linkedin/LinkedInCapabilityService";

export async function GET(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "VIEWER");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const db = await getDB(session.email);

  // Clean any legacy mock seed records if present
  if (db.linkedinPosts && db.linkedinPosts.some((p: any) => p.id?.startsWith("li_post_1") || p.id?.startsWith("li_post_2"))) {
    db.linkedinPosts = db.linkedinPosts.filter((p: any) => !p.id?.startsWith("li_post_1") && !p.id?.startsWith("li_post_2"));
    db.linkedinSocialActions = (db.linkedinSocialActions || []).filter((a: any) => !a.id?.startsWith("li_act_1") && !a.id?.startsWith("li_act_2"));
    await saveDB(db, session.email);
  }

  const connection = (db.linkedinConnections || []).find((c) => c.status === "CONNECTED") || null;
  const organizations = (db.linkedinOrganizations || []).filter((o) => o.status === "ACTIVE");
  const posts = db.linkedinPosts || [];
  const comments = db.linkedinSocialActions || [];

  // Derive dynamic capability manifest
  const capabilityManifest = LinkedInCapabilityService.evaluate(connection, organizations);

  // Compute real dashboard overview metrics
  const publishedPosts = posts.filter((p) => p.status === "PUBLISHED");
  const scheduledPosts = posts.filter((p) => p.status === "SCHEDULED" || p.status === "QUEUED");
  const pendingReview = posts.filter((p) => p.status === "APPROVAL_PENDING");

  const totalImpressions = publishedPosts.reduce((sum, p) => sum + (p.impressions || 0), 0);
  const totalReactions = publishedPosts.reduce((sum, p) => sum + (p.reactions || p.likes || 0), 0);
  const totalComments = publishedPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
  const totalShares = publishedPosts.reduce((sum, p) => sum + (p.shares || 0), 0);

  const totalEngagements = totalReactions + totalComments + totalShares;
  const engagementRate = totalImpressions > 0 ? ((totalEngagements / totalImpressions) * 100).toFixed(1) : "0.0";

  return NextResponse.json({
    success: true,
    connection: connection
      ? {
          id: connection.id,
          status: connection.status,
          memberId: connection.memberId,
          memberUrn: connection.memberUrn,
          memberName: connection.memberName,
          memberEmail: connection.memberEmail,
          memberAvatarUrl: connection.memberAvatarUrl,
          organizationIds: connection.organizationIds,
          authorizedScopes: connection.authorizedScopes,
          tokenExpiresAt: connection.tokenExpiresAt,
          apiVersion: connection.apiVersion,
          createdAt: connection.createdAt,
        }
      : null,
    organizations: organizations.map((o) => ({
      id: o.id,
      organizationId: o.organizationId,
      organizationUrn: o.organizationUrn,
      name: o.name,
      vanityName: o.vanityName,
      logoUrl: o.logoUrl,
      role: o.role,
      followerCount: o.followerCount,
      status: o.status,
    })),
    capabilities: capabilityManifest,
    metrics: {
      totalPosts: posts.length,
      publishedCount: publishedPosts.length,
      scheduledCount: scheduledPosts.length,
      pendingReviewCount: pendingReview.length,
      totalImpressions,
      totalReactions,
      totalComments,
      totalShares,
      engagementRate: `${engagementRate}%`,
    },
    recentPosts: posts.slice(-5).reverse(),
    recentComments: comments.slice(-5).reverse(),
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "ADMIN");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const db = await getDB(session.email);
  const body = await req.json().catch(() => ({}));

  if (body.isSandbox || body.action === "CONNECT_SANDBOX") {
    const sandboxConn = {
      id: "li_conn_sandbox",
      tenantId: session.email,
      status: "CONNECTED",
      memberId: "SANDBOX_MEMBER_99",
      memberUrn: "urn:li:person:SANDBOX_MEMBER_99",
      memberName: session.name || "Subhransu Nayak",
      memberEmail: session.email,
      memberAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      organizationIds: ["urn:li:organization:1008219"],
      authorizedScopes: [
        "openid",
        "profile",
        "email",
        "w_member_social",
        "r_organization_social",
        "w_organization_social",
        "rw_organization_admin",
      ],
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      apiVersion: "202401",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sandboxOrg = {
      id: "li_org_sandbox",
      organizationId: "1008219",
      organizationUrn: "urn:li:organization:1008219",
      name: "QuickReply AI Official",
      vanityName: "quickreply-ai",
      logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      role: "ADMINISTRATOR",
      followerCount: 24500,
      status: "ACTIVE",
    };

    db.linkedinConnections = [sandboxConn as any];
    db.linkedinOrganizations = [sandboxOrg as any];

    // Seed realistic demo posts if empty
    if (!db.linkedinPosts || db.linkedinPosts.length === 0) {
      db.linkedinPosts = [
        {
          id: "li_post_1",
          authorUrn: "urn:li:person:SANDBOX_MEMBER_99",
          authorName: session.name || "Subhransu Nayak",
          content: "🚀 We just launched autonomous LinkedIn multi-channel routing in QuickReply! AI now categorizes B2B inquiries in <0.3s.",
          visibility: "PUBLIC",
          status: "PUBLISHED",
          reactions: 142,
          comments: 29,
          impressions: 4820,
          publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "li_post_2",
          authorUrn: "urn:li:organization:1008219",
          authorName: "QuickReply AI Official",
          content: "💡 5 Architecture lessons from scaling LLM RAG pipelines to 10M events/day. Thread below ⬇️",
          visibility: "PUBLIC",
          status: "SCHEDULED",
          scheduledAt: new Date(Date.now() + 3600000 * 4).toISOString(),
          reactions: 0,
          comments: 0,
          impressions: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ] as any;
    }

    // Seed realistic social inbox comments if empty
    if (!db.linkedinSocialActions || db.linkedinSocialActions.length === 0) {
      db.linkedinSocialActions = [
        {
          id: "li_act_1",
          postUrn: "urn:li:share:7198210381920",
          actorUrn: "urn:li:person:DEV_ALEX",
          actorName: "Alex Mercer (VP Engineering)",
          actionType: "COMMENT",
          content: "How does the Restli 2.0 quality gate prevent AI hallucinations in community replies?",
          createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        },
        {
          id: "li_act_2",
          postUrn: "urn:li:share:7198210381920",
          actorUrn: "urn:li:person:DEV_SARAH",
          actorName: "Sarah Jenkins (Growth Lead)",
          actionType: "COMMENT",
          content: "Can we connect company page multi-admin workflows with individual approval gates?",
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
      ] as any;
    }

    await saveDB(db, session.email);

    return NextResponse.json({
      success: true,
      message: "LinkedIn Sandbox Environment Activated",
    });
  }

  return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "ADMIN");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const { session } = authResult;
  const db = await getDB(session.email);

  if (db.linkedinConnections) {
    for (const conn of db.linkedinConnections) {
      conn.status = "DISCONNECTED";
      conn.accessTokenEncrypted = undefined;
      conn.refreshTokenEncrypted = undefined;
      conn.updatedAt = new Date().toISOString();
    }
  }

  if (db.linkedinOrganizations) {
    for (const org of db.linkedinOrganizations) {
      org.status = "REVOKED";
    }
  }

  // Cancel any scheduled posts that haven't published yet
  if (db.linkedinPosts) {
    for (const p of db.linkedinPosts) {
      if (p.status === "SCHEDULED" || p.status === "QUEUED") {
        p.status = "DRAFT";
        p.updatedAt = new Date().toISOString();
      }
    }
  }

  await saveDB(db, session.email);

  return NextResponse.json({
    success: true,
    message: "LinkedIn account disconnected and credentials securely wiped.",
  });
}
