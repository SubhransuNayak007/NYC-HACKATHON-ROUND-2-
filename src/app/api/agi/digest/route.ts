/**
 * GET /api/agi/digest
 * Returns today's feedback digest — the most useful comments identified by the AGI.
 */

import { NextResponse } from 'next/server';
import { getDB } from '@/database/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = await getDB();
    const comments = (db.agiLearnedComments || []);

    // Get today's useful comments
    const today = new Date().toISOString().split('T')[0];
    const todayComments = comments.filter(c =>
      c.processedAt.startsWith(today) && c.isUsefulFeedback
    );

    // Sort by usefulness score
    todayComments.sort((a, b) => b.usefulnessScore - a.usefulnessScore);

    const digest = {
      date: today,
      totalProcessed: comments.filter(c => c.processedAt.startsWith(today)).length,
      usefulCount: todayComments.length,
      topComments: todayComments.slice(0, 10).map(c => ({
        id: c.id,
        text: c.text,
        authorName: c.authorName,
        platform: c.platform,
        videoTitle: c.videoTitle,
        classification: c.classification,
        sentiment: c.sentiment,
        usefulnessScore: c.usefulnessScore,
        replyGenerated: c.replyGenerated,
        replyStatus: c.replyStatus,
        replyConfidence: c.replyConfidence,
        timestamp: c.timestamp,
      })),
      audienceKnowledge: db.audienceKnowledge
        ? {
            topQuestions: (db.audienceKnowledge.topQuestions || []).slice(0, 5),
            recurringComplaints: (db.audienceKnowledge.recurringComplaints || []).slice(0, 5),
            recurringPraises: (db.audienceKnowledge.recurringPraises || []).slice(0, 5),
            sentimentTrend: (db.audienceKnowledge.sentimentTrend || []).slice(-14),
            totalCommentsProcessed: db.audienceKnowledge.totalCommentsProcessed,
          }
        : null,
    };

    return NextResponse.json(digest);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
