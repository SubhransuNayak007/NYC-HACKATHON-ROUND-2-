/**
 * Socket.io WebSocket Server for Quick Reply
 *
 * Replaces the SSE (Server-Sent Events) system with bidirectional
 * WebSocket connections for real-time comment feed updates.
 *
 * Benefits over SSE:
 * - Bidirectional: client can send commands (ack, skip, etc.)
 * - Binary support: can send compressed data
 * - Auto-reconnection with state recovery
 * - Room-based broadcasting (per-user isolation)
 * - Built-in heartbeat and connection management
 *
 * Events:
 * - Server → Client: comment:new, comment:replied, comment:review, comment:skipped, comment:failed, rag:match, poll:complete
 * - Client → Server: comment:ack, comment:skip, subscribe:channel
 * - System: connect, disconnect, error
 */

import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { NextApiRequest } from "next";
import { verifyAccessToken, getUserFromCookies, AccessTokenPayload } from "./auth";
import { commentEventBus, type CommentEvent } from "./events";

// --- Socket.io Server Instance ---

let io: SocketIOServer | null = null;

/**
 * Initialize the Socket.io server.
 * Attaches to the existing HTTP server.
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6, // 1MB max message size
  });

  // --- Authentication Middleware ---
  // Accept JWT token from handshake auth, OR session cookies from the HTTP request
  io.use((socket, next) => {
    // 1. Try JWT token from handshake auth (new clients)
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token as string;

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        (socket as any).user = payload;
        return next();
      }
    }

    // 2. Try session cookies from the HTTP request (browser clients)
    const cookieHeader = socket.handshake.headers?.cookie ||
                         socket.request?.headers?.cookie;
    if (cookieHeader) {
      const user = getUserFromCookies(cookieHeader);
      if (user) {
        (socket as any).user = user;
        return next();
      }
    }

    // 3. Allow connection without auth for local development
    if (process.env.NODE_ENV !== "production") {
      (socket as any).user = {
        sub: "dev@localhost",
        name: "Developer",
        tier: "pro" as const,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
        iss: "quick-reply",
        aud: "quick-reply-api",
      };
      return next();
    }

    return next(new Error("Authentication required"));
  });

  // --- Connection Handler ---
  io.on("connection", (socket) => {
    const user = (socket as any).user as AccessTokenPayload;
    console.log(`[Socket] User connected: ${user.sub} (socket: ${socket.id})`);

    // Join user's personal room
    const userRoom = `user:${user.sub.replace(/[^a-z0-9]/gi, "_")}`;
    socket.join(userRoom);

    // Send connection confirmation
    socket.emit("connected", {
      userId: user.sub,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // --- Client Events ---

    // Acknowledge a comment (mark as seen)
    socket.on("comment:ack", (data: { commentId: string }) => {
      console.log(`[Socket] Comment acknowledged: ${data.commentId} by ${user.sub}`);
      // Could update DB here if needed
    });

    // Skip a comment
    socket.on("comment:skip", (data: { commentId: string }) => {
      console.log(`[Socket] Comment skipped: ${data.commentId} by ${user.sub}`);
      // Emit back to confirm
      socket.emit("comment:skipped", { commentId: data.commentId });
    });

    // Subscribe to specific channel updates
    socket.on("subscribe:channel", (data: { channelId: string }) => {
      const channelRoom = `channel:${data.channelId}`;
      socket.join(channelRoom);
      console.log(`[Socket] ${user.sub} subscribed to channel: ${data.channelId}`);
    });

    // Unsubscribe from channel
    socket.on("unsubscribe:channel", (data: { channelId: string }) => {
      const channelRoom = `channel:${data.channelId}`;
      socket.leave(channelRoom);
    });

    // Disconnect
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] User disconnected: ${user.sub} (reason: ${reason})`);
    });
  });

  // --- Listen to Scheduler Events and Broadcast ---
  setupSchedulerBroadcast();

  console.log("[Socket] Socket.io server initialized");
  return io;
}

/**
 * Set up broadcasting from the scheduler event bus to Socket.io clients.
 */
function setupSchedulerBroadcast() {
  if (!io) return;

  const onComment = (event: CommentEvent) => {
    if (!io) return;

    // Broadcast to all connected clients
    // In production, you'd filter by user/subscription
    io.emit("comment:event", event);

    // Also emit to specific event types for granular handling
    switch (event.type) {
      case "new":
        io.emit("comment:new", event.comment);
        break;
      case "replied":
        io.emit("comment:replied", event.comment);
        break;
      case "review":
        io.emit("comment:review", event.comment);
        break;
      case "skipped":
        io.emit("comment:skipped", event.comment);
        break;
      case "failed":
        io.emit("comment:failed", event.comment);
        break;
      case "rag_match":
        io.emit("rag:match", event.comment);
        break;
      case "poll_complete":
        io.emit("poll:complete", event.summary);
        break;
    }
  };

  commentEventBus.on("comment", onComment);
}

/**
 * Get the Socket.io server instance.
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast an event to all connected clients.
 */
export function broadcastEvent(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}

/**
 * Send an event to a specific user.
 */
export function sendToUser(userId: string, event: string, data: any) {
  if (io) {
    const userRoom = `user:${userId.replace(/[^a-z0-9]/gi, "_")}`;
    io.to(userRoom).emit(event, data);
  }
}

/**
 * Send an event to all subscribers of a channel.
 */
export function sendToChannel(channelId: string, event: string, data: any) {
  if (io) {
    const channelRoom = `channel:${channelId}`;
    io.to(channelRoom).emit(event, data);
  }
}

/**
 * Get connected client count.
 */
export function getConnectedCount(): number {
  return io ? io.engine.clientsCount : 0;
}

/**
 * Gracefully shut down the Socket.io server.
 */
export function closeSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (io) {
      io.close(() => {
        io = null;
        console.log("[Socket] Server closed");
        resolve();
      });
    } else {
      resolve();
    }
  });
}
