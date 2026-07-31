import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.locator('#generation-quality').selectOption('256x128');
await page.getByRole('button', { name: 'Generate', exact: true }).click();
await page.locator('.generating-overlay').waitFor({ state: 'visible', timeout: 15000 });
await page.locator('.generating-overlay').waitFor({ state: 'hidden', timeout: 180000 });
await page.getByRole('button', { name: 'Globe view' }).click();
await page.waitForFunction(() => document.querySelector('[data-enrichment-workflow="project.system-orbital-context"]')?.getAttribute('data-enrichment-status') === 'complete', undefined, { timeout: 30000 });

const layers = page.getByRole('button', { name: 'Layers and display options' });
const openLayers = async () => {
  if ((await layers.getAttribute('aria-expanded')) !== 'true') await layers.click({ force: true });
  await page.locator('.explore-layers-popover').waitFor({ state: 'visible', timeout: 10000 });
};

await openLayers();
await page.getByRole('button', { name: /^Clouds/ }).click();
await page.waitForFunction(() => document.querySelector('[data-enrichment-workflow="project.atmospheric-weather-presentation"]')?.getAttribute('data-enrichment-status') === 'complete', undefined, { timeout: 30000 });
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-cloud-layer') === 'visible', undefined, { timeout: 10000 });

await page.keyboard.press('Escape');
await openLayers();
await page.locator('.weather-toggle').evaluate((element) => element.click());
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-weather-layer') === 'visible', undefined, { timeout: 10000 });
await page.keyboard.press('Escape');

const globe = page.locator('.globe-viewer');
await globe.waitFor({ state: 'visible' });
if (await globe.getAttribute('data-cloud-renderer') !== 'layered-noise-v2') throw new Error('Layered cloud renderer is not active.');
if (await globe.getAttribute('data-cloud-shadow-mode') !== 'disabled-until-soft-shadow') throw new Error('Hard alpha-map cloud shadows are still active.');
if (await globe.getAttribute('data-moon-shadow-mode') !== 'pcf-soft-tracked') throw new Error('Moon shadow tracking mode is not active.');
const moonCasters = Number(await globe.getAttribute('data-moon-shadow-caster-count'));
if (!(moonCasters >= 1)) throw new Error(`Expected at least one moon shadow caster, got ${moonCasters}`);

const surface = page.locator('.globe-render-surface');
await page.waitForFunction(() => document.querySelector('.globe-render-surface')?.getAttribute('data-camera-distance'), undefined, { timeout: 10000 });
const distanceBefore = Number(await surface.getAttribute('data-camera-distance'));
const zoomButton = page.getByRole('button', { name: /^Zoom \d+ percent$/ });
await zoomButton.click({ force: true });
await page.getByRole('menuitem', { name: '35%' }).click({ force: true });
await page.waitForFunction((before) => Number(document.querySelector('.globe-render-surface')?.getAttribute('data-camera-distance')) > Number(before) + 0.5, distanceBefore, { timeout: 10000 });
const distanceAfter = Number(await surface.getAttribute('data-camera-distance'));
if (!(distanceAfter > distanceBefore + 0.5)) throw new Error(`Wide zoom did not increase camera distance: ${distanceBefore} -> ${distanceAfter}`);

const moonBefore = await surface.getAttribute('data-primary-moon-position');
const lightBefore = await surface.getAttribute('data-shadow-light-vector');
await page.getByLabel('Simulation speed').selectOption('30');
await page.waitForTimeout(700);
const moonAfter = await surface.getAttribute('data-primary-moon-position');
const lightAfter = await surface.getAttribute('data-shadow-light-vector');
const alignment = Number(await surface.getAttribute('data-moon-shadow-alignment'));
if (!moonBefore || moonBefore === 'none' || !moonAfter || moonAfter === 'none' || moonBefore === moonAfter) throw new Error('Primary moon geometry did not advance with the shared clock.');
if (!lightBefore || !lightAfter || lightBefore === lightAfter) throw new Error('Directional stellar light vector did not advance with the shared clock.');
if (!Number.isFinite(alignment) || alignment < -1.001 || alignment > 1.001) throw new Error(`Invalid moon/light alignment ${alignment}`);

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(120);
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 2 || document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) throw new Error(`Page-level overflow detected at ${viewport.width}x${viewport.height}.`);
}
if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

console.log(JSON.stringify({ moonCasters, distanceBefore, distanceAfter, moonBefore, moonAfter, lightBefore, lightAfter, alignment }, null, 2));
await browser.close();
