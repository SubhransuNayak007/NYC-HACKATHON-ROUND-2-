/**
 * GET /api/workflows/executions/[id]/stream
 * Real-Time Execution Status Streaming Endpoint (SSE) (Requirement R7).
 * Streams lifecycle events (node.started, node.completed, node.failed, etc.)
 * directly to the visual canvas with mandatory cryptographic secret redaction.
 */

import { NextRequest, NextResponse } from "next/server";
import { globalEventBus, redactEventPayload, WorkflowLifecycleEvent } from "@/backend/engine/EventBus";
import { globalCheckpointManager } from "@/backend/engine/CheckpointManager";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await context.params;
  const executionId = resolvedParams.id;

  if (!executionId) {
    return NextResponse.json({ error: "Missing execution ID" }, { status: 400 });
  }

  // Ensure execution exists
  const checkpoint = await globalCheckpointManager.getCheckpoint(executionId);
  const history = globalEventBus.getHistory(executionId);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Replay cached event history for this execution
      for (const ev of history) {
        const payload = `data: ${JSON.stringify(redactEventPayload(ev))}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      // If execution is already in a terminal state, close stream
      if (
        checkpoint &&
        ["COMPLETED", "FAILED"].includes(checkpoint.status) &&
        history.some((h) => h.eventType === "execution.completed" || h.eventType === "execution.failed")
      ) {
        controller.close();
        return;
      }

      // 2. Subscribe to live execution events
      const unsubscribe = globalEventBus.subscribeExecution(
        executionId,
        (event: WorkflowLifecycleEvent) => {
          try {
            const data = `data: ${JSON.stringify(redactEventPayload(event))}\n\n`;
            controller.enqueue(encoder.encode(data));

            // Terminal event closes stream
            if (event.eventType === "execution.completed" || event.eventType === "execution.failed") {
              setTimeout(() => {
                try {
                  controller.close();
                } catch {
                  // Ignore already closed stream
                }
              }, 500);
            }
          } catch {
            // Controller may be closed
          }
        }
      );

      // 3. Keepalive heartbeat interval (every 15s)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // 4. Handle client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
