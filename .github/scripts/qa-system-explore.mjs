import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

console.log('QA: loading app');
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.locator('#generation-quality').selectOption('256x128');
await page.getByRole('button', { name: 'Generate', exact: true }).click();
await page.locator('.generating-overlay').waitFor({ state: 'visible', timeout: 15000 });
await page.locator('.generating-overlay').waitFor({ state: 'hidden', timeout: 180000 });
console.log('QA: ordinary generation complete');

await page.getByRole('button', { name: 'System view', exact: true }).click();
await page.waitForFunction(() => document.querySelector('[data-enrichment-workflow="project.system-orbital-context"]')?.getAttribute('data-enrichment-status') === 'complete', undefined, { timeout: 45000 });
await page.waitForFunction(() => document.querySelector('.system-viewer')?.getAttribute('data-system-viewer') === 'ready', undefined, { timeout: 15000 });
console.log('QA: System viewer and orbital enrichment ready');

const viewer = page.locator('.system-viewer');
const surface = page.locator('.system-render-surface');
const bodyCount = Number(await viewer.getAttribute('data-system-body-count'));
if (!Number.isFinite(bodyCount) || bodyCount < 4) throw new Error(`Expected a nontrivial system catalog, found ${bodyCount}.`);
if (await viewer.getAttribute('data-system-distance-authority') !== 'physical-data-distinct-from-display') {
  throw new Error('Physical and display distance boundary is missing.');
}
if (await viewer.getAttribute('data-system-scale-mode') !== 'compressed') throw new Error('System viewer did not start in compressed overview mode.');

const bodySelect = page.getByRole('combobox', { name: 'Selected system body' });
const initialPrimaryId = await viewer.getAttribute('data-system-selected-body');
const placeholderId = await bodySelect.locator('option[data-generation-status="placeholder"]').first().getAttribute('value');
if (!placeholderId) throw new Error('No placeholder system body was available for selection QA.');
await bodySelect.selectOption(placeholderId);
await page.waitForFunction((id) => document.querySelector('.system-viewer')?.getAttribute('data-system-selected-body') === id, placeholderId);
if (await page.locator('.system-body-inspector').getAttribute('data-body-generation-status') !== 'placeholder') {
  throw new Error('Placeholder body styling/status contract was not exposed in the inspector.');
}

await page.getByRole('button', { name: 'Focus selected body', exact: true }).click();
await page.waitForFunction((id) => document.querySelector('.system-viewer')?.getAttribute('data-system-focused-body') === id, placeholderId);
await page.getByRole('button', { name: 'Return to primary', exact: true }).click();
await page.waitForFunction((id) => {
  const element = document.querySelector('.system-viewer');
  return element?.getAttribute('data-system-focused-body') === id
    && element?.getAttribute('data-system-selected-body') === id;
}, initialPrimaryId);
console.log('QA: body selection, focus, and return to primary confirmed');

const orbitToggle = page.getByRole('checkbox', { name: 'Show orbit paths', exact: true });
await orbitToggle.uncheck();
await page.waitForFunction(() => document.querySelector('.system-viewer')?.getAttribute('data-system-orbit-paths') === 'hidden');
await orbitToggle.check();
await page.waitForFunction(() => document.querySelector('.system-viewer')?.getAttribute('data-system-orbit-paths') === 'visible');

const labelToggle = page.getByRole('checkbox', { name: 'Show labels', exact: true });
await labelToggle.uncheck();
await page.waitForFunction(() => document.querySelector('.system-viewer')?.getAttribute('data-system-labels') === 'hidden');
await labelToggle.check();
await page.waitForFunction(() => document.querySelector('.system-viewer')?.getAttribute('data-system-labels') === 'visible');

await page.getByRole('combobox', { name: 'System distance scale', exact: true }).selectOption('relative');
await page.waitForFunction(() => document.querySelector('.system-viewer')?.getAttribute('data-system-scale-mode') === 'relative');
console.log('QA: orbit, label, and relative-distance controls confirmed');

await page.locator('#system-simulation-speed').selectOption('7');
await page.waitForFunction(() => document.querySelector('.system-render-surface')?.getAttribute('data-simulation-days'), undefined, { timeout: 10000 });
const simulationDaysBefore = Number(await surface.getAttribute('data-simulation-days'));
await page.waitForFunction((before) => {
  const current = Number(document.querySelector('.system-render-surface')?.getAttribute('data-simulation-days'));
  return Number.isFinite(current) && current > Number(before) + 0.08;
}, simulationDaysBefore, { timeout: 20000 });
const simulationDaysAfter = Number(await surface.getAttribute('data-simulation-days'));

const bounds = await surface.boundingBox();
if (!bounds) throw new Error('System render surface has no bounding box.');
await page.mouse.move(bounds.x + bounds.width * 0.62, bounds.y + bounds.height * 0.58);
await page.mouse.down();
await page.waitForFunction(() => document.querySelector('.system-render-surface')?.getAttribute('data-clock-grab-state') === 'held');
await page.mouse.move(bounds.x + bounds.width * 0.78, bounds.y + bounds.height * 0.46, { steps: 12 });
await page.mouse.up();
await page.waitForFunction(() => document.querySelector('.system-render-surface')?.getAttribute('data-clock-grab-state') === 'released');
console.log('QA: shared clock and camera hold boundary confirmed');

const zoomButton = page.getByRole('button', { name: /^Zoom \d+ percent$/ });
await zoomButton.click({ force: true });
await page.getByRole('menuitem', { name: '35%', exact: true }).click({ force: true });
await page.waitForTimeout(160);
const distance35 = Number(await surface.getAttribute('data-camera-distance'));

await zoomButton.click({ force: true });
await page.getByRole('menuitem', { name: '50%', exact: true }).click({ force: true });
await page.waitForTimeout(160);
const distance50 = Number(await surface.getAttribute('data-camera-distance'));
if (!(distance35 > distance50)) throw new Error(`Expected 35% zoom to be farther than 50%: ${distance35} vs ${distance50}.`);

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(220);
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 2 || document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) throw new Error(`Page-level overflow detected at ${viewport.width}x${viewport.height}.`);
  await page.screenshot({ path: `/tmp/world-forge-system-explore-${viewport.width}x${viewport.height}.png`, fullPage: true });
}
if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

console.log(JSON.stringify({
  bodyCount,
  initialPrimaryId,
  placeholderId,
  scaleMode: await viewer.getAttribute('data-system-scale-mode'),
  orbitPaths: await viewer.getAttribute('data-system-orbit-paths'),
  labels: await viewer.getAttribute('data-system-labels'),
  simulationDaysBefore,
  simulationDaysAfter,
  distance35,
  distance50
}, null, 2));
await browser.close();
