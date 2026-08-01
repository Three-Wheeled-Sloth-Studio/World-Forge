import { chromium } from 'playwright';

const viewports = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];
const results = [];
for (const viewport of viewports) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewportSize: viewport });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });

  const advanced = page.locator('details.advanced-generator-settings');
  await advanced.locator('summary').click();
  await page.getByLabel('Generation path').selectOption('core.world-generation-experimental');
  await page.locator('.generator-primary-actions .primary-button').click();
  await page.locator('.last-generation-summary').waitFor({ state: 'visible', timeout: 120000 });
  await page.getByRole('button', { name: 'System view' }).click();
  await page.locator('.system-viewer[data-system-viewer="ready"]').waitFor({ state: 'visible', timeout: 60000 });

  const bodySelect = page.getByLabel('Selected system body');
  await bodySelect.selectOption({ index: 0 });
  await page.locator('.stellar-surface-panel').waitFor({ state: 'visible' });
  const genericBodyActionCount = await page.getByRole('button', { name: 'Generate selected body' }).count();
  if (genericBodyActionCount !== 0) throw new Error(`Star exposed generic body generation action: ${genericBodyActionCount}`);
  const genericPanelCount = await page.locator('.system-body-generation').count();
  if (genericPanelCount !== 0) throw new Error(`Star exposed secondary-body generation panel: ${genericPanelCount}`);

  await page.getByRole('button', { name: 'Generate stellar surface detail' }).click();
  await page.locator('.stellar-surface-panel[data-stellar-surface-status="complete"]').waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('.system-render-surface')?.getAttribute('data-selected-body-material') === 'stellar-surface-v1');

  const materialMode = await page.locator('.system-render-surface').getAttribute('data-selected-body-material');
  const activityText = await page.locator('.stellar-surface-panel').innerText();
  for (const expected of ['Activity', 'Rotation', 'Spots', 'Faculae', 'Streamers']) {
    if (!activityText.includes(expected)) throw new Error(`Missing stellar summary: ${expected}`);
  }
  const layout = await page.evaluate(() => ({
    widthOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    heightOverflow: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    version: document.body.innerText.includes('0.3.48')
  }));
  if (layout.widthOverflow || layout.heightOverflow || !layout.version) throw new Error(`Layout/version failure: ${JSON.stringify(layout)}`);
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  results.push({ viewport, materialMode, layout, activityText: activityText.replace(/\s+/g, ' ').slice(0, 300) });
  await browser.close();
}
console.log('STELLAR_BROWSER_QA=' + JSON.stringify(results));
