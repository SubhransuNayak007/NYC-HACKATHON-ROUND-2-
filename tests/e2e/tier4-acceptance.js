/**
 * Tier 4: Real-World Acceptance Scenarios Test Suite
 * Full landing page traversals across Desktop and Mobile, element collision checks,
 * and multi-route developer console cleanliness.
 */

const {
  BASE_URL,
  VIEWPORTS,
  createPage,
  hydrateFullPage,
} = require('./helpers');

/**
 * Execute Tier 4 Acceptance Tests
 * @param {import('playwright-core').Browser} browser
 * @param {(result: any) => void} [onTestComplete]
 * @returns {Promise<Array<{ id: string, name: string, passed: boolean, message: string, details?: any }>>}
 */
async function runTier4(browser, onTestComplete = () => {}) {
  const results = [];

  async function test(id, name, fn) {
    const start = Date.now();
    let res;
    try {
      const details = await fn();
      res = {
        id,
        name,
        passed: true,
        durationMs: Date.now() - start,
        message: 'PASS: ' + (details?.summary || 'Acceptance scenario passed'),
        details,
      };
    } catch (err) {
      res = {
        id,
        name,
        passed: false,
        durationMs: Date.now() - start,
        message: 'FAIL: ' + (err.message || String(err)),
        stack: err.stack,
      };
    }
    results.push(res);
    onTestComplete(res);
  }

  // --------------------------------------------------------------------------
  // A01: Full Desktop (1440x900) Traversal & Collision Check
  // --------------------------------------------------------------------------
  await test('A01', 'Full Desktop (1440x900) Traversal & Zero Collision Gate', async () => {
    const { page, errors } = await createPage(browser, VIEWPORTS.desktop);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await hydrateFullPage(page);

      // Traversal step-by-step
      const traversalReport = await page.evaluate(async () => {
        const sections = Array.from(document.querySelectorAll('main > section, main > div'));
        const collisions = [];

        // Scroll sequentially to each section
        for (let i = 0; i < sections.length; i++) {
          const s = sections[i];
          s.scrollIntoView({ behavior: 'instant', block: 'start' });
          await new Promise(r => setTimeout(r, 100));

          // Check for horizontal overflow at this step
          const sw = document.documentElement.scrollWidth;
          const cw = document.documentElement.clientWidth;
          if (sw > cw) {
            collisions.push({
              sectionIndex: i,
              id: s.id || `section-${i}`,
              error: `Horizontal overflow at section: ${sw}px > ${cw}px`,
            });
          }
        }

        return {
          totalSectionsTraversed: sections.length,
          collisionsCount: collisions.length,
          collisions,
        };
      });

      if (traversalReport.collisionsCount > 0) {
        throw new Error(`Desktop traversal found collisions/overflow: ${JSON.stringify(traversalReport.collisions)}`);
      }

      // Check console errors
      const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('React DevTools'));
      if (criticalErrors.length > 0) {
        throw new Error(`Console errors during desktop traversal: ${criticalErrors.join('; ')}`);
      }

      return {
        summary: `Successfully traversed all ${traversalReport.totalSectionsTraversed} sections on 1440x900 with zero collisions and zero console errors`,
        ...traversalReport,
      };
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // A02: Full Mobile (393x852) Traversal & Overflow Gate
  // --------------------------------------------------------------------------
  await test('A02', 'Full Mobile (393x852) Traversal & Zero Overflow Gate', async () => {
    const { page, errors } = await createPage(browser, VIEWPORTS.mobile);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await hydrateFullPage(page);

      const mobileTraversal = await page.evaluate(async () => {
        const sections = Array.from(document.querySelectorAll('main > section, main > div'));
        const overflowViolations = [];

        for (let i = 0; i < sections.length; i++) {
          const s = sections[i];
          s.scrollIntoView({ behavior: 'instant', block: 'start' });
          await new Promise(r => setTimeout(r, 100));

          const sw = document.documentElement.scrollWidth;
          const cw = document.documentElement.clientWidth;
          if (sw > cw) {
            overflowViolations.push({
              sectionIndex: i,
              id: s.id || `section-${i}`,
              scrollWidth: sw,
              clientWidth: cw,
              overflow: sw - cw,
            });
          }
        }

        return {
          totalSections: sections.length,
          violationsCount: overflowViolations.length,
          overflowViolations,
        };
      });

      if (mobileTraversal.violationsCount > 0) {
        throw new Error(
          `Mobile traversal detected horizontal overflow in ${mobileTraversal.violationsCount} section(s): ${JSON.stringify(mobileTraversal.overflowViolations)}`
        );
      }

      const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('React DevTools'));
      if (criticalErrors.length > 0) {
        throw new Error(`Console errors during mobile traversal: ${criticalErrors.join('; ')}`);
      }

      return {
        summary: `Successfully traversed all ${mobileTraversal.totalSections} sections on 393x852 with strictly zero horizontal overflow (scrollWidth <= 393px)`,
        ...mobileTraversal,
      };
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // A03: Multi-Route Console Cleanliness (/ and /register)
  // --------------------------------------------------------------------------
  await test('A03', 'Multi-Route Console Cleanliness Gate (/ and /register)', async () => {
    const { page, errors, warnings } = await createPage(browser, VIEWPORTS.desktop);
    try {
      const preloadLogs = [];
      page.on('console', msg => {
        const t = msg.text();
        if (t.toLowerCase().includes('preload') || t.toLowerCase().includes('preloaded')) {
          preloadLogs.push({ type: msg.type(), text: t });
        }
      });

      // Test 1: Landing page (/)
      await page.goto(BASE_URL + '/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(4000);

      // Test 2: Auth page (/register)
      await page.goto(BASE_URL + '/register', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(4000);

      if (preloadLogs.length > 0) {
        throw new Error(
          `Detected ${preloadLogs.length} preload console warning(s) across / and /register: ${preloadLogs.map(l => l.text).join(' | ')}`
        );
      }

      const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('React DevTools'));
      if (criticalErrors.length > 0) {
        throw new Error(`Critical console errors detected: ${criticalErrors.join('; ')}`);
      }

      return {
        summary: 'Zero preload warnings and zero unhandled console errors across / and /register routes',
        routesTested: ['/', '/register'],
        preloadWarningsFound: 0,
        consoleErrorsFound: 0,
      };
    } finally {
      await page.close();
    }
  });

  return results;
}

module.exports = { runTier4 };
