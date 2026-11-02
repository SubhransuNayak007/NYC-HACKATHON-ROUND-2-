import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Legacy callback redirect - forwards all parameters to the official production integration callback
 */
export async function GET(request: NextRequest) {
  const targetUrl = new URL("/api/integrations/instagram/callback", request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });
  return NextResponse.redirect(targetUrl, 307);
}

