const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const base = 'http://10.0.0.1:5173/RemedCalc/';
  const outDir = '/tmp/agent_30373022-fd05-4a6a-846a-b7cec62b7972/playwright';
  const fs = require('fs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await page.goto(base);
  await page.waitForTimeout(1000);

  // Screenshot comprimidos tab
  await page.screenshot({ path: `${outDir}/01-comprimidos.png`, fullPage: true });

  // Switch to insulin tab
  await page.click('button:has-text("Insulinas")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/02-insulinas.png`, fullPage: true });

  // Get full page HTML
  const fullHTML = await page.content();
  fs.writeFileSync(`${outDir}/02-insulinas-full.html`, fullHTML);

  // Check for visual issues
  const issues = [];

  // Check if results section has content for insulin
  const resultsHTML = await page.locator('.results').innerHTML();
  if (!resultsHTML.includes('Tubetes') && !resultsHTML.includes('Frascos')) {
    issues.push('Results section missing insulin delivery info');
  }

  // Check if all insulin fields are visible
  const insulinFields = ['Modo', 'Manhã', 'Tarde', 'Noite', 'Almoço', 'Jantar', 'Dias de tratamento'];
  for (const field of insulinFields) {
    const count = await page.locator(`text=${field}`).count();
    if (count === 0) {
      issues.push(`Missing insulin field: ${field}`);
    }
  }

  // Check for non-insulin fields visible on insulin tab
  const nonInsulinFields = ['Comprimidos por dose', 'Intervalo entre doses', 'Duração do tratamento', 'Entregar para', 'Reserva técnica', 'Comprimidos por cartela', 'Cartelas por caixa', 'Tomar semanalmente'];
  for (const field of nonInsulinFields) {
    const count = await page.locator(`text=${field}`).count();
    if (count > 0) {
      issues.push(`Non-insulin field visible on insulin tab: ${field}`);
    }
  }

  // Check for overflow issues
  const bodyOverflow = await page.evaluate(() => {
    const body = document.body;
    return {
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
      hasHorizontalScroll: body.scrollWidth > body.clientWidth
    };
  });

  // Check the grid layout
  const gridInfo = await page.evaluate(() => {
    const grid = document.querySelector('.panel .grid');
    if (!grid) return null;
    const style = window.getComputedStyle(grid);
    return {
      display: style.display,
      gridTemplateColumns: style.gridTemplateColumns,
      gap: style.gap,
    };
  });

  const report = {
    issues,
    bodyOverflow,
    gridInfo,
    resultsHTML: resultsHTML.substring(0, 500),
  };

  fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
})();
