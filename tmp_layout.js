const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const base = 'http://10.0.0.1:5174/RemedCalc/';
  const outDir = '/tmp/agent_30373022-fd05-4a6a-846a-b7cec62b7972/playwright';
  const fs = require('fs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await page.goto(base);
  await page.waitForTimeout(1000);

  await page.screenshot({ path: `${outDir}/01-debug-inicial.png`, fullPage: true });

  const initialText = await page.content();
  fs.writeFileSync(`${outDir}/01-inicial.html`, initialText);

  await page.click('button:has-text("Insulinas")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/02-debug-insulinas.png`, fullPage: true });

  const insulinText = await page.content();
  fs.writeFileSync(`${outDir}/02-insulinas.html`, insulinText);

  const report = {
    weeklyHiddenOnInsulin: !(await page.locator('label:has-text("Tomar semanalmente")').count() > 0),
    hasInsulinFields: await page.locator('text=Manhã').count() > 0 && await page.locator('text=Almoço').count() > 0 && await page.locator('text=Jantar').count() > 0,
    hasModeSelect: await page.locator('select').count() > 0,
    insulinTabClean: (await page.locator('label:has-text("Comprimidos por dose")').count()) === 0 && (await page.locator('label:has-text("Duração do tratamento")').count()) === 0 && (await page.locator('label:has-text("Entregar para")').count()) === 0 && (await page.locator('label:has-text("Reserva técnica")').count()) === 0,
    totalInsulinFields: await page.locator('text=Manhã').count(),
    totalSelects: await page.locator('select').count(),
  };

  fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.log(report);

  await browser.close();
})();
