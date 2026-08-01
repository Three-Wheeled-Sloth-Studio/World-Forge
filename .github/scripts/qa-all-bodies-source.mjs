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
  const options = await bodySelect.locator('option').evaluateAll((nodes) => nodes.map((node) => ({
    value: node.value,
    label: node.textContent ?? ''
  })));
  if (options.length < 3) throw new Error(`Expected star, primary, and at least one secondary body; found ${options.length}`);

  await bodySelect.selectOption({ index: 1 });
  const bodyPanel = page.locator('.system-body-generation');
  await bodyPanel.waitFor({ state: 'visible' });

  const eligible = Number(await bodyPanel.getAttribute('data-body-eligible-count'));
  if (!Number.isFinite(eligible) || eligible < 1) throw new Error(`No eligible non-primary bodies: ${eligible}`);

  await page.getByRole('button', { name: 'Queue unresolved system bodies' }).click();
  await page.getByRole('button', { name: /Start body generation queue/ }).click();

  await page.waitForFunction(() => {
    const panel = document.querySelector('.system-body-generation');
    if (!panel) return false;
    const eligibleCount = Number(panel.getAttribute('data-body-eligible-count'));
    const generatedCount = Number(panel.getAttribute('data-body-generated-count'));
    const queueCount = Number(panel.getAttribute('data-body-queue-count'));
    const active = panel.getAttribute('data-body-active-id');
    return eligibleCount > 0 && generatedCount === eligibleCount && queueCount === 0 && active === 'none';
  }, null, { timeout: 180000 });

  const generatedSummary = {
    eligible: Number(await bodyPanel.getAttribute('data-body-eligible-count')),
    generated: Number(await bodyPanel.getAttribute('data-body-generated-count'))
  };

  const starId = options[0].value;
  const primaryId = options[1].value;
  const secondaryIds = options.map((option) => option.value).filter((id) => id !== starId && id !== primaryId);
  const inspected = [];

  for (const id of secondaryIds) {
    await bodySelect.selectOption(id);
    await page.locator('.system-body-inspector[data-body-generation-status="generated"]').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction((bodyId) => {
      const viewer = document.querySelector('.system-viewer');
      const surface = document.querySelector('.system-render-surface');
      return viewer?.getAttribute('data-system-selected-body') === bodyId
        && (surface?.getAttribute('data-selected-body-material') ?? '').startsWith('system-body-');
    }, id, { timeout: 30000 });
    const material = await page.locator('.system-render-surface').getAttribute('data-selected-body-material');
    const typeText = await page.locator('.system-body-inspector dl').innerText();

    await page.getByRole('button', { name: 'Zoom to selected body globe' }).click();
    await page.waitForFunction((bodyId) => {
      const viewer = document.querySelector('.globe-viewer');
      return viewer?.getAttribute('data-globe-target-body') === bodyId
        && viewer?.getAttribute('data-globe-target-mode') === 'generated-system-body';
    }, id, { timeout: 30000 });
    const globeMaterial = await page.locator('.globe-viewer').getAttribute('data-globe-surface-material');
    if (!globeMaterial?.startsWith('system-body-')) throw new Error(`Generated detail material missing for ${id}: ${globeMaterial}`);
    inspected.push({ id, material, globeMaterial, typeText: typeText.replace(/\s+/g, ' ').slice(0, 180) });

    await page.getByRole('button', { name: 'System view' }).click();
    await page.locator('.system-viewer[data-system-viewer="ready"]').waitFor({ state: 'visible', timeout: 30000 });
  }

  await bodySelect.selectOption(starId);
  const stellarPanel = page.locator('.stellar-surface-panel');
  await stellarPanel.waitFor({ state: 'visible' });
  const stellarStatus = await stellarPanel.getAttribute('data-stellar-surface-status');
  if (stellarStatus !== 'complete') {
    await page.getByRole('button', { name: 'Generate stellar surface detail' }).click();
    await page.locator('.stellar-surface-panel[data-stellar-surface-status="complete"]').waitFor({ state: 'visible', timeout: 60000 });
  }
  await page.waitForFunction(() => document.querySelector('.system-render-surface')?.getAttribute('data-selected-body-material') === 'stellar-surface-v1');

  const layout = await page.evaluate(() => ({
    widthOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    heightOverflow: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    version: document.body.innerText.includes('0.3.49')
  }));
  if (layout.widthOverflow || layout.heightOverflow || !layout.version) {
    throw new Error(`Layout/version failure: ${JSON.stringify(layout)}`);
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);

  results.push({ viewport, generatedSummary, inspected, layout });
  await browser.close();
}

console.log('ALL_BODY_BROWSER_QA=' + JSON.stringify(results));
