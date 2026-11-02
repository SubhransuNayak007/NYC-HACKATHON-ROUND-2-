import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "initiate") {
    // Return OAuth 2.0 authorization URL for Canva Connect API
    const clientId = process.env.CANVA_CLIENT_ID || "canva_mock_client_id";
    const redirectUri = encodeURIComponent(`${req.nextUrl.origin}/api/showcase/canva/callback`);
    const scopes = encodeURIComponent(
      "design:content:read design:content:write asset:read asset:write brandtemplate:meta:read"
    );
    const authUrl = `https://www.canva.com/api/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}`;

    return NextResponse.json({
      authUrl,
      status: "ready",
    });
  }

  // Return connection status
  return NextResponse.json({
    connected: true,
    accountName: "Enterprise Brand Workspace",
    scopes: ["design:content:write", "asset:write", "brandtemplate:meta:read"],
    tokenExpiresIn: 86400,
  });
}
