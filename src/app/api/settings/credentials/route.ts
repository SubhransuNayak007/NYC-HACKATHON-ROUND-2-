import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity } from "@/database/db";

export async function GET() {
  try {
    const db = await getDB();
    const credentials = db.workspace?.settings?.customCredentials || {};
    return NextResponse.json({ success: true, credentials });
  } catch (error) {
    console.error("Error fetching custom credentials:", error);
    return NextResponse.json({ error: "Failed to load credentials" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credentials } = body;

    if (!credentials || typeof credentials !== "object") {
      return NextResponse.json({ error: "Invalid credentials object" }, { status: 400 });
    }

    const db = await getDB();
    if (!db.workspace) {
      db.workspace = {
        name: "My Workspace",
        members: [],
        settings: {
          dailyReplyQuota: 500,
          blockedUsers: [],
          spamProtection: true,
          slackWebhook: "",
          emailDigest: "weekly",
        },
      };
    }

    if (!db.workspace.settings) {
      db.workspace.settings = {
        dailyReplyQuota: 500,
        blockedUsers: [],
        spamProtection: true,
        slackWebhook: "",
        emailDigest: "weekly",
      };
    }

    // Merge existing credentials with new updates
    const current = db.workspace.settings.customCredentials || {};
    db.workspace.settings.customCredentials = {
      ...current,
      ...credentials,
    };

    await saveDB(db);

    await logActivity(
      "CREDENTIALS_UPDATED",
      `Creator configured custom Client ID & Secret for platforms: ${Object.keys(credentials).join(", ")}`
    );

    return NextResponse.json({
      success: true,
      message: "Client ID & Secret configured successfully. Your real channels will now use these credentials!",
      credentials: db.workspace.settings.customCredentials,
    });
  } catch (error) {
    console.error("Error saving custom credentials:", error);
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}
