const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const base = 'http://10.0.0.1:5175/RemedCalc/';
  const outDir = '/tmp/agent_30373022-fd05-4a6a-846a-b7cec62b7972/playwright';
  const fs = require('fs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await page.goto(base);
  await page.waitForTimeout(2000);

  // Screenshot comprimidos tab
  await page.screenshot({ path: `${outDir}/01-comprimidos.png`, fullPage: true });

  // Check comprimidos tab elements are visible
  const comprimidosFields = await page.evaluate(() => {
    const fields = document.querySelectorAll('.panel .grid .field');
    return Array.from(fields).map(f => f.textContent.trim().split('\n')[0]);
  });

  // Switch to insulin tab
  await page.click('button:has-text("Insulinas")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/02-insulinas.png`, fullPage: true });

  // Check insulin tab elements are visible
  const insulinFields = await page.evaluate(() => {
    const fields = document.querySelectorAll('.panel .grid .field');
    return Array.from(fields).map(f => f.textContent.trim().split('\n')[0]);
  });

  // Check insulin-specific elements
  const hasModeSelect = await page.locator('.panel select').count();
  const hasMorningInput = await page.locator('.panel input[aria-label="Manhã"]').count();
  const hasDiasTratamento = await page.locator('.panel').innerHTML();
  const hasDiasTratamentoField = hasDiasTratamento.includes('Dias de tratamento');

  // Check results section for insulin
  const resultsHTML = await page.locator('.results').innerHTML();
  const hasInsulinResult = resultsHTML.includes('Tubetes') || resultsHTML.includes('Frascos');

  // Check for non-insulin fields on insulin tab
  const hasDoseField = hasDiasTratamento.includes('Comprimidos por dose');
  const hasIntervalField = hasDiasTratamento.includes('Intervalo entre doses');
  const hasWeeklyField = hasDiasTratamento.includes('Tomar semanalmente');

  // Check for overflow
  const bodyOverflow = await page.evaluate(() => {
    const body = document.body;
    return {
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
      hasHorizontalScroll: body.scrollWidth > body.clientWidth
    };
  });

  // Check grid layout
  const gridInfo = await page.evaluate(() => {
    const grid = document.querySelector('.panel .grid');
    if (!grid) return null;
    const style = window.getComputedStyle(grid);
    return {
      display: style.display,
      gridTemplateColumns: style.gridTemplateColumns,
      gap: style.gap,
      childCount: grid.children.length
    };
  });

  const report = {
    comprimidosFields,
    insulinFields,
    hasModeSelect,
    hasDiasTratamentoField,
    hasInsulinResult,
    hasDoseField,
    hasIntervalField,
    hasWeeklyField,
    bodyOverflow,
    gridInfo
  };

  fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
})();
