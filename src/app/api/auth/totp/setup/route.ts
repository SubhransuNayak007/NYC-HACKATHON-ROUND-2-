import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";
import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required to setup Google Authenticator" },
        { status: 400 }
      );
    }

    const safeEmail = email.toLowerCase().trim();
    const db = await getDB(safeEmail);

    // If TOTP secret already exists, reuse it or generate a fresh one
    let totpSecret = db.userSession?.quickLogin?.totpSecret;
    if (!totpSecret) {
      const secret = new Secret({ size: 20 });
      totpSecret = secret.base32;

      if (!db.userSession) {
        db.userSession = {
          email: safeEmail,
          name: safeEmail.split("@")[0],
          username: safeEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, ""),
          tier: "free",
          repliesToday: 0,
          lastResetDate: new Date().toISOString().split("T")[0],
        };
      }

      db.userSession.quickLogin = {
        ...(db.userSession.quickLogin || {}),
        totpSecret,
        totpEnabled: false,
        quickLoginEnabled: true,
      };

      await saveDB(db, safeEmail);
    }

    const totp = new TOTP({
      issuer: "QuickReply",
      label: safeEmail,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(totpSecret),
    });

    const totpUri = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(totpUri, {
      width: 220,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      success: true,
      email: safeEmail,
      totpSecret,
      totpUri,
      qrCodeDataUrl,
    });
  } catch (err) {
    console.error("[TOTP Setup] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate Google Authenticator secret" },
      { status: 500 }
    );
  }
}
