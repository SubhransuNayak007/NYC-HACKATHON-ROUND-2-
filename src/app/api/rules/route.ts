import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDB, saveDB, logActivity, Rule } from "@/database/db";
import { sanitize, checkBodySize, safeError } from '@/backend/security';
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders } from "@/backend/ratelimit";

export async function GET() {
  const db = await getDB();
  const sortedRules = [...db.rules].sort((a, b) => a.priority - b.priority);
  return NextResponse.json(sortedRules);
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("session_email")?.value || "unknown";
    const rl = await checkRateLimit(`rules:${email}`, RATE_LIMITS.API);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const body = await req.json();
    if (!checkBodySize(req)) {
      return NextResponse.json({ error: 'Request payload too large' }, { status: 413 });
    }
    const {
      name,
      conditions,
      operator,
      filters,
      templateId,
      delaySeconds,
      dailyLimit,
      colorLabel,
      customVariable1,
      customVariable2,
      customVariable3,
      approvalMode
    } = body;

    const cleanName = sanitize(name);
    const cleanCv1 = sanitize(customVariable1);
    const cleanCv2 = sanitize(customVariable2);
    const cleanCv3 = sanitize(customVariable3);

    if (!cleanName) {
      return NextResponse.json({ error: "Missing rule name" }, { status: 400 });
    }

    const db = await getDB();
    
    // Determine priority (max priority + 1)
    const maxPriority = db.rules.reduce((max, r) => r.priority > max ? r.priority : max, 0);
    
    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      name: cleanName,
      isActive: true,
      priority: maxPriority + 1,
      colorLabel: colorLabel || "blue",
      conditions: conditions || [],
      operator: operator || "OR",
      filters: filters || { topLevelOnly: true, maxRepliesPerUser: 5, language: "auto" },
      templateId: templateId || "",
      delaySeconds: delaySeconds ?? 180,
      dailyLimit: dailyLimit ?? 50,
      customVariable1: cleanCv1,
      customVariable2: cleanCv2,
      customVariable3: cleanCv3,
      approvalMode: approvalMode || "autonomous"
    };

    db.rules.push(newRule);
    await saveDB(db);

    await logActivity(db.userSession?.name || "Creator", `Created rule '${cleanName}'`);

    return NextResponse.json(newRule, { status: 201 });
  } catch (err) {
    return safeError(err, "Failed to create rule");
  }
}
