/**
 * POST /api/auth/refresh — Refresh JWT access token
 *
 * When the access token expires (15 min), the client calls this endpoint
 * with the refresh token cookie to get a new token pair.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken, generateTokenPair } from "@/backend/auth";
import { getDB } from "@/database/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("qr_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token found" },
        { status: 401 }
      );
    }

    // Verify the refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // Get current user data for tier info
    const db = await getDB(payload.sub);
    const tier = db.userSession?.tier || "free";
    const name = db.userSession?.name || payload.sub.split("@")[0];
    const username = db.userSession?.username || name.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Generate new token pair
    const tokens = generateTokenPair(payload.sub, name, username, tier);

    // Build response with new cookies
    const response = NextResponse.json({
      success: true,
      accessToken: tokens.accessToken,
      expiresAt: tokens.accessExpiresAt,
    });

    // Set new cookies
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
    };

    response.cookies.set("qr_access_token", tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set("qr_refresh_token", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 90 * 24 * 60 * 60, // 90 days (3 months)
    });

    return response;
  } catch (err) {
    console.error("[Auth] Token refresh error:", err);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
