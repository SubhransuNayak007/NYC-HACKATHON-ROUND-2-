import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, WorkspaceMember } from "@/database/db";

export async function GET() {
  const db = await getDB();
  return NextResponse.json({
    workspace: db.workspace,
    activityLogs: db.activityLogs,
    userSession: db.userSession
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await getDB();

    if (body.settings) {
      // Whitelist allowed settings fields to prevent unauthorized field injection
      const allowedSettingsFields: Record<string, unknown> = {};

      if (typeof body.settings.dailyReplyQuota === "number") {
        // Clamp daily reply quota to a reasonable range
        allowedSettingsFields.dailyReplyQuota = Math.min(Math.max(1, Math.floor(body.settings.dailyReplyQuota)), 500);
      }
      if (Array.isArray(body.settings.blockedUsers)) {
        // Sanitize blocked users: only allow valid email strings
        allowedSettingsFields.blockedUsers = body.settings.blockedUsers
          .filter((u: unknown) => typeof u === "string" && u.length > 0 && u.length < 254)
          .slice(0, 100); // Limit to 100 blocked users
      }
      if (typeof body.settings.spamProtection === "boolean") {
        allowedSettingsFields.spamProtection = body.settings.spamProtection;
      }
      if (typeof body.settings.slackWebhook === "string") {
        // Validate webhook URL format if provided
        const url = body.settings.slackWebhook;
        if (url === "" || /^https:\/\/hooks\.slack\.com\/.+$/.test(url)) {
          allowedSettingsFields.slackWebhook = url;
        }
      }
      if (typeof body.settings.emailDigest === "string" && ["daily", "weekly", "none"].includes(body.settings.emailDigest)) {
        allowedSettingsFields.emailDigest = body.settings.emailDigest;
      }
      if (typeof body.settings.negativeKeywords === "string" && body.settings.negativeKeywords.length <= 1000) {
        allowedSettingsFields.negativeKeywords = body.settings.negativeKeywords;
      }
      if (body.settings.globalReplyConfig && typeof body.settings.globalReplyConfig === "object") {
        const grc: Record<string, unknown> = { ...db.workspace.settings.globalReplyConfig };
        const src = body.settings.globalReplyConfig;
        if (typeof src.replyToAll === "boolean") grc.replyToAll = src.replyToAll;
        if (typeof src.tags === "string" && src.tags.length <= 500) grc.tags = src.tags;
        if (typeof src.template === "string" && src.template.length <= 2000) grc.template = src.template;
        allowedSettingsFields.globalReplyConfig = grc;
      }
      // AI & Language settings
      if (typeof body.settings.defaultLanguage === "string" && body.settings.defaultLanguage.length <= 10) {
        allowedSettingsFields.defaultLanguage = body.settings.defaultLanguage;
      }
      if (typeof body.settings.autoTranslate === "boolean") {
        allowedSettingsFields.autoTranslate = body.settings.autoTranslate;
      }
      if (typeof body.settings.aiReplyEnabled === "boolean") {
        allowedSettingsFields.aiReplyEnabled = body.settings.aiReplyEnabled;
      }
      // Confidence gate (0-1): minimum RAG confidence before an auto-reply fires
      if (typeof body.settings.confidenceGate === "number") {
        allowedSettingsFields.confidenceGate = Math.min(1, Math.max(0, body.settings.confidenceGate));
      }
      // Golden-hour mode: prioritize comments on videos published in the last 60 min
      if (typeof body.settings.goldenHourEnabled === "boolean") {
        allowedSettingsFields.goldenHourEnabled = body.settings.goldenHourEnabled;
      }

      db.workspace.settings = {
        ...db.workspace.settings,
        ...allowedSettingsFields,
      };
    }

    if (body.name && typeof body.name === "string" && body.name.length > 0 && body.name.length <= 100) {
      db.workspace.name = body.name;
    }

    if (body.userSession) {
      // Only allow safe user session fields to be updated
      const allowedSession: Record<string, unknown> = {};
      if (typeof body.userSession.name === "string" && body.userSession.name.length <= 100) {
        allowedSession.name = body.userSession.name;
      }
      // Never allow tier, email, or repliesToday to be set via the API
      db.userSession = {
        ...(db.userSession as NonNullable<typeof db.userSession>),
        ...allowedSession
      };
    }


    await saveDB(db);
    await logActivity(db.userSession?.name || "Creator", "Updated workspace configuration parameters");

    return NextResponse.json({ 
      success: true, 
      workspace: db.workspace,
      userSession: db.userSession
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

// Invite team members
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
    }

    const db = await getDB();
    
    // Check if user already exists
    if (db.workspace.members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: "User is already a member of this workspace" }, { status: 400 });
    }

    // Generate a default name from the email
    const namePart = email.split("@")[0];
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._]/g, " ");

    const newMember: WorkspaceMember = {
      id: `m-${Date.now()}`,
      email,
      name: formattedName,
      role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=random&size=150`
    };

    db.workspace.members.push(newMember);
    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Invited team member ${formattedName} (${email}) as ${role}`);

    return NextResponse.json(newMember, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
  }
}
