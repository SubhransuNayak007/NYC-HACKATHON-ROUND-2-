import { NextRequest } from "next/server";
import { commentEventBus, type CommentEvent } from "@/backend/scheduler";

/**
 * Server-Sent Events (SSE) endpoint for real-time comment feed.
 *
 * The browser opens a persistent connection to this endpoint.
 * When the background scheduler (or any poll) finds new comments,
 * events are pushed to all connected clients instantly — no polling
 * delay needed on the frontend.
 *
 * Falls back to 30s client-side polling if SSE is unavailable.
 */
export async function GET(req: NextRequest) {
  // Check for session cookie — accept session_email or qr_access_token
  const sessionEmail = req.cookies.get("session_email")?.value;
  const jwtToken = req.cookies.get("qr_access_token")?.value;

  if (!sessionEmail && !jwtToken) {
    console.warn("[SSE] No session cookie found — returning 401");
    return new Response("Unauthorized — please log in again", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Client connected: ${sessionEmail || "jwt-user"}`);

      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`)
      );

      // Send heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`:heartbeat ${Date.now()}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      // Listen for comment events from the scheduler
      const onComment = (event: CommentEvent) => {
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Client disconnected, clean up
          commentEventBus.removeListener("comment", onComment);
          clearInterval(heartbeat);
        }
      };

      commentEventBus.on("comment", onComment);

      // Clean up on disconnect
      req.signal?.addEventListener("abort", () => {
        commentEventBus.removeListener("comment", onComment);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
