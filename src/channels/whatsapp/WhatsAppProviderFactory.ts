/**
 * ============================================================
 *  QuickReply — WhatsApp Provider Factory
 *  src/channels/whatsapp/WhatsAppProviderFactory.ts
 *
 *  Resolves the official Meta WhatsApp Cloud API Provider.
 *  Exclusively standardizes on Meta WhatsApp Business Platform (Cloud API).
 * ============================================================
 */

import type { IChannel, ChannelStatus } from "../core/IChannel";
import { WhatsAppCloudProvider } from "./WhatsAppCloudProvider";

// Global cache for Next.js hot module reloads & route isolation
declare global {
  // eslint-disable-next-line no-var
  var __qr_wa_cloud_instance__: WhatsAppCloudProvider | undefined;
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
 * Get the active WhatsApp provider (exclusively official WhatsApp Cloud API)
 */
export function getWhatsAppProvider(): WhatsAppCloudProvider {
  return getWhatsAppCloudProvider();
}

/**
 * Get overall connection status for Meta Cloud API
 */
export function getWhatsAppConnectionStatus(): ChannelStatus {
  const provider = getWhatsAppProvider();
  return provider.getStatus();
}

/**
 * Force reset WhatsApp provider instance
 */
export function resetWhatsAppProviders(): void {
  globalThis.__qr_wa_cloud_instance__ = undefined;
}

export type { IChannel, ChannelStatus };
