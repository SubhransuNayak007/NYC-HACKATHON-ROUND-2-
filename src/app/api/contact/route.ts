import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/database/db";

// In-memory rate limiter: max 5 requests per IP per 10 minutes
const ipRateMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const entry = ipRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= 5) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many contact inquiries from this IP. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { inquiryType, name, email, phone, brand, message, website_hp } = body;

    // Honeypot spam check - bots filling invisible field
    if (website_hp) {
      return NextResponse.json({
        success: true,
        message: "Your inquiry has been received.",
      });
    }

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Please enter a valid name (at least 2 characters)." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid work email address." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json(
        { error: "Please enter a message (at least 5 characters)." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanInquiry = inquiryType || "general";
    const cleanPhone = (phone || "").trim();
    const cleanBrand = (brand || "").trim();
    const cleanMessage = message.trim();

    // Log the contact inquiry to the database activity log
    await logActivity(
      cleanName,
      `[Contact Form - ${cleanInquiry.toUpperCase()}] Email: ${cleanEmail} | Brand: ${cleanBrand || "N/A"} | Msg: "${cleanMessage.slice(0, 100)}..."`
    );

    return NextResponse.json({
      success: true,
      message: "Your inquiry has been received. Our team will contact you within 2 hours.",
    });
  } catch (err: any) {
    console.error("[Contact API] Error handling request:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
