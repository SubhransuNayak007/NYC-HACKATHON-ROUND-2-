/**
 * Challenger Adversarial Verification Suite
 * Executes rigorous empirical checks:
 * 1. Console Cleanliness (5-second dwell on / and /register)
 * 2. Color Contrast & Text Clipping on rotating pill (specifically "COMMENT")
 * 3. Responsive Overflow Stress Test across 9 viewports (320px to 1440px)
 */

const { chromium } = require('playwright-core');
const path = require('path');
const {
  CHROME_PATH,
  BASE_URL,
  calculateContrastRatio,
  parseColor,
} = require('./e2e/helpers');

const VIEWPORT_WIDTHS = [320, 360, 393, 412, 480, 600, 768, 1024, 1440];

async function launch() {
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

async function runChallenge1_ConsoleCleanliness(browser) {
  console.log('\n======================================================');
  console.log('CHALLENGE 1: Console Cleanliness Verification (5s dwell)');
  console.log('======================================================');

  const routes = ['/', '/register'];
  const results = {};

  for (const route of routes) {
    console.log(`\nTesting route: ${route} (5000ms dwell)...`);
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const logs = [];
    const warnings = [];
    const errors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      logs.push({ type, text });
      if (type === 'warning') warnings.push(text);
      if (type === 'error') errors.push(text);
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    const targetUrl = `${BASE_URL}${route}`;
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
    
    // Dwell for full 5 seconds
    await page.waitForTimeout(5000);

    // Analyze preload warnings
    const preloadWarnings = warnings.filter((w) =>
      w.toLowerCase().includes('preload') || w.toLowerCase().includes('was preloaded using link preload')
    );

    // Unhandled runtime errors
    const allErrors = [...errors, ...pageErrors];

    results[route] = {
      totalLogs: logs.length,
      totalWarnings: warnings.length,
      totalErrors: allErrors.length,
      preloadWarnings,
      allErrors,
      rawWarnings: warnings,
      rawLogs: logs,
    };

    console.log(`  Route: ${route}`);
    console.log(`  Total console logs/info: ${logs.length}`);
    console.log(`  Total warnings: ${warnings.length}`);
    console.log(`  Preload warnings: ${preloadWarnings.length}`);
    console.log(`  Total errors / pageErrors: ${allErrors.length}`);

    if (preloadWarnings.length > 0) {
      console.log('  ❌ PRELOAD WARNINGS FOUND:');
      preloadWarnings.forEach((w) => console.log('    - ', w));
    } else {
      console.log('  ✅ ZERO resource preload warnings');
    }

    if (allErrors.length > 0) {
      console.log('  ❌ RUNTIME ERRORS FOUND:');
      allErrors.forEach((e) => console.log('    - ', e));
    } else {
      console.log('  ✅ ZERO unhandled runtime errors');
    }

    await page.close();
  }

  return results;
}

async function runChallenge2_ColorContrastAndTextClipping(browser) {
  console.log('\n======================================================');
  console.log('CHALLENGE 2: Color Contrast & Text Clipping on Pill');
  console.log('======================================================');

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);

  // 1. Initial color inspection
  const colorMetrics = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) throw new Error('Hero h1 not found');
    const pill = h1.querySelector('span.rounded-full');
    if (!pill) throw new Error('Rotating pill element not found');

    const pillStyle = window.getComputedStyle(pill);
    const wordSpan = pill.querySelector('span');
    const wordStyle = wordSpan ? window.getComputedStyle(wordSpan) : pillStyle;

    return {
      pillClasses: pill.className,
      computedPillTextColor: pillStyle.color,
      computedWordTextColor: wordStyle.color,
      computedBgColor: pillStyle.backgroundColor,
      overflow: pillStyle.overflow,
    };
  });

  console.log('Color Metrics:');
  console.log(`  Pill classes: ${colorMetrics.pillClasses}`);
  console.log(`  Computed Pill text color: ${colorMetrics.computedPillTextColor}`);
  console.log(`  Computed Word text color: ${colorMetrics.computedWordTextColor}`);
  console.log(`  Computed Pill bg color: ${colorMetrics.computedBgColor}`);
  console.log(`  Pill overflow: ${colorMetrics.overflow}`);

  // Target values:
  // Text: #C85A32 -> rgb(200, 90, 50)
  // Bg: #FAD0B8 -> rgb(250, 208, 184)
  const expectedTextRgb = 'rgb(200, 90, 50)';
  const actualTextColor = colorMetrics.computedWordTextColor || colorMetrics.computedPillTextColor;
  const matchesTargetColor = actualTextColor.includes('200, 90, 50');

  const contrastRatio = calculateContrastRatio(actualTextColor, colorMetrics.computedBgColor);
  console.log(`  Exact match to rgb(200, 90, 50): ${matchesTargetColor ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  Contrast ratio (text vs bg): ${contrastRatio.toFixed(2)}:1`);

  // 2. Advance animation specifically to "COMMENT" and verify bounding boxes
  console.log('\nAdvancing animation specifically to "COMMENT"...');
  
  // Wait up to 15s for the word "COMMENT" to appear in the pill
  const startTime = Date.now();
  let foundComment = false;
  let commentMetrics = null;

  while (Date.now() - startTime < 15000) {
    const currentStatus = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const pill = h1 ? h1.querySelector('span.rounded-full') : null;
      if (!pill) return null;
      const text = pill.innerText.trim();
      return text;
    });

    if (currentStatus === 'COMMENT') {
      foundComment = true;
      // Wait 300ms for spring layout animation to fully settle
      await page.waitForTimeout(400);

      commentMetrics = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const pill = h1.querySelector('span.rounded-full');
        const pillRect = pill.getBoundingClientRect();
        
        // Find visible active word span
        const wordSpans = Array.from(pill.querySelectorAll('span')).filter((s) => s.innerText.trim() === 'COMMENT');
        const activeWordSpan = wordSpans[0] || pill.querySelector('span');
        const textRect = activeWordSpan.getBoundingClientRect();
        const fontComputed = window.getComputedStyle(activeWordSpan);

        return {
          currentWord: pill.innerText.trim(),
          pillRect: {
            left: pillRect.left,
            right: pillRect.right,
            top: pillRect.top,
            bottom: pillRect.bottom,
            width: pillRect.width,
            height: pillRect.height,
          },
          textRect: {
            left: textRect.left,
            right: textRect.right,
            top: textRect.top,
            bottom: textRect.bottom,
            width: textRect.width,
            height: textRect.height,
          },
          pillScrollWidth: pill.scrollWidth,
          pillClientWidth: pill.clientWidth,
          font: {
            fontFamily: fontComputed.fontFamily,
            fontSize: fontComputed.fontSize,
            fontWeight: fontComputed.fontWeight,
            lineHeight: fontComputed.lineHeight,
          },
          leftPaddingPx: textRect.left - pillRect.left,
          rightPaddingPx: pillRect.right - textRect.right,
          isClippedLeft: textRect.left < pillRect.left - 0.5,
          isClippedRight: textRect.right > pillRect.right + 0.5,
          hasScrollOverflow: pill.scrollWidth > pill.clientWidth + 1,
        };
      });
      break;
    }

    await page.waitForTimeout(200);
  }

  if (!foundComment) {
    console.error('❌ Failed to capture "COMMENT" within timeout');
  } else {
    console.log('✅ Captured "COMMENT" active state:');
    console.log(`  Word: "${commentMetrics.currentWord}"`);
    console.log(`  Font: ${commentMetrics.font.fontSize} weight ${commentMetrics.font.fontWeight}`);
    console.log(`  Pill Bounding Box : left=${commentMetrics.pillRect.left.toFixed(1)}, right=${commentMetrics.pillRect.right.toFixed(1)}, width=${commentMetrics.pillRect.width.toFixed(1)}`);
    console.log(`  Text Bounding Box : left=${commentMetrics.textRect.left.toFixed(1)}, right=${commentMetrics.textRect.right.toFixed(1)}, width=${commentMetrics.textRect.width.toFixed(1)}`);
    console.log(`  Left Clearance    : ${commentMetrics.leftPaddingPx.toFixed(1)}px`);
    console.log(`  Right Clearance   : ${commentMetrics.rightPaddingPx.toFixed(1)}px`);
    console.log(`  Scroll vs Client  : scrollWidth=${commentMetrics.pillScrollWidth}px, clientWidth=${commentMetrics.pillClientWidth}px`);
    console.log(`  Clipped Left?     : ${commentMetrics.isClippedLeft ? 'YES ❌' : 'NO ✅'}`);
    console.log(`  Clipped Right?    : ${commentMetrics.isClippedRight ? 'YES ❌' : 'NO ✅'}`);
    console.log(`  Scroll Overflow?  : ${commentMetrics.hasScrollOverflow ? 'YES ❌' : 'NO ✅'}`);
  }

  // Also check mobile viewport for "COMMENT" clipping
  console.log('\nChecking "COMMENT" clipping at mobile viewport (393x852)...');
  await page.setViewportSize({ width: 393, height: 852 });
  await page.waitForTimeout(500);

  // Wait for COMMENT on mobile
  let mobileCommentMetrics = null;
  const mStartTime = Date.now();
  while (Date.now() - mStartTime < 15000) {
    const text = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const pill = h1 ? h1.querySelector('span.rounded-full') : null;
      return pill ? pill.innerText.trim() : null;
    });
    if (text === 'COMMENT') {
      await page.waitForTimeout(400);
      mobileCommentMetrics = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const pill = h1.querySelector('span.rounded-full');
        const pillRect = pill.getBoundingClientRect();
        const wordSpans = Array.from(pill.querySelectorAll('span')).filter((s) => s.innerText.trim() === 'COMMENT');
        const activeWordSpan = wordSpans[0] || pill.querySelector('span');
        const textRect = activeWordSpan.getBoundingClientRect();
        return {
          pillWidth: pillRect.width,
          textWidth: textRect.width,
          leftPaddingPx: textRect.left - pillRect.left,
          rightPaddingPx: pillRect.right - textRect.right,
          isClippedLeft: textRect.left < pillRect.left - 0.5,
          isClippedRight: textRect.right > pillRect.right + 0.5,
          hasScrollOverflow: pill.scrollWidth > pill.clientWidth + 1,
        };
      });
      break;
    }
    await page.waitForTimeout(200);
  }

  if (mobileCommentMetrics) {
    console.log(`  Mobile Pill Width : ${mobileCommentMetrics.pillWidth.toFixed(1)}px`);
    console.log(`  Mobile Text Width : ${mobileCommentMetrics.textWidth.toFixed(1)}px`);
    console.log(`  Mobile Left Pad   : ${mobileCommentMetrics.leftPaddingPx.toFixed(1)}px`);
    console.log(`  Mobile Right Pad  : ${mobileCommentMetrics.rightPaddingPx.toFixed(1)}px`);
    console.log(`  Mobile Clipped?   : ${mobileCommentMetrics.isClippedRight || mobileCommentMetrics.isClippedLeft ? 'YES ❌' : 'NO ✅'}`);
  }

  await page.close();

  return {
    colorMetrics,
    matchesTargetColor,
    contrastRatio,
    commentMetrics,
    mobileCommentMetrics,
  };
}

async function runChallenge3_MobileOverflowStressTest(browser) {
  console.log('\n======================================================');
  console.log('CHALLENGE 3: Multi-Viewport Overflow Stress Test');
  console.log('======================================================');

  const viewportResults = [];

  for (const width of VIEWPORT_WIDTHS) {
    const height = width < 768 ? 852 : 900;
    const page = await browser.newPage({ viewport: { width, height } });

    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(800);

    // Scroll through page to trigger dynamic elements
    const scrollPoints = [0, 0.25, 0.5, 0.75, 1.0];
    let maxScrollWidth = 0;
    let worstScrollPoint = null;
    let offendingElements = [];

    for (const p of scrollPoints) {
      await page.evaluate((progress) => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, maxScroll * progress);
      }, p);
      await page.waitForTimeout(150);

      const metrics = await page.evaluate((vw) => {
        const sw = document.documentElement.scrollWidth;
        const cw = document.documentElement.clientWidth;
        const iw = window.innerWidth;
        const bodySw = document.body ? document.body.scrollWidth : 0;
        
        // Find elements extending past viewport
        let offenders = [];
        if (sw > iw) {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const r = el.getBoundingClientRect();
            if (r.right > iw + 1) {
              const tag = el.tagName.toLowerCase();
              const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 50) : '';
              const id = el.id ? `#${el.id}` : '';
              offenders.push({ tag, id, cls, right: r.right, overflow: r.right - iw });
              if (offenders.length >= 5) break;
            }
          }
        }

        return {
          scrollWidth: sw,
          clientWidth: cw,
          innerWidth: iw,
          bodyScrollWidth: bodySw,
          hasOverflow: sw > iw,
          overflowDelta: Math.max(0, sw - iw),
          offenders,
        };
      }, width);

      if (metrics.scrollWidth > maxScrollWidth) {
        maxScrollWidth = metrics.scrollWidth;
        worstScrollPoint = p;
        offendingElements = metrics.offenders;
      }
    }

    const passed = maxScrollWidth <= width;
    console.log(
      `  Viewport ${width.toString().padStart(4, ' ')}px: ` +
      `innerWidth=${width}px, maxScrollWidth=${maxScrollWidth}px -> ` +
      (passed ? 'PASS ✅ (zero horizontal scrollbar)' : `FAIL ❌ (overflow +${maxScrollWidth - width}px)`)
    );

    if (!passed && offendingElements.length > 0) {
      console.log(`    Offending elements at ${(worstScrollPoint * 100).toFixed(0)}% scroll:`);
      offendingElements.forEach((o) => {
        console.log(`      <${o.tag}${o.id} class="${o.cls}"> right=${o.right.toFixed(1)}px (+${o.overflow.toFixed(1)}px)`);
      });
    }

    viewportResults.push({
      width,
      height,
      maxScrollWidth,
      passed,
      overflowDelta: Math.max(0, maxScrollWidth - width),
      offendingElements,
    });

    await page.close();
  }

  return viewportResults;
}

async function main() {
  console.log('STARTING EMPIRICAL CHALLENGER ADVERSARIAL SUITE');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Base URL : ${BASE_URL}`);

  let browser;
  try {
    browser = await launch();
  } catch (err) {
    console.error('Failed to launch Chromium:', err);
    process.exit(1);
  }

  try {
    const c1 = await runChallenge1_ConsoleCleanliness(browser);
    const c2 = await runChallenge2_ColorContrastAndTextClipping(browser);
    const c3 = await runChallenge3_MobileOverflowStressTest(browser);

    console.log('\n======================================================');
    console.log('CHALLENGER SUITE EXECUTION COMPLETE');
    console.log('======================================================');

    const allC1Passed = Object.values(c1).every((r) => r.preloadWarnings.length === 0 && r.totalErrors === 0);
    const c2ColorPassed = c2.matchesTargetColor;
    const c2ClipPassed = c2.commentMetrics && !c2.commentMetrics.isClippedRight && !c2.commentMetrics.isClippedLeft;
    const c3Passed = c3.every((v) => v.passed);

    console.log(`Challenge 1 (Console Cleanliness) : ${allC1Passed ? 'PASS' : 'FAIL'}`);
    console.log(`Challenge 2 (Color Match)         : ${c2ColorPassed ? 'PASS' : 'FAIL'}`);
    console.log(`Challenge 2 (COMMENT Clipping)    : ${c2ClipPassed ? 'PASS' : 'FAIL'}`);
    console.log(`Challenge 3 (9-Viewport Overflow) : ${c3Passed ? 'PASS' : 'FAIL'}`);

    const overallVerdict = allC1Passed && c2ColorPassed && c2ClipPassed && c3Passed ? 'APPROVE' : 'REJECT';
    console.log(`\nPRELIMINARY VERDICT (Pre-E2E): ${overallVerdict}`);

    return {
      c1,
      c2,
      c3,
      overallVerdict,
    };
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Challenger script error:', err);
    process.exit(1);
  });
}

module.exports = { main };
