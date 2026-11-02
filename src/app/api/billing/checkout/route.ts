/**
 * ============================================================
 *  QuickReply — Checkout Session Initiation (Stripe / Razorpay)
 *  POST /api/billing/checkout
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/backend/auth/guard";
import { createCheckoutSession, SubscriptionTier } from "@/backend/stripe";
import { createRazorpayOrder } from "@/backend/billing/razorpay";
import { getPlanConfig } from "@/backend/billing/plans";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { tier, provider = "stripe" } = body as { tier: SubscriptionTier; provider?: "stripe" | "razorpay" };

    const validTiers = ["starter", "growth", "pro", "business", "premium"];
    if (!tier || !validTiers.includes(tier)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TIER", message: "Invalid subscription tier selected" } },
        { status: 400 }
      );
    }

    const plan = getPlanConfig(tier);
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    if (provider === "razorpay") {
      const order = await createRazorpayOrder({
        amountInInr: plan.inrPriceMonthly,
        receipt: `rcpt_${session.email}_${plan.id}_${Date.now()}`,
        notes: {
          userId: session.email,
          tier: plan.id,
          credits: plan.monthlyCredits + plan.bonusCredits,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          provider: "razorpay",
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: process.env.RAZORPAY_KEY_ID || "",
          planName: plan.name,
        },
      });
    }

    // Stripe checkout session
    const checkoutSession = await createCheckoutSession(
      session.email,
      session.name,
      plan.id as SubscriptionTier,
      `${origin}/dashboard?upgraded=true`,
      `${origin}/dashboard?cancelled=true`
    );

    return NextResponse.json({
      success: true,
      data: {
        provider: "stripe",
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
      },
    });
  } catch (err: any) {
    console.error("[Billing] Checkout creation error:", err);
    return NextResponse.json(
      { success: false, error: { code: "CHECKOUT_FAILED", message: err.message || "Failed to create checkout session" } },
      { status: 500 }
    );
  }
}
