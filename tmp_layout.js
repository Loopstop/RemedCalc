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
  await page.waitForTimeout(1000);

  const report = {};

  // ==================== COMPRIMIDOS ====================
  await page.screenshot({ path: `${outDir}/01-comprimidos.png`, fullPage: true });

  const comprimidosFields = await page.evaluate(() => {
    const fields = document.querySelectorAll('.panel .grid .field');
    return Array.from(fields).map(f => f.textContent.trim().split('\n')[0]);
  });

  const comprimidosWeekly = await page.locator('.weeklyRow .field').count();

  const comprimidosResults = await page.locator('.results').innerHTML();

  report.comprimidos = {
    hasDose: comprimidosFields.some(f => f.includes('Comprimidos por dose')),
    hasInterval: comprimidosFields.some(f => f.includes('Intervalo entre doses')),
    hasTreatment: comprimidosFields.some(f => f.includes('Duração do tratamento')),
    hasDelivery: comprimidosFields.some(f => f.includes('Entregar para')),
    hasReserve: comprimidosFields.some(f => f.includes('Reserva técnica')),
    hasBlister: comprimidosFields.some(f => f.includes('Comprimidos por cartela')),
    hasBox: comprimidosFields.some(f => f.includes('Cartelas por caixa')),
    hasWeekly: comprimidosWeekly > 0,
    hasFrequencyCard: comprimidosResults.includes('Frequência'),
    hasPrimaryCard: comprimidosResults.includes('comprimido(s) a entregar'),
  };

  // ==================== LÍQUIDOS ====================
  await page.click('button:has-text("Líquidos / mL")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/03-liquid.png`, fullPage: true });

  const liquidFields = await page.evaluate(() => {
    const fields = document.querySelectorAll('.panel .grid .field');
    return Array.from(fields).map(f => f.textContent.trim().split('\n')[0]);
  });

  const liquidWeekly = await page.locator('.weeklyRow .field').count();

  const liquidResults = await page.locator('.results').innerHTML();

  report.liquid = {
    hasDose: liquidFields.some(f => f.includes('Volume por dose')),
    hasInterval: liquidFields.some(f => f.includes('Intervalo entre doses')),
    hasTreatment: liquidFields.some(f => f.includes('Duração do tratamento')),
    hasDelivery: liquidFields.some(f => f.includes('Entregar para')),
    hasReserve: liquidFields.some(f => f.includes('Reserva técnica')),
    hasBottle: liquidFields.some(f => f.includes('Volume por frasco')),
    hasWeekly: liquidWeekly > 0,
    hasFrequencyCard: liquidResults.includes('Frequência'),
    hasPrimaryCard: liquidResults.includes('mL a entregar'),
    hasReserveCard: liquidResults.includes('Sem reserva técnica'),
  };

  // ==================== INSULINAS ====================
  await page.click('button:has-text("Insulinas")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/02-insulinas.png`, fullPage: true });

  const insulinPanelHTML = await page.locator('.panel').innerHTML();
  const insulinFields = await page.evaluate(() => {
    const fields = document.querySelectorAll('.panel .grid .field');
    return Array.from(fields).map(f => f.textContent.trim().split('\n')[0]);
  });

  const insulinResults = await page.locator('.results').innerHTML();

  report.insulin = {
    hasMode: insulinFields.some(f => f.includes('Modo')),
    hasMorning: insulinFields.some(f => f.includes('Manhã')),
    hasAfternoon: insulinFields.some(f => f.includes('Tarde')),
    hasNight: insulinFields.some(f => f.includes('Noite')),
    hasLunch: insulinFields.some(f => f.includes('Almoço')),
    hasDinner: insulinFields.some(f => f.includes('Jantar')),
    hasDays: insulinFields.some(f => f.includes('Dias de tratamento')),
    hasDose: insulinFields.some(f => f.includes('Comprimidos por dose')),
    hasInterval: insulinFields.some(f => f.includes('Intervalo entre doses')),
    hasTreatment: insulinFields.some(f => f.includes('Duração do tratamento')),
    hasDelivery: insulinFields.some(f => f.includes('Entregar para')),
    hasReserve: insulinFields.some(f => f.includes('Reserva técnica')),
    hasWeekly: insulinFields.some(f => f.includes('Tomar semanalmente')),
    hasPrimaryCard: insulinResults.includes('Tubetes a entregar') || insulinResults.includes('Frascos a entregar'),
    hasModeSelect: insulinPanelHTML.includes('<select'),
  };

  // ==================== OVERFLOW ====================
  report.overflow = await page.evaluate(() => {
    const body = document.body;
    return {
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
      hasHorizontalScroll: body.scrollWidth > body.clientWidth
    };
  });

  fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
})();
