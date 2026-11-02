/**
 * Master E2E Landing Page Specification
 * QuickReply Landing Page Stabilization Verification
 * Referenced in PROJECT.md: tests/e2e/landing.spec.ts
 */

import { launchBrowser } from './helpers';
import { runTier1 } from './tier1-features';
import { runTier2 } from './tier2-boundary';
import { runTier3 } from './tier3-cross-feature';
import { runTier4 } from './tier4-acceptance';

export async function runAllLandingSpecs() {
  console.log('Starting Playwright E2E Landing Page Verification Suite...');
  const browser = await launchBrowser();

  try {
    const tier1 = await runTier1(browser);
    const tier2 = await runTier2(browser);
    const tier3 = await runTier3(browser);
    const tier4 = await runTier4(browser);

    return {
      tier1,
      tier2,
      tier3,
      tier4,
    };
  } finally {
    await browser.close();
  }
}

// Allow direct execution via tsx: npx tsx tests/e2e/landing.spec.ts
if (require.main === module) {
  runAllLandingSpecs()
    .then((results) => {
      const allTests = [
        ...results.tier1,
        ...results.tier2,
        ...results.tier3,
        ...results.tier4,
      ];
      const failed = allTests.filter((t) => !t.passed);
      console.log(`\nExecution Finished: ${allTests.length - failed.length}/${allTests.length} Passed`);
      if (failed.length > 0) {
        console.error(`Failed ${failed.length} test(s):`, failed.map((f) => f.id));
        process.exit(1);
      } else {
        console.log('All tests passed successfully!');
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Fatal error during spec execution:', err);
      process.exit(1);
    });
}
