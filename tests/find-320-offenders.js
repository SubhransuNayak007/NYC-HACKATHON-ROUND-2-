const { chromium } = require('playwright-core');
const { CHROME_PATH, BASE_URL } = require('./e2e/helpers');

async function find320Offenders() {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const report = await page.evaluate(() => {
    const sw = document.documentElement.scrollWidth;
    const elements = Array.from(document.querySelectorAll('*'));
    
    // Find top-level children of body or main sections that overflow
    const sections = Array.from(document.querySelectorAll('body > * , main > *, section'));
    const sectionOverflows = sections.map((s) => {
      const r = s.getBoundingClientRect();
      return {
        tag: s.tagName,
        id: s.id,
        className: (s.className || '').toString().slice(0, 60),
        scrollWidth: s.scrollWidth,
        clientWidth: s.clientWidth,
        offsetWidth: s.offsetWidth,
        rectRight: r.right,
        rectLeft: r.left,
      };
    }).filter((s) => s.scrollWidth > 320 || s.rectRight > 320 || s.offsetWidth > 320);

    // Also find any direct child of body that overflows
    const directBodyChildren = Array.from(document.body.children).map((c) => {
      const r = c.getBoundingClientRect();
      return {
        tag: c.tagName,
        id: c.id,
        className: (c.className || '').toString().slice(0, 60),
        scrollWidth: c.scrollWidth,
        clientWidth: c.clientWidth,
        offsetWidth: c.offsetWidth,
        rectRight: r.right,
      };
    });

    return {
      docScrollWidth: sw,
      sectionOverflows,
      directBodyChildren,
    };
  });

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

find320Offenders().catch(console.error);
