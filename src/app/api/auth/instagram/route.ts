import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Legacy route redirect - forwards all requests to the official production integration route
 */
export async function GET(request: NextRequest) {
  const targetUrl = new URL("/api/integrations/instagram/connect", request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });
  return NextResponse.redirect(targetUrl, 307);
}

