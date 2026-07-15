/**
 * Real-time event bus for the QuickReply engine.
 *
 * Split out of scheduler.ts so the engine (engine.ts) can emit events
 * without a circular import. Both the SSE endpoint and Socket.io consume
 * these events.
 */

import { EventEmitter } from "events";
import type { Comment as DBComment, PipelineTrace } from "@/database/db";

export const commentEventBus = new EventEmitter();
commentEventBus.setMaxListeners(50);

export interface CommentEvent {
  type:
    | "new"
    | "replied"
    | "review"
    | "skipped"
    | "failed"
    | "rag_match"
    | "ai_reply"
    | "poll_complete"
    | "trace";
  comment?: DBComment;
  trace?: PipelineTrace;
  summary?: {
    checkedCount: number;
    matchedCount: number;
    repliedCount: number;
    ragMatched: number;
    aiReplied: number;
    timestamp: string;
  };
}

/**
 * Emit a comment event to all connected SSE clients and Socket.io clients.
 */
export function emitCommentEvent(event: CommentEvent) {
  commentEventBus.emit("comment", event);
  broadcastToSocket(event).catch(() => {});
}

async function broadcastToSocket(event: CommentEvent) {
  try {
    const { broadcastEvent } = await import("./socket");
    broadcastEvent("comment:event", event);
    if (event.type === "poll_complete") {
      broadcastEvent("poll:complete", event.summary);
    }
  } catch {
    // Socket.io not available — SSE still works via commentEventBus
  }
}

// --- Re-exports for backward compatibility (scheduler.ts / socket.ts / SSE) ---
export { commentEventBus as default };
