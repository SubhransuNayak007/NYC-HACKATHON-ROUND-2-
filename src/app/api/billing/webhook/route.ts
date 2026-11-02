/**
 * ============================================================
 *  QuickReply — Unified Billing Webhook Handler (Stripe + Razorpay)
 *  src/app/api/billing/webhook/route.ts
 *
 *  Production Webhook Security:
 *   1. Cryptographic signature verification (Stripe HMAC / Razorpay HMAC-SHA256).
 *   2. Idempotency guard: Tracks provider + event_id to eliminate duplicate processing.
 *   3. Transactional credit grant via immutable CreditLedger.
 *   4. Subscription state machine: TRIALING -> ACTIVE -> PAST_DUE -> CANCELED -> EXPIRED.
 *   5. Audit logging for financial reconciliation.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/backend/stripe";
import { verifyRazorpayWebhookSignature } from "@/backend/billing/razorpay";
import { getPlanConfig } from "@/backend/billing/plans";
import { grantCredits } from "@/backend/credits/ledger";
import { getDB, saveDB, logActivity, type SubscriptionRecord, type WebhookEventRecord } from "@/database/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const stripeSignature = req.headers.get("stripe-signature");
  const razorpaySignature = req.headers.get("x-razorpay-signature");

  // ============================================================
  // 1. STRIPE WEBHOOK EVENT PROCESSING
  // ============================================================
  if (stripeSignature) {
    let event: any;
    try {
      event = constructWebhookEvent(bodyText, stripeSignature);
    } catch (err: any) {
      console.error("[Webhook:Stripe] Signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const eventId = event.id;
    const eventType = event.type;

    try {
      // Resolve tenant email
      const sessionObj = event.data.object;
      const userId = (
        sessionObj.metadata?.userId ||
        sessionObj.customer_email ||
        sessionObj.receipt_email ||
        ""
      ).toLowerCase().trim();

      if (!userId) {
        console.warn(`[Webhook:Stripe] Event ${eventId} (${eventType}) missing userId metadata`);
        return NextResponse.json({ received: true, ignored: true });
      }

      const db = await getDB(userId);
      if (!db.webhookEvents) db.webhookEvents = [];

      // Idempotency check: prevent replay attacks
      const alreadyProcessed = db.webhookEvents.some(
        (e) => e.provider === "stripe" && e.eventId === eventId && e.status === "processed"
      );
      if (alreadyProcessed) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      switch (eventType) {
        case "checkout.session.completed": {
          const tier = (sessionObj.metadata?.tier as string) || "starter";
          const plan = getPlanConfig(tier);
          const totalCredits = plan.monthlyCredits + plan.bonusCredits;

          // Grant credits atomically via Immutable Ledger
          await grantCredits({
            tenantId: userId,
            amount: totalCredits,
            type: "PURCHASE",
            referenceType: "STRIPE_CHECKOUT",
            referenceId: sessionObj.id,
            idempotencyKey: `stripe_evt_${eventId}`,
            metadata: {
              tier: plan.id,
              customerId: sessionObj.customer,
              subscriptionId: sessionObj.subscription,
              amountTotal: sessionObj.amount_total,
              currency: sessionObj.currency,
            },
          });

          // Update user session & subscription state
          if (db.userSession) {
            db.userSession.tier = plan.id as any;
            (db.userSession as any).stripeCustomerId = sessionObj.customer;
            (db.userSession as any).stripeSubscriptionId = sessionObj.subscription;
          }

          if (!db.subscriptions) db.subscriptions = [];
          const subRecord: SubscriptionRecord = {
            id: `sub_${sessionObj.subscription || sessionObj.id}`,
            tenantId: userId,
            provider: "stripe",
            subscriptionId: (sessionObj.subscription as string) || sessionObj.id,
            customerId: (sessionObj.customer as string) || "",
            tier: plan.id,
            status: "ACTIVE",
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancelAtPeriodEnd: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          db.subscriptions.unshift(subRecord);

          await saveDB(db, userId);
          await logActivity("System", `[Billing] Upgraded to ${plan.name} (${totalCredits} credits granted)`);
          break;
        }

        case "customer.subscription.updated": {
          const subscription = sessionObj;
          const status = subscription.status === "active" ? "ACTIVE" : subscription.status === "past_due" ? "PAST_DUE" : "CANCELED";
          const tier = (subscription.metadata?.tier as string) || "starter";
          const plan = getPlanConfig(tier);

          if (db.userSession) {
            db.userSession.tier = (status === "ACTIVE" ? plan.id : "free") as any;
          }

          if (db.subscriptions) {
            const existingSub = db.subscriptions.find((s) => s.subscriptionId === subscription.id);
            if (existingSub) {
              existingSub.status = status;
              existingSub.tier = plan.id;
              existingSub.updatedAt = new Date().toISOString();
            }
          }

          await saveDB(db, userId);
          await logActivity("System", `[Billing] Subscription status updated to ${status}`);
          break;
        }

        case "customer.subscription.deleted": {
          if (db.userSession) {
            db.userSession.tier = "free";
          }
          if (db.subscriptions) {
            const existingSub = db.subscriptions.find((s) => s.subscriptionId === sessionObj.id);
            if (existingSub) {
              existingSub.status = "CANCELED";
              existingSub.updatedAt = new Date().toISOString();
            }
          }
          await saveDB(db, userId);
          await logActivity("System", `[Billing] Subscription cancelled — reverted to Free tier`);
          break;
        }

        case "invoice.paid": {
          // Recurring subscription grant on renewal (only if not initial checkout session)
          if (sessionObj.billing_reason === "subscription_cycle") {
            const tier = (sessionObj.lines?.data?.[0]?.metadata?.tier as string) || "starter";
            const plan = getPlanConfig(tier);

            await grantCredits({
              tenantId: userId,
              amount: plan.monthlyCredits,
              type: "SUBSCRIPTION_GRANT",
              referenceType: "SUBSCRIPTION_MONTHLY",
              referenceId: sessionObj.id,
              idempotencyKey: `stripe_invoice_${sessionObj.id}`,
              metadata: { note: `Monthly subscription renewal (${plan.name})` },
            });

            await logActivity("System", `[Billing] Monthly renewal: ${plan.monthlyCredits} credits granted`);
          }
          break;
        }
      }

      // Record webhook event idempotency record
      const webhookRecord: WebhookEventRecord = {
        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        provider: "stripe",
        eventId,
        eventType,
        processedAt: new Date().toISOString(),
        status: "processed",
        idempotencyKey: `stripe_${eventId}`,
      };
      db.webhookEvents.unshift(webhookRecord);
      await saveDB(db, userId);

      return NextResponse.json({ success: true, eventId });
    } catch (err: any) {
      console.error(`[Webhook:Stripe] Error handling event ${eventId}:`, err);
      return NextResponse.json({ error: "Internal webhook processing error" }, { status: 500 });
    }
  }

  // ============================================================
  // 2. RAZORPAY WEBHOOK EVENT PROCESSING (India Payments)
  // ============================================================
  if (razorpaySignature) {
    const isValid = verifyRazorpayWebhookSignature(bodyText, razorpaySignature);
    if (!isValid) {
      console.error("[Webhook:Razorpay] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }

    const eventId = payload.event_id || `rzp_${Date.now()}`;
    const eventType = payload.event;

    try {
      const paymentEntity = payload.payload?.payment?.entity || payload.payload?.order?.entity || {};
      const notes = paymentEntity.notes || {};
      const userId = (notes.userId || "").toLowerCase().trim();

      if (!userId) {
        console.warn(`[Webhook:Razorpay] Event ${eventId} missing userId in notes`);
        return NextResponse.json({ received: true, ignored: true });
      }

      const db = await getDB(userId);
      if (!db.webhookEvents) db.webhookEvents = [];

      const alreadyProcessed = db.webhookEvents.some(
        (e) => e.provider === "razorpay" && e.eventId === eventId && e.status === "processed"
      );
      if (alreadyProcessed) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      if (eventType === "order.paid" || eventType === "payment.captured") {
        const tier = (notes.tier as string) || "starter";
        const plan = getPlanConfig(tier);
        const totalCredits = plan.monthlyCredits + plan.bonusCredits;

        await grantCredits({
          tenantId: userId,
          amount: totalCredits,
          type: "PURCHASE",
          referenceType: "RAZORPAY_PAYMENT",
          referenceId: paymentEntity.id,
          idempotencyKey: `rzp_evt_${eventId}`,
          metadata: {
            tier: plan.id,
            amountPaise: paymentEntity.amount,
            currency: paymentEntity.currency,
          },
        });

        if (db.userSession) {
          db.userSession.tier = plan.id as any;
        }

        if (!db.subscriptions) db.subscriptions = [];
        db.subscriptions.unshift({
          id: `sub_rzp_${paymentEntity.id}`,
          tenantId: userId,
          provider: "razorpay",
          subscriptionId: paymentEntity.id,
          customerId: paymentEntity.customer_id || "",
          tier: plan.id,
          status: "ACTIVE",
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await saveDB(db, userId);
        await logActivity("System", `[Billing] Upgraded to ${plan.name} via Razorpay (${totalCredits} credits granted)`);
      }

      db.webhookEvents.unshift({
        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        provider: "razorpay",
        eventId,
        eventType,
        processedAt: new Date().toISOString(),
        status: "processed",
        idempotencyKey: `rzp_${eventId}`,
      });
      await saveDB(db, userId);

      return NextResponse.json({ success: true, eventId });
    } catch (err: any) {
      console.error(`[Webhook:Razorpay] Error processing event ${eventId}:`, err);
      return NextResponse.json({ error: "Internal webhook error" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Missing webhook signature header" }, { status: 400 });
}
