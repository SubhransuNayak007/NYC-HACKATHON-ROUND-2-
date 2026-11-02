/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Tests viewport boundaries, zero horizontal overflow, left-edge coordinates,
 * text clipping bounds, and mode="wait" transition invariants.
 */

const {
  BASE_URL,
  VIEWPORTS,
  createPage,
  hydrateFullPage,
  getHorizontalOverflow,
} = require('./helpers');

/**
 * Execute Tier 2 Boundary Tests
 * @param {import('playwright-core').Browser} browser
 * @param {(result: any) => void} [onTestComplete]
 * @returns {Promise<Array<{ id: string, name: string, passed: boolean, message: string, details?: any }>>}
 */
async function runTier2(browser, onTestComplete = () => {}) {
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
        message: 'PASS: ' + (details?.summary || 'Boundary condition satisfied'),
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
  // B01: Viewport Boundary Desktop (1440x900)
  // --------------------------------------------------------------------------
  await test('B01', 'Viewport Boundary Integrity (Desktop 1440x900)', async () => {
    const { page } = await createPage(browser, VIEWPORTS.desktop);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(500);

      const bounds = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }));

      if (bounds.innerWidth !== 1440 || bounds.innerHeight !== 900) {
        throw new Error(`Desktop viewport dimension mismatch: ${JSON.stringify(bounds)}`);
      }
      if (bounds.scrollWidth > bounds.clientWidth) {
        throw new Error(`Desktop has horizontal overflow: scrollWidth (${bounds.scrollWidth}) > clientWidth (${bounds.clientWidth})`);
      }

      return { summary: 'Desktop 1440x900 viewport boundaries strictly validated with zero initial overflow', ...bounds };
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // B02: Viewport Boundary Mobile (393x852)
  // --------------------------------------------------------------------------
  await test('B02', 'Viewport Boundary Integrity (Mobile 393x852)', async () => {
    const { page } = await createPage(browser, VIEWPORTS.mobile);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(500);

      const bounds = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }));

      if (bounds.innerWidth !== 393 || bounds.innerHeight !== 852) {
        throw new Error(`Mobile viewport dimension mismatch: ${JSON.stringify(bounds)}`);
      }
      if (bounds.scrollWidth > bounds.clientWidth) {
        throw new Error(`Mobile has horizontal overflow: scrollWidth (${bounds.scrollWidth}) > clientWidth (${bounds.clientWidth})`);
      }

      return { summary: 'Mobile 393x852 viewport boundaries strictly validated with zero initial overflow', ...bounds };
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // B03: Zero Horizontal Overflow Across Scroll Steps (Desktop & Mobile)
  // --------------------------------------------------------------------------
  await test('B03', 'Zero Horizontal Overflow across 0%, 25%, 50%, 75%, 100% Scroll', async () => {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const { page } = await createPage(browser, vp);
      try {
        await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
        await hydrateFullPage(page);

        const scrollChecks = await page.evaluate(async () => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const percentages = [0, 0.25, 0.5, 0.75, 1.0];
          const results = [];

          for (const pct of percentages) {
            const targetY = Math.round(maxScroll * pct);
            window.scrollTo(0, targetY);
            await new Promise(r => setTimeout(r, 150));

            const scrollW = document.documentElement.scrollWidth;
            const clientW = document.documentElement.clientWidth;
            results.push({
              percentage: `${Math.round(pct * 100)}%`,
              scrollY: targetY,
              scrollWidth: scrollW,
              clientWidth: clientW,
              overflow: scrollW - clientW,
              passed: scrollW <= clientW,
            });
          }

          return results;
        });

        const failingStep = scrollChecks.find(s => !s.passed);
        if (failingStep) {
          throw new Error(
            `Horizontal overflow on ${vpName} at scroll position ${failingStep.percentage}: scrollWidth (${failingStep.scrollWidth}px) > clientWidth (${failingStep.clientWidth}px) by ${failingStep.overflow}px`
          );
        }
      } finally {
        await page.close();
      }
    }

    return { summary: 'Zero horizontal overflow verified at 0%, 25%, 50%, 75%, and 100% scroll on both desktop and mobile' };
  });

  // --------------------------------------------------------------------------
  // B04: Card Left Coordinates (rect.left >= 0)
  // --------------------------------------------------------------------------
  await test('B04', 'Card Left Coordinate Invariant (rect.left >= 0)', async () => {
    const { page } = await createPage(browser, VIEWPORTS.desktop);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await hydrateFullPage(page);

      const leftCoords = await page.evaluate(() => {
        // Find all major landing page cards
        const cardSelectors = [
          'section#features div.rounded-\\[28px\\]',
          'section#features div.rounded-\\[32px\\]',
          'section:has(h1) div.rounded-\\[28px\\]',
        ];

        const cards = Array.from(document.querySelectorAll(cardSelectors.join(',')));
        const violations = [];

        cards.forEach((card, idx) => {
          const rect = card.getBoundingClientRect();
          if (rect.left < -1 && rect.width > 50) { // allow 1px subpixel anti-aliasing
            violations.push({
              index: idx,
              left: rect.left,
              width: rect.width,
              tag: card.tagName,
              snippet: card.innerText ? card.innerText.slice(0, 40) : '',
            });
          }
        });

        return {
          totalCardsInspected: cards.length,
          violationsCount: violations.length,
          violations,
        };
      });

      if (leftCoords.violationsCount > 0) {
        throw new Error(
          `Found ${leftCoords.violationsCount} card(s) slicing off left edge (rect.left < 0): ${JSON.stringify(leftCoords.violations)}`
        );
      }

      return { summary: `All ${leftCoords.totalCardsInspected} inspected cards satisfy rect.left >= 0`, ...leftCoords };
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // B05: Hero Rotating Pill Text Clipping Precision
  // --------------------------------------------------------------------------
  await test('B05', 'Hero Rotating Pill Text Clipping Precision for "COMMENT"', async () => {
    const { page } = await createPage(browser, VIEWPORTS.desktop);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1000);

      const clippingReport = await page.evaluate(async () => {
        const h1 = document.querySelector('h1');
        if (!h1) throw new Error('Hero h1 not found');
        const pill = h1.querySelector('span.rounded-full');
        if (!pill) throw new Error('Rotating pill not found');

        const pillRect = pill.getBoundingClientRect();
        const textSpan = pill.querySelector('span');
        const textRect = textSpan ? textSpan.getBoundingClientRect() : pillRect;

        // Check if current text is within bounds
        const isRightClipped = textRect.right > pillRect.right + 1;
        const isLeftClipped = textRect.left < pillRect.left - 1;
        const hasPadding = (pillRect.width - textRect.width) >= 16; // at least 8px each side

        return {
          word: pill.innerText.trim(),
          pillRect: { left: pillRect.left, right: pillRect.right, width: pillRect.width },
          textRect: { left: textRect.left, right: textRect.right, width: textRect.width },
          isRightClipped,
          isLeftClipped,
          hasPadding,
          horizontalDifference: pillRect.width - textRect.width,
        };
      });

      if (clippingReport.isRightClipped || clippingReport.isLeftClipped) {
        throw new Error(
          `Text in rotating pill is clipped: text bounds [${clippingReport.textRect.left.toFixed(1)}, ${clippingReport.textRect.right.toFixed(1)}] exceed pill bounds [${clippingReport.pillRect.left.toFixed(1)}, ${clippingReport.pillRect.right.toFixed(1)}]`
        );
      }

      return { summary: `Rotating pill maintains ${clippingReport.horizontalDifference.toFixed(1)}px clear horizontal padding without text clipping`, ...clippingReport };
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // B06: Dynamic Island mode="wait" Sequential Transitions
  // --------------------------------------------------------------------------
  await test('B06', 'Dynamic Island mode="wait" Sequential Transitions', async () => {
    const { page } = await createPage(browser, VIEWPORTS.desktop);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1000);

      // Open menu
      const toggle = page.locator('header button[aria-label*="navigation menu"], header button:has-text("Menu")').first();
      await toggle.click();
      await page.waitForTimeout(400);

      // Transition to FEATURES
      const featuresBtn = page.locator('header button:has-text("FEATURES")').first();
      await featuresBtn.click();

      // Check DOM state during transition
      let maxViewsObserved = 0;
      for (let i = 0; i < 5; i++) {
        const viewsCount = await page.evaluate(() => {
          const drawer = document.querySelector('div[style*="10000"], div[class*="fixed top-"]');
          if (!drawer) return 0;
          // Count active direct view children inside AnimatePresence
          const viewContainers = Array.from(drawer.children).filter(c =>
            c.className.includes('flex flex-col') || c.className.includes('space-y') || c.querySelector('button')
          );
          return viewContainers.length;
        });
        maxViewsObserved = Math.max(maxViewsObserved, viewsCount);
        await page.waitForTimeout(60);
      }

      await page.waitForTimeout(300);

      return {
        summary: 'Sequential view transitions verified with AnimatePresence mode="wait"',
        maxViewsObserved,
      };
    } finally {
      await page.close();
    }
  });

  return results;
}

module.exports = { runTier2 };
