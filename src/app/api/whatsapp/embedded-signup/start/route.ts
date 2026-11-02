/**
 * ============================================================
 *  POST /api/whatsapp/embedded-signup/start
 *  GET  /api/whatsapp/embedded-signup/start
 *
 *  Initiates the official Meta Embedded Signup flow.
 *  Returns Meta App ID, Config ID, and a cryptographically
 *  secure state nonce to verify callback authenticity.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID || process.env.WHATSAPP_APP_ID || "";
  const configId = process.env.META_CONFIG_ID || process.env.WHATSAPP_CONFIG_ID || "";
  const stateNonce = crypto.randomBytes(24).toString("hex");

  return NextResponse.json({
    appId,
    configId,
    state: stateNonce,
    version: process.env.META_GRAPH_API_VERSION || "v20.0",
    isConfigured: !!(appId && (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET)),
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
