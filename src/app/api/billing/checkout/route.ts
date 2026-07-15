/**
 * POST /api/billing/checkout — Create Stripe Checkout session
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";
import { cookies } from "next/headers";
import { createCheckoutSession, SubscriptionTier } from "@/backend/stripe";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const email = cookieStore.get("session_email")?.value;
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tier } = body as { tier: SubscriptionTier };

    if (!tier || !["premium", "pro"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be 'premium' or 'pro'." },
        { status: 400 }
      );
    }

    const db = await getDB(email);
    const name = db.userSession?.name || email.split("@")[0];
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    const session = await createCheckoutSession(
      email,
      name,
      tier,
      `${origin}/dashboard?upgraded=true`,
      `${origin}/dashboard?cancelled=true`
    );

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (err: any) {
    console.error("[Billing] Checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
