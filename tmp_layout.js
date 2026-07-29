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
  await page.waitForTimeout(1500);

  // Screenshot comprimidos tab
  await page.screenshot({ path: `${outDir}/01-comprimidos.png`, fullPage: true });

  // Switch to insulin tab
  await page.click('button:has-text("Insulinas")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/02-insulinas.png`, fullPage: true });

  // Switch to liquid tab
  await page.click('button:has-text("Líquidos / mL")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/03-liquidos.png`, fullPage: true });

  // Now let's check the insulin tab layout in detail
  // Get the panel HTML for insulin tab
  const insulinPanelHTML = await page.locator('.panel').innerHTML();
  fs.writeFileSync(`${outDir}/02-insulin-panel.html`, insulinPanelHTML);

  // Check for visual issues
  const issues = [];

  // 1. Check if non-insulin fields are visible on insulin tab
  const nonInsulinFields = ['Comprimidos por dose', 'Intervalo entre doses', 'Duração do tratamento', 'Entregar para', 'Reserva técnica', 'Comprimidos por cartela', 'Cartelas por caixa', 'Tomar semanalmente'];
  for (const field of nonInsulinFields) {
    const count = await page.locator(`text=${field}`).count();
    if (count > 0) {
      issues.push(`Non-insulin field visible on insulin tab: ${field}`);
    }
  }

  // 2. Check if insulin fields are visible
  const insulinFields = ['Modo', 'Manhã', 'Tarde', 'Noite', 'Almoço', 'Jantar', 'Dias de tratamento'];
  for (const field of insulinFields) {
    const count = await page.locator(`text=${field}`).count();
    if (count === 0) {
      issues.push(`Missing insulin field: ${field}`);
    }
  }

  // 3. Check results section
  const resultsHTML = await page.locator('.results').innerHTML();
  if (!resultsHTML.includes('Tubetes') && !resultsHTML.includes('Frascos')) {
    issues.push('Results section missing insulin delivery info');
  }

  // 4. Check for overflow
  const bodyOverflow = await page.evaluate(() => {
    const body = document.body;
    return {
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
      hasHorizontalScroll: body.scrollWidth > body.clientWidth
    };
  });

  // 5. Check grid layout
  const gridInfo = await page.evaluate(() => {
    const grids = document.querySelectorAll('.panel .grid');
    return Array.from(grids).map(g => ({
      columns: g.style.gridTemplateColumns || window.getComputedStyle(g).gridTemplateColumns,
      childCount: g.children.length
    }));
  });

  // 6. Check if weekly checkbox is hidden on insulin tab
  const weeklyVisible = await page.locator('label:has-text("Tomar semanalmente")').count();
  if (weeklyVisible > 0) {
    issues.push('Weekly checkbox visible on insulin tab');
  }

  // 7. Check if dose field is hidden on insulin tab
  const doseVisible = await page.locator('label:has-text("Comprimidos por dose")').count();
  if (doseVisible > 0) {
    issues.push('Dose field visible on insulin tab');
  }

  // 8. Check if interval field is hidden on insulin tab
  const intervalVisible = await page.locator('label:has-text("Intervalo entre doses")').count();
  if (intervalVisible > 0) {
    issues.push('Interval field visible on insulin tab');
  }

  // 9. Check if treatment days field is hidden on insulin tab
  const treatmentVisible = await page.locator('label:has-text("Duração do tratamento")').count();
  if (treatmentVisible > 0) {
    issues.push('Treatment days field visible on insulin tab');
  }

  // 10. Check if delivery days field is hidden on insulin tab
  const deliveryVisible = await page.locator('label:has-text("Entregar para")').count();
  if (deliveryVisible > 0) {
    issues.push('Delivery days field visible on insulin tab');
  }

  // 11. Check if reserve field is hidden on insulin tab
  const reserveVisible = await page.locator('label:has-text("Reserva técnica")').count();
  if (reserveVisible > 0) {
    issues.push('Reserve field visible on insulin tab');
  }

  // 12. Check if blister/box fields are hidden on insulin tab
  const blisterVisible = await page.locator('label:has-text("Comprimidos por cartela")').count();
  if (blisterVisible > 0) {
    issues.push('Blister field visible on insulin tab');
  }
  const boxVisible = await page.locator('label:has-text("Cartelas por caixa")').count();
  if (boxVisible > 0) {
    issues.push('Box field visible on insulin tab');
  }

  const report = {
    issues,
    bodyOverflow,
    gridInfo,
    resultsHasInsulinData: resultsHTML.includes('Tubetes') || resultsHTML.includes('Frascos'),
    weeklyHiddenOnInsulin: weeklyVisible === 0,
    doseHiddenOnInsulin: doseVisible === 0,
    intervalHiddenOnInsulin: intervalVisible === 0,
    treatmentHiddenOnInsulin: treatmentVisible === 0,
    deliveryHiddenOnInsulin: deliveryVisible === 0,
    reserveHiddenOnInsulin: reserveVisible === 0,
    blisterHiddenOnInsulin: blisterVisible === 0,
    boxHiddenOnInsulin: boxVisible === 0,
  };

  fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
})();
