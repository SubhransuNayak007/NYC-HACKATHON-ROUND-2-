/**
 * ============================================================
 * QuickReply — Social Provider Registry & Factory
 * src/channels/social/SocialProviderRegistry.ts
 *
 * Central registry providing uniform access to all 4 official providers:
 * - InstagramProvider
 * - TelegramProvider
 * - LinkedInProvider
 * - XProvider
 * ============================================================
 */

import type { SocialProvider } from "./core/SocialProvider";
import type { SocialPlatform } from "@/database/db";
import { InstagramProvider } from "./providers/InstagramProvider";
import { TelegramProvider } from "./providers/TelegramProvider";
import { LinkedInProvider } from "./providers/LinkedInProvider";
import { XProvider } from "./providers/XProvider";

export class SocialProviderRegistry {
  private static providers: Map<SocialPlatform, SocialProvider> = new Map();

  static initialize() {
    if (this.providers.size === 0) {
      this.providers.set("instagram", new InstagramProvider());
      this.providers.set("telegram", new TelegramProvider());
      this.providers.set("linkedin", new LinkedInProvider());
      this.providers.set("twitter", new XProvider());
    }
  }

  static getProvider(platform: SocialPlatform): SocialProvider {
    this.initialize();
    const p = this.providers.get(platform);
    if (!p) {
      throw new Error(`Unsupported social platform: ${platform}. Supported: instagram, telegram, linkedin, twitter.`);
    }
    return p;
  }

  static getAllProviders(): SocialProvider[] {
    this.initialize();
    return Array.from(this.providers.values());
  }

  static isPlatformSupported(platform: string): platform is SocialPlatform {
    return ["instagram", "telegram", "linkedin", "twitter"].includes(platform);
  }
}
