/**
 * ============================================================================
 *  QuickReply — Autonomous Instagram Reply Dispatcher API
 *  src/app/api/automations/instagram/reply/route.ts
 *
 *  Executes end-to-end AI reasoning & Meta Graph API delivery for inbound events:
 *   1. Normalizes incoming comment or DM event.
 *   2. Deduplicates event via SHA-256 idempotency hash.
 *   3. Evaluates 18+ intent classifiers & sentiment scoring.
 *   4. Queries LangChain RAG Knowledge Base.
 *   5. Generates safe grounded AI response.
 *   6. Dispatches to official Meta Graph API v19.0+.
 *   7. Commits outbound message to persistent history and updates CRM.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getSessionUser } from "@/backend/auth";
import { getDB, saveDB, decryptToken, InstagramMessage, InstagramComment, InstagramEvent } from "@/database/db";
import { MetaApiClient } from "@/channels/instagram/MetaApiClient";
import { InstagramDecisionEngine } from "@/channels/instagram/InstagramDecisionEngine";
import { InstagramCapabilityService } from "@/channels/instagram/InstagramCapabilityService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { eventType, eventId, senderId, senderName, text, mediaId, conversationId } = body;

  if (!text || (!senderId && !eventId)) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: text and senderId or eventId" },
      { status: 400 }
    );
  }

  const db = await getDB(user.email);
  const connection = (db.instagramConnections || []).find((c) => c.status === "CONNECTED");

  if (!connection || !connection.encryptedAccessToken) {
    return NextResponse.json(
      {
        success: false,
        error: "Instagram Professional account is not connected or requires reauthorization.",
      },
      { status: 400 }
    );
  }

  const rawToken = decryptToken(connection.encryptedAccessToken);
  if (!rawToken) {
    return NextResponse.json(
      { success: false, error: "Failed to decrypt Meta access credentials." },
      { status: 500 }
    );
  }

  const metaClient = new MetaApiClient();

  // 1. Idempotency Check
  const payloadHash = crypto
    .createHash("sha256")
    .update(`${user.email}:${eventId || Date.now()}:${eventType}:${text}`)
    .digest("hex");

  if (!db.instagramEvents) db.instagramEvents = [];
  const isDuplicate = db.instagramEvents.some(
    (e) => (eventId && e.providerEventId === eventId) || e.payloadHash === payloadHash
  );

  if (isDuplicate) {
    return NextResponse.json({
      success: true,
      status: "IGNORED_DUPLICATE",
      message: "Event has already been processed.",
    });
  }

  // Record event
  const eventRecord: InstagramEvent = {
    id: `igev_${uuidv4().substring(0, 8)}`,
    tenantId: user.email,
    providerEventId: eventId || `ev_${Date.now()}`,
    eventType: eventType === "DM" ? "message" : "comment",
    payloadHash,
    receivedAt: new Date().toISOString(),
    status: "PROCESSED" as const,
    retryCount: 0,
  };
  db.instagramEvents.unshift(eventRecord);

  // 2. AI Decision & Safety Evaluation
  const decision = InstagramDecisionEngine.evaluate({
    tenantId: user.email,
    text,
    authorId: senderId || "anonymous",
    authorUsername: senderName || "user",
    source: eventType === "DM" ? "DM" : "COMMENT",
  });

  // 3. Dispatch based on Event Type
  let dispatchResult: any = null;
  let replyText = decision.safeDraftReply || "Thank you for reaching out!";

  if (eventType === "DM" && senderId) {
    dispatchResult = await metaClient.sendMessage(rawToken, connection.instagramAccountId || connection.id, senderId, replyText);

    // Save Outbound DM Message
    if (!db.instagramMessages) db.instagramMessages = [];
    const outboundMsg: InstagramMessage = {
      id: `igmsg_${uuidv4().substring(0, 8)}`,
      tenantId: user.email,
      accountId: connection.instagramAccountId || connection.id,
      conversationId: conversationId || `conv_${senderId}`,
      providerMessageId: dispatchResult?.messageId || `msg_${Date.now()}`,
      direction: "OUTBOUND",
      type: "TEXT",
      body: replyText,
      status: dispatchResult?.success ? "SENT" : "FAILED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.instagramMessages.unshift(outboundMsg);
  } else {
    // Comment Reply
    const commentTargetId = eventId || mediaId;
    if (commentTargetId) {
      dispatchResult = await metaClient.replyToComment(rawToken, commentTargetId, replyText);

      // Save Outbound Comment
      if (!db.instagramComments) db.instagramComments = [];
      const commentRecord: InstagramComment = {
        id: dispatchResult?.commentId || `igc_${uuidv4().substring(0, 8)}`,
        tenantId: user.email,
        accountId: connection.instagramAccountId || connection.id,
        postId: mediaId || "post_unknown",
        providerCommentId: commentTargetId,
        authorProviderId: connection.instagramAccountId || connection.id,
        authorUsername: connection.username || "instagram_user",
        text: replyText,
        status: dispatchResult?.success ? "REPLIED" : "PENDING",
        sentiment: decision.sentiment,
        intent: decision.intent,
        priority: "NORMAL",
        spamScore: 0,
        automationState: "PROCESSED",
        replyText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.instagramComments.unshift(commentRecord);
    }
  }

  // 4. Update Contact CRM Record
  if (!db.instagramContacts) db.instagramContacts = [];
  const contactIdx = db.instagramContacts.findIndex(
    (c) => c.providerUserId === senderId && c.tenantId === user.email
  );

  const scoreDelta = decision.leadScoreDelta || 10;
  if (contactIdx >= 0) {
    const contact = db.instagramContacts[contactIdx];
    contact.totalInteractions += 1;
    contact.leadScore = Math.min(100, Math.max(0, contact.leadScore + scoreDelta));
    contact.leadStage = contact.leadScore >= 70 ? "HOT" : contact.leadScore >= 30 ? "WARM" : "COLD";
    contact.lastInteractionAt = new Date().toISOString();
  } else if (senderId) {
    db.instagramContacts.unshift({
      id: `igct_${uuidv4().substring(0, 8)}`,
      tenantId: user.email,
      accountId: connection.instagramAccountId || connection.id,
      providerUserId: senderId,
      username: senderName || `user_${senderId.slice(-4)}`,
      displayName: senderName,
      leadScore: Math.min(100, Math.max(0, 20 + scoreDelta)),
      leadStage: 20 + scoreDelta >= 70 ? "HOT" : "WARM",
      source: eventType === "DM" ? "DM" : "COMMENT",
      tags: [decision.intent],
      totalInteractions: 1,
      lastInteractionAt: new Date().toISOString(),
      sentimentTrend: decision.sentiment,
      intentHistory: [decision.intent],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Update connection last synced timestamp
  connection.lastSyncedAt = new Date().toISOString();

  await saveDB(db, user.email);

  return NextResponse.json({
    success: dispatchResult?.success ?? true,
    status: dispatchResult?.success ? "SENT" : "FAILED",
    intent: decision.intent,
    sentiment: decision.sentiment,
    leadScoreDelta: scoreDelta,
    reply: replyText,
    providerResponse: dispatchResult,
  });
}
