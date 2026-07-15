import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, WebhookTrigger } from "@/database/db";

/**
 * Feature 6: Webhook Triggers
 * GET /api/automations/webhooks - List all
 * POST /api/automations/webhooks - Create
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json(db.webhookTriggers || []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, secret, events } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "Missing name or URL" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.webhookTriggers) db.webhookTriggers = [];

    const newWebhook: WebhookTrigger = {
      id: `wh-${Date.now()}`,
      name,
      url,
      secret: secret || "",
      events: events || ["comment_replied"],
      isActive: true,
      fireCount: 0,
      headers: {},
    };

    db.webhookTriggers.push(newWebhook);
    await saveDB(db);
    await logActivity(db.userSession?.name || "Creator", `Created webhook trigger '${name}'`);

    return NextResponse.json(newWebhook, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
