import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/database/db";

/**
 * Feature 5: ROI Calculator settings
 * GET /api/analytics/roi - Get ROI data
 * PUT /api/analytics/roi - Update hourly rate
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json({ roiData: db.roiData });
}

export async function PUT(req: NextRequest) {
  try {
    const { hourlyRate } = await req.json();
    if (typeof hourlyRate !== "number" || hourlyRate < 0 || hourlyRate > 1000) {
      return NextResponse.json({ error: "Invalid hourly rate (0-1000)" }, { status: 400 });
    }
    const db = await getDB();
    if (db.roiData) {
      db.roiData.hourlyRate = hourlyRate;
      // Recalculate money saved
      db.roiData.moneySavedThisWeek = Math.round(db.roiData.hoursSavedThisWeek * hourlyRate);
      db.roiData.moneySavedThisMonth = Math.round(db.roiData.hoursSavedThisMonth * hourlyRate);
      db.roiData.allTimeMoneySaved = Math.round(db.roiData.allTimeHoursSaved * hourlyRate);
    }
    await saveDB(db);
    return NextResponse.json({ roiData: db.roiData });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update ROI settings" }, { status: 500 });
  }
}
