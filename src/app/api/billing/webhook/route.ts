/**
 * POST /api/billing/webhook — Stripe Webhook Handler
 *
 * Receives events from Stripe and processes them:
 * - checkout.session.completed → Activate subscription
 * - customer.subscription.updated → Update tier
 * - customer.subscription.deleted → Downgrade to free
 * - invoice.payment_failed → Notify user
 * - invoice.paid → Reset usage counters
 *
 * Protected by Stripe signature verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, handleBillingEvent } from "@/backend/stripe";
import { getDB, saveDB, logActivity } from "@/database/db";
import { enqueueBillingJob } from "@/backend/queue";

export const runtime = "nodejs"; // Stripe webhook needs full Node.js

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.customer_email;
        if (!userId) break;

        const db = await getDB(userId);
        const tier = (session.metadata?.tier as any) || "premium";

        db.userSession = {
          ...db.userSession!,
          tier,
        };

        // Store Stripe customer ID for future reference
        if (session.customer) {
          (db.userSession as any).stripeCustomerId = session.customer;
        }
        if (session.subscription) {
          (db.userSession as any).stripeSubscriptionId = session.subscription;
        }

        await saveDB(db, userId);
        await logActivity("System", `[Billing] ${userId} upgraded to ${tier}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const db = await getDB(userId);
        const tier = (subscription.metadata?.tier as any) || "premium";

        if (subscription.status === "active") {
          db.userSession = { ...db.userSession!, tier };
        } else if (subscription.status === "past_due" || subscription.status === "canceled") {
          db.userSession = { ...db.userSession!, tier: "free" };
        }

        await saveDB(db, userId);
        await logActivity("System", `[Billing] Subscription updated for ${userId}: ${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const db = await getDB(userId);
        db.userSession = { ...db.userSession!, tier: "free" };
        await saveDB(db, userId);
        await logActivity("System", `[Billing] ${userId} downgraded to free (subscription cancelled)`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const userId = invoice.metadata?.userId || invoice.customer_email;
        if (!userId) break;

        await handleBillingEvent({
          userId,
          action: "payment_failed",
          stripeCustomerId: invoice.customer as string,
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const userId = invoice.metadata?.userId || invoice.customer_email;
        if (!userId) break;

        await handleBillingEvent({
          userId,
          action: "invoice_created",
          stripeCustomerId: invoice.customer as string,
        });
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[Webhook] Error processing ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
