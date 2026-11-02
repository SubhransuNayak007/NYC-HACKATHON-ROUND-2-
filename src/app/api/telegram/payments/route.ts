/**
 * ============================================================
 *  GET  /api/telegram/payments
 *  POST /api/telegram/payments
 *
 *  Manages Telegram Stars & Native Invoices and Transaction Logs.
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDB, saveDB, type TelegramPayment } from "@/database/db";

export async function GET(req: NextRequest) {
  try {
    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);

    const payments = db.telegramPayments || [];
    const totalRevenue = payments
      .filter((p) => p.status === "SUCCESSFUL")
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      success: true,
      payments,
      totalRevenue,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load payments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegramUserId, invoiceId, productId, currency = "XTR", amount = 100 } = body;

    const sessionEmail = req.cookies.get("session_email")?.value || process.env.OWNER_EMAIL || "subhransu.nayak.418@gmail.com";
    const db = await getDB(sessionEmail);
    if (!db.telegramPayments) db.telegramPayments = [];

    const newPayment: TelegramPayment = {
      id: `tgpay_${uuidv4().substring(0, 8)}`,
      tenantId: sessionEmail,
      connectionId: db.telegramConnections?.[0]?.id || "default_conn",
      providerPaymentId: `tg_charge_${Date.now()}`,
      telegramUserId: String(telegramUserId || "user_71829"),
      invoiceId: invoiceId || `inv_${Date.now()}`,
      productId: productId || "prod_pro_plan",
      currency,
      amount,
      status: "SUCCESSFUL",
      payloadHash: `hash_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.telegramPayments.unshift(newPayment);
    await saveDB(db, sessionEmail);

    return NextResponse.json({
      success: true,
      payment: newPayment,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record payment" },
      { status: 500 }
    );
  }
}
