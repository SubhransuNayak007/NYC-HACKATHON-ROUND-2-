/**
 * ============================================================================
 *  QuickReply — Meta Instagram Webhook Ingestion API
 *  src/app/api/webhooks/instagram/route.ts
 *
 *  Complies with Meta Graph API Webhook Specification:
 *   1. GET: Hub challenge verification with timing-safe comparison.
 *   2. POST: High-throughput HMAC-SHA256 signature verification.
 *   3. Returns immediate HTTP 200 OK (prevents Meta webhook retries).
 *   4. Dispatches async event processing to InstagramWorkerRuntime.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { MetaApiClient } from "@/channels/instagram/MetaApiClient";
import { InstagramWorkerRuntime } from "@/channels/instagram/InstagramWorkerRuntime";
import { getDB } from "@/database/db";

export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * GET — Meta Webhook Verification
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ||
    "quickreply_meta_webhook_secret_token";

  if (mode === "subscribe" && token && safeCompare(token, expectedToken)) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden: Invalid verify token" }, { status: 403 });
}

/**
 * POST — Inbound Meta Webhook Receiver
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-hub-signature-256");
  const rawBody = await req.text();

  const metaClient = new MetaApiClient();
  const isValid = metaClient.validateWebhookSignature(rawBody, signature);

  if (!isValid && process.env.NODE_ENV === "production") {
    console.error("[Meta Webhook] Invalid HMAC-SHA256 signature rejected.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  // Process asynchronously without blocking Meta's 200 OK acknowledgment
  (async () => {
    try {
      if (payload.object === "instagram" || payload.object === "page") {
        for (const entry of payload.entry || []) {
          const entryAccountId = entry.id;

          // Dynamically resolve tenant from database
          const db = await getDB();
          const connection = (db.instagramConnections || []).find(
            (c) =>
              c.instagramAccountId === entryAccountId ||
              c.facebookPageId === entryAccountId ||
              c.id === entryAccountId
          );

          const resolvedTenant = connection?.tenantId || "subhransu.nayak.418@gmail.com";
          const resolvedWorkspace = connection?.workspaceId || "ws_default";

          // Process Direct Messages
          for (const messaging of entry.messaging || []) {
            if (messaging.message && !messaging.message.is_echo) {
              await InstagramWorkerRuntime.processMessage({
                tenantId: resolvedTenant,
                workspaceId: resolvedWorkspace,
                providerMessageId: messaging.message.mid || `msg_${Date.now()}`,
                senderId: messaging.sender?.id || "unknown",
                recipientId: messaging.recipient?.id || entryAccountId || "unknown",
                text: messaging.message.text || "",
                timestamp: messaging.timestamp || Date.now(),
                isEcho: messaging.message.is_echo,
              });
            }
          }

          // Process Comments & Changes
          for (const change of entry.changes || []) {
            if (change.field === "comments" && change.value) {
              await InstagramWorkerRuntime.processComment({
                tenantId: resolvedTenant,
                workspaceId: resolvedWorkspace,
                providerCommentId: change.value.id || `comm_${Date.now()}`,
                postId: change.value.media?.id || "unknown",
                authorId: change.value.from?.id || "unknown",
                authorUsername: change.value.from?.username || "instagram_user",
                text: change.value.text || "",
                timestamp: Date.now(),
              });
            }
          }
        }
      }
    } catch (workerErr) {
      console.error("[Meta Webhook] Background runtime worker exception:", workerErr);
    }
  })();

  // Return immediate 200 OK acknowledgment to Meta
  return NextResponse.json({ success: true, received: true });
}
