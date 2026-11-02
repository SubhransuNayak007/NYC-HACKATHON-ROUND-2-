/**
 * ============================================================
 *  QuickReply — Meta WhatsApp Cloud API Webhook Ingestion
 *  src/app/api/webhooks/whatsapp/route.ts
 *
 *  Official Meta Webhook receiver:
 *  - GET: Hub challenge verification
 *  - POST: HMAC-SHA256 signature verification, fast 200 OK ack,
 *          idempotent deduplication, status tracking, and AI dispatch.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB } from "@/database/db";
import { processWhatsAppMessage } from "@/backend/wa_engine";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "quickreply_whatsapp_verify";

// GET: Meta sends this to verify your webhook URL
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Challenge verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden - Invalid verify token" }, { status: 403 });
}

// POST: Receive incoming WhatsApp messages and status events
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") || "";

  // 1. Verify HMAC-SHA256 signature if app secret is present
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (appSecret && signature) {
    const isValid = verifyMetaSignature(rawBody, signature, appSecret);
    if (!isValid) {
      console.warn("[WhatsApp Webhook] Invalid HMAC signature. Dropping request.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // 2. Process payload and persist
  try {
    await handleWebhookPayload(rawBody);
  } catch (err) {
    console.error("[WhatsApp Webhook] Processing error:", err);
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

function verifyMetaSignature(payload: string, signatureHeader: string, appSecret: string): boolean {
  try {
    const expectedSig = crypto.createHmac("sha256", appSecret).update(payload).digest("hex");
    const sigParts = signatureHeader.split("sha256=");
    if (sigParts.length !== 2) return false;
    const actualSig = sigParts[1];

    if (expectedSig.length !== actualSig.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(actualSig));
  } catch {
    return false;
  }
}

async function handleWebhookPayload(rawBody: string) {
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return;
  }

  if (payload.object !== "whatsapp_business_account") return;

  const tenantEmail = process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
  const db = await getDB(tenantEmail);
  const entries = payload.entry || [];

  for (const entry of entries) {
    const wabaId = entry.id;
    const changes = entry.changes || [];

    for (const change of changes) {
      if (change.field !== "messages") continue;
      const value = change.value || {};
      const metadata = value.metadata || {};
      const phoneNumberId = metadata.phone_number_id;
      const displayPhone = metadata.display_phone_number;

      // Update connection lastWebhookAt & health
      if (db.waConnections && db.waConnections.length > 0) {
        const conn = db.waConnections.find((c) => c.phoneNumberId === phoneNumberId || c.wabaId === wabaId);
        if (conn) {
          conn.lastWebhookAt = new Date().toISOString();
          conn.webhookStatus = "healthy";
          if (conn.status === "WEBHOOK_PENDING" || conn.status === "CONNECTING") {
            conn.status = "READY";
          }
        }
      }

      // Handle message statuses (sent, delivered, read, failed)
      const statuses = value.statuses || [];
      for (const st of statuses) {
        const providerMessageId = st.id;
        const recipientPhone = st.recipient_id;
        const statusType = st.status; // "sent", "delivered", "read", "failed"

        if (db.waMessages) {
          const msg = db.waMessages.find((m) => m.waMessageId === providerMessageId);
          if (msg) {
            msg.status = statusType === "failed" ? "failed" : statusType;
            if (st.errors && st.errors.length > 0) {
              msg.metadata = {
                ...msg.metadata,
                ...{ errorCode: st.errors[0].code, errorMessage: st.errors[0].title || st.errors[0].message },
              };
            }
          }
        }
      }

      // Handle incoming messages
      const contacts = value.contacts || [];
      const messages = value.messages || [];

      for (const msg of messages) {
        const providerMsgId = msg.id;

        // Idempotency: Check if message has already been processed
        const eventHash = crypto.createHash("sha256").update(providerMsgId || JSON.stringify(msg)).digest("hex");
        if (db.webhookEvents) {
          const exists = db.webhookEvents.find((e) => e.eventId === providerMsgId || e.idempotencyKey === eventHash);
          if (exists) {
            console.log(`[WhatsApp Webhook] Duplicate message ${providerMsgId} ignored.`);
            continue;
          }
        }

        const senderPhone = msg.from;
        const contactInfo = contacts.find((c: any) => c.wa_id === senderPhone);
        const contactName = contactInfo?.profile?.name || `Customer (+${senderPhone})`;

        let msgText = "";
        let mediaType: any = undefined;
        let mediaUrl: string | undefined = undefined;

        if (msg.type === "text") {
          msgText = msg.text?.body || "";
        } else if (msg.type === "button") {
          msgText = msg.button?.text || msg.button?.payload || "";
        } else if (msg.type === "interactive") {
          msgText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
        } else if (msg.type === "image") {
          msgText = msg.image?.caption || "[Image]";
          mediaType = "image";
          mediaUrl = msg.image?.id;
        } else if (msg.type === "document") {
          msgText = msg.document?.caption || msg.document?.filename || "[Document]";
          mediaType = "document";
          mediaUrl = msg.document?.id;
        }

        // Find or create conversation
        if (!db.waConversations) db.waConversations = [];
        let conv = db.waConversations.find((c) => c.customerPhone === senderPhone);

        if (!conv) {
          conv = {
            id: `conv_${uuidv4().substring(0, 8)}`,
            channelPhone: displayPhone || "+15550199",
            customerPhone: senderPhone,
            status: "active",
            mode: "ai",
            priority: "normal",
            tags: ["New Lead"],
            unreadCount: 1,
            lastMessageAt: new Date().toISOString(),
            lastMessagePreview: msgText,
            intentHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          db.waConversations.unshift(conv);
        } else {
          conv.lastMessageAt = new Date().toISOString();
          conv.lastMessagePreview = msgText;
          conv.unreadCount = (conv.unreadCount || 0) + 1;
          conv.updatedAt = new Date().toISOString();
        }

        // Find or create customer
        if (!db.waCustomers) db.waCustomers = [];
        let cust = db.waCustomers.find((c) => c.phone === senderPhone);
        if (!cust) {
          cust = {
            id: `cust_${uuidv4().substring(0, 8)}`,
            phone: senderPhone,
            name: contactName,
            tags: ["New Lead"],
            totalConversations: 1,
            totalOrders: 0,
            totalSpent: 0,
            lastInteractionAt: new Date().toISOString(),
            leadScore: 20,
            leadStage: "warm",
            optedOut: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          db.waCustomers.unshift(cust);
        } else {
          cust.lastInteractionAt = new Date().toISOString();
          if (contactName && cust.name?.startsWith("Customer")) {
            cust.name = contactName;
          }
        }
        conv.customerId = cust.id;

        // Persist inbound message
        if (!db.waMessages) db.waMessages = [];
        const inboundMsgRecord = {
          id: `msg_${uuidv4().substring(0, 8)}`,
          waMessageId: providerMsgId,
          conversationId: conv.id,
          direction: "inbound" as const,
          sender: "customer" as const,
          senderName: contactName,
          text: msgText,
          mediaType,
          mediaUrl,
          status: "delivered" as const,
          timestamp: new Date().toISOString(),
        };
        db.waMessages.push(inboundMsgRecord);

        // Record webhook event for idempotency
        if (!db.webhookEvents) db.webhookEvents = [];
        db.webhookEvents.push({
          id: `wh_${uuidv4().substring(0, 8)}`,
          provider: "whatsapp",
          eventId: providerMsgId || `evt_${Date.now()}`,
          eventType: `message.${msg.type}`,
          processedAt: new Date().toISOString(),
          status: "processed",
          idempotencyKey: providerMsgId || eventHash,
        });

        await saveDB(db, tenantEmail);

        // Trigger AI engine if conversation mode is AI
        if (conv.mode === "ai" && msgText) {
          try {
            await processWhatsAppMessage({
              waMessageId: providerMsgId,
              conversationId: conv.id,
              customerPhone: senderPhone,
              customerName: contactName,
              text: msgText,
              timestamp: new Date().toISOString(),
              db,
              organizationId: "default",
            });
          } catch (aiErr) {
            console.error("[WhatsApp Webhook] AI Processing error:", aiErr);
          }
        }
      }
    }
  }

  await saveDB(db, tenantEmail);
}
