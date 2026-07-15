/**
 * GET /api/socketio — Socket.io health check
 *
 * The actual Socket.io server runs on the HTTP server.
 * This route is just a health check endpoint.
 */

import { NextResponse } from "next/server";
import { getConnectedCount } from "@/backend/socket";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    transport: "websocket",
    connectedClients: getConnectedCount(),
    timestamp: new Date().toISOString(),
  });
}
