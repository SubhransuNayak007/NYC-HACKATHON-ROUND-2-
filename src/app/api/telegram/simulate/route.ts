/**
 * ============================================================
 *  POST /api/telegram/simulate
 *
 *  Simulates an incoming live Telegram update and processes it
 *  through the 24/7 autonomous TelegramRuntimeEngine.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { TelegramRuntimeEngine } from "@/backend/telegram/TelegramRuntimeEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text = "Hi, I am interested in your Pro plan and pricing.",
      senderName = "Alex Carter",
      senderUsername = "alex_carter_vip",
      chatType = "private",
    } = body;

    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const updateId = Math.floor(100000 + Math.random() * 900000);
    const userId = Math.floor(1000000 + Math.random() * 9000000);

    const simulatedUpdate = {
      update_id: updateId,
      message: {
        message_id: Math.floor(100 + Math.random() * 900),
        from: {
          id: userId,
          is_bot: false,
          first_name: senderName,
          username: senderUsername,
          language_code: "en",
        },
        chat: {
          id: userId,
          first_name: senderName,
          username: senderUsername,
          type: chatType,
          title: chatType !== "private" ? `${senderName}'s Group` : undefined,
        },
        date: Math.floor(Date.now() / 1000),
        text,
      },
    };

    const result = await TelegramRuntimeEngine.processUpdate(simulatedUpdate, "simulated_bot", sessionEmail);

    return NextResponse.json({
      success: true,
      result,
      message: `Inbound Telegram message processed: "${text}"`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to simulate message" },
      { status: 500 }
    );
  }
}
