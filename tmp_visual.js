import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:4173/RemedCalc/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const overflow = bodyHeight - viewportHeight;

  const sectionHeights = await page.evaluate(() => {
    const results = {};
    const selectors = ['.hero', '.panel', '.results', '.formula', '.historyPanel', '.buildBadge'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      results[sel] = el ? Math.round(el.getBoundingClientRect().height) : 0;
    }
    return results;
  });

  const text = await page.textContent('body');
  const checks = {
    hasTitle: text.includes('Calculadora de dispensação'),
    hasResults: text.includes('comprimido(s) a entregar'),
    hasWarning: text.includes('Atenção'),
    hasHistory: text.includes('Receita atual') || text.includes('Histórico'),
  };

  await page.screenshot({ path: 'ui_desktop.png', fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'ui_mobile.png', fullPage: true });

  console.log(JSON.stringify({ viewportHeight, bodyHeight, overflow, sectionHeights, checks }, null, 2));

  await browser.close();
  console.log('DONE');
})().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
