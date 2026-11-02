/**
 * /api/youtube/automations
 * GET  — list all automations for the authenticated workspace (Mongo + DBData fallback)
 * POST — create a new automation (persists to both Mongo collection and DBData rules)
 * PATCH — toggle status (active/paused) across both stores
 * DELETE — delete automation across both stores
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDB, saveDB, Rule } from "@/database/db";
import { getSessionUser, getCanonicalTenantId } from "@/backend/auth";
import {
  getYTAutomationsCollection,
  getYTAutomationVersionsCollection,
  ensureYouTubeIndexes,
  isMongoAvailable,
  type YTAutomation,
} from "@/database/youtube-collections";
import { initSyncState } from "@/backend/youtube-sync";
import { AutomationRule, ScopeTargetType } from "@/backend/rules/types";

export const dynamic = "force-dynamic";

function getWorkspaceId(req: NextRequest): string {
  try {
    const session = getSessionUser(req);
    if (session?.email) return getCanonicalTenantId(session.email);
  } catch {}
  return "default_workspace";
}

// ─── GET /api/youtube/automations ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const workspaceId = getWorkspaceId(req);

  try {
    const automationsMap = new Map<string, YTAutomation>();

    // 1. Fetch from dedicated MongoDB collection if available
    if (isMongoAvailable()) {
      try {
        await ensureYouTubeIndexes();
        const col = await getYTAutomationsCollection();
        if (col) {
          const { searchParams } = new URL(req.url);
          const statusFilter = searchParams.get("status");
          const videoId = searchParams.get("videoId");

          const filter: any = { workspaceId };
          if (statusFilter) filter.status = statusFilter;
          if (videoId) {
            filter.$or = [
              { "scope.videoId": videoId },
              { "scope.videoIds": videoId },
              { "scope.videoId": { $exists: false }, "scope.videoIds": { $exists: false } },
            ];
          }

          const mongoAutomations = await col
            .find(filter)
            .sort({ priority: 1, createdAt: -1 })
            .limit(200)
            .toArray();

          for (const a of mongoAutomations) {
            automationsMap.set(a.id, a);
          }
        }
      } catch (mongoErr) {
        console.warn("[YT-Automations] Mongo fetch non-fatal:", mongoErr);
      }
    }

    // 2. Fetch from DBData (db.automationRules and db.rules)
    try {
      const db = await getDB(workspaceId);

      // Map db.automationRules
      const automationRules: AutomationRule[] = db.automationRules || [];
      for (const ar of automationRules) {
        if (!automationsMap.has(ar.id)) {
          const condsAny = ar.conditions as any;
          const primaryKeyword =
            condsAny?.children?.[0]?.value ||
            (condsAny?.field === "comment.text" ? condsAny?.value : "") ||
            ar.intentConfig?.expectedIntent ||
            "Keyword trigger";

          automationsMap.set(ar.id, {
            id: ar.id,
            workspaceId,
            name: ar.name,
            description: ar.description,
            platform: "youtube",
            status: ar.status === "PUBLISHED" ? "ACTIVE" : "PAUSED",
            executionMode: (ar.mode as any) || "TAG",
            activeVersionId: `v_${ar.version || 1}`,
            scope: {
              targetType: ar.scope?.targetType as any,
              videoIds: ar.scope?.targetIds,
            } as any,
            conditions: [
              {
                id: `c_${ar.id}`,
                type: "contains",
                value: Array.isArray(primaryKeyword) ? primaryKeyword.join(", ") : String(primaryKeyword || "Keyword match"),
              },
            ],
            action: {
              type: "reply",
              replyTemplate: ar.actionPlan?.templateText || "Thanks for your comment!",
              delay: ar.delays?.seconds || 0,
            },
            priority: ar.priority || 50,
            createdBy: ar.tenantId || workspaceId,
            createdAt: ar.createdAt || new Date().toISOString(),
            updatedAt: ar.updatedAt || new Date().toISOString(),
            execCountToday: 0,
            execCountTotal: ar.executionStats?.timesMatched || 0,
          });
        }
      }

      // Map db.rules
      const standardRules: Rule[] = db.rules || [];
      for (const r of standardRules) {
        if (!automationsMap.has(r.id)) {
          const triggerKeywords = r.conditions?.map((c) => c.value).filter(Boolean).join(", ") || "Keyword match";
          automationsMap.set(r.id, {
            id: r.id,
            workspaceId,
            name: r.name,
            platform: "youtube",
            status: r.isActive ? "ACTIVE" : "PAUSED",
            executionMode: "TAG",
            activeVersionId: "v1",
            scope: {},
            conditions: r.conditions?.map((c) => ({
              id: c.id,
              type: (c.type as any) || "contains",
              value: c.value,
            })) || [{ id: `c_${r.id}`, type: "contains", value: triggerKeywords }],
            action: {
              type: "reply",
              replyTemplate: r.customVariable1 || "Auto-reply from QuickReply",
              delay: r.delaySeconds || 0,
            },
            priority: r.priority || 50,
            createdBy: workspaceId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            execCountToday: 0,
            execCountTotal: 0,
          });
        }
      }
    } catch (dbErr) {
      console.warn("[YT-Automations] DB fetch non-fatal:", dbErr);
    }

    const automations = Array.from(automationsMap.values()).sort((a, b) => (a.priority || 50) - (b.priority || 50));

    return NextResponse.json({
      automations,
      count: automations.length,
    });
  } catch (err: any) {
    console.error("[YT-Automations] GET fatal error:", err);
    return NextResponse.json({ error: "Failed to load automations", automations: [], count: 0 }, { status: 200 });
  }
}

// ─── POST /api/youtube/automations ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const workspaceId = getWorkspaceId(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, conditions, action, scope, executionMode } = body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!action?.replyTemplate || typeof action.replyTemplate !== "string") {
    return NextResponse.json({ error: "action.replyTemplate is required" }, { status: 400 });
  }

  const automationId = `auto_${crypto.randomUUID()}`;
  const versionId = `ver_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const safeConditions = Array.isArray(conditions) && conditions.length > 0 ? conditions : [{ id: "c_default", type: "contains", value: "" }];

  const automation: YTAutomation = {
    id: automationId,
    workspaceId,
    name: name.trim(),
    description: body.description?.trim(),
    platform: "youtube",
    status: body.publishImmediately ? "ACTIVE" : "DRAFT",
    executionMode: executionMode || "TAG",
    activeVersionId: body.publishImmediately ? versionId : null,
    scope: {
      channelId: scope?.channelId || undefined,
      videoId: scope?.videoId || undefined,
      videoIds: scope?.videoIds || undefined,
    },
    conditions: safeConditions,
    action: {
      type: "reply",
      replyTemplate: action.replyTemplate.trim(),
      delay: typeof action.delay === "number" ? action.delay : 0,
    },
    rateLimit: body.rateLimit,
    safety: body.safety ?? { skipSpam: true, skipNegative: false },
    priority: typeof body.priority === "number" ? body.priority : 50,
    createdBy: workspaceId,
    createdAt: now,
    updatedAt: now,
    publishedAt: body.publishImmediately ? now : undefined,
    execCountToday: 0,
    execCountTotal: 0,
  };

  // 1. Save to MongoDB if available
  if (isMongoAvailable()) {
    try {
      await ensureYouTubeIndexes();
      const col = await getYTAutomationsCollection();
      const versionsCol = await getYTAutomationVersionsCollection();
      if (col && versionsCol) {
        await col.insertOne(automation);
        await versionsCol.insertOne({
          id: versionId,
          automationId,
          workspaceId,
          version: 1,
          compiledDefinition: { ...automation },
          createdBy: workspaceId,
          createdAt: now,
          publishedAt: body.publishImmediately ? now : undefined,
        });
      }
    } catch (mongoErr) {
      console.warn("[YT-Automations] Mongo insert non-fatal:", mongoErr);
    }
  }

  // 2. ALSO save to DBData (both db.rules and db.automationRules) for 100% durability
  try {
    const db = await getDB(workspaceId);
    if (!db.rules) db.rules = [];
    if (!db.automationRules) db.automationRules = [];

    const standardRule: Rule = {
      id: automationId,
      name: automation.name,
      isActive: automation.status === "ACTIVE",
      priority: automation.priority,
      colorLabel: "blue",
      conditions: safeConditions.map((c: any) => ({
        id: c.id || `c_${Math.random()}`,
        type: c.type || "contains",
        value: c.value || "",
      })),
      operator: "OR",
      filters: { topLevelOnly: true, maxRepliesPerUser: 5, language: "auto" },
      templateId: "",
      delaySeconds: automation.action.delay || 60,
      dailyLimit: 100,
      customVariable1: automation.action.replyTemplate,
      customVariable2: "",
      customVariable3: "",
      approvalMode: "autonomous",
    };

    db.rules.unshift(standardRule);

    const autoEngineRule: AutomationRule = {
      id: automationId,
      tenantId: workspaceId,
      workspaceId: `ws_${workspaceId}`,
      name: automation.name,
      description: automation.description || "",
      mode: automation.executionMode as any,
      status: automation.status === "ACTIVE" ? "PUBLISHED" : "DRAFT",
      version: 1,
      priority: automation.priority,
      scope: {
        targetType: (automation.scope?.videoId ? "SELECTED_VIDEOS" : "ALL_VIDEOS") as ScopeTargetType,
        targetIds: automation.scope?.videoIds || (automation.scope?.videoId ? [automation.scope.videoId] : []),
        platforms: ["youtube"],
      },
      conditions: {
        type: "leaf",
        field: "comment.text",
        operator: "contains",
        value: safeConditions.map((c: any) => c.value).join(", "),
      },
      actionPlan: {
        actionType: "reply_comment",
        templateText: automation.action.replyTemplate,
      },
      stopConditions: {
        stopAfterMatch: true,
        stopIfActionSucceeds: true,
        stopIfHighRisk: true,
        maxActionsPerComment: 1,
      },
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      executionStats: {
        timesEvaluated: 0,
        timesMatched: 0,
        actionsExecuted: 0,
        actionsBlocked: 0,
        avgLatencyMs: 0,
      },
    };

    db.automationRules.unshift(autoEngineRule);

    await saveDB(db, workspaceId);
  } catch (dbErr) {
    console.error("[YT-Automations] DB save error:", dbErr);
  }

  // 3. Initialize sync state for video if scoped
  const targetVideoId = scope?.videoId;
  const targetChannelId = scope?.channelId;
  if (targetVideoId && targetChannelId) {
    try {
      await initSyncState(workspaceId, targetVideoId, targetChannelId, {
        automationEnabled: true,
        ragEnabled: executionMode === "RAG" || executionMode === "HYBRID",
        priority: "high",
      });
    } catch {}
  }

  return NextResponse.json(
    { success: true, automation, versionId },
    { status: 201 }
  );
}

// ─── PATCH /api/youtube/automations ──────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const workspaceId = getWorkspaceId(req);

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, status } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const isNowActive = status === "ACTIVE" || status === "PUBLISHED" || status === "active";

  // 1. Update in MongoDB
  if (isMongoAvailable()) {
    try {
      const col = await getYTAutomationsCollection();
      if (col) {
        await col.updateOne(
          { id, workspaceId },
          { $set: { status: isNowActive ? "ACTIVE" : "PAUSED", updatedAt: new Date().toISOString() } }
        );
      }
    } catch {}
  }

  // 2. Update in DBData
  try {
    const db = await getDB(workspaceId);
    if (db.rules) {
      const rIdx = db.rules.findIndex((r) => r.id === id);
      if (rIdx !== -1) {
        db.rules[rIdx].isActive = isNowActive;
      }
    }
    if (db.automationRules) {
      const aIdx = db.automationRules.findIndex((a) => a.id === id);
      if (aIdx !== -1) {
        db.automationRules[aIdx].status = isNowActive ? "PUBLISHED" : "PAUSED";
        db.automationRules[aIdx].updatedAt = new Date().toISOString();
      }
    }
    await saveDB(db, workspaceId);
  } catch {}

  return NextResponse.json({ success: true, id, status: isNowActive ? "ACTIVE" : "PAUSED" });
}

// ─── DELETE /api/youtube/automations ─────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const workspaceId = getWorkspaceId(req);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

  // 1. Delete from MongoDB
  if (isMongoAvailable()) {
    try {
      const col = await getYTAutomationsCollection();
      if (col) {
        await col.deleteOne({ id, workspaceId });
      }
    } catch {}
  }

  // 2. Delete from DBData (both db.rules and db.automationRules)
  try {
    const db = await getDB(workspaceId);
    if (db.rules) {
      db.rules = db.rules.filter((r) => r.id !== id);
    }
    if (db.automationRules) {
      db.automationRules = db.automationRules.filter((a) => a.id !== id);
    }
    await saveDB(db, workspaceId);
  } catch {}

  return NextResponse.json({ success: true, deleted: id });
}
