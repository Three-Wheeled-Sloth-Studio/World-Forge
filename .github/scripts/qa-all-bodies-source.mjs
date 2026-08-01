import { chromium } from 'playwright';

const viewport = { width: 1440, height: 900 };
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
const options = await bodySelect.locator('option').evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, label: node.textContent ?? '' })));
await bodySelect.selectOption({ index: 1 });
const bodyPanel = page.locator('.system-body-generation');
await bodyPanel.waitFor({ state: 'visible' });
await page.getByRole('button', { name: 'Queue unresolved system bodies' }).click();
await page.getByRole('button', { name: /Start body generation queue/ }).click();

let queueCompleted = false;
for (let attempt = 0; attempt < 240; attempt += 1) {
  const state = await page.evaluate(() => {
    const panel = document.querySelector('.system-body-generation');
    return {
      eligible: Number(panel?.getAttribute('data-body-eligible-count')),
      generated: Number(panel?.getAttribute('data-body-generated-count')),
      queue: Number(panel?.getAttribute('data-body-queue-count')),
      active: panel?.getAttribute('data-body-active-id') ?? 'missing',
      errors: Array.from(document.querySelectorAll('.system-generation-error')).map((node) => node.textContent?.trim()).filter(Boolean)
    };
  });
  if (state.errors.length) throw new Error(`Queue failed: ${JSON.stringify(state)}`);
  if (state.eligible > 0 && state.generated === state.eligible && state.queue === 0 && state.active === 'none') {
    queueCompleted = true;
    break;
  }
  await page.waitForTimeout(500);
}
if (!queueCompleted) throw new Error('Queue did not complete.');

const starId = options[0].value;
const primaryId = options[1].value;
const firstSecondary = options.find((option) => option.value !== starId && option.value !== primaryId);
if (!firstSecondary) throw new Error(`No secondary option: ${JSON.stringify(options)}`);
await bodySelect.selectOption(firstSecondary.value);
await page.waitForTimeout(2500);

const diagnostic = await page.evaluate((expectedId) => {
  const viewer = document.querySelector('.system-viewer');
  const surface = document.querySelector('.system-render-surface');
  const inspector = document.querySelector('.system-body-inspector');
  const panel = document.querySelector('.system-body-generation');
  const zoomButton = document.querySelector('button[aria-label="Zoom to selected body globe"]');
  const select = document.querySelector('select[aria-label="Selected system body"]');
  return {
    expectedId,
    selectValue: select instanceof HTMLSelectElement ? select.value : null,
    viewerSelected: viewer?.getAttribute('data-system-selected-body') ?? null,
    viewerFocused: viewer?.getAttribute('data-system-focused-body') ?? null,
    inspectorStatus: inspector?.getAttribute('data-body-generation-status') ?? null,
    panelStatus: panel?.getAttribute('data-body-lifecycle-status') ?? null,
    panelProfile: panel?.querySelector('dl')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    selectedMaterial: surface?.getAttribute('data-selected-body-material') ?? null,
    zoomDisabled: zoomButton instanceof HTMLButtonElement ? zoomButton.disabled : null,
    zoomTitle: zoomButton?.getAttribute('title') ?? null,
    browserErrors: []
  };
}, firstSecondary.value);
diagnostic.browserErrors = errors;
console.log('FIRST_BODY_PRESENTATION_DIAGNOSTIC=' + JSON.stringify(diagnostic));

if (diagnostic.selectValue !== firstSecondary.value
  || diagnostic.viewerSelected !== firstSecondary.value
  || diagnostic.inspectorStatus !== 'generated'
  || !diagnostic.selectedMaterial?.startsWith('system-body-')
  || diagnostic.zoomDisabled !== false
  || errors.length) {
  throw new Error(`First generated body presentation mismatch: ${JSON.stringify(diagnostic)}`);
}

await browser.close();
console.log('FIRST_BODY_PRESENTATION_DIAGNOSTIC_PASS=' + JSON.stringify(diagnostic));
