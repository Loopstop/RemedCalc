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
  await page.waitForTimeout(500);

  // Screenshot initial comprimidos tab
  await page.screenshot({ path: `${outDir}/01-comprimidos.png`, fullPage: true });

  // Check weekly checkbox position: should be after Intervalo entre doses
  const weeklyCheckbox = page.locator('label:has-text("Tomar semanalmente") input[type="checkbox"]');
  const intervaloInput = page.locator('label:has-text("Intervalo entre doses") input[type="number"]');
  
  // Verify weekly checkbox is hidden on insulin tab
  await page.click('button:has-text("Insulinas")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/02-insulinas.png`, fullPage: true });
  
  const insulinWeeklyVisible = await weeklyCheckbox.isVisible().catch(() => false);
  const hasInsulinFields = await page.locator('text=Manhã').count() > 0 &&
                            await page.locator('text=Almoço').count() > 0 &&
                            await page.locator('text=Jantar').count() > 0;
  const hasModeSelect = await page.locator('select').count() > 0;
  
  // Verify insulin tab does NOT show non-insulin fields
  const hasComprimidosPorDose = await page.locator('label:has-text("Comprimidos por dose")').count() > 0;
  const hasDuracaoTratamento = await page.locator('label:has-text("Duração do tratamento")').count() > 0;
  const hasEntregarPara = await page.locator('label:has-text("Entregar para")').count() > 0;
  const hasReservaTecnica = await page.locator('label:has-text("Reserva técnica")').count() > 0;

  // Check ml tab
  await page.click('button:has-text("Líquidos / mL")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/03-liquid.png`, fullPage: true });

  const report = {
    weeklyHiddenOnInsulin: !insulinWeeklyVisible,
    hasInsulinFields,
    hasModeSelect,
    insulinTabClean: !hasComprimidosPorDose && !hasDuracaoTratamento && !hasEntregarPara && !hasReservaTecnica,
  };

  fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.log(report);

  await browser.close();
})();
