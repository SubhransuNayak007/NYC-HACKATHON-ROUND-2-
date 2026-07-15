/**
 * GET /api/billing — Get current billing/subscription status
 * POST /api/billing — Update billing preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";
import { cookies } from "next/headers";
import { PRICING_TIERS, checkReplyLimit, checkChannelLimit } from "@/backend/stripe";

function getSessionEmail(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );
  return cookies["session_email"] ? decodeURIComponent(cookies["session_email"]) : null;
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const email = cookieStore.get("session_email")?.value;
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [replyLimit, channelLimit] = await Promise.all([
    checkReplyLimit(email),
    checkChannelLimit(email),
  ]);

  const tierConfig = PRICING_TIERS[replyLimit.tier];

  return NextResponse.json({
    tier: replyLimit.tier,
    tierName: tierConfig.name,
    features: tierConfig.features,
    usage: {
      replies: {
        used: replyLimit.used,
        limit: replyLimit.limit,
        percentage: Math.round((replyLimit.used / replyLimit.limit) * 100),
      },
      channels: {
        current: channelLimit.current,
        limit: channelLimit.limit,
        unlimited: channelLimit.limit === -1,
      },
    },
    plans: Object.entries(PRICING_TIERS).map(([key, config]) => ({
      id: key,
      name: config.name,
      monthlyReplyLimit: config.monthlyReplyLimit,
      channelLimit: config.channelLimit,
      features: config.features,
      price: key === "free" ? 0 : key === "premium" ? 1900 : 4900, // cents
      priceFormatted: key === "free" ? "$0" : key === "premium" ? "$19/mo" : "$49/mo",
    })),
  });
}
