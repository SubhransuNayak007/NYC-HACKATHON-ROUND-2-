import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, logActivity, Rule } from "@/database/db";
import { sanitize, checkBodySize, safeError, validateSafeRegex } from '@/backend/security';
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders } from "@/backend/ratelimit";
import { getSession, requireTenantAccess } from "@/backend/auth/guard";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    const tenantEmail = session?.email;
    const db = await getDB(tenantEmail);
    const sortedRules = [...(db.rules || [])].sort((a, b) => a.priority - b.priority);
    return NextResponse.json(sortedRules, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    return safeError(err, "Failed to fetch rules");
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireTenantAccess(req, undefined, "MEMBER");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const { session } = authResult;
    const tenantEmail = session.email;

    const rl = await checkRateLimit(`rules:${tenantEmail}`, RATE_LIMITS.API);
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

    // Validate conditions and check for ReDoS patterns
    const safeConditions = Array.isArray(conditions) ? conditions.slice(0, 20) : [];
    for (const cond of safeConditions) {
      if (cond && typeof cond.value === "string" && (cond.type === "regex" || cond.operator === "matches_regex")) {
        const regexCheck = validateSafeRegex(cond.value);
        if (!regexCheck.isSafe) {
          return NextResponse.json({ error: `Invalid rule regex: ${regexCheck.reason}` }, { status: 400 });
        }
      }
    }

    const db = await getDB(tenantEmail);
    if (!db.rules) db.rules = [];
    
    // Determine priority (max priority + 1)
    const maxPriority = db.rules.reduce((max, r) => r.priority > max ? r.priority : max, 0);
    
    const newRule: Rule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      isActive: true,
      priority: maxPriority + 1,
      colorLabel: colorLabel || "blue",
      conditions: safeConditions,
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
    await saveDB(db, tenantEmail);

    await logActivity(db.userSession?.name || "Creator", `Created rule '${cleanName}'`);

    return NextResponse.json(newRule, { status: 201 });
  } catch (err) {
    return safeError(err, "Failed to create rule");
  }
}
