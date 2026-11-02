import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser, hasPermission } from "@/backend/auth";
import { META_AUTH_URL } from "@/channels/instagram/MetaApiClient";

/**
 * GET /api/instagram/auth
 * Generates OAuth v2 URL with CSRF state token and sets secure cookie
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    // Allow if session exists with ADMIN role, or fallback to dev session
    if (session && !hasPermission(session.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admin access required to connect Instagram" }, { status: 403 });
    }

    const appId = process.env.INSTAGRAM_CLIENT_ID || process.env.META_APP_ID;
    if (!appId) {
      return NextResponse.json(
        {
          error: "INSTAGRAM_CLIENT_ID / META_APP_ID is not configured in server environment.",
          status: "NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const stateToken = crypto.randomBytes(24).toString("hex");
    const redirectUri = `${req.nextUrl.origin}/api/instagram/auth/callback`;
    const scopes = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_messages",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
    ].join(",");

    const authUrl = `${META_AUTH_URL}?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${stateToken}&scope=${encodeURIComponent(scopes)}&response_type=code`;

    const response = NextResponse.json({
      success: true,
      authUrl,
      stateToken,
    });

    response.cookies.set("meta_oauth_state", stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to initiate Meta OAuth" },
      { status: 500 }
    );
  }
}
