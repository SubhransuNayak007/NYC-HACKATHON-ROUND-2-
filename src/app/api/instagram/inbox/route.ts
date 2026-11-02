import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getCanonicalTenantId, hasPermission } from "@/backend/auth";
import { getDB, saveDB, decryptToken, InstagramComment, InstagramMessage } from "@/database/db";
import { MetaApiClient } from "@/channels/instagram/MetaApiClient";
import { v4 as uuidv4 } from "uuid";

const metaClient = new MetaApiClient();

/**
 * GET /api/instagram/inbox
 * Returns unified comments and DMs with intent & sentiment filtering
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") || "all"; // all, comments, messages, escalated
    const sentiment = searchParams.get("sentiment");
    const intent = searchParams.get("intent");

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);

    let comments = (db.instagramComments || []).filter((c) => c.tenantId === tenantId);
    let conversations = (db.instagramConversations || []).filter((cv) => cv.tenantId === tenantId);
    let messages = (db.instagramMessages || []).filter((m) => m.tenantId === tenantId);

    if (sentiment) {
      comments = comments.filter((c) => c.sentiment === sentiment);
      conversations = conversations.filter((cv) => cv.sentiment === sentiment);
    }
    if (intent) {
      comments = comments.filter((c) => c.intent === intent);
      conversations = conversations.filter((cv) => cv.intent === intent);
    }
    if (type === "escalated") {
      comments = comments.filter((c) => c.status === "ESCALATED");
      conversations = conversations.filter((cv) => cv.status === "ESCALATED");
    }

    return NextResponse.json({
      success: true,
      comments: type === "messages" ? [] : comments.reverse(),
      conversations: type === "comments" ? [] : conversations.reverse(),
      messages: type === "comments" ? [] : messages,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load Instagram inbox" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/instagram/inbox
 * Dispatches a human or approved AI reply to a comment or direct message
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.role, "MEMBER")) {
      return NextResponse.json({ error: "Forbidden: Member role required to send replies" }, { status: 403 });
    }

    const body = await req.json();
    const { type, targetId, text } = body; // type: 'comment' | 'dm'

    if (!type || !targetId || !text) {
      return NextResponse.json({ error: "Missing type, targetId, or text" }, { status: 400 });
    }

    const db = await getDB(session.email);
    const tenantId = getCanonicalTenantId(session.email);
    const connection = (db.instagramConnections || []).find((c) => c.tenantId === tenantId && c.status === "READY");

    if (!connection || !connection.encryptedCredentialRef) {
      return NextResponse.json(
        { error: "No active Instagram connection found. Please connect your account." },
        { status: 400 }
      );
    }

    const rawToken = decryptToken(connection.encryptedCredentialRef);

    if (type === "comment") {
      const comment = (db.instagramComments || []).find((c) => c.id === targetId && c.tenantId === tenantId);
      if (!comment) {
        return NextResponse.json({ error: "Comment not found or access denied" }, { status: 404 });
      }

      const res = await metaClient.replyToComment(rawToken, comment.providerCommentId, text);
      if (!res.success || !res.commentId) {
        return NextResponse.json({ error: res.error?.userFacingExplanation || "Failed to post comment reply" }, { status: 502 });
      }

      comment.status = "REPLIED";
      comment.replyText = text;
      comment.replyCommentId = res.commentId;
      comment.repliedAt = new Date().toISOString();
      await saveDB(db, session.email);

      return NextResponse.json({ success: true, replyCommentId: res.commentId });
    } else if (type === "dm") {
      const conv = (db.instagramConversations || []).find((cv) => cv.id === targetId && cv.tenantId === tenantId);
      if (!conv) {
        return NextResponse.json({ error: "Conversation not found or access denied" }, { status: 404 });
      }

      const recipientId = conv.contactId.replace("ig_cnt_", "");
      const res = await metaClient.sendMessage(rawToken, conv.accountId, recipientId, text);
      if (!res.success || !res.messageId) {
        return NextResponse.json({ error: res.error?.userFacingExplanation || "Failed to send DM" }, { status: 502 });
      }

      if (!db.instagramMessages) db.instagramMessages = [];
      const msg: InstagramMessage = {
        id: `ig_msg_${uuidv4().substring(0, 8)}`,
        tenantId,
        accountId: conv.accountId,
        conversationId: conv.id,
        providerMessageId: res.messageId,
        direction: "OUTBOUND",
        type: "TEXT",
        body: text,
        status: "SENT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.instagramMessages.push(msg);
      conv.lastMessageAt = new Date().toISOString();
      conv.status = "RESOLVED";
      await saveDB(db, session.email);

      return NextResponse.json({ success: true, messageId: res.messageId });
    }

    return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to dispatch reply" },
      { status: 500 }
    );
  }
}
