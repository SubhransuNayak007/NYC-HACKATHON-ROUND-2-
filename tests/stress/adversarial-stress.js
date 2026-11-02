#!/usr/bin/env node

/**
 * QuickReply Adversarial Stress Test Suite
 * Executed by Empirical Challenger Agent
 *
 * Verifies 5 rigorous stress conditions:
 * 1. Extreme scroll velocities and scroll-math bounds.
 * 2. Dynamic window resizing between desktop (1440px), tablet (1024px, 768px), and mobile (393px, 320px).
 * 3. Card bounding rects: verify zero negative left coordinates (rect.left >= 0) during scroll entry in Autonomous Workflow Suite and Feature Cards stack.
 * 4. Folder tabs vertical overlap: verify tabRect.bottom - bodyRect.top >= 0 across zoom levels (100%, 125%, 150%).
 * 5. Dynamic Island transitions: rapid toggling between main, features, integrations, < Back under animation interruption.
 */

const { chromium } = require('playwright-core');
const path = require('path');
const { CHROME_PATH, BASE_URL } = require('../e2e/helpers');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

async function launchBrowser() {
  return await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });
}

/**
 * STRESS TEST 1: Extreme scroll velocities & scroll-math bounds
 */
async function testExtremeScrollVelocities(browser) {
  console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}STRESS TEST 1: Extreme Scroll Velocities & Scroll-Math Bounds${colors.reset}`);
  console.log(`${colors.cyan}======================================================================${colors.reset}`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message || String(err)));

  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);

  const scrollSequences = [
    { name: 'Hyper-jump to bottom', deltaY: 20000 },
    { name: 'Violent reverse to top', deltaY: -25000 },
    { name: 'Rapid oscillation 1', deltaY: 5000 },
    { name: 'Rapid oscillation 2', deltaY: -4000 },
    { name: 'Rapid oscillation 3', deltaY: 8000 },
    { name: 'Rapid oscillation 4', deltaY: -7000 },
    { name: 'Micro wheel bursts', deltaY: 300 },
    { name: 'Massive burst to 50%', deltaY: 6000 },
  ];

  let violations = [];

  for (const seq of scrollSequences) {
    // Perform rapid scroll via evaluate and wheel events
    await page.mouse.wheel(0, seq.deltaY);
    await page.evaluate((dy) => {
      window.scrollBy({ top: dy, behavior: 'instant' });
    }, seq.deltaY);
    // Give short 80ms window to catch transient intermediate frame states
    await page.waitForTimeout(80);

    const frameMetrics = await page.evaluate(() => {
      const scrollY = window.scrollY;
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      const hasHorizontalOverflow = scrollWidth > innerWidth;

      // Check all transform strings across animated elements for NaN or Infinity
      const elementsWithTransform = Array.from(document.querySelectorAll('*')).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.transform && style.transform !== 'none';
      });

      const brokenTransforms = [];
      for (const el of elementsWithTransform) {
        const t = window.getComputedStyle(el).transform;
        if (t.includes('NaN') || t.includes('Infinity')) {
          brokenTransforms.push({
            tag: el.tagName,
            cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 40) : '',
            transform: t,
          });
        }
      }

      return {
        scrollY,
        maxScrollY,
        scrollWidth,
        innerWidth,
        hasHorizontalOverflow,
        brokenTransforms,
      };
    });

    if (frameMetrics.hasHorizontalOverflow) {
      violations.push(`${seq.name}: horizontal overflow detected (${frameMetrics.scrollWidth}px > ${frameMetrics.innerWidth}px)`);
    }
    if (frameMetrics.brokenTransforms.length > 0) {
      violations.push(`${seq.name}: broken NaN/Infinity transforms detected on ${frameMetrics.brokenTransforms.length} elements`);
    }

    console.log(`  - [${seq.name}] scrollY: ${frameMetrics.scrollY.toFixed(0)}px | max: ${frameMetrics.maxScrollY.toFixed(0)}px | width: ${frameMetrics.scrollWidth}px | brokenTransforms: ${frameMetrics.brokenTransforms.length}`);
  }

  // Settle and verify final page state
  await page.waitForTimeout(500);

  await page.close();

  const passed = violations.length === 0 && pageErrors.length === 0;
  console.log(`\nVerdict: ${passed ? colors.green + 'PASS ✅' : colors.red + 'FAIL ❌'}${colors.reset} (Violations: ${violations.length}, Page Errors: ${pageErrors.length})`);
  return { passed, violations, pageErrors };
}

/**
 * STRESS TEST 2: Dynamic window resizing between desktop, tablet, and mobile
 */
async function testDynamicResizing(browser) {
  console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}STRESS TEST 2: Dynamic Window Resizing (1440px -> 1024px -> 768px -> 393px -> 320px -> 1440px)${colors.reset}`);
  console.log(`${colors.cyan}======================================================================${colors.reset}`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message || String(err)));

  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);

  const resizeTargets = [
    { label: 'Desktop 1440px', width: 1440, height: 900 },
    { label: 'Tablet Landscape 1024px', width: 1024, height: 768 },
    { label: 'Tablet Portrait 768px', width: 768, height: 1024 },
    { label: 'Mobile Large 393px', width: 393, height: 852 },
    { label: 'Mobile Small 320px', width: 320, height: 568 },
    { label: 'Re-expand Desktop 1440px', width: 1440, height: 900 },
  ];

  let violations = [];

  for (const target of resizeTargets) {
    await page.setViewportSize({ width: target.width, height: target.height });
    await page.waitForTimeout(350); // allow resize observer and CSS media queries to adapt

    const metrics = await page.evaluate((targetWidth) => {
      const sw = document.documentElement.scrollWidth;
      const cw = document.documentElement.clientWidth;
      const iw = window.innerWidth;
      const hasOverflow = sw > iw;

      // Check header bounds
      const header = document.querySelector('header');
      const headerRect = header ? header.getBoundingClientRect() : null;

      // Check section #features (Everything It Does)
      const features = document.querySelector('#features');
      const featuresRect = features ? features.getBoundingClientRect() : null;

      // Check dark comparison section #comparison
      const comparison = document.querySelector('#comparison');
      const compRect = comparison ? comparison.getBoundingClientRect() : null;

      return {
        targetWidth,
        scrollWidth: sw,
        clientWidth: cw,
        innerWidth: iw,
        hasOverflow,
        headerWidth: headerRect ? headerRect.width : 0,
        featuresHeight: featuresRect ? featuresRect.height : 0,
        comparisonTop: compRect ? compRect.top : 0,
      };
    }, target.width);

    const overflowDelta = Math.max(0, metrics.scrollWidth - target.width);
    if (overflowDelta > 0.5) {
      violations.push(`${target.label}: horizontal overflow of +${overflowDelta.toFixed(1)}px (scrollWidth: ${metrics.scrollWidth}px > ${target.width}px)`);
    }

    console.log(`  - [${target.label}] innerWidth: ${metrics.innerWidth}px | scrollWidth: ${metrics.scrollWidth}px | featuresH: ${metrics.featuresHeight.toFixed(0)}px | overflow: ${overflowDelta > 0.5 ? colors.red + '+' + overflowDelta.toFixed(1) + 'px ❌' : colors.green + '0px ✅'}${colors.reset}`);
  }

  await page.close();
  const passed = violations.length === 0 && pageErrors.length === 0;
  console.log(`\nVerdict: ${passed ? colors.green + 'PASS ✅' : colors.red + 'FAIL ❌'}${colors.reset} (Violations: ${violations.length}, Page Errors: ${pageErrors.length})`);
  return { passed, violations, pageErrors };
}

/**
 * STRESS TEST 3: Card bounding rects: verify zero negative left coordinates (rect.left >= 0)
 * in Autonomous Workflow Suite and Feature Cards stack during scroll entry.
 */
async function testCardBoundingRects(browser) {
  console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}STRESS TEST 3: Card Bounding Rects (Zero Negative Left Coordinates: rect.left >= 0)${colors.reset}`);
  console.log(`${colors.cyan}======================================================================${colors.reset}`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message || String(err)));

  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);

  let violations = [];

  // Part A: Autonomous Workflow Suite (SlidingCardsMarquee)
  console.log('\n--- Part A: Autonomous Workflow Suite Card Bounding Rects ---');
  // Locate the section
  const workflowSection = await page.$('section.bg-\\[\\#FAF8F5\\]');
  const sectionBox = await workflowSection.boundingBox();
  console.log(`  Workflow Section Top: ${sectionBox.y.toFixed(0)}px, Height: ${sectionBox.height.toFixed(0)}px`);

  // Scroll through workflow suite in 8 steps
  const scrollSteps = [0.0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0];
  for (const step of scrollSteps) {
    const targetScrollY = Math.max(0, sectionBox.y + sectionBox.height * step - 300);
    await page.evaluate((y) => window.scrollTo(0, y), targetScrollY);
    await page.waitForTimeout(200);

    const cardMetrics = await page.evaluate(() => {
      // Find visible cards in top row and bottom row
      const desktopRow1 = document.querySelector('section.bg-\\[\\#FAF8F5\\] div.hidden.md\\:block > div:nth-child(1)');
      const desktopRow2 = document.querySelector('section.bg-\\[\\#FAF8F5\\] div.hidden.md\\:block > div:nth-child(2)');

      if (!desktopRow1 || !desktopRow2) return null;

      const row1Cards = Array.from(desktopRow1.children);
      const row2Cards = Array.from(desktopRow2.children);

      const r1FirstCard = row1Cards[0] ? row1Cards[0].getBoundingClientRect() : null;
      const r2FirstCard = row2Cards[0] ? row2Cards[0].getBoundingClientRect() : null;

      return {
        r1FirstCardLeft: r1FirstCard ? r1FirstCard.left : null,
        r2FirstCardLeft: r2FirstCard ? r2FirstCard.left : null,
        r1Count: row1Cards.length,
        r2Count: row2Cards.length,
      };
    });

    if (cardMetrics) {
      const r1Left = cardMetrics.r1FirstCardLeft;
      const r2Left = cardMetrics.r2FirstCardLeft;
      console.log(`    Scroll ${(step * 100).toFixed(0)}%: Row 1 Card 1 left = ${r1Left !== null ? r1Left.toFixed(1) : 'N/A'}px | Row 2 Card 1 left = ${r2Left !== null ? r2Left.toFixed(1) : 'N/A'}px`);

      if (r1Left !== null && r1Left < -0.5) {
        violations.push(`Workflow Row 1 Card 1 sliced off left boundary at ${(step * 100).toFixed(0)}% scroll: left = ${r1Left.toFixed(1)}px < 0`);
      }
    }
  }

  // Part B: Feature Cards Stack (EVERYTHING IT DOES)
  console.log('\n--- Part B: Feature Cards Stack (7 Engines) Bounding Rects ---');
  const featuresSection = await page.$('#features');
  const featBox = await featuresSection.boundingBox();
  console.log(`  Features Section Top: ${featBox.y.toFixed(0)}px, Height: ${featBox.height.toFixed(0)}px`);

  // Scroll through features section at 10 increments
  const featSteps = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  for (const step of featSteps) {
    const scrollY = featBox.y + featBox.height * step;
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(200);

    const featMetrics = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#features div[style*="background-color"]'));
      return cards.map((c, idx) => {
        const r = c.getBoundingClientRect();
        return {
          index: idx,
          left: r.left,
          right: r.right,
          width: r.width,
          top: r.top,
          isNegativeLeft: r.left < -0.5,
        };
      });
    });

    const negativeCards = featMetrics.filter((c) => c.isNegativeLeft);
    if (negativeCards.length > 0) {
      for (const nc of negativeCards) {
        violations.push(`Feature Card ${nc.index + 1} sliced off left boundary: left = ${nc.left.toFixed(1)}px < 0 at step ${(step * 100).toFixed(0)}%`);
      }
    }

    if (featMetrics.length > 0) {
      const minLeft = Math.min(...featMetrics.map((c) => c.left));
      console.log(`    Scroll ${(step * 100).toFixed(0)}%: ${featMetrics.length} cards checked | minLeft = ${minLeft.toFixed(1)}px >= 0 : ${minLeft >= -0.5 ? 'YES ✅' : 'NO ❌'}`);
    }
  }

  await page.close();
  const passed = violations.length === 0 && pageErrors.length === 0;
  console.log(`\nVerdict: ${passed ? colors.green + 'PASS ✅' : colors.red + 'FAIL ❌'}${colors.reset} (Violations: ${violations.length}, Page Errors: ${pageErrors.length})`);
  return { passed, violations, pageErrors };
}

/**
 * STRESS TEST 4: Folder tabs vertical overlap (tabRect.bottom - bodyRect.top >= 0)
 * across zoom levels (100%, 125%, 150%) on desktop and mobile.
 */
async function testFolderTabsVerticalOverlap(browser) {
  console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}STRESS TEST 4: Folder Tabs Vertical Overlap Across Zoom Levels (100%, 125%, 150%)${colors.reset}`);
  console.log(`${colors.cyan}======================================================================${colors.reset}`);

  const zoomLevels = [
    { label: '100% (1.00x)', scale: 1.0 },
    { label: '125% (1.25x)', scale: 1.25 },
    { label: '150% (1.50x)', scale: 1.5 },
  ];

  let violations = [];

  for (const zoom of zoomLevels) {
    console.log(`\nTesting Zoom Level: ${zoom.label}...`);
    const page = await browser.newPage({
      viewport: { width: Math.round(1440 / zoom.scale), height: Math.round(900 / zoom.scale) },
      deviceScaleFactor: zoom.scale,
    });

    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(800);

    // Scroll to four steps section
    await page.evaluate(() => {
      const h2 = Array.from(document.querySelectorAll('h2')).find((el) => el.innerText.includes('FOUR STEPS'));
      if (h2) {
        h2.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    });
    await page.waitForTimeout(400);

    const overlapMetrics = await page.evaluate(() => {
      // Inspect desktop staircase cards or mobile cards
      const tabs = Array.from(document.querySelectorAll('div')).filter((el) => {
        const text = el.innerText ? el.innerText.trim() : '';
        return text.startsWith('⚡/') && text.length <= 4;
      });

      return tabs.map((tabEl) => {
        const tabText = tabEl.innerText.trim();
        const tabRect = tabEl.getBoundingClientRect();
        // The card body is the sibling or next container
        const parentCol = tabEl.closest('div.relative.z-10') || tabEl.parentElement;
        const cardBody = parentCol ? parentCol.nextElementSibling : null;
        const bodyRect = cardBody ? cardBody.getBoundingClientRect() : null;

        const overlapPx = bodyRect ? tabRect.bottom - bodyRect.top : 0;
        return {
          tabText,
          tabBottom: tabRect.bottom,
          bodyTop: bodyRect ? bodyRect.top : null,
          overlapPx,
          hasHairlineGap: overlapPx < -0.05,
        };
      });
    });

    console.log(`  Zoom ${zoom.label} results (${overlapMetrics.length} tabs found):`);
    for (const m of overlapMetrics) {
      const hasGap = m.hasHairlineGap;
      console.log(`    Tab [${m.tabText}]: tabBottom=${m.tabBottom.toFixed(2)}px | bodyTop=${m.bodyTop !== null ? m.bodyTop.toFixed(2) : 'N/A'}px | overlap=${m.overlapPx.toFixed(2)}px -> ${hasGap ? colors.red + 'GAP DETECTED ❌' : colors.green + 'SEAMLESS ✅'}${colors.reset}`);
      if (hasGap) {
        violations.push(`Zoom ${zoom.label} Tab ${m.tabText} has hairline gap: overlap = ${m.overlapPx.toFixed(2)}px < 0`);
      }
    }

    await page.close();
  }

  const passed = violations.length === 0;
  console.log(`\nVerdict: ${passed ? colors.green + 'PASS ✅' : colors.red + 'FAIL ❌'}${colors.reset} (Violations: ${violations.length})`);
  return { passed, violations };
}

/**
 * STRESS TEST 5: Dynamic Island transitions: rapid toggling between
 * main, features, integrations, < Back under animation interruption.
 */
async function testDynamicIslandTransitions(browser) {
  console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}STRESS TEST 5: Dynamic Island Transitions Under Rapid Animation Interruption${colors.reset}`);
  console.log(`${colors.cyan}======================================================================${colors.reset}`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message || String(err)));

  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);

  let violations = [];

  // Step 1: Click the center menu trigger pill to open menu
  console.log('  1. Opening Dynamic Island Menu...');
  const menuTrigger = page.locator('header button[aria-label*="navigation menu"], header button:has-text("Menu")').first();
  const triggerCount = await menuTrigger.count();
  if (triggerCount === 0) {
    violations.push('Menu trigger button not found in DOM');
  } else {
    await menuTrigger.click();
    await page.waitForTimeout(400);
  }

  // Step 2: Rapidly spam transition clicks with sub-animation timing (50ms - 100ms)
  console.log('  2. Executing rapid view switching under animation interruption...');
  const rapidActions = [
    { target: 'FEATURES', label: 'Click FEATURES' },
    { target: 'Back', label: 'Interrupt with ‹ Back (100ms)' },
    { target: 'INTEGRATIONS', label: 'Interrupt with INTEGRATIONS (80ms)' },
    { target: 'Back', label: 'Interrupt with ‹ Back (70ms)' },
    { target: 'FEATURES', label: 'Click FEATURES again (60ms)' },
    { target: 'Back', label: 'Return to main menu' },
  ];

  for (const act of rapidActions) {
    const btnLocator = page.locator(`header div[style*="10000"] button:has-text("${act.target}")`).first();
    let clicked = false;
    try {
      if (await btnLocator.isVisible({ timeout: 500 })) {
        await btnLocator.click({ timeout: 500, force: true });
        clicked = true;
      }
    } catch {
      clicked = false;
    }

    // Wait minimal time to interrupt the spring / slide animation midway
    await page.waitForTimeout(100);

    // Sample view container count during animation frame
    const activeViewContainers = await page.evaluate(() => {
      const menuBox = document.querySelector('div[style*="10000"], div[style*="z-index: 10000"]');
      if (!menuBox) return 0;
      // In Framer Motion <AnimatePresence mode="wait">, at most 1 active view div should be present
      const motionViews = Array.from(menuBox.children).filter((el) => {
        const text = el.innerText || '';
        return text.includes('FEATURES') || text.includes('CAMPAIGNS') || text.includes('INSTAGRAM') || text.includes('‹ Back');
      });
      return motionViews.length;
    });

    console.log(`    Action: ${act.label} (Found button: ${clicked}) | Active View Containers: ${activeViewContainers}`);

    if (activeViewContainers > 1) {
      violations.push(`Double-rendering detected during action "${act.label}": ${activeViewContainers} view containers simultaneously present`);
    }
  }

  // Step 3: Let animations settle completely and verify final stability
  console.log('  3. Allowing animations to settle (500ms)...');
  await page.waitForTimeout(500);

  const finalMenuState = await page.evaluate(() => {
    const menuBox = document.querySelector('div[style*="10000"], div[style*="z-index: 10000"]');
    if (!menuBox) return { exists: false };
    const text = menuBox.innerText || '';
    const hasHome = text.includes('HOME');
    const hasFeatures = text.includes('FEATURES');
    const hasIntegrations = text.includes('INTEGRATIONS');
    return {
      exists: true,
      hasHome,
      hasFeatures,
      hasIntegrations,
      boxWidth: menuBox.getBoundingClientRect().width,
    };
  });

  console.log(`  Final Menu State: exists=${finalMenuState.exists}, hasHome=${finalMenuState.hasHome}, width=${finalMenuState.boxWidth ? finalMenuState.boxWidth.toFixed(1) + 'px' : 'N/A'}`);

  if (!finalMenuState.hasHome) {
    violations.push('Dynamic Island did not settle into valid view after rapid interruptions');
  }

  await page.close();
  const passed = violations.length === 0 && pageErrors.length === 0;
  console.log(`\nVerdict: ${passed ? colors.green + 'PASS ✅' : colors.red + 'FAIL ❌'}${colors.reset} (Violations: ${violations.length}, Page Errors: ${pageErrors.length})`);
  return { passed, violations, pageErrors };
}

async function main() {
  console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   CHALLENGER EMPIRICAL ADVERSARIAL STRESS TEST SUITE                ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`Target Host : ${BASE_URL}`);
  console.log(`Timestamp   : ${new Date().toISOString()}`);

  const browser = await launchBrowser();
  const suiteResults = {};

  try {
    suiteResults.stress1 = await testExtremeScrollVelocities(browser);
    suiteResults.stress2 = await testDynamicResizing(browser);
    suiteResults.stress3 = await testCardBoundingRects(browser);
    suiteResults.stress4 = await testFolderTabsVerticalOverlap(browser);
    suiteResults.stress5 = await testDynamicIslandTransitions(browser);

    console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bold}ADVERSARIAL STRESS TEST RESULTS SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}======================================================================${colors.reset}`);

    const s1 = suiteResults.stress1.passed;
    const s2 = suiteResults.stress2.passed;
    const s3 = suiteResults.stress3.passed;
    const s4 = suiteResults.stress4.passed;
    const s5 = suiteResults.stress5.passed;

    console.log(`1. Extreme Scroll Velocities & Scroll-Math Bounds : ${s1 ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
    console.log(`2. Dynamic Window Resizing (1440 -> 320 -> 1440px) : ${s2 ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
    console.log(`3. Card Bounding Rects (rect.left >= 0 Invariant)  : ${s3 ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
    console.log(`4. Folder Tabs Vertical Overlap (100%, 125%, 150%) : ${s4 ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
    console.log(`5. Dynamic Island Rapid Transition Interruption   : ${s5 ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);

    const allPassed = s1 && s2 && s3 && s4 && s5;
    const finalVerdict = allPassed ? 'APPROVE' : 'REJECT';

    console.log(`${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
    console.log(`${colors.bold}CHALLENGER STRESS VERDICT: ${allPassed ? colors.green + 'APPROVE ✅' : colors.red + 'REJECT ❌'}${colors.reset}`);
    console.log(`${colors.cyan}======================================================================${colors.reset}`);

    return {
      allPassed,
      finalVerdict,
      suiteResults,
    };
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main()
    .then((res) => {
      process.exit(res.allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Stress test execution fatal error:', err);
      process.exit(1);
    });
}

module.exports = { main };
