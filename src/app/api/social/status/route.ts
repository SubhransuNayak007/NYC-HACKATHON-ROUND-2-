import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/backend/auth";
import { getWhatsAppProvider } from "@/channels/whatsapp/WhatsAppProviderFactory";
import { MetaApiClient } from "@/channels/instagram/MetaApiClient";
import { LinkedInApiClient, LINKEDIN_API_VERSION } from "@/channels/linkedin/LinkedInApiClient";
import { CapabilityEngine } from "@/channels/core/CapabilityEngine";
import { getDB } from "@/database/db";

/**
 * GET /api/social/status
 * Returns verified multi-channel diagnostic state & capabilities
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getUserFromCookies(req.headers.get("cookie")) || {
      sub: "subhransu.nayak.418@gmail.com",
    };

    const db = await getDB();
    const waProvider = getWhatsAppProvider();
    const metaClient = new MetaApiClient();
    const liClient = new LinkedInApiClient();

    // 1. WhatsApp Diagnostics
    const waStatus = waProvider.getStatus();

    // 2. Instagram Diagnostics
    const igAccount = db.socialAccounts?.find((a) => a.platform === "instagram" && a.isActive);
    const igConfigured = metaClient.isConfigured();
    const igConnected = !!igAccount && !!igAccount.accessToken;

    // 3. LinkedIn Diagnostics
    const liAccount = db.socialAccounts?.find((a) => a.platform === "linkedin" && a.isActive);
    const liConfigured = liClient.isConfigured();
    const liConnected = !!liAccount && !!liAccount.accessToken;

    // 4. Telegram Diagnostics
    const tgConn = db.telegramConnections?.find((c) => c.status === "CONNECTED") || db.telegramConnections?.[0];
    const tgConnected = !!tgConn && tgConn.status === "CONNECTED";

    // 5. Platform Capabilities Matrix
    const capabilities = {
      whatsapp: CapabilityEngine.getCapabilities("whatsapp"),
      instagram: CapabilityEngine.getCapabilities("instagram"),
      linkedin: CapabilityEngine.getCapabilities("linkedin"),
      youtube: CapabilityEngine.getCapabilities("youtube"),
      twitter: CapabilityEngine.getCapabilities("twitter"),
      telegram: CapabilityEngine.getCapabilities("telegram"),
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      channels: {
        whatsapp: {
          platform: "whatsapp",
          connected: waStatus.connected,
          status: waStatus.status,
          phone: waStatus.phone || null,
          businessName: waStatus.businessName || null,
          provider: "Meta WhatsApp Cloud API (Graph API v20.0)",
          capabilities: capabilities.whatsapp,
        },
        instagram: {
          platform: "instagram",
          connected: igConnected,
          status: igConnected ? "connected" : igConfigured ? "disconnected" : "not_configured",
          username: igAccount?.username || null,
          accountName: igAccount?.name || null,
          provider: "Meta Graph API v19.0 (Professional)",
          configured: igConfigured,
          webhookEndpoint: "/api/webhooks/instagram",
          capabilities: capabilities.instagram,
        },
        linkedin: {
          platform: "linkedin",
          connected: liConnected,
          status: liConnected ? "connected" : liConfigured ? "disconnected" : "not_configured",
          accountName: liAccount?.name || null,
          provider: `LinkedIn Community Management REST API (Version: ${LINKEDIN_API_VERSION})`,
          configured: liConfigured,
          personalDmRestricted: true,
          capabilities: capabilities.linkedin,
        },
        telegram: {
          platform: "telegram",
          connected: tgConnected,
          status: tgConnected ? "connected" : "not_configured",
          botUsername: tgConn?.botUsername || null,
          botName: tgConn?.botName || null,
          provider: "Official Telegram Bot API (v7.0 - 10.2+)",
          capabilities: capabilities.telegram,
        },
      },
      capabilities,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Internal status error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
