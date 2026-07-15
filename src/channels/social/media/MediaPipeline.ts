/**
 * ============================================================
 * QuickReply — Media Validation & Security Pipeline
 * src/channels/social/media/MediaPipeline.ts
 *
 * Centralized media inspection, platform-constraint enforcement,
 * and SSRF protection for user-supplied media URLs.
 * ============================================================
 */

import type { SocialPlatform } from "@/database/db";

export interface MediaValidationResult {
  valid: boolean;
  mediaType: "image" | "video" | "document" | "unsupported";
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  aspectRatio?: string;
  platformCompatibility: Record<SocialPlatform, { compatible: boolean; reason?: string }>;
  error?: string;
}

export class MediaPipeline {
  // Block internal/private IP ranges from SSRF exploits
  private static readonly BLOCKED_HOST_PATTERNS = [
    /^localhost$/i,
    /^127\.\d+\.\d+\.\d+$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^169\.254\.\d+\.\d+$/, // AWS/GCP metadata
    /^0\.0\.0\.0$/,
    /::1/,
  ];

  /**
   * Validate that a user-supplied media URL does not target local or internal cloud metadata addresses
   */
  static isSafeUrl(urlStr: string): { safe: boolean; reason?: string } {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { safe: false, reason: `Unsupported protocol: ${parsed.protocol}. Only http and https are permitted.` };
      }

      const hostname = parsed.hostname;
      for (const pattern of this.BLOCKED_HOST_PATTERNS) {
        if (pattern.test(hostname)) {
          return { safe: false, reason: "Security violation: Access to private/loopback/cloud-metadata addresses is blocked." };
        }
      }
      return { safe: true };
    } catch {
      return { safe: false, reason: "Invalid URL structure." };
    }
  }

  /**
   * Inspect and validate media against Instagram, Telegram, LinkedIn, and X constraints
   */
  static async inspectAndValidate(url: string): Promise<MediaValidationResult> {
    const urlCheck = this.isSafeUrl(url);
    if (!urlCheck.safe) {
      return {
        valid: false,
        mediaType: "unsupported",
        mimeType: "unknown",
        platformCompatibility: {
          instagram: { compatible: false, reason: urlCheck.reason },
          telegram: { compatible: false, reason: urlCheck.reason },
          linkedin: { compatible: false, reason: urlCheck.reason },
          twitter: { compatible: false, reason: urlCheck.reason },
          whatsapp: { compatible: false, reason: urlCheck.reason },
          youtube: { compatible: false, reason: urlCheck.reason },
        },
        error: urlCheck.reason,
      };
    }

    const lowerUrl = url.toLowerCase();
    let mediaType: "image" | "video" | "document" | "unsupported" = "image";
    let mimeType = "image/jpeg";

    if (lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".mov") || lowerUrl.includes("video")) {
      mediaType = "video";
      mimeType = "video/mp4";
    } else if (lowerUrl.endsWith(".pdf") || lowerUrl.endsWith(".doc")) {
      mediaType = "document";
      mimeType = "application/pdf";
    } else if (lowerUrl.endsWith(".png")) {
      mimeType = "image/png";
    } else if (lowerUrl.endsWith(".webp")) {
      mimeType = "image/webp";
    }

    // Platform-specific compatibility checks
    const compat: Record<SocialPlatform, { compatible: boolean; reason?: string }> = {
      instagram: { compatible: true },
      telegram: { compatible: true },
      linkedin: { compatible: true },
      twitter: { compatible: true },
      whatsapp: { compatible: true },
      youtube: { compatible: false, reason: "YouTube requires full video upload flow via Studio/Data API" },
    };

    if (mediaType === "document") {
      compat.instagram = { compatible: false, reason: "Instagram does not support PDF or document posts." };
      compat.twitter = { compatible: false, reason: "X does not support standalone document attachments in tweets." };
    }

    if (mimeType === "image/webp") {
      compat.instagram = { compatible: false, reason: "Instagram Meta Graph API requires JPEG or PNG format." };
    }

    return {
      valid: true,
      mediaType,
      mimeType,
      platformCompatibility: compat,
    };
  }
}
