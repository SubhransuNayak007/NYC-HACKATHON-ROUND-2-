/**
 * ============================================================
 *  QuickReply — Telegram Business Enterprise Service
 *  src/backend/telegram/TelegramBusinessService.ts
 *
 *  Provides official Telegram Business Connected Bot features:
 *  - Business Hours & Timezone Evaluation
 *  - Greeting Message Engine
 *  - Away Message & After-Hours Auto-Responder
 *  - Quick Reply Shortcuts (/pricing, /shipping, /demo, /contact)
 *  - Business Chat Links with Attribution
 * ============================================================
 */

import { TelegramApiClient } from "./TelegramApiClient";
import type { TelegramConnection } from "@/database/db";

export interface BusinessHoursSchedule {
  day: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  open: string; // "09:00"
  close: string; // "18:00"
  closed: boolean;
}

export interface BusinessConfig {
  timezone: string;
  schedule: BusinessHoursSchedule[];
  greetingMessage?: string;
  awayMessage?: string;
  quickReplies?: Array<{
    shortcut: string;
    title: string;
    message: string;
  }>;
}

export class TelegramBusinessService {
  /**
   * Checks if current time is within business hours for a given timezone and schedule.
   */
  public static isWithinBusinessHours(
    timezone = "UTC",
    schedule: BusinessHoursSchedule[] = []
  ): boolean {
    if (!schedule || schedule.length === 0) return true; // default always open if unconfigured

    try {
      const now = new Date();
      // Format current time in user's timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "Mon";
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      const currentMinutes = hour * 60 + minute;

      const dayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      const dayNum = dayMap[weekdayStr] ?? now.getUTCDay();

      const daySchedule = schedule.find((s) => s.day === dayNum);
      if (!daySchedule || daySchedule.closed) return false;

      const [openH, openM] = daySchedule.open.split(":").map(Number);
      const [closeH, closeM] = daySchedule.close.split(":").map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    } catch {
      return true; // Safe fallback
    }
  }

  /**
   * Generate an official Telegram Business Chat Link
   */
  public static createBusinessChatLink(
    botUsername: string,
    messageText: string,
    campaignTag?: string
  ): string {
    const cleanUser = botUsername.replace(/^@/, "");
    const encodedText = encodeURIComponent(messageText);
    const startParam = campaignTag ? `&start=${encodeURIComponent(campaignTag)}` : "";
    return `https://t.me/${cleanUser}?text=${encodedText}${startParam}`;
  }

  /**
   * Send Away Message if customer messages outside business hours
   */
  public static async handleAfterHoursMessage(
    client: TelegramApiClient,
    chatId: string | number,
    awayMessage: string,
    businessConnectionId?: string
  ): Promise<any> {
    const text =
      awayMessage ||
      "👋 Thanks for messaging! Our team is currently offline. Your message has been saved, and our AI assistant or a team member will follow up during business hours.";

    return client.sendMessage(chatId, text, {
      business_connection_id: businessConnectionId,
      parse_mode: "HTML",
    });
  }

  /**
   * Dispatch Greeting Message for new customers
   */
  public static async handleGreetingMessage(
    client: TelegramApiClient,
    chatId: string | number,
    greetingMessage: string,
    businessConnectionId?: string
  ): Promise<any> {
    const text =
      greetingMessage ||
      "👋 Hello! Welcome to our official Telegram Business channel. How can we assist you today?";

    return client.sendMessage(chatId, text, {
      business_connection_id: businessConnectionId,
      parse_mode: "HTML",
    });
  }
}
