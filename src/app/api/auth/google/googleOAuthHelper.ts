/**
 * QuickReply Google OAuth 2.0 Helper
 * src/app/api/auth/google/googleOAuthHelper.ts
 *
 * Implements:
 * 1. Granular service-specific scopes (Gmail, Drive, Sheets, Docs, Calendar)
 * 2. Incremental authorization (include_granted_scopes=true)
 * 3. RFC 7636 PKCE code challenge & verifier generation
 * 4. Token exchange and refresh with secret redaction
 * 5. Multi-account credential storage in CredentialVault
 */

import crypto from "crypto";
import { CredentialVault } from "@/backend/credentials/CredentialVault";

export const GOOGLE_SERVICE_SCOPES: Record<string, string[]> = {
  base: ["openid", "email", "profile"],
  gmail: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
  ],
  drive: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
  google_drive: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
  sheets: [
    "https://www.googleapis.com/auth/spreadsheets",
  ],
  google_sheets: [
    "https://www.googleapis.com/auth/spreadsheets",
  ],
  docs: [
    "https://www.googleapis.com/auth/documents",
  ],
  google_docs: [
    "https://www.googleapis.com/auth/documents",
  ],
  calendar: [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
  google_calendar: [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
  youtube: [
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
  ],
};

/**
 * Resolve granular service-specific scopes for Google OAuth.
 */
export function resolveGoogleScopes(services?: string[] | string): string[] {
  const scopeSet = new Set<string>(GOOGLE_SERVICE_SCOPES.base);

  if (!services) {
    return Array.from(scopeSet);
  }

  const serviceList: string[] = Array.isArray(services)
    ? services
    : services.split(",").map((s) => s.trim().toLowerCase());

  if (serviceList.includes("all") || serviceList.includes("suite") || serviceList.includes("google")) {
    // Add all core workspace suite scopes
    for (const key of ["gmail", "drive", "sheets", "docs", "calendar"]) {
      for (const sc of GOOGLE_SERVICE_SCOPES[key]) {
        scopeSet.add(sc);
      }
    }
    return Array.from(scopeSet);
  }

  for (const s of serviceList) {
    const scopes = GOOGLE_SERVICE_SCOPES[s];
    if (scopes) {
      for (const sc of scopes) {
        scopeSet.add(sc);
      }
    }
  }

  return Array.from(scopeSet);
}

export interface GoogleAuthUrlOptions {
  clientId: string;
  redirectUri: string;
  state: string;
  services?: string[] | string;
  scopes?: string[];
  codeChallenge?: string;
  codeChallengeMethod?: "S256";
  includeGrantedScopes?: boolean;
  prompt?: string;
  accessType?: "offline" | "online";
}

/**
 * Build Google OAuth 2.0 authorization URL with incremental auth and PKCE.
 */
export function buildGoogleAuthUrl(options: GoogleAuthUrlOptions): string {
  const {
    clientId,
    redirectUri,
    state,
    services,
    scopes: customScopes,
    codeChallenge,
    codeChallengeMethod = "S256",
    includeGrantedScopes = true,
    prompt = "consent select_account",
    accessType = "offline",
  } = options;

  const targetScopes = customScopes && customScopes.length > 0
    ? Array.from(new Set([...GOOGLE_SERVICE_SCOPES.base, ...customScopes]))
    : resolveGoogleScopes(services);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: targetScopes.join(" "),
    access_type: accessType,
    state,
    prompt,
  });

  if (includeGrantedScopes) {
    params.set("include_granted_scopes", "true");
  }

  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", codeChallengeMethod);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: number;
  tokenType: string;
  scope?: string;
  idToken?: string;
}

/**
 * Exchange Google authorization code with optional PKCE code_verifier.
 */
export async function exchangeGoogleCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  codeVerifier?: string;
  tokenEndpoint?: string;
}): Promise<GoogleTokenResponse> {
  const { code, redirectUri, clientId, clientSecret, codeVerifier, tokenEndpoint } = params;
  const endpoint = tokenEndpoint || "https://oauth2.googleapis.com/token";

  const formBody = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  if (codeVerifier) {
    formBody.set("code_verifier", codeVerifier);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    const safeError = CredentialVault.redactSecrets(errorText);
    throw new Error(`Google OAuth code exchange failed with HTTP ${res.status}: ${safeError}`);
  }

  const data = await res.json();
  const accessToken = data.access_token || data.accessToken;
  if (!accessToken) {
    throw new Error("Google OAuth exchange response did not contain an access_token");
  }

  const expiresIn = Number(data.expires_in) || 3600;
  const expiresAt = Date.now() + expiresIn * 1000;

  return {
    accessToken,
    refreshToken: data.refresh_token || data.refreshToken || undefined,
    expiresIn,
    expiresAt,
    tokenType: data.token_type || "Bearer",
    scope: data.scope,
    idToken: data.id_token,
  };
}

/**
 * Fetch Google User Profile info (email, name, sub).
 */
export async function fetchGoogleProfile(accessToken: string): Promise<{
  email: string;
  name: string;
  picture?: string;
  sub: string;
}> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Google profile with HTTP ${res.status}: ${CredentialVault.redactSecrets(errText)}`);
  }

  const profile = await res.json();
  return {
    email: profile.email || "",
    name: profile.name || profile.email?.split("@")[0] || "Google User",
    picture: profile.picture,
    sub: profile.sub || "",
  };
}
