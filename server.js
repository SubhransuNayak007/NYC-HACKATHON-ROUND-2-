/**
 * Custom Next.js Server with Socket.io
 *
 * This server wraps Next.js with a raw HTTP server so Socket.io
 * can attach for WebSocket connections. Required for Render deployment
 * where persistent connections are needed for 24/7 operation.
 *
 * Usage: node server.js
 */

const { createServer } = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT, 10) || 3000;

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Initialize Socket.io server
  try {
    const { initSocketServer } = require("./src/backend/socket");
    initSocketServer(server);
    console.log("[Server] Socket.io initialized");
  } catch (err) {
    console.warn("[Server] Socket.io init failed (non-critical):", err.message);
  }

  server.listen(port, hostname, () => {
    console.log(`[Server] Ready on http://${hostname}:${port}`);
    console.log(`[Server] Environment: ${dev ? "development" : "production"}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
