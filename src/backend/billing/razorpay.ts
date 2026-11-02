/**
 * ============================================================
 *  QuickReply — Razorpay Payment Gateway (India / UPI / Subscriptions)
 *  src/backend/billing/razorpay.ts
 *
 *  Provides Indian merchant payment processing, UPI checkout,
 *  recurring subscriptions, and signature-verified webhook processing.
 * ============================================================
 */

import crypto from "crypto";

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
  notes?: Record<string, any>;
}

export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || "";
}

export function getRazorpayKeySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || "";
}

export function getRazorpayWebhookSecret(): string {
  return process.env.RAZORPAY_WEBHOOK_SECRET || process.env.SESSION_SECRET || "";
}

/**
 * Verify Razorpay Webhook signature using HMAC-SHA256 in constant time.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret || getRazorpayWebhookSecret();
  if (!webhookSecret || !signature || !rawBody) return false;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature.length !== signature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Create a Razorpay Order for Indian Checkout (UPI / Cards / NetBanking).
 */
export async function createRazorpayOrder(params: {
  amountInInr: number;
  receipt: string;
  notes: {
    userId: string;
    tier: string;
    credits: number;
  };
}): Promise<RazorpayOrder> {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) not configured");
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: Math.round(params.amountInInr * 100), // Amount in paise
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Razorpay Order creation failed (${response.status}): ${errText}`);
  }

  return (await response.json()) as RazorpayOrder;
}
