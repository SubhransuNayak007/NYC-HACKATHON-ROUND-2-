import { NextRequest, NextResponse } from "next/server";
import { MetaApiClient, InstagramWebhookEvent } from "@/channels/instagram/MetaApiClient";
import { InstagramWorkerRuntime } from "@/channels/instagram/InstagramWorkerRuntime";
import { getDB } from "@/database/db";

const metaClient = new MetaApiClient();

/**
 * GET /api/instagram/webhooks
 * Meta Webhook Challenge Verification
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verified = metaClient.verifyWebhookChallenge(mode, token, challenge);
  if (verified) {
    return new NextResponse(verified, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/instagram/webhooks
 * Meta Webhook Event Ingestion (24/7 Autonomous Queue Receiver)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // 1. Constant-Time HMAC Signature Verification
    if (process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET) {
      if (!metaClient.validateWebhookSignature(rawBody, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload: InstagramWebhookEvent = JSON.parse(rawBody);
    if (payload.object !== "instagram" || !payload.entry) {
      return NextResponse.json({ error: "Unsupported object type" }, { status: 400 });
    }

    const db = await getDB();
    const connections = db.instagramConnections || [];

    // Process all entries asynchronously
    for (const entry of payload.entry) {
      const recipientOrAccountId = entry.id;
      // Match connection by account URN/ID
      const matchedConn =
        connections.find((c) => c.accountId === recipientOrAccountId) ||
        connections[0];

      const tenantId = matchedConn?.tenantId || "default";
      const workspaceId = matchedConn?.workspaceId || `ws_${tenantId}`;

      // A. Direct Messages
      if (entry.messaging) {
        for (const msg of entry.messaging) {
          if (msg.message && msg.message.text) {
            // Run background worker asynchronously
            InstagramWorkerRuntime.processMessage({
              tenantId,
              workspaceId,
              providerMessageId: msg.message.mid,
              senderId: msg.sender.id,
              recipientId: msg.recipient.id,
              text: msg.message.text,
              timestamp: msg.timestamp,
              isEcho: msg.message.is_echo,
            }).catch((err) => {
              console.error("[InstagramWebhook] Worker error processing message:", err);
            });
          }
        }
      }

      // B. Comments & Mentions
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === "comments" && change.value) {
            const comment = change.value;
            InstagramWorkerRuntime.processComment({
              tenantId,
              workspaceId,
              providerCommentId: comment.id,
              postId: comment.media?.id || "unknown_post",
              authorId: comment.from?.id || "unknown_author",
              authorUsername: comment.from?.username || "instagram_user",
              text: comment.text || "",
            }).catch((err) => {
              console.error("[InstagramWebhook] Worker error processing comment:", err);
            });
          }
        }
      }
    }

    // Acknowledge immediately to Meta with 200 OK
    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing error" },
      { status: 500 }
    );
  }
}
