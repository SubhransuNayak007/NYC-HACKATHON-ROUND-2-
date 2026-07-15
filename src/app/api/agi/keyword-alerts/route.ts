/**
 * GET  /api/agi/keyword-alerts  — list alerts
 * POST /api/agi/keyword-alerts  — create alert
 * DELETE /api/agi/keyword-alerts?id=xxx — delete alert
 */

import { NextResponse } from 'next/server';
import { getDB, saveDB } from '@/database/db';
import { createKeywordAlert, seedDefaultKeywordAlerts } from '@/backend/agi/KeywordAlertEngine';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await seedDefaultKeywordAlerts();
    const db = await getDB();
    return NextResponse.json({ alerts: db.keywordAlerts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { keyword, type = 'custom', platforms, alertViaWhatsApp, alertViaDashboard, caseSensitive } = body;
    if (!keyword) return NextResponse.json({ error: 'keyword required' }, { status: 400 });

    const alert = await createKeywordAlert(keyword, type, {
      platforms,
      alertViaWhatsApp,
      alertViaDashboard,
      caseSensitive,
    });

    return NextResponse.json({ ok: true, alert });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = await getDB();
    if (!db.keywordAlerts) return NextResponse.json({ ok: true });
    db.keywordAlerts = db.keywordAlerts.filter(a => a.id !== id);
    await saveDB(db);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
