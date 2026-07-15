/**
 * POST /api/billing/portal — Create Stripe Customer Portal session
 */

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";
import { cookies } from "next/headers";
import { getOrCreateCustomer, createPortalSession } from "@/backend/stripe";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const email = cookieStore.get("session_email")?.value;
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const db = await getDB(email);
    const name = db.userSession?.name || email.split("@")[0];
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    const customer = await getOrCreateCustomer(email, name);
    const portal = await createPortalSession(
      customer.id,
      `${origin}/dashboard`
    );

    return NextResponse.json({
      portalUrl: portal.url,
    });
  } catch (err: any) {
    console.error("[Billing] Portal error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create portal session" },
      { status: 500 }
    );
  }
}
