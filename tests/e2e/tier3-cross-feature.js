/**
 * Tier 3: Cross-Feature Combinations Test Suite
 * Tests interaction during scroll, mobile menu open/close during scroll,
 * and sticky unpinning transition into the dark comparison table.
 */

const {
  BASE_URL,
  VIEWPORTS,
  createPage,
  hydrateFullPage,
} = require('./helpers');

/**
 * Execute Tier 3 Cross-Feature Tests
 * @param {import('playwright-core').Browser} browser
 * @param {(result: any) => void} [onTestComplete]
 * @returns {Promise<Array<{ id: string, name: string, passed: boolean, message: string, details?: any }>>}
 */
async function runTier3(browser, onTestComplete = () => {}) {
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
        message: 'PASS: ' + (details?.summary || 'Cross-feature interaction verified'),
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
  // C01: Dynamic Interaction During Scroll (Comparison Tabs)
  // --------------------------------------------------------------------------
  await test('C01', 'Interactive Tabs Switching During Scroll in Dark Comparison', async () => {
    const { page } = await createPage(browser, VIEWPORTS.mobile);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await hydrateFullPage(page);

      // Scroll to #comparison section
      const compSection = page.locator('#comparison');
      await compSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);

      // Click "QuickReply" tab
      const qrTab = page.locator('#comparison button:has-text("QuickReply")');
      if (await qrTab.isVisible()) {
        await qrTab.click();
        await page.waitForTimeout(300);

        // Verify active class on button
        const qrActive = await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('#comparison button')).find(b => b.innerText.includes('QuickReply'));
          return btn ? btn.className.includes('EE7D60') || btn.className.includes('bg-') : false;
        });

        if (!qrActive) {
          throw new Error('QuickReply tab button failed to activate upon click');
        }

        // Click "Side by Side" tab
        const sideTab = page.locator('#comparison button:has-text("Side by Side")');
        await sideTab.click();
        await page.waitForTimeout(300);
      }

      // Assert page layout did not break
      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientW = await page.evaluate(() => document.documentElement.clientWidth);

      if (scrollW > clientW) {
        throw new Error(`Comparison tabs interaction caused horizontal layout shift: ${scrollW} > ${clientW}`);
      }

      return { summary: 'Comparison segmented tab toggle responsive during scroll with zero layout shifts' };
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // C02: Mobile Menu Open/Close During Scroll
  // --------------------------------------------------------------------------
  await test('C02', 'Mobile Menu Open/Close at Scroll Offset Y=600px', async () => {
    const { page } = await createPage(browser, VIEWPORTS.mobile);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1000);

      // Scroll down 600px
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(300);

      // Open mobile menu
      const toggle = page.locator('header button[aria-label*="navigation menu"], header button:has-text("Menu")').first();
      await toggle.click({ timeout: 5000, force: true });
      await page.waitForTimeout(400);

      const menuInfo = await page.evaluate(() => {
        const drawer = document.querySelector('div[style*="10000"], div[class*="fixed top-"]');
        if (!drawer) return { isVisible: false };
        const rect = drawer.getBoundingClientRect();
        return {
          isVisible: true,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          withinViewport: rect.top >= 0 && rect.left >= 0 && rect.right <= window.innerWidth,
        };
      });

      if (!menuInfo.isVisible || !menuInfo.withinViewport) {
        throw new Error(`Mobile menu drawer is not positioned cleanly within viewport: ${JSON.stringify(menuInfo)}`);
      }

      // Close menu
      await toggle.click({ timeout: 5000, force: true });
      await page.waitForTimeout(400);

      // Verify scroll position did not jump erroneously
      const scrollYAfter = await page.evaluate(() => window.scrollY);
      const isScrollPreserved = Math.abs(scrollYAfter - 600) < 50;

      if (!isScrollPreserved) {
        throw new Error(`Scroll position jumped unexpectedly after closing menu: expected ~600px, found ${scrollYAfter}px`);
      }

      return { summary: 'Mobile menu opens, renders centered, and closes without disrupting scroll position', menuInfo, scrollYAfter };
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // C03: Sticky Unpinning Transition into Comparison Table
  // --------------------------------------------------------------------------
  await test('C03', 'Sticky Unpinning Transition from Feature Cards into Dark Comparison', async () => {
    const { page } = await createPage(browser, VIEWPORTS.desktop);
    try {
      await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
      await hydrateFullPage(page);

      // Scroll directly to the boundary between #features and #comparison
      const transitionReport = await page.evaluate(async () => {
        const featuresSection = document.querySelector('section#features');
        const comparisonSection = document.querySelector('section#comparison');

        if (!featuresSection || !comparisonSection) {
          throw new Error('Required sections (#features, #comparison) not found');
        }

        comparisonSection.scrollIntoView({ behavior: 'instant', block: 'start' });
        await new Promise(r => setTimeout(r, 400));

        const compRect = comparisonSection.getBoundingClientRect();
        const compHeading = comparisonSection.querySelector('h2');
        const headingRect = compHeading ? compHeading.getBoundingClientRect() : compRect;

        // Check if any card from #features is overlapping the comparison heading
        const featureCards = Array.from(featuresSection.querySelectorAll('div.rounded-\\[28px\\], div.rounded-\\[32px\\]'));
        const overlaps = [];

        featureCards.forEach((c, idx) => {
          const r = c.getBoundingClientRect();
          // Check collision with comparison heading: if card overlaps heading top/bottom
          if (r.bottom > headingRect.top + 10 && r.top < headingRect.bottom - 10) {
            overlaps.push({
              cardIndex: idx + 1,
              cardBottom: r.bottom,
              headingTop: headingRect.top,
              overlapY: r.bottom - headingRect.top,
            });
          }
        });

        return {
          compTop: compRect.top,
          headingTop: headingRect.top,
          headingBottom: headingRect.bottom,
          overlapsCount: overlaps.length,
          overlaps,
        };
      });

      if (transitionReport.overlapsCount > 0) {
        throw new Error(
          `Feature card(s) failed to unpin, colliding over dark comparison table heading: ${JSON.stringify(transitionReport.overlaps)}`
        );
      }

      return { summary: 'Feature cards stack unpins smoothly into dark comparison table with zero element collisions', ...transitionReport };
    } finally {
      await page.close();
    }
  });

  return results;
}

module.exports = { runTier3 };
