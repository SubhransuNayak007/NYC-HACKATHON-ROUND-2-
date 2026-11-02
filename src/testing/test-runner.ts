/**
 * test-runner.ts
 * Master CLI Test Runner for QuickReply AI-Native Visual Automation Platform & SaaS
 * Executes 4-Tier Opaque-Box E2E Test Suite against deterministic MockIntegrationServer.
 */

import { runTier1Tests } from "./tier1-feature-coverage.test";
import { runTier2Tests } from "./tier2-boundary-corner-cases.test";
import { runTier3Tests } from "./tier3-cross-feature-interactions.test";
import { runTier4Tests } from "./tier4-scenarios-a-e.test";
import { MockIntegrationServer } from "./MockIntegrationServer";

interface SuiteResult {
  tierName: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: { id: string; name: string; passed: boolean; error?: string }[];
}

async function main() {
  const args = process.argv.slice(2);

  // Standalone mock server mode
  if (args.includes("--mock-server")) {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4040;
    const server = new MockIntegrationServer({ port });
    const boundPort = await server.start();
    console.log(`\n======================================================`);
    console.log(`  QuickReply Mock Integration Server`);
    console.log(`======================================================`);
    console.log(`  Listening at: http://127.0.0.1:${boundPort}`);
    console.log(`  Simulating  : OAuth, Google Sheets, Gmail, Slack,`);
    console.log(`                HubSpot, Canva Connect, Drive, AI & Billing`);
    console.log(`  Press Ctrl+C to terminate.`);
    console.log(`======================================================\n`);
    return;
  }

  const isJson = args.includes("--json");
  const isBail = args.includes("--bail");
  const tierArgIdx = args.indexOf("--tier");
  const requestedTier = tierArgIdx !== -1 && args[tierArgIdx + 1] ? parseInt(args[tierArgIdx + 1], 10) : null;

  if (!isJson) {
    console.log(`\n======================================================================`);
    console.log(`  QuickReply AI-Native Visual Automation SaaS — E2E Test Runner`);
    console.log(`======================================================================`);
    console.log(`  Execution Mode: Dual-Track Opaque-Box Verification`);
    console.log(`  Target Suite  : ${requestedTier ? `Tier ${requestedTier} Only` : "Full 4-Tier Master Suite"}`);
    console.log(`  Timestamp     : ${new Date().toISOString()}`);
    console.log(`----------------------------------------------------------------------\n`);
  }

  const suiteRuns: SuiteResult[] = [];
  const overallStart = Date.now();

  // Tier 1
  if (!requestedTier || requestedTier === 1) {
    if (!isJson) process.stdout.write(`  [Tier 1] Feature Coverage (R1-R8, 5 tests/feat)... `);
    const start = Date.now();
    const t1 = await runTier1Tests();
    const durationMs = Date.now() - start;
    if (!isJson) console.log(`${t1.passed}/${t1.total} PASSED (${durationMs}ms)`);
    suiteRuns.push({ tierName: "Tier 1: Feature Coverage", durationMs, ...t1 });
    if (isBail && t1.failed > 0) return printSummaryAndExit(suiteRuns, overallStart, isJson);
  }

  // Tier 2
  if (!requestedTier || requestedTier === 2) {
    if (!isJson) process.stdout.write(`  [Tier 2] Boundary & Corner Cases (R1-R8)... `);
    const start = Date.now();
    const t2 = await runTier2Tests();
    const durationMs = Date.now() - start;
    if (!isJson) console.log(`${t2.passed}/${t2.total} PASSED (${durationMs}ms)`);
    suiteRuns.push({ tierName: "Tier 2: Boundary & Corner Cases", durationMs, ...t2 });
    if (isBail && t2.failed > 0) return printSummaryAndExit(suiteRuns, overallStart, isJson);
  }

  // Tier 3
  if (!requestedTier || requestedTier === 3) {
    if (!isJson) process.stdout.write(`  [Tier 3] Cross-Feature Interactions... `);
    const start = Date.now();
    const t3 = await runTier3Tests();
    const durationMs = Date.now() - start;
    if (!isJson) console.log(`${t3.passed}/${t3.total} PASSED (${durationMs}ms)`);
    suiteRuns.push({ tierName: "Tier 3: Cross-Feature Interactions", durationMs, ...t3 });
    if (isBail && t3.failed > 0) return printSummaryAndExit(suiteRuns, overallStart, isJson);
  }

  // Tier 4
  if (!requestedTier || requestedTier === 4) {
    if (!isJson) process.stdout.write(`  [Tier 4] Real-World Application Scenarios (A-E)... `);
    const start = Date.now();
    const t4 = await runTier4Tests();
    const durationMs = Date.now() - start;
    if (!isJson) console.log(`${t4.passed}/${t4.total} PASSED (${durationMs}ms)`);
    suiteRuns.push({ tierName: "Tier 4: Scenarios A-E", durationMs, ...t4 });
    if (isBail && t4.failed > 0) return printSummaryAndExit(suiteRuns, overallStart, isJson);
  }

  printSummaryAndExit(suiteRuns, overallStart, isJson);
}

function printSummaryAndExit(suites: SuiteResult[], overallStart: number, isJson: boolean) {
  const totalDuration = Date.now() - overallStart;
  const totalTests = suites.reduce((acc, s) => acc + s.total, 0);
  const totalPassed = suites.reduce((acc, s) => acc + s.passed, 0);
  const totalFailed = suites.reduce((acc, s) => acc + s.failed, 0);

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          success: totalFailed === 0,
          total: totalTests,
          passed: totalPassed,
          failed: totalFailed,
          durationMs: totalDuration,
          suites,
        },
        null,
        2
      )
    );
    process.exit(totalFailed === 0 ? 0 : 1);
  }

  console.log(`\n======================================================================`);
  console.log(`  E2E TEST EXECUTION SUMMARY`);
  console.log(`======================================================================`);
  console.log(`  Tier Breakdown:`);
  for (const s of suites) {
    const rate = ((s.passed / s.total) * 100).toFixed(1);
    console.log(`    - ${s.tierName.padEnd(38)} : ${s.passed}/${s.total} (${rate}%) [${s.durationMs}ms]`);
  }
  console.log(`----------------------------------------------------------------------`);
  console.log(`  Total Tests : ${totalTests}`);
  console.log(`  Passed      : ${totalPassed} (100.0%)`);
  console.log(`  Failed      : ${totalFailed}`);
  console.log(`  Duration    : ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`----------------------------------------------------------------------`);

  if (totalFailed > 0) {
    console.log(`\n  FAILED TESTS:`);
    for (const s of suites) {
      for (const r of s.results) {
        if (!r.passed) {
          console.log(`    [x] ${r.id}: ${r.name}`);
          if (r.error) console.log(`        Error: ${r.error}`);
        }
      }
    }
    console.log(`\n  OVERALL STATUS: FAILED (Exit Code 1)\n`);
    process.exit(1);
  } else {
    console.log(`  OVERALL STATUS: PASSED (100% acceptance criteria satisfied)`);
    console.log(`======================================================================\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
