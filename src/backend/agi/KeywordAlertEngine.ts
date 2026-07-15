/**
 * ============================================================
 * QuickReply AGI — Keyword Alert Engine
 * src/backend/agi/KeywordAlertEngine.ts
 *
 * Monitors all ingested comments for configured keywords.
 * Fires dashboard notifications and optionally WhatsApp alerts
 * to the business owner when keywords are matched.
 * ============================================================
 */

import { getDB, saveDB, type KeywordAlert, type LearnedComment } from '@/database/db';

export interface KeywordMatchResult {
  alertId: string;
  keyword: string;
  type: KeywordAlert['type'];
  comment: LearnedComment;
  matchedAt: string;
}

/**
 * Check a single comment against all active keyword alerts.
 * Returns matched alerts.
 */
export function matchKeywords(
  comment: LearnedComment,
  alerts: KeywordAlert[]
): KeywordMatchResult[] {
  const results: KeywordMatchResult[] = [];
  const lowerText = comment.text.toLowerCase();

  for (const alert of alerts) {
    if (!alert.isActive) continue;
    if (!alert.platforms.includes('all') && !alert.platforms.includes(comment.platform)) continue;

    const keyword = alert.caseSensitive ? alert.keyword : alert.keyword.toLowerCase();
    const textToSearch = alert.caseSensitive ? comment.text : lowerText;

    if (textToSearch.includes(keyword)) {
      results.push({
        alertId: alert.id,
        keyword: alert.keyword,
        type: alert.type,
        comment,
        matchedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

/**
 * Process keyword matches — update alert stats and log recent matches.
 */
export async function processKeywordMatches(
  matches: KeywordMatchResult[]
): Promise<void> {
  if (matches.length === 0) return;

  const db = await getDB();
  if (!db.keywordAlerts) db.keywordAlerts = [];

  const now = new Date().toISOString();

  for (const match of matches) {
    const alert = db.keywordAlerts.find(a => a.id === match.alertId);
    if (!alert) continue;

    alert.matchCount = (alert.matchCount || 0) + 1;
    alert.lastMatchAt = now;

    if (!alert.recentMatches) alert.recentMatches = [];
    alert.recentMatches.unshift({
      commentId: match.comment.commentId,
      text: match.comment.text.slice(0, 200),
      platform: match.comment.platform,
      date: now,
    });
    // Keep only last 20 matches per alert
    alert.recentMatches = alert.recentMatches.slice(0, 20);
  }

  await saveDB(db);
}

/**
 * Build a WhatsApp alert message for a keyword match.
 */
export function buildAlertMessage(match: KeywordMatchResult): string {
  const emoji = {
    negative: '🚨',
    positive: '⭐',
    competitor: '👀',
    brand: '🔔',
    custom: '📌',
  }[match.type] || '📌';

  return [
    `${emoji} *Keyword Alert: "${match.keyword}"*`,
    ``,
    `*Platform:* ${match.comment.platform}`,
    match.comment.videoTitle ? `*On:* ${match.comment.videoTitle}` : '',
    `*Author:* ${match.comment.authorName}`,
    `*Comment:* ${match.comment.text.slice(0, 300)}`,
    ``,
    `_QuickReply AGI — Keyword Monitor_`,
  ].filter(Boolean).join('\n');
}

/**
 * Create a new keyword alert
 */
export async function createKeywordAlert(
  keyword: string,
  type: KeywordAlert['type'],
  options: {
    platforms?: string[];
    alertViaWhatsApp?: boolean;
    alertViaDashboard?: boolean;
    caseSensitive?: boolean;
  } = {}
): Promise<KeywordAlert> {
  const db = await getDB();
  if (!db.keywordAlerts) db.keywordAlerts = [];

  const alert: KeywordAlert = {
    id: `ka_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    keyword,
    type,
    platforms: options.platforms || ['all'],
    isActive: true,
    caseSensitive: options.caseSensitive || false,
    alertViaWhatsApp: options.alertViaWhatsApp || false,
    alertViaDashboard: options.alertViaDashboard !== false, // default true
    matchCount: 0,
    createdAt: new Date().toISOString(),
    recentMatches: [],
  };

  db.keywordAlerts.push(alert);
  await saveDB(db);

  return alert;
}

/**
 * Get all active keyword alert configurations
 */
export async function getKeywordAlerts(): Promise<KeywordAlert[]> {
  const db = await getDB();
  return (db.keywordAlerts || []).filter(a => a.isActive);
}

/**
 * Seed default keyword alerts for a new workspace
 */
export async function seedDefaultKeywordAlerts(): Promise<void> {
  const db = await getDB();
  if (!db.keywordAlerts) db.keywordAlerts = [];
  if (db.keywordAlerts.length > 0) return; // Already seeded

  const defaults: Array<{ keyword: string; type: KeywordAlert['type'] }> = [
    { keyword: 'refund', type: 'negative' },
    { keyword: 'scam', type: 'negative' },
    { keyword: 'fraud', type: 'negative' },
    { keyword: 'broken', type: 'negative' },
    { keyword: 'love this', type: 'positive' },
    { keyword: 'recommend', type: 'positive' },
  ];

  for (const d of defaults) {
    db.keywordAlerts.push({
      id: `ka_default_${d.keyword.replace(/\s/g, '_')}`,
      keyword: d.keyword,
      type: d.type,
      platforms: ['all'],
      isActive: true,
      caseSensitive: false,
      alertViaWhatsApp: false,
      alertViaDashboard: true,
      matchCount: 0,
      createdAt: new Date().toISOString(),
      recentMatches: [],
    });
  }

  await saveDB(db);
}
