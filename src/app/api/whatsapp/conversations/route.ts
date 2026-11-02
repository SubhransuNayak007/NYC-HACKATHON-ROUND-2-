import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/backend/auth";
import { getDB, saveDB } from "@/database/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  try {
    let userEmail = "subhransu.nayak.418@gmail.com";
    try {
      const auth = getUserFromCookies(req.headers.get("cookie"));
      if (auth?.sub) userEmail = auth.sub;
    } catch {
      // fallback
    }

    const db = await getDB(userEmail);

    // Clean any legacy mock conversation seeds if present
    if (db.waConversations && db.waConversations.some((c: any) => c.id?.startsWith("conv_rahul") || c.id?.startsWith("conv_sarah"))) {
      db.waConversations = db.waConversations.filter((c: any) => !c.id?.startsWith("conv_rahul") && !c.id?.startsWith("conv_sarah") && !c.id?.startsWith("conv_david") && !c.id?.startsWith("conv_priya"));
      db.waCustomers = (db.waCustomers || []).filter((c: any) => !c.id?.startsWith("cust_rahul") && !c.id?.startsWith("cust_sarah") && !c.id?.startsWith("cust_david") && !c.id?.startsWith("cust_priya"));
      db.waMessages = (db.waMessages || []).filter((m: any) => !m.id?.startsWith("msg_r") && !m.id?.startsWith("msg_s") && !m.id?.startsWith("msg_d") && !m.id?.startsWith("msg_p"));
      await saveDB(db, userEmail);
    }

    const conversations = (db.waConversations || []).sort(
      (a: any, b: any) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || "")
    );

    const customers = db.waCustomers || [];
    const customerMap: Record<string, any> = {};
    for (const c of customers) {
      customerMap[c.phone] = c;
      customerMap[c.id] = c;
    }

    // Map messages grouped by conversationId
    const messages = db.waMessages || [];
    const messagesByConv: Record<string, any[]> = {};
    for (const m of messages) {
      if (!messagesByConv[m.conversationId]) {
        messagesByConv[m.conversationId] = [];
      }
      messagesByConv[m.conversationId].push(m);
    }

    // Sort messages in each conversation chronologically
    for (const cId in messagesByConv) {
      messagesByConv[cId].sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
    }

    return NextResponse.json({
      conversations,
      customers: customerMap,
      messages: messagesByConv,
      total: conversations.length,
    });
  } catch (err) {
    console.error("[WA Conversations GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let userEmail = "subhransu.nayak.418@gmail.com";
    try {
      const auth = getUserFromCookies(req.headers.get("cookie"));
      if (auth?.sub) userEmail = auth.sub;
    } catch {
      // fallback
    }

    const body = await req.json();
    const db = await getDB(userEmail);

    // Mode Toggle or Status Update
    if (body.conversationId && body.mode) {
      const conv = (db.waConversations || []).find((c: any) => c.id === body.conversationId);
      if (conv) {
        conv.mode = body.mode;
        conv.updatedAt = new Date().toISOString();
        await saveDB(db, userEmail);
        return NextResponse.json({ success: true, conversation: conv });
      }
    }

    // Simulate Inbound Lead Trigger
    if (body.action === "simulate_inbound") {
      const simNames = ["Ananya Gupta", "Vikram Malhotra", "Elena Rostova", "Marcus Chen"];
      const simPhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const randomName = simNames[Math.floor(Math.random() * simNames.length)];
      const custId = `cust_${uuidv4().substring(0, 6)}`;
      const convId = `conv_${uuidv4().substring(0, 6)}`;

      const newCustomer = {
        id: custId,
        phone: simPhone,
        name: randomName,
        email: `${randomName.toLowerCase().replace(" ", ".")}@gmail.com`,
        avatarUrl: "",
        tags: ["live_simulation", "inbound_lead"],
        totalConversations: 1,
        totalOrders: 0,
        totalSpent: 0,
        lastInteractionAt: new Date().toISOString(),
        leadScore: 88,
        leadStage: "warm" as const,
        isVip: false,
        optedOut: false,
      };

      const inboundText = body.text || "Hello! Can I integrate QuickReply with our WhatsApp catalogue and automate order tracking?";
      const aiReplyText = "Hello! Yes, QuickReply seamlessly synchronizes with your WhatsApp catalogue and automates order tracking with sub-140ms neural RAG. Would you like a demo?";

      const newConv = {
        id: convId,
        customerPhone: simPhone,
        customerId: custId,
        status: "active" as const,
        mode: "ai" as const,
        priority: "high" as const,
        sentiment: "positive" as const,
        tags: ["catalogue_sync", "automated_demo"],
        leadScore: 88,
        unreadCount: 0,
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: aiReplyText,
        createdAt: new Date().toISOString(),
        intentHistory: ["catalogue_inquiry"],
      };

      const msgInbound = {
        id: `msg_${uuidv4().substring(0, 8)}`,
        conversationId: convId,
        direction: "inbound" as const,
        sender: "customer" as const,
        text: inboundText,
        status: "read" as const,
        timestamp: new Date(Date.now() - 2000).toISOString(),
      };

      const msgAiReply = {
        id: `msg_${uuidv4().substring(0, 8)}`,
        conversationId: convId,
        direction: "outbound" as const,
        sender: "ai" as const,
        text: aiReplyText,
        status: "delivered" as const,
        timestamp: new Date().toISOString(),
        metadata: {
          aiConfidence: 0.996,
          intentDetected: "catalogue_sync",
          processingMs: 124,
        },
      };

      db.waCustomers = [newCustomer, ...(db.waCustomers || [])];
      db.waConversations = [newConv, ...(db.waConversations || [])];
      db.waMessages = [...(db.waMessages || []), msgInbound, msgAiReply];

      await saveDB(db, userEmail);

      return NextResponse.json({
        success: true,
        customer: newCustomer,
        conversation: newConv,
        messages: [msgInbound, msgAiReply],
      });
    }

    const conversation = {
      id: uuidv4(),
      channelPhone: body.channelPhone || "",
      customerPhone: body.customerPhone || "",
      status: "active" as const,
      mode: "ai" as const,
      priority: "normal" as const,
      tags: body.tags || [],
      unreadCount: 0,
      lastMessageAt: new Date().toISOString(),
      lastMessagePreview: body.initialMessage || "New conversation",
      intentHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.waConversations = [conversation, ...(db.waConversations || [])];

    if (body.initialMessage) {
      const msg = {
        id: uuidv4(),
        conversationId: conversation.id,
        direction: "inbound" as const,
        sender: "customer" as const,
        text: body.initialMessage,
        status: "delivered" as const,
        timestamp: new Date().toISOString(),
      };
      db.waMessages = [...(db.waMessages || []), msg];
    }

    await saveDB(db, userEmail);

    return NextResponse.json({ success: true, conversation });
  } catch (err) {
    console.error("[WA Conversations POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
