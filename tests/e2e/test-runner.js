#!/usr/bin/env node

/**
 * QuickReply Headless E2E Test Runner
 * Playwright Core test suite across 4 verification tiers.
 *
 * Usage:
 *   node tests/e2e/test-runner.js [options]
 *
 * Options:
 *   --tier <1|2|3|4|all>   Run specific tier (default: all)
 *   --bail                 Stop execution immediately on first test failure
 *   --json                 Output machine-readable JSON results
 *   --help                 Display usage instructions
 */

const { launchBrowser } = require('./helpers');
const { runTier1 } = require('./tier1-features');
const { runTier2 } = require('./tier2-boundary');
const { runTier3 } = require('./tier3-cross-feature');
const { runTier4 } = require('./tier4-acceptance');

// Parse CLI Arguments
const args = process.argv.slice(2);
let selectedTier = 'all';
let bailOnFail = false;
let outputJson = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--tier' && args[i + 1]) {
    selectedTier = args[i + 1].toLowerCase();
    i++;
  } else if (arg.startsWith('--tier=')) {
    selectedTier = arg.split('=')[1].toLowerCase();
  } else if (arg === '--bail') {
    bailOnFail = true;
  } else if (arg === '--json') {
    outputJson = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
QuickReply Headless E2E Test Runner

Usage:
  node tests/e2e/test-runner.js [options]

Options:
  --tier <1|2|3|4|all>   Run specific tier (default: all)
  --bail                 Stop execution immediately on first failure
  --json                 Print machine-readable JSON report
  --help, -h             Show this help message
`);
    process.exit(0);
  }
}

// ANSI Color formatting
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg = '') {
  if (!outputJson) console.log(msg);
}

async function main() {
  const startTime = Date.now();
  log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  log(`${colors.bold}${colors.cyan}  QUICKREPLY E2E VERIFICATION TEST SUITE (PLAYWRIGHT CORE)           ${colors.reset}`);
  log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  log(`Tier Filter : ${selectedTier.toUpperCase()}`);
  log(`Bail Mode   : ${bailOnFail ? 'ENABLED' : 'DISABLED'}`);
  log(`Target Host : ${process.env.BASE_URL || 'http://localhost:3000'}`);
  log();

  let browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    console.error(`${colors.red}Failed to launch Chromium browser:${colors.reset}`, err.message);
    process.exit(1);
  }

  const allResults = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    tiers: {},
  };

  const tiersToRun = [];
  if (selectedTier === '1' || selectedTier === 'all') tiersToRun.push({ id: 'Tier 1', name: 'Feature Coverage', fn: runTier1 });
  if (selectedTier === '2' || selectedTier === 'all') tiersToRun.push({ id: 'Tier 2', name: 'Boundary & Corner Cases', fn: runTier2 });
  if (selectedTier === '3' || selectedTier === 'all') tiersToRun.push({ id: 'Tier 3', name: 'Cross-Feature Combinations', fn: runTier3 });
  if (selectedTier === '4' || selectedTier === 'all') tiersToRun.push({ id: 'Tier 4', name: 'Real-World Acceptance Scenarios', fn: runTier4 });

  let hasFailure = false;

  for (const tier of tiersToRun) {
    log(`${colors.bold}${colors.yellow}>>> Running ${tier.id}: ${tier.name}${colors.reset}`);
    log('----------------------------------------------------------------------');

    let tierResults = [];
    try {
      tierResults = await tier.fn(browser, (res) => {
        allResults.totalTests++;
        if (res.passed) {
          allResults.passed++;
          log(`  ${colors.green}✔ PASS${colors.reset} [${res.id}] ${colors.bold}${res.name}${colors.reset} (${res.durationMs}ms)`);
          log(`         ${colors.dim}${res.message}${colors.reset}`);
        } else {
          allResults.failed++;
          hasFailure = true;
          log(`  ${colors.red}✖ FAIL${colors.reset} [${res.id}] ${colors.bold}${res.name}${colors.reset} (${res.durationMs}ms)`);
          log(`         ${colors.red}${res.message}${colors.reset}`);
        }
      });
    } catch (err) {
      const crashRes = {
        id: 'CRASH',
        name: `${tier.id} Execution Failure`,
        passed: false,
        message: 'FATAL: ' + err.message,
        durationMs: 0,
      };
      tierResults = [crashRes];
      allResults.totalTests++;
      allResults.failed++;
      hasFailure = true;
      log(`  ${colors.red}✖ FAIL${colors.reset} [CRASH] ${colors.bold}${tier.id} Execution Failure${colors.reset}`);
      log(`         ${colors.red}FATAL: ${err.message}${colors.reset}`);
    }

    allResults.tiers[tier.id] = tierResults;

    log();
    if (hasFailure && bailOnFail) break;
  }

  await browser.close();
  allResults.durationMs = Date.now() - startTime;

  if (outputJson) {
    console.log(JSON.stringify(allResults, null, 2));
  } else {
    log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
    log(`${colors.bold}  SUMMARY REPORT${colors.reset}`);
    log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
    log(`  Total Tests : ${allResults.totalTests}`);
    log(`  Passed      : ${colors.green}${allResults.passed}${colors.reset}`);
    log(`  Failed      : ${allResults.failed > 0 ? colors.red + allResults.failed : colors.green + '0'}${colors.reset}`);
    log(`  Duration    : ${(allResults.durationMs / 1000).toFixed(2)}s`);
    log('----------------------------------------------------------------------');

    if (hasFailure) {
      log(`${colors.bold}${colors.red}OVERALL STATUS: FAILED (${allResults.failed} failing tests)${colors.reset}\n`);
    } else {
      log(`${colors.bold}${colors.green}OVERALL STATUS: PASSED (100% acceptance criteria satisfied)${colors.reset}\n`);
    }
  }

  process.exit(hasFailure ? 1 : 0);
}

main().catch((err) => {
  console.error('Unhandled Test Runner Exception:', err);
  process.exit(1);
});
