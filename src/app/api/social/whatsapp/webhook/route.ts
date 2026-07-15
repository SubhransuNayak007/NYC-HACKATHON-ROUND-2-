import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, WACustomer, WAConversation, WAMessage } from "@/database/db";
import { v4 as uuidv4 } from "uuid";
import { processWhatsAppMessage } from "@/backend/wa_engine";
import { getWhatsAppProvider } from "@/channels/whatsapp/WhatsAppProviderFactory";
import { broadcastEvent } from "@/backend/socket";

/**
 * WhatsApp Business Webhook
 * GET /api/social/whatsapp/webhook - Webhook verification (required by Meta)
 * POST /api/social/whatsapp/webhook - Receive real-time incoming messages
 */

// GET: Webhook verification challenge from Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token) {
    if (configuredToken && token === configuredToken) {
      console.log("[WhatsApp Webhook] Verified via env token successfully");
      return new NextResponse(challenge, { status: 200 });
    }

    // Check saved accounts in DB
    const db = await getDB();
    const waAccount = db.socialAccounts?.find(
      (a) => a.platform === "whatsapp" && a.webhookVerifyToken === token
    );

    if (waAccount) {
      console.log("[WhatsApp Webhook] Verified via account token successfully");
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// POST: Receive real-time incoming messages from WhatsApp Cloud API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entries = body.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (change.field !== "messages") continue;

        const messages: any[] = value.messages || [];
        const contacts: any[] = value.contacts || [];
        const metadata = value.metadata || {};
        const phoneNumberId = metadata.phone_number_id;
        const displayPhoneNumber = metadata.display_phone_number || "";

        const contactMap: Record<string, string> = {};
        for (const contact of contacts) {
          contactMap[contact.wa_id] = contact.profile?.name || contact.wa_id;
        }

        const db = await getDB();
        const orgId = "system";

        for (const msg of messages) {
          const msgId = msg.id;
          const from = msg.from.startsWith("+") ? msg.from : `+${msg.from}`;
          const customerName = contactMap[msg.from] || undefined;
          const text = msg.type === "text" ? msg.text?.body || "" : msg[msg.type]?.caption || "";
          const timestamp = msg.timestamp
            ? new Date(parseInt(msg.timestamp, 10) * 1000).toISOString()
            : new Date().toISOString();

          // Check deduplication
          if ((db.waMessages || []).some((m) => m.waMessageId === msgId)) {
            console.log(`[WhatsApp Webhook] Skipping duplicate message: ${msgId}`);
            continue;
          }

          // 1. Find or create Customer
          let customer = (db.waCustomers || []).find(
            (c) => c.phone.replace(/\D/g, "") === from.replace(/\D/g, "")
          );
          if (!customer) {
            customer = {
              id: uuidv4(),
              phone: from,
              name: customerName,
              tags: ["new_inquiry"],
              totalConversations: 1,
              totalOrders: 0,
              totalSpent: 0,
              lastInteractionAt: timestamp,
              leadScore: 10,
              leadStage: "cold",
              optedOut: false,
              createdAt: timestamp,
              updatedAt: timestamp,
            };
            db.waCustomers = [...(db.waCustomers || []), customer];
          } else {
            customer.totalConversations = (customer.totalConversations || 0) + 1;
            customer.lastInteractionAt = timestamp;
            if (customerName && !customer.name) customer.name = customerName;
          }

          // 2. Find or create Conversation
          let conversation = (db.waConversations || []).find(
            (c) => c.customerPhone.replace(/\D/g, "") === from.replace(/\D/g, "")
          );
          if (!conversation) {
            conversation = {
              id: uuidv4(),
              channelPhone: displayPhoneNumber || "+10000000000",
              customerPhone: from,
              customerId: customer.id,
              status: "active",
              mode: "ai",
              priority: "normal",
              tags: customer.tags || [],
              unreadCount: 1,
              lastMessageAt: timestamp,
              lastMessagePreview: text.substring(0, 100),
              intentHistory: [],
              createdAt: timestamp,
              updatedAt: timestamp,
            };
            db.waConversations = [...(db.waConversations || []), conversation];
          } else {
            conversation.lastMessageAt = timestamp;
            conversation.lastMessagePreview = text.substring(0, 100);
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
            conversation.updatedAt = timestamp;
          }

          // 3. Process through 13-stage AI Pipeline
          const result = await processWhatsAppMessage({
            waMessageId: msgId,
            conversationId: conversation.id,
            customerPhone: from,
            customerName,
            text,
            mediaType: msg.type !== "text" ? msg.type : undefined,
            timestamp,
            db,
            organizationId: orgId,
          });

          // 4. Persist messages & analytics
          if (result.newMessages.length > 0) {
            db.waMessages = [...(db.waMessages || []), ...result.newMessages];
          }
          if (result.analyticsEvents.length > 0) {
            db.waAnalyticsEvents = [...(db.waAnalyticsEvents || []), ...result.analyticsEvents];
          }

          // Update conversation mode & status
          if (result.shouldEscalate) {
            conversation.status = "escalated";
            conversation.mode = "human";
            conversation.escalationReason = result.escalationReason;
          }
          conversation.intentHistory = [
            result.intent,
            ...(conversation.intentHistory || []).slice(0, 4),
          ];

          // 5. Send Real Outbound WhatsApp Reply if AI produced a response
          if (result.shouldSend && result.responseText) {
            const provider = getWhatsAppProvider();
            const sendResult = await provider.sendMessage(from, result.responseText);

            if (sendResult.success && sendResult.messageId) {
              const lastOutbound = db.waMessages?.find(
                (m) => m.conversationId === conversation.id && m.direction === "outbound" && m.sender === "ai"
              );
              if (lastOutbound) {
                lastOutbound.waMessageId = sendResult.messageId;
                lastOutbound.status = "sent";
              }
            }
          }

          await saveDB(db);

          // 6. Broadcast Real-Time Updates to open Dashboards
          for (const newMsg of result.newMessages) {
            broadcastEvent("wa:message:new", newMsg);
          }
          broadcastEvent("wa:conversation:update", conversation);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[WhatsApp Webhook Error]", err);
    return NextResponse.json({ status: "ok" });
  }
}
