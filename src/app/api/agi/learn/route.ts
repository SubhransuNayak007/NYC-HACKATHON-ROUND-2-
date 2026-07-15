/**
 * POST /api/agi/learn
 * Cron endpoint — triggers AGI learning cycle.
 * Called every 15 minutes by cron_manager or external cron.
 */

import { NextResponse } from 'next/server';
import { runLearningCycle } from '@/backend/agi/ContinuousLearningEngine';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  // Basic auth check (cron secret)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runLearningCycle();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[AGI] /api/agi/learn error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

// Allow GET for easy manual triggering in dev
export async function GET(req: Request) {
  return POST(req);
}
