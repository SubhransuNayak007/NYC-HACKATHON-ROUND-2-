import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";
import { cookies } from "next/headers";
import { getUserFromCookies } from "@/backend/auth";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

/** Helper: extract email from cookies (session_email or JWT) */
function getEmailFromCookies(cookieStore: any): string | null {
  let email = cookieStore.get("session_email")?.value;
  if (email) return email;
  const jwtCookie = cookieStore.get("qr_access_token")?.value;
  if (jwtCookie) {
    const user = getUserFromCookies(`qr_access_token=${jwtCookie}`);
    if (user) return user.sub;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const email = getEmailFromCookies(cookieStore);

    if (!email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = await getDB(email);

    // If already configured, return existing setup (never regenerate)
    if (db.userSession?.quickLogin?.totpSecret && db.userSession?.quickLogin?.quickLoginEnabled) {
      const existingTotp = new TOTP({ secret: Secret.fromBase32(db.userSession.quickLogin.totpSecret) });
      const qrCodeDataUrl = await QRCode.toDataURL(existingTotp.toString(), {
        width: 256, margin: 2,
        color: { dark: "#000000", light: "#ffffff" }
      });

      return NextResponse.json({
        secretCode: "••••••",  // Already shown — don't expose again
        totpUri: existingTotp.toString(),
        qrCodeDataUrl,
        totpSecret: db.userSession.quickLogin.totpSecret,
        alreadyConfigured: true
      });
    }

    // Generate new 6-digit secret code (one-time only)
    const secretCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create TOTP instance
    const totp = new TOTP({
      issuer: "QuickReply",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: new Secret({ size: 20 })
    });

    // Hash the secret code
    const secretCodeHash = await bcrypt.hash(secretCode, 10);

    // Store in database — permanent, never overwritten
    if (db.userSession) {
      db.userSession.quickLogin = {
        secretCodeHash,
        secretCodePlain: secretCode,
        totpSecret: totp.secret.base32,
        totpEnabled: false,
        quickLoginEnabled: true
      };
      await saveDB(db, email);
    }

    // Generate QR code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(totp.toString(), {
      width: 256, margin: 2,
      color: { dark: "#000000", light: "#ffffff" }
    });

    return NextResponse.json({
      secretCode,
      totpUri: totp.toString(),
      qrCodeDataUrl,
      totpSecret: totp.secret.base32,
      alreadyConfigured: false
    });

  } catch (err) {
    console.error("[QuickLogin Setup] Error:", err);
    return NextResponse.json({ error: "Failed to setup quick login" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const email = getEmailFromCookies(cookieStore);

    if (!email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = await getDB(email);

    if (!db.userSession?.quickLogin) {
      return NextResponse.json({ configured: false });
    }

    return NextResponse.json({
      configured: true,
      quickLoginEnabled: db.userSession.quickLogin.quickLoginEnabled,
      totpEnabled: db.userSession.quickLogin.totpEnabled,
      hasSecretCode: true
    });

  } catch (err) {
    console.error("[QuickLogin Setup] GET Error:", err);
    return NextResponse.json({ error: "Failed to check quick login status" }, { status: 500 });
  }
}