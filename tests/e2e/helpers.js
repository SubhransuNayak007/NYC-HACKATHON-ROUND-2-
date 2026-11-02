/**
 * E2E Test Suite Helpers & Shared Utilities
 * QuickReply Landing Page Stabilization Verification
 */

const { chromium } = require('playwright-core');

const CHROME_PATH = process.env.CHROME_BIN ||
  'C:\\Users\\sbhrn\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 393, height: 852 },
};

/**
 * Launch Chromium instance using local Playwright binary
 */
async function launchBrowser(options = {}) {
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
    ...options,
  });
}

/**
 * Create a page with specified viewport and console message listener
 */
async function createPage(browser, viewport = VIEWPORTS.desktop) {
  const page = await browser.newPage({ viewport });
  const consoleMessages = [];
  const errors = [];
  const warnings = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({ type, text });
    if (type === 'error') errors.push(text);
    if (type === 'warning') warnings.push(text);
  });

  page.on('pageerror', (err) => {
    errors.push(err.message || String(err));
  });

  return { page, consoleMessages, errors, warnings };
}

/**
 * Smoothly scroll through page to trigger hydration of all next/dynamic modules
 */
async function hydrateFullPage(page) {
  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const steps = Math.ceil(totalHeight / (viewportHeight * 0.8));

  for (let i = 0; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * viewportHeight * 0.8);
    await page.waitForTimeout(150);
  }
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

/**
 * Assert zero horizontal overflow
 */
async function getHorizontalOverflow(page) {
  return await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const innerWidth = window.innerWidth;
    return {
      scrollWidth,
      clientWidth,
      innerWidth,
      hasOverflow: scrollWidth > clientWidth,
      overflowAmount: Math.max(0, scrollWidth - clientWidth),
    };
  });
}

/**
 * Parse CSS color strings (rgb, rgba, hex) into {r, g, b, a}
 */
function parseColor(colorStr) {
  if (!colorStr) return { r: 0, g: 0, b: 0, a: 1 };
  colorStr = colorStr.trim().toLowerCase();

  // Handle rgb / rgba
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // Handle hex #RRGGBB or #RGB
  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1,
    };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Calculate WCAG 2.1 relative luminance and contrast ratio
 */
function getLuminance(r, g, b) {
  const [sR, sG, sB] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

function calculateContrastRatio(color1, color2) {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  const l1 = getLuminance(c1.r, c1.g, c1.b);
  const l2 = getLuminance(c2.r, c2.g, c2.b);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

module.exports = {
  CHROME_PATH,
  BASE_URL,
  VIEWPORTS,
  launchBrowser,
  createPage,
  hydrateFullPage,
  getHorizontalOverflow,
  parseColor,
  calculateContrastRatio,
};
