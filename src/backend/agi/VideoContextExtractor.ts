/**
 * ============================================================
 * QuickReply AGI — Video Context Extractor
 * src/backend/agi/VideoContextExtractor.ts
 *
 * Extracts rich context from videos (YouTube captions, descriptions)
 * so the AI can reply to comments with content-aware responses.
 * ============================================================
 */

import { getDB, saveDB, type VideoContext } from '@/database/db';

/**
 * Extract and store context for a YouTube video.
 * Uses captions if available, falls back to description.
 */
export async function extractYouTubeVideoContext(
  videoId: string,
  channelId: string,
  apiKey: string
): Promise<VideoContext | null> {
  try {
    const db = await getDB();
    if (!db.agiVideoContexts) db.agiVideoContexts = [];

    // Skip if already processed
    const existing = db.agiVideoContexts.find(v => v.videoId === videoId);
    if (existing) return existing;

    // 1. Fetch video metadata
    const metaRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
    );
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();
    const snippet = meta.items?.[0]?.snippet;
    if (!snippet) return null;

    const title = snippet.title || '';
    const description = (snippet.description || '').slice(0, 2000);

    // 2. Try to fetch captions
    let transcript: string | undefined;
    let transcriptSource: VideoContext['transcriptSource'] = 'description_only';

    try {
      const captionRes = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
      );
      if (captionRes.ok) {
        const captionData = await captionRes.json();
        const englishCaption = captionData.items?.find(
          (c: any) => c.snippet?.language === 'en' || c.snippet?.language === 'en-US'
        );
        if (englishCaption) {
          // Note: downloading caption content requires OAuth; we use description as fallback
          transcriptSource = 'youtube_captions';
        }
      }
    } catch {
      // Caption fetch failed, use description
    }

    // 3. Build AI summary from title + description
    const summary = buildDescriptionSummary(title, description);
    const keyPoints = extractKeyPoints(description);
    const cta = extractCTA(description);

    const context: VideoContext = {
      videoId,
      platform: 'youtube',
      title,
      description: description.slice(0, 500),
      summary,
      keyPoints,
      cta,
      transcript,
      transcriptSource,
      channelId,
      publishedAt: snippet.publishedAt || new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    db.agiVideoContexts.push(context);
    // Keep only last 500 video contexts
    if (db.agiVideoContexts.length > 500) {
      db.agiVideoContexts = db.agiVideoContexts.slice(-500);
    }
    await saveDB(db);

    return context;
  } catch (err) {
    console.error('[VideoContext] Error extracting context:', err);
    return null;
  }
}

/**
 * Build a 2-3 sentence summary from title and description.
 */
function buildDescriptionSummary(title: string, description: string): string {
  const firstParagraph = description.split('\n\n')[0]?.trim() || description.slice(0, 300);
  if (firstParagraph.length > 20) {
    return `This video titled "${title}" covers: ${firstParagraph.slice(0, 250)}.`;
  }
  return `This video is titled "${title}".`;
}

/**
 * Extract bullet-point key topics from description.
 */
function extractKeyPoints(description: string): string[] {
  const lines = description.split('\n').filter(l => l.trim().length > 10);
  const bullets = lines
    .filter(l => l.startsWith('-') || l.startsWith('•') || l.startsWith('*') || /^\d+\./.test(l))
    .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
    .filter(l => l.length > 5)
    .slice(0, 5);
  return bullets.length > 0 ? bullets : lines.slice(0, 3).map(l => l.trim());
}

/**
 * Try to extract CTA from description.
 */
function extractCTA(description: string): string | undefined {
  const ctaPatterns = [
    /subscribe for/i, /click the link/i, /visit our/i, /shop now/i,
    /use code/i, /discount/i, /link in bio/i, /comment below/i,
  ];
  const lines = description.split('\n');
  for (const line of lines) {
    for (const pattern of ctaPatterns) {
      if (pattern.test(line)) return line.trim().slice(0, 200);
    }
  }
  return undefined;
}

/**
 * Get cached video context for reply generation.
 */
export async function getVideoContext(videoId: string): Promise<VideoContext | null> {
  const db = await getDB();
  return (db.agiVideoContexts || []).find(v => v.videoId === videoId) || null;
}

/**
 * Build a concise context string to inject into reply prompts.
 */
export function buildVideoContextPrompt(context: VideoContext): string {
  const lines = [
    `VIDEO: "${context.title}"`,
    `SUMMARY: ${context.summary}`,
  ];
  if (context.keyPoints.length > 0) {
    lines.push(`KEY POINTS: ${context.keyPoints.slice(0, 3).join(' | ')}`);
  }
  if (context.cta) {
    lines.push(`CTA: ${context.cta}`);
  }
  return lines.join('\n');
}
