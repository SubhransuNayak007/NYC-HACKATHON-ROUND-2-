const { chromium } = require('playwright-core');
const { CHROME_PATH, BASE_URL } = require('../e2e/helpers');

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const data = await page.evaluate(() => {
    const iw = window.innerWidth;
    const sw = document.documentElement.scrollWidth;
    const offenders = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > iw + 0.5) {
        offenders.push({
          tag: el.tagName,
          id: el.id,
          cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
          text: (el.innerText || '').slice(0, 30).replace(/\n/g, ' '),
          left: r.left,
          right: r.right,
          width: r.width,
        });
      }
    });
    return { iw, sw, count: offenders.length, offenders: offenders.slice(0, 15) };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
