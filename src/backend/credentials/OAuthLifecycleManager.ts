/**
 * QuickReply OAuth 2.0 Lifecycle Manager
 * src/backend/credentials/OAuthLifecycleManager.ts
 *
 * Implements:
 * 1. Automated token refresh when (expiresAt - NOW) <= 300s (5-minute lookahead window)
 * 2. Per-workspace credential isolation
 * 3. Provider-specific token refresh exchange (Google, Slack, HubSpot, Canva, Mock Server)
 * 4. RFC 7636 PKCE (Proof Key for Code Exchange) generation and verification
 * 5. Atomic encrypted update to CredentialVault
 * 6. Secret-redacted logging and error reporting
 */

import crypto from "crypto";
import { CredentialVault } from "./CredentialVault";

export interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

export interface RefreshOptions {
  tenantId: string;
  workspaceId: string;
  credentialId: string;
  forceRefresh?: boolean;
  mockBaseUrl?: string;
  codeVerifier?: string;
}

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

export class OAuthLifecycleManager {
  // Provider-specific OAuth 2.0 token refresh endpoints
  public static readonly DEFAULT_TOKEN_ENDPOINTS: Record<string, string> = {
    google_sheets: "https://oauth2.googleapis.com/token",
    gmail: "https://oauth2.googleapis.com/token",
    google_drive: "https://oauth2.googleapis.com/token",
    google_docs: "https://oauth2.googleapis.com/token",
    google_calendar: "https://oauth2.googleapis.com/token",
    google: "https://oauth2.googleapis.com/token",
    slack: "https://slack.com/api/oauth.v2.access",
    hubspot: "https://api.hubapi.com/oauth/v1/token",
    canva: "https://api.canva.com/rest/v1/oauth/token",
  };

  /**
   * Generate RFC 7636 compliant PKCE code_verifier and code_challenge (S256).
   */
  public static generatePKCE(): PKCEPair {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: "S256",
    };
  }

  /**
   * Determine if a token is expired or within the 300s expiration threshold.
   */
  public static isTokenExpiring(expiresAt?: number | string | Date, thresholdSeconds: number = 300): boolean {
    if (!expiresAt) return false;

    let expiryMs: number;
    if (typeof expiresAt === "number") {
      // Handle both epoch seconds and epoch ms
      expiryMs = expiresAt < 10000000000 ? expiresAt * 1000 : expiresAt;
    } else if (typeof expiresAt === "string") {
      const parsed = Date.parse(expiresAt);
      expiryMs = isNaN(parsed) ? Number(expiresAt) : parsed;
    } else if (expiresAt instanceof Date) {
      expiryMs = expiresAt.getTime();
    } else {
      return false;
    }

    const now = Date.now();
    const deltaMs = expiryMs - now;
    return deltaMs <= thresholdSeconds * 1000;
  }

  /**
   * Ensure the credential has a fresh access token before node execution.
   * If expiring within 300s, executes refresh grant and returns updated secret.
   */
  public static async ensureFreshToken(options: RefreshOptions): Promise<Record<string, any>> {
    const { tenantId, workspaceId, credentialId, forceRefresh, mockBaseUrl, codeVerifier } = options;

    const secret = await CredentialVault.resolveSecretForRuntime(tenantId, workspaceId, credentialId);
    if (!secret) {
      throw new Error(`Credential '${credentialId}' not found or inactive in workspace '${workspaceId}'`);
    }

    // Check if this credential has OAuth token lifecycle
    const expiresAt = secret.expiresAt;
    const refreshToken = secret.refreshToken || secret.refresh_token;

    if (!refreshToken) {
      // Not a refreshable OAuth 2.0 credential (e.g. static API key or webhook secret)
      return secret;
    }

    const needsRefresh = forceRefresh || this.isTokenExpiring(expiresAt, 300);
    if (!needsRefresh) {
      return secret;
    }

    // Execute refresh exchange
    const metadata = await CredentialVault.getCredentialMetadata(tenantId, workspaceId, credentialId);
    const appId = metadata?.appId || secret.appId || "google";

    const refreshed = await this.executeTokenRefresh({
      appId,
      refreshToken,
      clientId: secret.clientId || process.env[`${appId.toUpperCase()}_CLIENT_ID`] || "quickreply_client_default",
      clientSecret: secret.clientSecret || process.env[`${appId.toUpperCase()}_CLIENT_SECRET`] || "",
      tokenEndpoint: secret.tokenEndpoint || this.resolveTokenEndpoint(appId, mockBaseUrl),
      mockBaseUrl: mockBaseUrl || process.env.MOCK_SERVER_URL,
      codeVerifier: codeVerifier || secret.codeVerifier,
    });

    // Merge refreshed values into secret payload
    const updatedSecret: Record<string, any> = {
      ...secret,
      accessToken: refreshed.accessToken,
      access_token: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    };

    if (refreshed.refreshToken) {
      updatedSecret.refreshToken = refreshed.refreshToken;
      updatedSecret.refresh_token = refreshed.refreshToken;
    }

    // Commit atomically to CredentialVault with envelope encryption & AAD
    await CredentialVault.updateCredentialSecret(
      tenantId,
      workspaceId,
      credentialId,
      updatedSecret,
      refreshed.expiresAt
    );

    return updatedSecret;
  }

  /**
   * Determine token endpoint based on provider or mock environment.
   */
  public static resolveTokenEndpoint(appId: string, mockBaseUrl?: string): string {
    const base = mockBaseUrl || process.env.MOCK_SERVER_URL;
    if (base) {
      return `${base.replace(/\/+$/, "")}/oauth/token`;
    }
    return this.DEFAULT_TOKEN_ENDPOINTS[appId] || "https://oauth2.googleapis.com/token";
  }

  /**
   * Low-level OAuth 2.0 refresh grant network request.
   */
  public static async executeTokenRefresh(params: {
    appId: string;
    refreshToken: string;
    clientId: string;
    clientSecret: string;
    tokenEndpoint: string;
    mockBaseUrl?: string;
    codeVerifier?: string;
  }): Promise<RefreshResult> {
    const { appId, refreshToken, clientId, clientSecret, tokenEndpoint, codeVerifier } = params;

    const requestBody: Record<string, string> = {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    };

    if (codeVerifier) {
      requestBody.code_verifier = codeVerifier;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    try {
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const safeError = CredentialVault.redactSecrets(errorText);
        throw new Error(
          `OAuth token refresh failed for ${appId} with HTTP ${response.status}: ${safeError}`
        );
      }

      const data = await response.json();
      const accessToken = data.access_token || data.accessToken;
      if (!accessToken) {
        throw new Error(`OAuth provider response did not contain an access_token`);
      }

      const expiresInSec = Number(data.expires_in) || 3600;
      const expiresAt = Date.now() + expiresInSec * 1000;

      return {
        accessToken,
        refreshToken: data.refresh_token || data.refreshToken || undefined,
        expiresAt,
        tokenType: data.token_type || "Bearer",
        scope: data.scope,
      };
    } catch (err: any) {
      const safeMessage = CredentialVault.redactSecrets(err.message || String(err));
      throw new Error(`OAuth refresh lifecycle error: ${safeMessage}`);
    }
  }
}
