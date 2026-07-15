import { getDB, saveDB, decryptToken, encryptToken } from "@/database/db";

// --- YouTube API Quota Tracking ---
// YouTube Data API v3 free tier: 10,000 units/day
// Each API call costs a specific number of units:
//   channels.list = 1 unit
//   playlistItems.list = 1 unit
//   commentThreads.list = 1 unit
//   comments.insert = 50 units (posting a reply)

const DAILY_QUOTA_BUDGET = parseInt(process.env.YOUTUBE_DAILY_QUOTA_BUDGET || "8000", 10);
const QUOTA_COSTS: Record<string, number> = {
  "channels.list": 1,
  "playlistItems.list": 1,
  "commentThreads.list": 1,
  "comments.insert": 50,
};

// ─────────────────────────────────────────────────────────────
//  B1 — PERSISTENT QUOTA LEDGER (serverless-safe)
//  The counter is kept in memory as a fast path, but it is
//  hydrated from / persisted to the DB (systemStatus) so a cold
//  start can never silently reset the budget mid-demo.
// ─────────────────────────────────────────────────────────────
let _quotaUsedToday = 0;
let _quotaDate = new Date().toISOString().split("T")[0];
let _ledgerHydrated = false;
let _lastPersist = 0;

function resetQuotaIfNeeded() {
  const today = new Date().toISOString().split("T")[0];
  if (_quotaDate !== today) {
    _quotaUsedToday = 0;
    _quotaDate = today;
  }
}

/** Load the persisted ledger into memory (fires on cold start). */
export async function hydrateQuota(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  try {
    const db = await getDB();
    const ss = db.systemStatus;
    if (ss) {
      if (ss.quotaDate === today) {
        _quotaUsedToday = ss.youtubeQuotaUsedToday || 0;
        _quotaDate = today;
      } else {
        // New day — reset and persist the rollover so it sticks
        _quotaUsedToday = 0;
        _quotaDate = today;
        ss.quotaDate = today;
        ss.youtubeQuotaUsedToday = 0;
        await saveDB(db).catch(() => {});
      }
      _ledgerHydrated = true;
    }
  } catch {
    // No DB / no session context — keep in-memory value
  }
  return _quotaUsedToday;
}

/** Debounced persist of the in-memory counter to the DB ledger. */
async function persistQuota(): Promise<void> {
  const now = Date.now();
  if (now - _lastPersist < 1500) return; // throttle writes
  _lastPersist = now;
  try {
    const db = await getDB();
    if (db.systemStatus) {
      db.systemStatus.youtubeQuotaUsedToday = _quotaUsedToday;
      db.systemStatus.quotaDate = _quotaDate;
      await saveDB(db);
    }
  } catch {
    // Non-critical
  }
}

/** Authoritative ledger value — hydrate first, then read. */
export async function syncQuotaLedger(): Promise<number> {
  if (!_ledgerHydrated) await hydrateQuota();
  resetQuotaIfNeeded();
  return _quotaUsedToday;
}

/** Track an API call for quota management. Persists (debounced). */
export function trackApiCall(endpoint: string, units?: number): void {
  resetQuotaIfNeeded();
  const cost = units ?? QUOTA_COSTS[endpoint] ?? 1;
  _quotaUsedToday += cost;
  persistQuota().catch(() => {});
}

/** Get how many API units have been consumed today (in-memory fast path). */
export function getQuotaUsedToday(): number {
  resetQuotaIfNeeded();
  return _quotaUsedToday;
}

/** Get remaining quota budget. */
export function getQuotaRemaining(): number {
  resetQuotaIfNeeded();
  return Math.max(0, DAILY_QUOTA_BUDGET - _quotaUsedToday);
}

/** Check if we can afford an API call (fast path; call syncQuotaLedger() first for cold starts). */
export function canAffordApiCall(endpoint: string): boolean {
  resetQuotaIfNeeded();
  const cost = QUOTA_COSTS[endpoint] ?? 1;
  return _quotaUsedToday + cost <= DAILY_QUOTA_BUDGET;
}

/**
 * Get the uploads playlist ID for a YouTube channel.
 * Cost: 1 API unit (channels.list)
 */
export async function getUploadsPlaylistId(channelId: string): Promise<string | null> {
  const token = await getFreshAccessToken(channelId);
  if (!token) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    trackApiCall("channels.list");

    if (!res.ok) {
      console.error(`[YouTube] Error fetching channel ${channelId}:`, await res.text());
      return null;
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    return data.items[0].contentDetails?.relatedPlaylists?.uploads || null;
  } catch (err) {
    console.error("[YouTube] getUploadsPlaylistId exception:", err);
    return null;
  }
}

// Refresh Google OAuth Access Token
export async function getFreshAccessToken(channelId: string): Promise<string | null> {
  const db = await getDB();
  const channelIndex = db.channels.findIndex((c) => c.id === channelId);
  if (channelIndex === -1) return null;

  const channel = db.channels[channelIndex];
  const refreshToken = channel.refreshToken ? decryptToken(channel.refreshToken) : undefined;
  const accessToken = channel.accessToken ? decryptToken(channel.accessToken) : undefined;

  if (!refreshToken) {
    console.error(`No refresh token available for channel ${channelId}`);
    return accessToken || null;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Missing Google OAuth credentials for token refresh");
    return accessToken || null;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Failed to refresh access token:", err);
      // Mark channel status as quota_error to alert the user
      db.channels[channelIndex].status = "quota_error";
      await saveDB(db);
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    
    // Update local database with the fresh access token (encrypted)
    db.channels[channelIndex].accessToken = encryptToken(newAccessToken);
    db.channels[channelIndex].status = "active";
    await saveDB(db);

    return newAccessToken;
  } catch (err) {
    console.error("Error in getFreshAccessToken:", err);
    return null;
  }
}

// Fetch Channel's uploaded videos via Uploads Playlist
export async function fetchChannelVideos(channelId: string) {
  const token = await getFreshAccessToken(channelId);
  if (!token) return [];

  try {
    // 1. Fetch channel's uploads playlist ID
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!channelRes.ok) {
      console.error("Error fetching channel details:", await channelRes.text());
      return [];
    }

    trackApiCall("channels.list");

    const channelData = await channelRes.json();
    if (!channelData.items || channelData.items.length === 0) return [];

    const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) return [];

    // 2. Fetch recent videos in the uploads playlist
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=15`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!playlistRes.ok) {
      console.error("Error fetching uploads playlist items:", await playlistRes.text());
      return [];
    }

    trackApiCall("playlistItems.list");

    const playlistData = await playlistRes.json();
    if (!playlistData.items) return [];

    return playlistData.items.map((item: any) => ({
      id: item.snippet?.resourceId?.videoId,
      title: item.snippet?.title || "Untitled Video",
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
      publishedAt: item.snippet?.publishedAt
    }));
  } catch (err) {
    console.error("fetchChannelVideos exception:", err);
    return [];
  }
}

// Fetch comments threads for a specific video ID
export async function fetchVideoComments(channelId: string, videoId: string) {
  const token = await getFreshAccessToken(channelId);
  if (!token) return [];

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=time`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      console.error(`Error fetching comment threads for video ${videoId}:`, await res.text());
      return [];
    }

    trackApiCall("commentThreads.list");

    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("fetchVideoComments exception:", err);
    return [];
  }
}

// Post a reply to a YouTube comment thread
export async function postCommentReply(channelId: string, parentCommentId: string, replyText: string) {
  const token = await getFreshAccessToken(channelId);
  if (!token) return null;

  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/comments?part=snippet",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          snippet: {
            parentId: parentCommentId,
            textOriginal: replyText
          }
        })
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`Error posting reply to comment ${parentCommentId}:`, err);
      return null;
    }

    trackApiCall("comments.insert");

    return await res.json();
  } catch (err) {
    console.error("postCommentReply exception:", err);
    return null;
  }
}
