/**
 * ============================================================
 *  QuickReply — Telegram Mini App Cryptographic Validator
 *  src/backend/telegram/TelegramMiniAppValidator.ts
 *
 *  Validates Telegram Mini App (TWA) initData server-side:
 *  - Calculates HMAC-SHA256 hash using "WebAppData" secret key
 *  - Compares computed hash with client-provided hash in constant-time
 *  - Verifies auth_date freshness (prevents replay attacks)
 *  - Safely parses user payload
 * ============================================================
 */

import crypto from "crypto";

export interface TelegramMiniAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

export interface ValidatedMiniAppData {
  user?: TelegramMiniAppUser;
  auth_date: number;
  query_id?: string;
  hash: string;
  start_param?: string;
}

export class TelegramMiniAppValidator {
  /**
   * Validates initData raw query string against bot token.
   * Max age default: 24 hours (86400 seconds)
   */
  public static validate(
    initData: string,
    botToken: string,
    maxAgeSeconds = 86400
  ): { isValid: boolean; data?: ValidatedMiniAppData; error?: string } {
    if (!initData || !botToken) {
      return { isValid: false, error: "Missing initData or botToken" };
    }

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get("hash");

      if (!hash) {
        return { isValid: false, error: "Missing hash parameter in initData" };
      }

      // 1. Sort parameters alphabetically excluding "hash"
      const dataCheckArr: string[] = [];
      urlParams.forEach((val, key) => {
        if (key !== "hash") {
          dataCheckArr.push(`${key}=${val}`);
        }
      });
      dataCheckArr.sort();
      const dataCheckString = dataCheckArr.join("\n");

      // 2. Compute Secret Key: HMAC_SHA256("WebAppData", botToken)
      const secretKey = crypto
        .createHmac("sha256", "WebAppData")
        .update(botToken)
        .digest();

      // 3. Compute Hash: HMAC_SHA256(secretKey, dataCheckString)
      const computedHash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

      // 4. Constant-time comparison
      const hashBuf = Buffer.from(hash, "hex");
      const computedBuf = Buffer.from(computedHash, "hex");

      if (hashBuf.length !== computedBuf.length || !crypto.timingSafeEqual(hashBuf, computedBuf)) {
        return { isValid: false, error: "Invalid cryptographic signature (HMAC mismatch)" };
      }

      // 5. Auth Date Freshness Verification
      const authDate = parseInt(urlParams.get("auth_date") || "0", 10);
      const nowSeconds = Math.floor(Date.now() / 1000);

      if (nowSeconds - authDate > maxAgeSeconds) {
        return { isValid: false, error: "Authentication data has expired (Replay protection)" };
      }

      // 6. Extract User
      let user: TelegramMiniAppUser | undefined;
      const userStr = urlParams.get("user");
      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch {
          // Ignore parse error
        }
      }

      return {
        isValid: true,
        data: {
          user,
          auth_date: authDate,
          query_id: urlParams.get("query_id") || undefined,
          hash,
          start_param: urlParams.get("start_param") || undefined,
        },
      };
    } catch (err) {
      return {
        isValid: false,
        error: err instanceof Error ? err.message : "Validation error",
      };
    }
  }
}
