/**
 * ============================================================
 *  POST /api/social/disconnect
 *
 *  Disconnects an active social account (Instagram, LinkedIn, Twitter, etc.)
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";

export async function POST(req: NextRequest) {
  try {
    const { platform } = await req.json();
    if (!platform) {
      return NextResponse.json({ error: "Missing platform parameter." }, { status: 400 });
    }

    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    if (db.socialAccounts) {
      db.socialAccounts = db.socialAccounts.filter((a) => a.platform !== platform);
      await saveDB(db, sessionEmail);
    }

    return NextResponse.json({
      success: true,
      message: `${platform} disconnected successfully.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
