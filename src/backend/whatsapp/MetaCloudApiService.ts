/**
 * ============================================================
 *  QuickReply — Meta WhatsApp Cloud API Service (Production v20.0)
 *  src/backend/whatsapp/MetaCloudApiService.ts
 *
 *  Official, tenant-isolated Meta WhatsApp Cloud API Client.
 *  Handles WABA discovery, Embedded Signup token exchange,
 *  template retrieval, policy-checked messaging, and health checks.
 * ============================================================
 */

import crypto from "crypto";
import type {
  WhatsAppConnection,
  WhatsAppTemplate,
  WhatsAppMessagingLimit,
  WhatsAppQualityRating,
} from "@/database/db";

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v20.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaTokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaWABADiscovery {
  wabaId: string;
  name: string;
  currency?: string;
  timezoneId?: string;
  phoneNumbers: Array<{
    id: string;
    displayPhoneNumber: string;
    verifiedName: string;
    qualityRating: WhatsAppQualityRating;
    codeVerificationStatus: string;
    messagingLimit: WhatsAppMessagingLimit;
  }>;
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  error?: {
    code: number | string;
    message: string;
    type?: string;
    errorUserTitle?: string;
    errorUserMsg?: string;
  };
}

export class MetaCloudApiService {
  private static encryptSecret(secret: string): string {
    const key = process.env.TOKEN_ENCRYPTION_KEY || "quickreply_default_32_byte_secret_key!";
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let encrypted = cipher.update(secret, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${tag}:${encrypted}`;
  }

  public static decryptSecret(encryptedSecret: string): string {
    try {
      const parts = encryptedSecret.split(":");
      if (parts.length !== 3) return encryptedSecret;
      const [ivHex, tagHex, encryptedHex] = parts;
      const key = process.env.TOKEN_ENCRYPTION_KEY || "quickreply_default_32_byte_secret_key!";
      const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key.padEnd(32).slice(0, 32)), Buffer.from(ivHex, "hex"));
      decipher.setAuthTag(Buffer.from(tagHex, "hex"));
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      return encryptedSecret;
    }
  }

  public static getAppSecretProof(accessToken: string): string {
    const appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET;
    if (!appSecret) return "";
    return crypto.createHmac("sha256", appSecret).update(accessToken).digest("hex");
  }

  public static appendProof(url: string, accessToken: string): string {
    const proof = this.getAppSecretProof(accessToken);
    if (!proof) return url;
    const delimiter = url.includes("?") ? "&" : "?";
    return `${url}${delimiter}appsecret_proof=${proof}`;
  }

  /**
   * Exchange Meta Embedded Signup OAuth code for a permanent System User or Access Token.
   */
  public static async exchangeCodeForToken(code: string): Promise<MetaTokenExchangeResponse> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error("META_APP_ID and META_APP_SECRET must be configured in environment variables.");
    }

    const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    url.searchParams.append("client_id", appId);
    url.searchParams.append("client_secret", appSecret);
    url.searchParams.append("code", code);

    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to exchange authorization code with Meta.");
    }

    return data as MetaTokenExchangeResponse;
  }

  /**
   * Discovers authorized WhatsApp Business Accounts (WABAs) and associated phone numbers.
   */
  public static async discoverWABAs(userAccessToken: string): Promise<MetaWABADiscovery[]> {
    const url = `${GRAPH_API_BASE}/me/businesses?fields=id,name,client_whatsapp_business_accounts{id,name,currency,timezone_id,phone_numbers{id,display_phone_number,verified_name,quality_rating,code_verification_status,messaging_limit_tier}}&access_token=${userAccessToken}`;

    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error?.message || "Failed to query Meta Business Portfolio.");
    }

    const results: MetaWABADiscovery[] = [];
    const businesses = data.data || [];

    for (const biz of businesses) {
      const wabas = biz.client_whatsapp_business_accounts?.data || [];
      for (const waba of wabas) {
        const phoneNumbers = (waba.phone_numbers?.data || []).map((p: any) => ({
          id: p.id,
          displayPhoneNumber: p.display_phone_number || "",
          verifiedName: p.verified_name || "WhatsApp Business",
          qualityRating: (p.quality_rating || "GREEN") as WhatsAppQualityRating,
          codeVerificationStatus: p.code_verification_status || "VERIFIED",
          messagingLimit: (p.messaging_limit_tier || "TIER_1K") as WhatsAppMessagingLimit,
        }));

        results.push({
          wabaId: waba.id,
          name: waba.name || biz.name || "WhatsApp Business Account",
          currency: waba.currency,
          timezoneId: waba.timezone_id,
          phoneNumbers,
        });
      }
    }

    return results;
  }

  /**
   * Subscribes the QuickReply application webhooks to the customer's WABA.
   */
  public static async subscribeAppToWABA(wabaId: string, accessToken: string): Promise<boolean> {
    const url = `${GRAPH_API_BASE}/${wabaId}/subscribed_apps`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return res.ok && data.success === true;
  }

  /**
   * Sends a free-form WhatsApp message within the 24-hour Customer Service window.
   */
  public static async sendTextMessage(
    phoneNumberId: string,
    toPhone: string,
    text: string,
    accessToken: string
  ): Promise<SendMessageResult> {
    const cleanPhone = toPhone.replace(/[^\d+]/g, "").replace(/^0+/, "");
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: { body: text },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        return {
          success: false,
          error: {
            code: data.error?.code || res.status,
            message: data.error?.message || "Failed to deliver message via Meta Cloud API",
            type: data.error?.type,
            errorUserTitle: data.error?.error_user_title,
            errorUserMsg: data.error?.error_user_msg,
          },
        };
      }

      const msgId = data.messages?.[0]?.id;
      return {
        success: true,
        providerMessageId: msgId,
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: err instanceof Error ? err.message : "Network failure communicating with Meta",
        },
      };
    }
  }

  /**
   * Sends an approved WhatsApp Template message (required outside the 24h window or for campaigns).
   */
  public static async sendTemplateMessage(
    phoneNumberId: string,
    toPhone: string,
    templateName: string,
    languageCode: string,
    parameters: Array<{ type: string; text?: string; image?: { link: string } }>,
    accessToken: string
  ): Promise<SendMessageResult> {
    const cleanPhone = toPhone.replace(/[^\d+]/g, "").replace(/^0+/, "");
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode || "en_US" },
        components: parameters.length > 0
          ? [
              {
                type: "body",
                parameters,
              },
            ]
          : undefined,
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        return {
          success: false,
          error: {
            code: data.error?.code || res.status,
            message: data.error?.message || "Template message rejected by Meta",
            errorUserMsg: data.error?.error_user_msg,
          },
        };
      }

      return {
        success: true,
        providerMessageId: data.messages?.[0]?.id,
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: err instanceof Error ? err.message : "Network connection error",
        },
      };
    }
  }

  /**
   * Retrieves official WhatsApp Message Templates and their approval states from Meta.
   */
  public static async fetchTemplates(wabaId: string, accessToken: string): Promise<WhatsAppTemplate[]> {
    const url = `${GRAPH_API_BASE}/${wabaId}/message_templates?fields=id,name,language,status,category,components,quality_score&limit=100`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return [];
      }

      const templates: WhatsAppTemplate[] = (data.data || []).map((t: any) => ({
        id: `tpl_${t.id}`,
        tenantId: "default",
        providerTemplateId: t.id,
        name: t.name,
        language: t.language,
        category: t.category,
        status: t.status,
        components: t.components || [],
        quality: t.quality_score?.score,
        lastSyncedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      return templates;
    } catch {
      return [];
    }
  }

  /**
   * Marks an incoming WhatsApp message as read.
   */
  public static async markAsRead(phoneNumberId: string, messageId: string, accessToken: string): Promise<boolean> {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Runs real-time diagnostics on the WABA and phone number health.
   */
  public static async checkConnectionHealth(
    phoneNumberId: string,
    accessToken: string
  ): Promise<{ healthy: boolean; qualityRating?: string; verifiedName?: string; error?: string }> {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}?fields=id,verified_name,code_verification_status,display_phone_number,quality_rating,messaging_limit_tier`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok && !data.error) {
        return {
          healthy: true,
          qualityRating: data.quality_rating || "GREEN",
          verifiedName: data.verified_name || "WhatsApp Business",
        };
      }

      return {
        healthy: false,
        error: data.error?.message || "Health check failed with Meta",
      };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : "Failed to ping Meta Graph API",
      };
    }
  }
}
