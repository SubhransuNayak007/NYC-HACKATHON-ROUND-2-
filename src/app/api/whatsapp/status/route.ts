import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/backend/auth";
import { getWhatsAppProvider, getWhatsAppWebSessionProvider } from "@/channels/whatsapp/WhatsAppProviderFactory";
import { broadcastEvent } from "@/backend/socket";

/**
 * GET /api/whatsapp/status
 * Returns the live WhatsApp connection state from the real backend provider.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getUserFromCookies(req.headers.get("cookie"));
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const provider = getWhatsAppProvider();
    const status = provider.getStatus();

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[WA Status GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/status
 * Controls real session lifecycle (connect, disconnect)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getUserFromCookies(req.headers.get("cookie"));
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    const webProvider = getWhatsAppWebSessionProvider();

    if (action === "connect") {
      console.log("[WA Status API] Connect requested by user");
      const result = await webProvider.connect();
      broadcastEvent("wa:status:update", webProvider.getStatus());
      return NextResponse.json({
        success: result.success,
        qrCode: result.qrCode || webProvider.getQRCode(),
        status: webProvider.getStatus(),
        error: result.error,
      });
    }

    if (action === "disconnect") {
      console.log("[WA Status API] Disconnect requested by user");
      const result = await webProvider.disconnect();
      broadcastEvent("wa:status:update", webProvider.getStatus());
      return NextResponse.json({
        success: result.success,
        status: webProvider.getStatus(),
        error: result.error,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[WA Status POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
