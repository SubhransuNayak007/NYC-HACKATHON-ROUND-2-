import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";
import { cookies } from "next/headers";
import { getUserFromCookies } from "@/backend/auth";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    // Accept session_email or JWT token
    let email = cookieStore.get("session_email")?.value;
    if (!email) {
      const user = getUserFromCookies(cookieStore.get("qr_access_token")?.value ? `qr_access_token=${cookieStore.get("qr_access_token")?.value}` : null);
      if (user) email = user.sub;
    }

    if (!email) {
      return NextResponse.json({ configured: false, quickLoginEnabled: false });
    }

    const db = await getDB(email);

    if (!db.userSession?.quickLogin) {
      return NextResponse.json({ configured: false, quickLoginEnabled: false });
    }

    return NextResponse.json({
      configured: true,
      quickLoginEnabled: db.userSession.quickLogin.quickLoginEnabled,
      totpEnabled: db.userSession.quickLogin.totpEnabled,
      totpSecret: db.userSession.quickLogin.totpSecret,
    });

  } catch (err) {
    console.error("[QuickLogin Status] Error:", err);
    return NextResponse.json({ configured: false, quickLoginEnabled: false });
  }
}