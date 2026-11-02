/**
 * React Hook: Socket.io Client for Quick Reply
 *
 * Provides a managed WebSocket connection to the Socket.io server with
 * automatic graceful fallback for serverless deployments (e.g., Vercel).
 * Handles connection, authentication, reconnection, and event listening.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketOptions {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Custom token (if not using cookie auth) */
  token?: string;
}

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  events: CommentEvent[];
  clearEvents: () => void;
}

export interface CommentEvent {
  type: string;
  comment?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  timestamp?: string;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = true, token } = options;
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CommentEvent[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const retryCountRef = useRef(0);
  const maxEvents = 100;

  const addEvent = useCallback((event: CommentEvent) => {
    setEvents((prev) => {
      const next = [event, ...prev];
      return next.slice(0, maxEvents);
    });
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (socketRef.current?.connected) return;

    // In production Vercel serverless environment, full duplex WebSockets require
    // a dedicated standalone server (e.g., Render/Fly.io/VPS). If on Vercel and no external
    // socket URL is configured, gracefully avoid runaway connection spam.
    const isVercel = window.location.hostname.endsWith(".vercel.app");
    const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (isVercel && !process.env.NEXT_PUBLIC_SOCKET_URL) {
      // Running on Vercel without a dedicated external socket host
      setError("Realtime WebSocket server operates in polling mode on serverless");
      return;
    }

    const socketUrl = configuredUrl || window.location.origin;

    try {
      const socket = io(socketUrl, {
        path: "/api/socketio",
        transports: ["websocket", "polling"],
        auth: {
          token: token || undefined,
        },
        reconnection: true,
        reconnectionAttempts: 3, // Bounded to 3 to prevent CPU spikes on serverless
        reconnectionDelay: 2000,
        reconnectionDelayMax: 6000,
        timeout: 5000,
      });

      socket.on("connect", () => {
        setConnected(true);
        setError(null);
        retryCountRef.current = 0;
      });

      socket.on("disconnect", () => {
        setConnected(false);
      });

      socket.on("connect_error", (err) => {
        retryCountRef.current += 1;
        setConnected(false);
        setError(err.message);
        if (retryCountRef.current >= 3) {
          socket.disconnect(); // Stop retry storm
        }
      });

      // --- Comment Events ---
      socket.on("comment:new", (comment: Record<string, unknown>) => {
        addEvent({ type: "new", comment, timestamp: new Date().toISOString() });
      });

      socket.on("comment:replied", (comment: Record<string, unknown>) => {
        addEvent({ type: "replied", comment, timestamp: new Date().toISOString() });
      });

      socket.on("comment:review", (comment: Record<string, unknown>) => {
        addEvent({ type: "review", comment, timestamp: new Date().toISOString() });
      });

      socket.on("comment:skipped", (comment: Record<string, unknown>) => {
        addEvent({ type: "skipped", comment, timestamp: new Date().toISOString() });
      });

      socket.on("comment:failed", (comment: Record<string, unknown>) => {
        addEvent({ type: "failed", comment, timestamp: new Date().toISOString() });
      });

      socket.on("rag:match", (comment: Record<string, unknown>) => {
        addEvent({ type: "rag_match", comment, timestamp: new Date().toISOString() });
      });

      socket.on("poll:complete", (summary: Record<string, unknown>) => {
        addEvent({ type: "poll_complete", summary, timestamp: new Date().toISOString() });
      });

      socket.on("comment:event", (event: CommentEvent) => {
        addEvent(event);
      });

      socketRef.current = socket;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Socket initialization error";
      setError(msg);
    }
  }, [token, addEvent]);

  // Auto-connect on mount asynchronously to prevent cascading renders
  useEffect(() => {
    if (!autoConnect) return;
    const timer = setTimeout(() => {
      connect();
    }, 0);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    connected,
    error,
    connect,
    disconnect,
    events,
    clearEvents,
  };
}

/**
 * Listen to a specific Socket.io event.
 * Automatically cleans up on unmount.
 */
export function useSocketEvent<T = Record<string, unknown>>(
  socket: Socket | null,
  event: string,
  handler: (data: T) => void
) {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
