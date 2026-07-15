import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/backend/auth";
import { getWhatsAppWebSessionProvider, getWhatsAppProvider } from "@/channels/whatsapp/WhatsAppProviderFactory";

/**
 * GET /api/whatsapp/debug
 * Real Diagnostic Endpoint for WhatsApp Connection Pipeline
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getUserFromCookies(req.headers.get("cookie"));
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webProvider = getWhatsAppWebSessionProvider();
    const activeProvider = getWhatsAppProvider();
    const diagnostics = webProvider.getDebugDiagnostics();
    const status = activeProvider.getStatus();

    return NextResponse.json({
      success: true,
      diagnostics,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Internal debug error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
