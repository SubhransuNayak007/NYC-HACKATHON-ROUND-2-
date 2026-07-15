/**
 * Stripe Billing System for Quick Reply
 *
 * Provides subscription management, payment processing, and usage-based billing.
 *
 * Pricing Tiers:
 * - Free: 500 replies/month, 1 channel, basic rules
 * - Premium ($19/mo): 5,000 replies/month, 5 channels, RAG, priority support
 * - Pro ($49/mo): 25,000 replies/month, unlimited channels, AI replies, webhooks
 *
 * Features:
 * - Checkout sessions for new subscriptions
 * - Customer portal for managing existing subscriptions
 * - Webhook handling for payment events
 * - Usage tracking and metered billing
 */

import Stripe from "stripe";

// --- Stripe Client ---

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for billing. Set it in your environment.");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2025-06-30.basil" as any,
    typescript: true,
  });

  return stripeClient;
}

// --- Pricing Configuration ---

export const PRICING_TIERS = {
  free: {
    name: "Free",
    monthlyReplyLimit: 500,
    channelLimit: 1,
    features: ["basic_rules", "comment_monitoring"],
    stripePriceId: null, // No Stripe price for free tier
  },
  premium: {
    name: "Premium",
    monthlyReplyLimit: 5000,
    channelLimit: 5,
    features: ["basic_rules", "comment_monitoring", "rag_matching", "priority_support", "analytics"],
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || "price_premium_monthly",
  },
  pro: {
    name: "Pro",
    monthlyReplyLimit: 25000,
    channelLimit: -1, // unlimited
    features: ["basic_rules", "comment_monitoring", "rag_matching", "ai_replies", "webhooks", "priority_support", "analytics", "team_members"],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro_monthly",
  },
} as const;

export type SubscriptionTier = keyof typeof PRICING_TIERS;

// --- Customer Management ---

/**
 * Get or create a Stripe customer for a user.
 */
export async function getOrCreateCustomer(
  email: string,
  name: string
): Promise<Stripe.Customer> {
  const stripe = getStripe();

  // Search for existing customer
  const existing = await stripe.customers.search({
    query: `email:"${email}"`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    return existing.data[0];
  }

  // Create new customer
  return stripe.customers.create({
    email,
    name,
    metadata: {
      source: "quick-reply",
    },
  });
}

/**
 * Get a user's current subscription.
 */
export async function getSubscription(
  customerId: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  return subscriptions.data[0] || null;
}

// --- Checkout ---

/**
 * Create a Stripe Checkout session for a new subscription.
 */
export async function createCheckoutSession(
  email: string,
  name: string,
  tier: SubscriptionTier,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const customer = await getOrCreateCustomer(email, name);
  const priceId = PRICING_TIERS[tier].stripePriceId;

  if (!priceId) {
    throw new Error(`No Stripe price configured for tier: ${tier}`);
  }

  return stripe.checkout.sessions.create({
    customer: customer.id,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      userId: email,
      tier,
    },
    subscription_data: {
      metadata: {
        userId: email,
        tier,
      },
    },
  });
}

/**
 * Create a Customer Portal session for managing subscriptions.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// --- Webhook Handling ---

/**
 * Construct and verify a Stripe webhook event.
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required for webhook verification");
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

/**
 * Handle a billing event from the queue.
 */
export async function handleBillingEvent(data: {
  userId: string;
  action: "subscription_check" | "invoice_created" | "payment_failed";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}): Promise<{ success: boolean; message: string }> {
  const { getDB, saveDB } = await import("@/database/db");

  try {
    switch (data.action) {
      case "subscription_check": {
        if (!data.stripeCustomerId) {
          return { success: false, message: "No Stripe customer ID" };
        }
        const subscription = await getSubscription(data.stripeCustomerId);
        const db = await getDB(data.userId);

        if (subscription) {
          // Determine tier from subscription metadata or price ID
          const tier = (subscription.metadata?.tier as SubscriptionTier) || "premium";
          db.userSession = {
            ...db.userSession!,
            tier,
          };
        } else {
          // No active subscription, downgrade to free
          db.userSession = {
            ...db.userSession!,
            tier: "free",
          };
        }

        await saveDB(db, data.userId);
        return { success: true, message: "Subscription status updated" };
      }

      case "invoice_created": {
        // Reset monthly reply counter
        const db = await getDB(data.userId);
        if (db.userSession) {
          db.userSession.repliesToday = 0;
          db.userSession.lastResetDate = new Date().toISOString().split("T")[0];
        }
        await saveDB(db, data.userId);
        return { success: true, message: "Invoice processed, counters reset" };
      }

      case "payment_failed": {
        // Notify user, potentially downgrade
        const db = await getDB(data.userId);
        const { logActivity } = await import("@/database/db");
        await logActivity(
          "System",
          `[Billing] Payment failed for ${data.userId}. Subscription may be cancelled.`
        );
        return { success: true, message: "Payment failure logged" };
      }

      default:
        return { success: false, message: `Unknown action: ${data.action}` };
    }
  } catch (err) {
    console.error("[Stripe] Billing event handler error:", err);
    return { success: false, message: "Internal error processing billing event" };
  }
}

// --- Usage Tracking ---

/**
 * Check if a user has exceeded their plan's reply limit.
 */
export async function checkReplyLimit(
  userId: string
): Promise<{ allowed: boolean; tier: SubscriptionTier; used: number; limit: number }> {
  const { getDB } = await import("@/database/db");
  const db = await getDB(userId);
  const tier = db.userSession?.tier || "free";
  const tierConfig = PRICING_TIERS[tier];

  // Get monthly usage (simplified: use repliesToday as proxy for monthly)
  // In production, you'd query a separate usage collection
  const used = db.userSession?.repliesToday || 0;
  const limit = tierConfig.monthlyReplyLimit;

  return {
    allowed: used < limit,
    tier,
    used,
    limit,
  };
}

/**
 * Check if a user can add more channels.
 */
export async function checkChannelLimit(
  userId: string
): Promise<{ allowed: boolean; tier: SubscriptionTier; current: number; limit: number }> {
  const { getDB } = await import("@/database/db");
  const db = await getDB(userId);
  const tier = db.userSession?.tier || "free";
  const tierConfig = PRICING_TIERS[tier];

  const current = db.channels?.length || 0;
  const limit = tierConfig.channelLimit;

  return {
    allowed: limit === -1 || current < limit,
    tier,
    current,
    limit,
  };
}

// --- API Key for External Integrations ---

/**
 * Generate an API key for a user (for webhook/extension access).
 */
export function generateApiKey(email: string): string {
  const crypto = require("crypto");
  const secret = process.env.STRIPE_SECRET_KEY || "api-key-fallback";
  return crypto
    .createHmac("sha256", secret)
    .update(`${email}:${Date.now()}`)
    .digest("hex")
    .substring(0, 48);
}
