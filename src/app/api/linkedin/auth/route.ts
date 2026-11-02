/**
 * ============================================================================
 *  QuickReply — LinkedIn OAuth v2 Initiation Route
 *  src/app/api/linkedin/auth/route.ts
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireTenantAccess } from "@/backend/auth/guard";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";

export async function GET(req: NextRequest) {
  const authResult = await requireTenantAccess(req, undefined, "ADMIN");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CONFIG_MISSING",
          message: "LINKEDIN_CLIENT_ID environment variable is not configured.",
        },
      },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${origin}/api/linkedin/auth/callback`;

  // Standard Community Management & Social Scopes
  const scopes = [
    "openid",
    "profile",
    "email",
    "w_member_social",
    "r_organization_social",
    "w_organization_social",
    "rw_organization_admin",
  ].join(" ");

  const authUrl = new URL(LINKEDIN_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scopes);

  const res = NextResponse.json({
    success: true,
    authUrl: authUrl.toString(),
  });

  // Set secure CSRF state cookie (HttpOnly, SameSite)
  res.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return res;
}
