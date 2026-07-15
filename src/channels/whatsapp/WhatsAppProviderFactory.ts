/**
 * ============================================================
 *  QuickReply — WhatsApp Provider Factory
 *  src/channels/whatsapp/WhatsAppProviderFactory.ts
 *
 *  Resolves the active real WhatsApp channel provider:
 *  1. Meta WhatsApp Cloud API (if configured via env)
 *  2. WhatsApp Web Session Provider (self-hosted real QR linking via Baileys)
 * ============================================================
 */

import type { IChannel, ChannelStatus } from "../core/IChannel";
import { WhatsAppCloudProvider } from "./WhatsAppCloudProvider";
import { WhatsAppWebSessionProvider } from "./WhatsAppWebSessionProvider";

// Global cache for Next.js hot module reloads & route isolation
declare global {
  // eslint-disable-next-line no-var
  var __qr_wa_cloud_instance__: WhatsAppCloudProvider | undefined;
  // eslint-disable-next-line no-var
  var __qr_wa_web_session_instance__: WhatsAppWebSessionProvider | undefined;
}

/**
 * Get or instantiate the official WhatsApp Cloud Provider
 */
export function getWhatsAppCloudProvider(): WhatsAppCloudProvider {
  if (!globalThis.__qr_wa_cloud_instance__) {
    globalThis.__qr_wa_cloud_instance__ = new WhatsAppCloudProvider();
  }
  return globalThis.__qr_wa_cloud_instance__;
}

/**
 * Get or instantiate the WhatsApp Web Session Provider (Baileys)
 */
export function getWhatsAppWebSessionProvider(): WhatsAppWebSessionProvider {
  if (!globalThis.__qr_wa_web_session_instance__) {
    globalThis.__qr_wa_web_session_instance__ = new WhatsAppWebSessionProvider();
  }
  return globalThis.__qr_wa_web_session_instance__;
}

/**
 * Get the active WhatsApp provider.
 * Priority:
 * 1. Cloud API if credentials are set in env
 * 2. WebSession Provider for self-hosted QR login
 */
export function getWhatsAppProvider(): WhatsAppWebSessionProvider | WhatsAppCloudProvider {
  const hasCloudCreds =
    !!process.env.WHATSAPP_PHONE_NUMBER_ID &&
    !!process.env.WHATSAPP_ACCESS_TOKEN;

  if (hasCloudCreds) {
    return getWhatsAppCloudProvider();
  }

  return getWhatsAppWebSessionProvider();
}

/**
 * Get overall connection status across available providers
 */
export function getWhatsAppConnectionStatus(): ChannelStatus {
  const provider = getWhatsAppProvider();
  return provider.getStatus();
}

/**
 * Force reset all provider instances
 */
export function resetWhatsAppProviders(): void {
  globalThis.__qr_wa_cloud_instance__ = undefined;
  globalThis.__qr_wa_web_session_instance__ = undefined;
}

export type { IChannel, ChannelStatus };
