import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { OAuthLifecycleManager } from "@/backend/credentials/OAuthLifecycleManager";
import { buildGoogleAuthUrl, resolveGoogleScopes, GOOGLE_SERVICE_SCOPES } from "./googleOAuthHelper";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isLogin = searchParams.get("login") === "true";
  const stateVal = searchParams.get("state") || "dashboard";
  const services = searchParams.get("services") || searchParams.get("service");
  const tenantId = searchParams.get("tenantId") || "";
  const workspaceId = searchParams.get("workspaceId") || "";

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({
      error: "Google integration is temporarily unavailable. Missing GOOGLE_CLIENT_ID.",
    }, { status: 503 });
  }

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/api/auth/callback/google`;

  // Determine requested scopes based on mode
  let scopes: string[];
  if (isLogin) {
    scopes = [...GOOGLE_SERVICE_SCOPES.base];
  } else if (services) {
    scopes = resolveGoogleScopes(services);
  } else {
    // Default legacy scopes including YouTube if no specific services requested
    scopes = [
      ...GOOGLE_SERVICE_SCOPES.base,
      ...GOOGLE_SERVICE_SCOPES.youtube,
      ...GOOGLE_SERVICE_SCOPES.drive,
      ...GOOGLE_SERVICE_SCOPES.sheets,
    ];
  }

  // Generate PKCE pair
  const pkce = OAuthLifecycleManager.generatePKCE();

  // Generate cryptographic nonce for CSRF validation
  const nonce = crypto.randomBytes(32).toString("hex");

  // Construct structured state preserving destination and workspace context
  // Format: actualState|nonce (where actualState can contain workspace metadata)
  let actualState: string;
  if (isLogin) {
    actualState = `login:${stateVal}`;
  } else if (workspaceId || services) {
    // Workspace-bound connector authorization
    actualState = `connect:${encodeURIComponent(tenantId)}:${encodeURIComponent(workspaceId)}:${encodeURIComponent(services || "all")}:${stateVal}`;
  } else {
    actualState = stateVal;
  }

  const stateWithNonce = `${actualState}|${nonce}`;

  // Build authorization URL with incremental authorization and multi-account selection
  const authUrl = buildGoogleAuthUrl({
    clientId,
    redirectUri,
    state: stateWithNonce,
    scopes,
    codeChallenge: pkce.codeChallenge,
    codeChallengeMethod: "S256",
    includeGrantedScopes: true,
    prompt: "consent select_account",
    accessType: "offline",
  });

  const response = NextResponse.redirect(authUrl);

  // Store CSRF nonce cookie
  response.cookies.set("oauth_nonce", nonce, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes expiry
  });

  // Store PKCE code_verifier cookie for callback token exchange
  response.cookies.set("oauth_code_verifier", pkce.codeVerifier, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
  });

  return response;
}
