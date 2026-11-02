/**
 * ============================================================
 *  QuickReply — Unified Pricing & Subscription Plans
 *  src/backend/billing/plans.ts
 *
 *  Source of truth for all pricing, quotas, and credit allocations.
 *  Supports USD & INR pricing models for Global and India merchants.
 * ============================================================
 */

export interface PlanConfig {
  id: "free" | "starter" | "growth" | "pro" | "business";
  name: string;
  usdPriceMonthly: number;
  inrPriceMonthly: number;
  monthlyCredits: number;
  bonusCredits: number;
  channelLimit: number; // -1 for unlimited
  dailyReplyLimit: number;
  features: string[];
  stripePriceId?: string;
  razorpayPlanId?: string;
}

export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Free Starter",
    usdPriceMonthly: 0,
    inrPriceMonthly: 0,
    monthlyCredits: 100,
    bonusCredits: 0,
    channelLimit: 1,
    dailyReplyLimit: 50,
    features: [
      "100 total AI reply credits",
      "1 Connected Channel (YouTube)",
      "Keyword & Intent Rule Engine",
      "Manual replies 100% free",
      "Standard Community Support",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter Growth",
    usdPriceMonthly: 5,
    inrPriceMonthly: 399,
    monthlyCredits: 1000,
    bonusCredits: 100,
    channelLimit: 2,
    dailyReplyLimit: 200,
    features: [
      "1,000 monthly AI reply credits + 100 bonus",
      "Up to 2 connected social channels",
      "Basic AI reply generation",
      "Automated Golden-Hour polling",
      "Email support",
    ],
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "price_starter_monthly",
    razorpayPlanId: process.env.RAZORPAY_PLAN_STARTER || "plan_starter_monthly",
  },
  growth: {
    id: "growth",
    name: "Growth Brand",
    usdPriceMonthly: 10,
    inrPriceMonthly: 799,
    monthlyCredits: 4000,
    bonusCredits: 500,
    channelLimit: 5,
    dailyReplyLimit: 800,
    features: [
      "4,000 monthly AI reply credits + 500 bonus",
      "Up to 5 connected social channels",
      "RAG Product & FAQ Knowledge Base",
      "Negative Keyword Interception",
      "Priority Email & Chat Support",
    ],
    stripePriceId: process.env.STRIPE_PRICE_GROWTH || "price_growth_monthly",
    razorpayPlanId: process.env.RAZORPAY_PLAN_GROWTH || "plan_growth_monthly",
  },
  pro: {
    id: "pro",
    name: "Professional",
    usdPriceMonthly: 20,
    inrPriceMonthly: 1599,
    monthlyCredits: 9500,
    bonusCredits: 1500,
    channelLimit: 10,
    dailyReplyLimit: 2000,
    features: [
      "9,500 monthly AI reply credits + 1,500 bonus",
      "Up to 10 connected social channels",
      "Multi-Provider AI Router (Gemini + Claude)",
      "Team Member Collaboration (RBAC)",
      "WhatsApp Business API Integration",
      "Priority Queue Dispatch",
    ],
    stripePriceId: process.env.STRIPE_PRICE_PRO || "price_pro_monthly",
    razorpayPlanId: process.env.RAZORPAY_PLAN_PRO || "plan_pro_monthly",
  },
  business: {
    id: "business",
    name: "Enterprise Business",
    usdPriceMonthly: 40,
    inrPriceMonthly: 3199,
    monthlyCredits: 18000,
    bonusCredits: 3000,
    channelLimit: -1, // Unlimited
    dailyReplyLimit: 10000,
    features: [
      "18,000 monthly AI reply credits + 3,000 bonus",
      "Unlimited connected social channels",
      "Custom Enterprise RAG & PDF Ingestion",
      "Dedicated Webhook Triggers & API Keys",
      "Highest Priority Queue SLA",
      "Dedicated Account Manager",
    ],
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || "price_business_monthly",
    razorpayPlanId: process.env.RAZORPAY_PLAN_BUSINESS || "plan_business_monthly",
  },
};

export function getPlanConfig(tier: string): PlanConfig {
  const normalized = (tier || "free").toLowerCase().trim();
  // Map legacy 'premium' to 'growth'
  if (normalized === "premium") return SUBSCRIPTION_PLANS.growth;
  return SUBSCRIPTION_PLANS[normalized] || SUBSCRIPTION_PLANS.free;
}
