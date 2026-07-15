/**
 * ============================================================
 * QuickReply AGI — Audience Knowledge Graph
 * src/backend/agi/AudienceKnowledgeGraph.ts
 *
 * Maintains and updates the persistent knowledge graph of
 * what the AI has learned about your audience from comments.
 * Gets smarter with every learning cycle.
 * ============================================================
 */

import { getDB, saveDB, type AudienceKnowledge, type LearnedComment } from '@/database/db';

/**
 * Update the audience knowledge graph with insights from a batch of new comments.
 */
export async function updateAudienceKnowledge(comments: LearnedComment[]): Promise<void> {
  const db = await getDB();
  if (!db.audienceKnowledge) {
    db.audienceKnowledge = {
      topQuestions: [],
      recurringPraises: [],
      recurringComplaints: [],
      featureRequests: [],
      audienceLanguagePatterns: [],
      sentimentTrend: [],
      topTestimonials: [],
      competitorMentions: [],
      totalCommentsProcessed: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  const kg = db.audienceKnowledge;
  const today = new Date().toISOString().split('T')[0];

  for (const comment of comments) {
    kg.totalCommentsProcessed++;

    // Questions
    if (comment.classification === 'question') {
      const existing = kg.topQuestions.find(
        q => q.question.toLowerCase().includes(comment.text.slice(0, 40).toLowerCase())
      );
      if (existing) {
        existing.frequency++;
        existing.lastSeen = comment.timestamp;
      } else {
        kg.topQuestions.push({
          question: comment.text.slice(0, 200),
          frequency: 1,
          lastSeen: comment.timestamp,
        });
      }
      // Keep top 30 questions by frequency
      kg.topQuestions.sort((a, b) => b.frequency - a.frequency);
      kg.topQuestions = kg.topQuestions.slice(0, 30);
    }

    // Praises (testimonials)
    if (comment.classification === 'testimonial') {
      kg.topTestimonials.push({
        text: comment.text.slice(0, 300),
        author: comment.authorName,
        likes: comment.likes,
        platform: comment.platform,
        commentId: comment.commentId,
      });
      // Keep top 20 by likes
      kg.topTestimonials.sort((a, b) => b.likes - a.likes);
      kg.topTestimonials = kg.topTestimonials.slice(0, 20);
    }

    // Complaints
    if (comment.classification === 'actionable_feedback' || comment.classification === 'bug_report') {
      const topic = extractMainTopic(comment.text);
      const existing = kg.recurringComplaints.find(c => c.topic === topic);
      if (existing) {
        existing.frequency++;
        existing.urgency = existing.frequency > 5 ? 'high' : existing.frequency > 2 ? 'medium' : 'low';
      } else {
        kg.recurringComplaints.push({
          topic,
          frequency: 1,
          urgency: 'low',
          exampleComment: comment.text.slice(0, 200),
        });
      }
      kg.recurringComplaints.sort((a, b) => b.frequency - a.frequency);
      kg.recurringComplaints = kg.recurringComplaints.slice(0, 20);
    }

    // Feature requests
    if (comment.classification === 'feature_request') {
      const req = comment.text.slice(0, 200);
      const existing = kg.featureRequests.find(
        f => f.request.toLowerCase().slice(0, 30) === req.toLowerCase().slice(0, 30)
      );
      if (existing) {
        existing.votes++;
      } else {
        kg.featureRequests.push({ request: req, votes: 1, firstSeen: comment.timestamp });
      }
      kg.featureRequests.sort((a, b) => b.votes - a.votes);
      kg.featureRequests = kg.featureRequests.slice(0, 20);
    }

    // Competitor mentions
    if (comment.classification === 'competitor_mention') {
      const competitor = comment.keywordsMatched.find(k => !['refund','scam','fraud','broken','love this','recommend'].includes(k)) || 'unknown';
      kg.competitorMentions.push({
        competitor,
        context: comment.text.slice(0, 200),
        sentiment: comment.sentiment,
        date: comment.timestamp,
        commentId: comment.commentId,
      });
      kg.competitorMentions = kg.competitorMentions.slice(-50); // Keep last 50
    }
  }

  // Update today's sentiment trend
  const avgSentiment = comments.reduce((sum, c) => sum + c.sentimentScore, 0) / Math.max(comments.length, 1);
  const existingTrend = kg.sentimentTrend.find(t => t.date === today);
  if (existingTrend) {
    // Running average
    existingTrend.score = (existingTrend.score + avgSentiment) / 2;
    existingTrend.commentCount += comments.length;
  } else {
    kg.sentimentTrend.push({ date: today, score: avgSentiment, commentCount: comments.length });
  }
  // Keep 90 days of trend
  kg.sentimentTrend.sort((a, b) => a.date.localeCompare(b.date));
  kg.sentimentTrend = kg.sentimentTrend.slice(-90);

  kg.lastUpdated = new Date().toISOString();
  await saveDB(db);
}

/**
 * Build a compact audience context string for injection into reply prompts.
 */
export async function getAudienceContextForPrompt(): Promise<string> {
  const db = await getDB();
  const kg = db.audienceKnowledge;
  if (!kg) return '';

  const lines: string[] = [];

  if (kg.topQuestions.length > 0) {
    lines.push(`Audience frequently asks about: ${kg.topQuestions.slice(0, 3).map(q => q.question.slice(0, 60)).join('; ')}`);
  }
  if (kg.recurringPraises.length > 0) {
    lines.push(`They love: ${kg.recurringPraises.slice(0, 2).map(p => p.topic).join(', ')}`);
  }
  if (kg.recurringComplaints.length > 0) {
    const urgent = kg.recurringComplaints.filter(c => c.urgency === 'high').slice(0, 2);
    if (urgent.length > 0) {
      lines.push(`Known issue: ${urgent.map(c => c.topic).join(', ')} (be empathetic)`);
    }
  }

  return lines.join('\n');
}

function extractMainTopic(text: string): string {
  const topics = ['delivery', 'packaging', 'quality', 'price', 'size', 'color', 'support', 'shipping', 'refund', 'broken', 'scratch'];
  const lower = text.toLowerCase();
  for (const t of topics) {
    if (lower.includes(t)) return t;
  }
  return text.slice(0, 40);
}

/**
 * Get the full audience knowledge graph
 */
export async function getAudienceKnowledge(): Promise<AudienceKnowledge | null> {
  const db = await getDB();
  return db.audienceKnowledge || null;
}
