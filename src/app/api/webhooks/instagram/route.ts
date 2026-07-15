import { NextRequest, NextResponse } from "next/server";
import { MetaApiClient } from "@/channels/instagram/MetaApiClient";
import { getDB, saveDB } from "@/database/db";
import { processWhatsAppMessage } from "@/backend/wa_engine";
import { broadcastEvent } from "@/backend/socket";
import { v4 as uuidv4 } from "uuid";

const metaClient = new MetaApiClient();

/**
 * GET /api/webhooks/instagram
 * Meta Webhook Verification Endpoint
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verified = metaClient.verifyWebhookChallenge(mode, token, challenge);
  if (verified) {
    console.log("[Instagram Webhook] Challenge verified successfully");
    return new NextResponse(verified, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/webhooks/instagram
 * Ingests Real Instagram DMs and Comments
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // Signature Validation (if secret is configured)
    if (process.env.META_APP_SECRET && !metaClient.validateWebhookSignature(rawBody, signature)) {
      console.warn("[Instagram Webhook] Invalid signature rejected");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Process Entries
    const entries = payload.entry || [];
    for (const entry of entries) {
      // 1. Direct Messages
      if (entry.messaging) {
        for (const msg of entry.messaging) {
          if (msg.message?.is_echo) continue; // Ignore own echoes
          const from = msg.sender?.id;
          const text = msg.message?.text || "";
          if (!from || !text) continue;

          const db = await getDB();
          const convId = `ig_${from}`;

          const aiResult = await processWhatsAppMessage({
            waMessageId: msg.message?.mid || uuidv4(),
            conversationId: convId,
            customerPhone: from,
            customerName: `Instagram User (${from})`,
            text,
            timestamp: new Date(msg.timestamp || Date.now()).toISOString(),
            db,
            organizationId: "org_default",
          });

          // Save messages to DB
          if (aiResult.newMessages && aiResult.newMessages.length > 0) {
            if (!db.waMessages) db.waMessages = [];
            db.waMessages.push(...aiResult.newMessages);
          }
          await saveDB(db);

          broadcastEvent("instagram.message_received", {
            from,
            text,
            timestamp: new Date().toISOString(),
            reply: aiResult.responseText,
          });
        }
      }

      // 2. Comments
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === "comments" && change.value) {
            const comment = change.value;
            const db = await getDB();
            if (!db.socialComments) db.socialComments = [];

            const commentId = comment.id;
            const existing = db.socialComments.find((c) => c.id === commentId);
            if (!existing) {
              db.socialComments.push({
                id: commentId,
                platform: "instagram",
                accountId: entry.id,
                author: comment.from?.username || "Instagram User",
                text: comment.text || "",
                postId: comment.media?.id || "media_unknown",
                postTitle: "Instagram Post",
                publishedAt: new Date().toISOString(),
                status: "pending",
              });
              await saveDB(db);

              broadcastEvent("instagram.comment_received", {
                commentId,
                author: comment.from?.username,
                text: comment.text,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[Instagram Webhook] Error processing event:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
