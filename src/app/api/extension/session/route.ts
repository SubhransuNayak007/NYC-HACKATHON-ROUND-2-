import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";
import { generateHMACToken } from "@/backend/auth";

/**
 * POST /api/extension/session
 *
 * Actions:
 *   { action: "status" }          — Returns the current session info (email, tier, replies today).
 *   { action: "token" }           — Returns the session email + HMAC token for header-based auth.
 *   { action: "validate", email, token } — Validates a stored extension session token.
 *
 * The extension popup calls this on load to check if the user is authenticated.
 * It relies on the session_email cookie set by the OAuth flow.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "status") {
      const db = await getDB();
      const session = db.userSession;

      if (!session?.email) {
        return NextResponse.json(
          { error: "No active session" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        email: session.email,
        name: session.name,
        tier: session.tier,
        repliesToday: session.repliesToday,
        lastResetDate: session.lastResetDate,
      });
    }

    if (action === "token") {
      const db = await getDB();
      const session = db.userSession;

      if (!session?.email) {
        return NextResponse.json(
          { error: "No active session" },
          { status: 401 }
        );
      }

      // Return the HMAC session token so the extension can authenticate
      // header-based API calls (content scripts / background worker).
      return NextResponse.json({
        email: session.email,
        name: session.name,
        token: generateHMACToken(session.email),
      });
    }

    if (action === "validate") {
      const { email, token } = body;

      if (!email || !token) {
        return NextResponse.json(
          { error: "Missing email or token" },
          { status: 400 }
        );
      }

      const secret =
        process.env.SESSION_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET ||
        "session-fallback-secret";

      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(email.toLowerCase().trim())
      );
      const expected = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (expected !== token) {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 401 }
        );
      }

      const db = await getDB();
      const session = db.userSession;

      if (!session?.email || session.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        email: session.email,
        name: session.name,
        tier: session.tier,
        repliesToday: session.repliesToday,
        lastResetDate: session.lastResetDate,
      });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Extension session API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
