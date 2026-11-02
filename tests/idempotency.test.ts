/**
 * Unit Tests: Idempotency & Deduplication Engine
 */

import { IdempotencyEngine } from "../src/backend/events/IdempotencyEngine";
import { EventNormalizer } from "../src/backend/events/EventNormalizer";

async function runTests() {
  console.log("▶ Running IdempotencyEngine Test Suite...");

  const tenantId = "test_tenant";
  const eventId = `evt_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const key = EventNormalizer.generateIdempotencyKey(tenantId, "instagram", eventId, "Hello pricing please");

  // 1. First Lock Attempt
  const lock1 = await IdempotencyEngine.acquireLock(tenantId, key, 60);
  if (!lock1.acquired || lock1.status !== "NEW") {
    throw new Error(`FAIL: First lock failed: ${lock1.status}`);
  }
  console.log("✓ Initial lock acquired successfully.");

  // 2. Concurrent Duplicate Ingestion Attempt (Same Key)
  const lock2 = await IdempotencyEngine.acquireLock(tenantId, key, 60);
  if (lock2.acquired || lock2.status !== "IN_FLIGHT") {
    throw new Error(`FAIL: Concurrent duplicate was NOT blocked! Status: ${lock2.status}`);
  }
  console.log("✓ Concurrent duplicate blocked as IN_FLIGHT.");

  // 3. Mark Completed
  await IdempotencyEngine.complete(tenantId, key, "exec_1001", { delivered: true });

  // 4. Third Replay Attempt (After Completion)
  const lock3 = await IdempotencyEngine.acquireLock(tenantId, key, 60);
  if (lock3.acquired || lock3.status !== "ALREADY_PROCESSED") {
    throw new Error(`FAIL: Completed event allowed reprocessing! Status: ${lock3.status}`);
  }
  console.log("✓ Completed event successfully marked ALREADY_PROCESSED.");

  console.log("🎉 All IdempotencyEngine tests passed!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
