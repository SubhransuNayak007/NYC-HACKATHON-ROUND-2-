/**
 * /api/youtube/feed/stream
 * SSE endpoint — streams real-time comment and automation events.
 *
 * Architecture:
 *  - On connect: sends last 50 events from yt_outbox (missed-event recovery)
 *  - Polls yt_outbox every 5s for new events (cursor-based, no Redis pub/sub needed)
 *  - Sends heartbeat ping every 25s so proxies / browsers don't close idle connections
 *  - Supports Last-Event-ID header for reconnect with exact replay position
 *
 * This replaces the in-memory EventEmitter (commentEventBus) which loses all
 * events on page refresh or server restart.
 */
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getDB } from "@/database/db";
import {
  getYTOutboxCollection,
  getYTSyncStateCollection,
  ensureYouTubeIndexes,
} from "@/database/youtube-collections";

// Force Node.js runtime — SSE requires streaming response support
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getWorkspaceId(req: NextRequest): Promise<string | null> {
  try {
    const session = req.cookies.get("qr_session")?.value;
    if (session) {
      const db = await getDB();
      if (db.userSession?.email) return db.userSession.email.toLowerCase().trim();
      return "default_workspace";
    }
    const db = await getDB();
    if (db.userSession?.email) return db.userSession.email.toLowerCase().trim();
  } catch {}
  return "default_workspace";
}

function encodeSSE(id: string, event: string, data: object): string {
  const json = JSON.stringify(data);
  return `id: ${id}\nevent: ${event}\ndata: ${json}\n\n`;
}

export async function GET(req: NextRequest) {
  const workspaceId = await getWorkspaceId(req);

  // SSE always returns 200 with text/event-stream
  // Auth failure sends an error event then closes
  const encoder = new TextEncoder();
  let closed = false;
  let pollTimer: NodeJS.Timeout | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      function send(chunk: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {}
      }

      function close() {
        if (closed) return;
        closed = true;
        if (pollTimer) clearTimeout(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        try { controller.close(); } catch {}
      }

      // Auth check
      if (!workspaceId) {
        send(encodeSSE("err-auth", "error", { code: "UNAUTHORIZED", message: "Not authenticated" }));
        close();
        return;
      }

      try {
        await ensureYouTubeIndexes();
      } catch {}

      // Determine replay cursor from Last-Event-ID header
      const lastEventId = req.headers.get("last-event-id") || null;
      let cursorDate: Date;
      if (lastEventId && lastEventId.startsWith("outbox:")) {
        const ts = lastEventId.replace("outbox:", "");
        cursorDate = isNaN(Date.parse(ts)) ? new Date(Date.now() - 5 * 60_000) : new Date(ts);
      } else {
        // Default: replay last 5 minutes of events
        cursorDate = new Date(Date.now() - 5 * 60_000);
      }

      // Send connection confirmed event with sync status
      let syncStatus = "unknown";
      try {
        const syncStates = await getYTSyncStateCollection();
        if (syncStates) {
          const states = await syncStates.find({ workspaceId }).limit(20).toArray();
          const now = Date.now();
          const anyStale = states.some((s) => {
            if (!s.lastSuccessfulSyncAt) return true;
            return now - new Date(s.lastSuccessfulSyncAt).getTime() > 5 * 60_000;
          });
          const anyError = states.some((s) => s.status === "error");
          syncStatus = anyError ? "error" : anyStale ? "stale" : states.length > 0 ? "healthy" : "idle";
        }
      } catch {}

      send(encodeSSE("connected", "connected", {
        workspaceId,
        syncStatus,
        replayFrom: cursorDate.toISOString(),
        ts: new Date().toISOString(),
      }));

      // Replay missed events since cursor
      let replayCursor = cursorDate;
      try {
        const outbox = await getYTOutboxCollection();
        if (outbox) {
          const missed = await outbox
            .find({ workspaceId, createdAt: { $gt: cursorDate.toISOString() } })
            .sort({ createdAt: 1 })
            .limit(50)
            .toArray();

          for (const evt of missed) {
            send(encodeSSE(`outbox:${evt.createdAt}`, evt.eventType.replace(".", "_"), {
              id: evt.id,
              eventType: evt.eventType,
              aggregateType: evt.aggregateType,
              aggregateId: evt.aggregateId,
              payload: evt.payload,
              createdAt: evt.createdAt,
            }));
            if (new Date(evt.createdAt) > replayCursor) {
              replayCursor = new Date(evt.createdAt);
            }
          }
        }
      } catch (err) {
        console.error("[SSE] Replay error:", err);
      }

      // Heartbeat: every 25 seconds to keep connection alive
      heartbeatTimer = setInterval(async () => {
        if (closed) return;
        let status = "unknown";
        try {
          const syncStates = await getYTSyncStateCollection();
          if (syncStates) {
            const states = await syncStates.find({ workspaceId }).limit(5).toArray();
            const now = Date.now();
            const anyError = states.some((s) => s.status === "error");
            const anyStale = states.some((s) => {
              if (!s.lastSuccessfulSyncAt) return false;
              return now - new Date(s.lastSuccessfulSyncAt).getTime() > 5 * 60_000;
            });
            status = anyError ? "error" : anyStale ? "stale" : states.length > 0 ? "healthy" : "idle";
          }
        } catch {}
        send(encodeSSE(`hb:${Date.now()}`, "heartbeat", {
          ts: new Date().toISOString(),
          syncStatus: status,
        }));
      }, 25_000);

      // Poll for new outbox events every 5 seconds
      const poll = async () => {
        if (closed) return;
        try {
          const outbox = await getYTOutboxCollection();
          if (outbox) {
            const newEvents = await outbox
              .find({ workspaceId, createdAt: { $gt: replayCursor.toISOString() } })
              .sort({ createdAt: 1 })
              .limit(20)
              .toArray();

            for (const evt of newEvents) {
              send(encodeSSE(`outbox:${evt.createdAt}`, evt.eventType.replace(".", "_"), {
                id: evt.id,
                eventType: evt.eventType,
                aggregateType: evt.aggregateType,
                aggregateId: evt.aggregateId,
                payload: evt.payload,
                createdAt: evt.createdAt,
              }));
              if (new Date(evt.createdAt) > replayCursor) {
                replayCursor = new Date(evt.createdAt);
              }
            }
          }
        } catch (err) {
          // Non-fatal — poll again next tick
          console.error("[SSE] Poll error:", err);
        }

        if (!closed) {
          pollTimer = setTimeout(poll, 5_000);
        }
      };

      // Start polling after initial replay
      pollTimer = setTimeout(poll, 5_000);

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Nginx: disable proxy buffering
    },
  });
}

