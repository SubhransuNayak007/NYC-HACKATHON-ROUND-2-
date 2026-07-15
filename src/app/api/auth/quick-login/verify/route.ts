import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const trimmedCode = code.trim();

    // Find user with this quick login code
    const cookieStore = await cookies();
    const email = cookieStore.get("session_email")?.value;

    // Try current session first
    let matchedEmail = email;

    if (matchedEmail) {
      const db = await getDB(matchedEmail);

      if (db.userSession?.quickLogin?.quickLoginEnabled) {
        const quickLogin = db.userSession.quickLogin;

        // Check secret code (6-digit)
        if (trimmedCode.length === 6 && /^\d{6}$/.test(trimmedCode)) {
          const isValidSecret = await bcrypt.compare(trimmedCode, quickLogin.secretCodeHash);
          if (isValidSecret) {
            // Set session cookie
            const cookieStore = await cookies();
            cookieStore.set("session_email", matchedEmail.toLowerCase().trim(), {
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 90 // 90 days (3 months)
            });

            return NextResponse.json({
              success: true,
              email: matchedEmail,
              name: db.userSession.name
            });
          }
        }

        // Check TOTP code (6-digit)
        if (trimmedCode.length === 6 && /^\d{6}$/.test(trimmedCode)) {
          const totp = new TOTP({
            issuer: "QuickReply",
            label: matchedEmail,
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: Secret.fromBase32(quickLogin.totpSecret)
          });

          const delta = totp.validate({ token: trimmedCode, window: 1 });
          if (delta !== null) {
            // Mark TOTP as enabled
            quickLogin.totpEnabled = true;

            // Set session cookie
            const cookieStore = await cookies();
            cookieStore.set("session_email", matchedEmail.toLowerCase().trim(), {
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 90 // 90 days (3 months)
            });

            return NextResponse.json({
              success: true,
              email: matchedEmail,
              name: db.userSession.name
            });
          }
        }
      }
    }

    // Invalid code
    return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 401 });

  } catch (err) {
    console.error("[QuickLogin Verify] Error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}