/**
 * Test Suite: Challenge & Giveaway Selection Engine
 */

import { GiveawayEngine, GiveawayParticipant } from "../src/backend/giveaway/GiveawayEngine";

async function runTests() {
  console.log("▶ Running Challenge & Giveaway Selection Engine Test Suite...");

  // 1. Test Challenge Answer Validation
  const val1 = GiveawayEngine.validateAnswer("The answer is 42!", {
    id: "c1",
    name: "Math Challenge",
    expectedAnswer: "42",
    validationType: "numeric",
  });
  if (!val1.isValid || val1.detectedAnswer !== "42") {
    throw new Error("FAIL: Numeric challenge validation failed!");
  }
  console.log("✓ Challenge answer correctly validated with numeric extraction.");

  // 2. Test CSPRNG Random Winner Selection
  const participants: GiveawayParticipant[] = [
    {
      id: "p1",
      userId: "u1",
      username: "rohit_sharma",
      commentId: "c1",
      commentText: "Answer is 42",
      platform: "youtube",
      isEligible: true,
      weight: 1,
      enteredAt: new Date().toISOString(),
    },
    {
      id: "p2",
      userId: "u2",
      username: "priya_p",
      commentId: "c2",
      commentText: "My guess: 42",
      platform: "youtube",
      isEligible: true,
      weight: 3, // VIP Weighted 3x
      enteredAt: new Date().toISOString(),
    },
    {
      id: "p3",
      userId: "u3",
      username: "spam_bot",
      commentId: "c3",
      commentText: "Wrong answer 99",
      platform: "youtube",
      isEligible: false,
      ineligibilityReason: "Wrong answer",
      weight: 1,
      enteredAt: new Date().toISOString(),
    },
  ];

  const drawRes = await GiveawayEngine.drawWinner({
    tenantId: "test_tenant",
    campaignId: "camp_1",
    campaignName: "Test Giveaway",
    participants,
    operatorEmail: "admin@quickreply.ai",
  });

  if (!drawRes.success || !drawRes.winner) {
    throw new Error(`FAIL: Winner draw failed: ${drawRes.error}`);
  }
  if (!drawRes.winner.candidateSnapshotHash) {
    throw new Error("FAIL: Winner record missing candidate snapshot hash!");
  }
  if (drawRes.winner.winnerUserId === "u3") {
    throw new Error("FAIL: Ineligible participant was drawn as winner!");
  }
  console.log(`✓ Winner drawn successfully: @${drawRes.winner.winnerUsername} (Hash: ${drawRes.winner.candidateSnapshotHash.substring(0, 10)}...).`);

  console.log("🎉 All Challenge & Giveaway tests passed successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
