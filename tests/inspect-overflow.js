const { chromium } = require('playwright-core');
const { CHROME_PATH, BASE_URL } = require('./e2e/helpers');

async function check() {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const sw = document.documentElement.scrollWidth;
    const cw = document.documentElement.clientWidth;
    const iw = window.innerWidth;

    const cards = Array.from(document.querySelectorAll('div')).filter(
      (el) => el.className && typeof el.className === 'string' && el.className.includes('rounded-[28px]')
    );

    const cardDetails = cards.map((c, i) => {
      const r = c.getBoundingClientRect();
      const cs = window.getComputedStyle(c);
      return {
        cardIndex: i,
        className: c.className.slice(0, 60),
        left: r.left,
        right: r.right,
        width: r.width,
        transform: cs.transform,
      };
    });

    // Check containers
    const heroSection = document.querySelector('section');
    const heroCs = heroSection ? window.getComputedStyle(heroSection) : null;

    const bodyCs = window.getComputedStyle(document.body);
    const htmlCs = window.getComputedStyle(document.documentElement);

    return {
      sw,
      cw,
      iw,
      cards: cardDetails,
      heroSection: heroSection ? {
        className: heroSection.className.slice(0, 80),
        overflow: heroCs.overflow,
        overflowX: heroCs.overflowX,
        scrollWidth: heroSection.scrollWidth,
        clientWidth: heroSection.clientWidth,
      } : null,
      body: {
        overflow: bodyCs.overflow,
        overflowX: bodyCs.overflowX,
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      },
      html: {
        overflow: htmlCs.overflow,
        overflowX: htmlCs.overflowX,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

check().catch(console.error);
