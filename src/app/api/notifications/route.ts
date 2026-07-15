import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";

/**
 * Feature 9: Smart Notifications
 * GET /api/notifications - Fetch notification log, milestones, and quota warnings
 * PUT /api/notifications - Mark notifications/milestones/warnings as read
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json({
    logs: db.notificationLog || [],
    milestones: db.milestones || [],
    quotaWarnings: db.quotaWarnings || [],
  });
}

export async function PUT(req: NextRequest) {
  try {
    const { action, ids, type } = await req.json();
    
    // action: "mark_read" | "dismiss"
    // type: "logs" | "milestones" | "warnings"

    const db = await getDB();

    if (type === "milestones" && db.milestones) {
      db.milestones = db.milestones.map(m => 
        ids.includes(m.id) ? { ...m, notified: true } : m
      );
    } 
    else if (type === "warnings" && db.quotaWarnings) {
      db.quotaWarnings = db.quotaWarnings.map(w => 
        ids.includes(w.id) ? { ...w, acknowledged: true } : w
      );
    }
    // Note: notificationLog doesn't have an "acknowledged" field in DB schema, 
    // it's mostly a historical log of sent messages. We can delete them on dismiss.
    else if (type === "logs" && db.notificationLog) {
      if (action === "dismiss") {
        db.notificationLog = db.notificationLog.filter(log => !ids.includes(log.id));
      }
    }

    await saveDB(db);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
