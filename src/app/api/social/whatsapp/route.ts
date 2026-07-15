import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, decryptToken, SocialComment } from "@/database/db";

/**
 * WhatsApp Business API
 * GET /api/social/whatsapp - Fetch stored incoming messages
 * POST /api/social/whatsapp - Send a WhatsApp reply message
 */

const WA_API = "https://graph.facebook.com/v18.0";

async function getAccountInfo(db: Awaited<ReturnType<typeof getDB>>) {
  const acct = db.socialAccounts?.find(a => a.platform === "whatsapp" && a.isActive);
  if (!acct?.whatsappToken || !acct?.phoneNumberId) return null;
  return { acct, token: decryptToken(acct.whatsappToken) };
}

// GET: Fetch all stored WhatsApp messages from DB (received via webhook)
export async function GET() {
  const db = await getDB();
  const result = await getAccountInfo(db);

  if (!result) {
    return NextResponse.json({ error: "WhatsApp not connected", connected: false }, { status: 404 });
  }

  const { acct } = result;
  const waMessages = db.socialComments?.filter(c => c.platform === "whatsapp") || [];

  return NextResponse.json({
    connected: true,
    account: acct.name,
    phoneNumber: acct.username,
    messages: waMessages,
  });
}

// POST: Send a WhatsApp reply to an incoming message
export async function POST(req: NextRequest) {
  try {
    const { to, replyText, messageId, socialCommentId } = await req.json();
    if (!to || !replyText) {
      return NextResponse.json({ error: "to and replyText required" }, { status: 400 });
    }

    const db = await getDB();
    const result = await getAccountInfo(db);
    if (!result) return NextResponse.json({ error: "WhatsApp not connected" }, { status: 404 });

    const { acct, token } = result;

    // Send message via WhatsApp Cloud API
    const sendRes = await fetch(`${WA_API}/${acct.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: replyText },
        // If replying to specific message
        ...(messageId ? { context: { message_id: messageId } } : {}),
      }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json();
      return NextResponse.json({ error: err.error?.message || "Failed to send message" }, { status: 400 });
    }

    const sendData = await sendRes.json();

    // Update stored social comment
    if (socialCommentId && db.socialComments) {
      const idx = db.socialComments.findIndex(c => c.id === socialCommentId);
      if (idx >= 0) {
        db.socialComments[idx].status = "replied";
        db.socialComments[idx].replyText = replyText;
        db.socialComments[idx].repliedAt = new Date().toISOString();
      }
      await saveDB(db);
    }

    return NextResponse.json({ success: true, messageId: sendData.messages?.[0]?.id });
  } catch (err) {
    return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 500 });
  }
}
