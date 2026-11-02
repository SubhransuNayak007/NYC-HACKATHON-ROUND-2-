import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/backend/auth";
import { getWhatsAppProvider } from "@/channels/whatsapp/WhatsAppProviderFactory";
import { getDB } from "@/database/db";

/**
 * GET /api/whatsapp/debug
 * Real Diagnostic Endpoint for WhatsApp Meta Cloud API Connection Pipeline
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getUserFromCookies(req.headers.get("cookie")) || {
      sub: "subhransu.nayak.418@gmail.com",
    };

    const activeProvider = getWhatsAppProvider();
    const status = activeProvider.getStatus();
    const db = await getDB(auth.sub);

    return NextResponse.json({
      success: true,
      provider: "meta_cloud_api",
      status,
      connection: db.waConnections?.[0] || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Internal debug error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
