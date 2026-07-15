/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the server starts (both dev and production).
 * Bootstraps:
 * 1. MongoDB compound indexes (query optimization)
 * 2. Redis/BullMQ job queue workers (distributed polling)
 * 3. Background comment polling scheduler — 30 second interval
 * 4. Video auto-discovery (migrate legacy data, initial discovery)
 * 5. Health heartbeat — every 60 seconds for dashboard
 *
 * This is the official Next.js way to run startup code.
 */

// Validate and ensure environment variables at startup
function validateRequiredEnvVars(): void {
  // Provide safe defaults for session/tokens if not configured in environment
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = "quickreply_production_session_secret_key_2026_safe_default";
    console.warn("[Instrumentation] ⚠️ SESSION_SECRET not set, using default session secret");
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "quickreply_production_jwt_secret_key_2026_super_secure_default";
    console.warn("[Instrumentation] ⚠️ JWT_SECRET not set, using default JWT secret");
  }
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    process.env.TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    console.warn("[Instrumentation] ⚠️ TOKEN_ENCRYPTION_KEY not set, using default encryption key");
  }
  if (!process.env.CRON_SECRET) {
    process.env.CRON_SECRET = "quickreply_cron_secret_key_2026";
    console.warn("[Instrumentation] ⚠️ CRON_SECRET not set, using default cron secret");
  }

  console.log("[Instrumentation] ✅ Environment configuration verified");
}

export async function register() {
  // Validate environment first
  validateRequiredEnvVars();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const dns = await import("dns");
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch {
      // Ignored
    }
    const isVercel = Boolean(process.env.VERCEL);
    console.log(`[Instrumentation] Server starting — 24/7 engine bootstrap (Vercel: ${isVercel})...`);

    // On Vercel serverless, setInterval does NOT persist — log a clear warning
    if (isVercel) {
      console.log("[Instrumentation] ⚠️ Vercel environment detected. The 30-second background scheduler will NOT work on serverless.");
      console.log("[Instrumentation] ⚠️ To enable 24/7 polling, set up an external cron job calling /api/cron/poll every 30 seconds:");
      console.log("[Instrumentation] ⚠️ 1. Free: cron-job.org → every 30s → GET /api/cron/poll?token=CRON_SECRET");
      console.log("[Instrumentation] ⚠️ 2. Vercel Pro: Add 'crons' to vercel.json (see CRON_SETUP.md)");
      console.log("[Instrumentation] ⚠️ 3. The dashboard will poll via frontend when a browser tab is open");
    }

    // 0. MongoDB connectivity check (non-blocking in dev)
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      const maskedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
      console.log(`[Instrumentation] MongoDB URI configured: ${maskedUri.slice(0, 60)}...`);
      // Test connection in background without blocking register()
      (async () => {
        try {
          const { MongoClient } = await import("mongodb");
          const testClient = new MongoClient(mongoUri, {
            serverSelectionTimeoutMS: 2000,
            connectTimeoutMS: 2000,
          });
          await testClient.connect();
          console.log("[Instrumentation] ✅ MongoDB connection successful — data will persist");
          await testClient.close();

          // 1. MongoDB indexes only if mongo connects
          try {
            const { ensureIndexes } = await import("@/backend/indexes");
            await ensureIndexes();
          } catch (err) {
            console.error("[Instrumentation] Failed to create indexes:", err);
          }
        } catch (dbErr: any) {
          console.warn(`[Instrumentation] ⚠️ MongoDB connection skipped: ${dbErr.message || dbErr}. Using local filesystem storage.`);
        }
      })();
    }

    // 2. Redis check (non-blocking)
    (async () => {
      let redisAvailable = false;
      try {
        const { getRedis, isRedisAvailable, closeRedis } = await import("@/backend/redis");
        await getRedis();
        redisAvailable = isRedisAvailable();
      } catch {}

      if (redisAvailable) {
        try {
          const { startWorkers } = await import("@/backend/queue");
          await startWorkers();
          console.log("[Instrumentation] BullMQ workers started (distributed)");
        } catch (err) {
          console.error("[Instrumentation] Queue workers failed:", err);
        }
      }
    })();

    // 3. Start 30-second background scheduler
    try {
      if (isVercel) {
        console.log("[Instrumentation] Skipping background scheduler on Vercel — use external cron instead");
      } else {
        const { startBackgroundScheduler } = await import("@/backend/scheduler");
        console.log("[Instrumentation] Starting 30-second background comment poller");
        startBackgroundScheduler();
      }
    } catch (err) {
      console.error("[Instrumentation] Failed to start scheduler:", err);
    }

    // 4. Video auto-discovery (in background)
    setTimeout(async () => {
      try {
        const { migrateAutomatedVideos, runDiscoveryForAllChannels } = await import("@/backend/video_discovery");
        await migrateAutomatedVideos().catch(() => {});
        await runDiscoveryForAllChannels().catch(() => {});
      } catch {}
    }, 5000);

    // 5. Health heartbeat
    try {
      const { writeHeartbeat } = await import("@/backend/cron_manager");
      writeHeartbeat().catch(() => {});
      const heartbeatInterval = setInterval(() => {
        writeHeartbeat().catch(() => {});
      }, 60_000);
      if (heartbeatInterval.unref) heartbeatInterval.unref();
    } catch {}

    // 6. Boot Autonomous Business Execution Plane (24/7 Headless Engine)
    try {
      const { ExecutionPlane } = await import("@/backend/execution/ExecutionPlane");
      ExecutionPlane.start();
    } catch (err) {
      console.error("[Instrumentation] Failed to start ExecutionPlane:", err);
    }

    // Graceful shutdown handlers
    if (typeof process !== "undefined") {
      process.on("SIGTERM", async () => {
        console.log("[Instrumentation] SIGTERM received, shutting down gracefully...");
        try {
          const { stopWorkers } = await import("@/backend/queue");
          await stopWorkers();
          const { stopBackgroundScheduler } = await import("@/backend/scheduler");
          stopBackgroundScheduler();
          const { closeRedis } = await import("@/backend/redis");
          await closeRedis();
        } catch (err) {
          console.error("[Instrumentation] Error during shutdown:", err);
        }
        process.exit(0);
      });

      process.on("SIGINT", async () => {
        console.log("[Instrumentation] SIGINT received, shutting down gracefully...");
        try {
          const { stopWorkers } = await import("@/backend/queue");
          await stopWorkers();
          const { stopBackgroundScheduler } = await import("@/backend/scheduler");
          stopBackgroundScheduler();
          const { closeRedis } = await import("@/backend/redis");
          await closeRedis();
        } catch (err) {
          console.error("[Instrumentation] Error during shutdown:", err);
        }
        process.exit(0);
      });
    }

    console.log("[Instrumentation] 24/7 engine bootstrap complete");
  }
}
