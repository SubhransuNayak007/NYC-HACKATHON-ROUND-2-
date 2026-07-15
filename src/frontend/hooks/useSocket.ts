/**
 * React Hook: Socket.io Client for Quick Reply
 *
 * Provides a managed WebSocket connection to the Socket.io server.
 * Handles connection, authentication, reconnection, and event listening.
 *
 * Usage:
 *   const { socket, connected, events } = useSocket();
 *
 *   useEffect(() => {
 *     if (!socket) return;
 *     socket.on("comment:new", handleNewComment);
 *     return () => socket.off("comment:new", handleNewComment);
 *   }, [socket]);
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

interface CommentEvent {
  type: string;
  comment?: any;
  summary?: any;
  timestamp?: string;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = true, token } = options;
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CommentEvent[]>([]);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const maxEvents = 100; // Keep last 100 events

  const addEvent = useCallback((event: CommentEvent) => {
    setEvents((prev) => {
      const next = [event, ...prev];
      return next.slice(0, maxEvents);
    });
  }, []);

  const connect = useCallback(() => {
    if (socketInstance?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const socket = io(socketUrl, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      auth: {
        token: token || undefined,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socket.on("connect", () => {
      setConnected(true);
      setError(null);
      console.log("[Socket] Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      console.log("[Socket] Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      setConnected(false);
      setError(err.message);
      console.error("[Socket] Connection error:", err.message);
    });

    // --- Comment Events ---
    socket.on("comment:new", (comment) => {
      addEvent({ type: "new", comment, timestamp: new Date().toISOString() });
    });

    socket.on("comment:replied", (comment) => {
      addEvent({ type: "replied", comment, timestamp: new Date().toISOString() });
    });

    socket.on("comment:review", (comment) => {
      addEvent({ type: "review", comment, timestamp: new Date().toISOString() });
    });

    socket.on("comment:skipped", (comment) => {
      addEvent({ type: "skipped", comment, timestamp: new Date().toISOString() });
    });

    socket.on("comment:failed", (comment) => {
      addEvent({ type: "failed", comment, timestamp: new Date().toISOString() });
    });

    socket.on("rag:match", (comment) => {
      addEvent({ type: "rag_match", comment, timestamp: new Date().toISOString() });
    });

    socket.on("poll:complete", (summary) => {
      addEvent({ type: "poll_complete", summary, timestamp: new Date().toISOString() });
    });

    // Catch-all for any comment events
    socket.on("comment:event", (event) => {
      addEvent(event);
    });

    setSocketInstance(socket);
  }, [token, addEvent, socketInstance]);

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      setSocketInstance(null);
      setConnected(false);
    }
  }, [socketInstance]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketInstance,
    connected,
    error,
    connect,
    disconnect,
    events,
    clearEvents,
  };
}

// --- Lightweight hook for just listening to specific events ---

/**
 * Listen to a specific Socket.io event.
 * Automatically cleans up on unmount.
 */
export function useSocketEvent<T = any>(
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
