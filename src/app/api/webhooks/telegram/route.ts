/**
 * ============================================================
 *  POST /api/webhooks/telegram
 *  GET  /api/webhooks/telegram
 *
 *  Root Telegram Webhook Ingestion Endpoint.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { TelegramRuntimeEngine } from "@/backend/telegram/TelegramRuntimeEngine";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "healthy",
    endpoint: "/api/webhooks/telegram",
    provider: "Official Telegram Bot API (v7.0 - 10.2+)",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";

    const result = await TelegramRuntimeEngine.processUpdate(update, "default_bot", sessionEmail);

    return NextResponse.json({
      ok: true,
      handled: result.handled,
      action: result.action,
    });
  } catch (err) {
    console.error("[Telegram Root Webhook] Error processing update:", err);
    return NextResponse.json({ ok: true, error: "Internal processing error" }, { status: 200 });
  }
}
