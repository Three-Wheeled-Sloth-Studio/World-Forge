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
await page.getByRole('button', { name: 'Globe view' }).click();
await page.waitForFunction(() => document.querySelector('[data-enrichment-workflow="project.system-orbital-context"]')?.getAttribute('data-enrichment-status') === 'complete', undefined, { timeout: 30000 });
console.log('QA: orbital enrichment complete');

const layers = page.getByRole('button', { name: 'Layers and display options' });
const openLayers = async () => {
  if ((await layers.getAttribute('aria-expanded')) !== 'true') await layers.click({ force: true });
  await page.locator('.explore-layers-popover').waitFor({ state: 'visible', timeout: 10000 });
};

await openLayers();
const cloudEnableStartedAt = Date.now();
await page.getByRole('button', { name: /^Clouds/ }).click();
await page.waitForFunction(() => document.querySelector('[data-enrichment-workflow="project.atmospheric-weather-presentation"]')?.getAttribute('data-enrichment-status') === 'complete', undefined, { timeout: 60000 });
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-cloud-layer') === 'visible', undefined, { timeout: 15000 });
const cloudEnableMs = Date.now() - cloudEnableStartedAt;
if (cloudEnableMs > 30000) throw new Error(`Cloud enable path exceeded the bounded 30 second QA budget: ${cloudEnableMs}ms.`);
console.log(`QA: cloud renderer visible in ${cloudEnableMs}ms`);

await page.keyboard.press('Escape');
await openLayers();
await page.locator('.weather-toggle').evaluate((element) => element.click());
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-weather-layer') === 'visible', undefined, { timeout: 15000 });
await page.keyboard.press('Escape');
console.log('QA: weather systems visible');

const globe = page.locator('.globe-viewer');
const surface = page.locator('.globe-render-surface');
await globe.waitFor({ state: 'visible' });
if (await globe.getAttribute('data-cloud-renderer') !== 'wind-oriented-spherical-v4') throw new Error('Wind-oriented spherical cloud renderer is not active.');
if (await globe.getAttribute('data-cloud-coverage-profile') !== 'thin-streamers-clear-sky') throw new Error('Thin-streamer clear-sky profile is not active.');
if (await globe.getAttribute('data-cloud-seam-mode') !== 'spherical-continuous') throw new Error('Spherical seam-continuity contract is not active.');
if (await globe.getAttribute('data-cloud-advection-mode') !== 'local-flow-shader') throw new Error('Local-flow shader advection is not active.');
if (await globe.getAttribute('data-weather-wind-field') === 'none') throw new Error('Generated wind field is missing from the weather artifact.');
if (await globe.getAttribute('data-weather-shell-offset') !== '0.002') throw new Error('Weather systems moved away from the accepted cloud-deck offset.');
if (await globe.getAttribute('data-cloud-shadow-mode') !== 'disabled-until-soft-shadow') throw new Error('Hard cloud shadows were re-enabled.');

await page.locator('#system-simulation-speed').selectOption('7');
await page.waitForFunction(() => document.querySelector('.globe-render-surface')?.getAttribute('data-weather-texture-day'), undefined, { timeout: 10000 });
const textureDayBefore = Number(await surface.getAttribute('data-weather-texture-day'));
await page.waitForFunction((before) => {
  const current = Number(document.querySelector('.globe-render-surface')?.getAttribute('data-weather-texture-day'));
  return Number.isFinite(current) && current > Number(before) + 0.08;
}, textureDayBefore, { timeout: 20000 });
const textureDayAfter = Number(await surface.getAttribute('data-weather-texture-day'));
console.log('QA: shared-clock shader evolution confirmed');

const box = await surface.boundingBox();
if (!box) throw new Error('Globe render surface has no bounding box.');
const yawBefore = Number(await surface.getAttribute('data-camera-orbit-yaw'));
await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.5);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.5, { steps: 24 });
await page.mouse.up();
await page.waitForTimeout(150);
const yawAfter = Number(await surface.getAttribute('data-camera-orbit-yaw'));
if (!Number.isFinite(yawBefore) || !Number.isFinite(yawAfter) || Math.abs(yawAfter - yawBefore) < 2.5) {
  throw new Error(`Camera did not rotate through the former seam location: ${yawBefore} -> ${yawAfter}.`);
}
console.log('QA: camera rotated through former seam');

await page.screenshot({ path: '/tmp/world-forge-cloud-cycle-2-2-1440x900.png', fullPage: true });

const zoomButton = page.getByRole('button', { name: /^Zoom \d+ percent$/ });
await zoomButton.click({ force: true });
await page.getByRole('menuitem', { name: '35%', exact: true }).click({ force: true });
await page.waitForTimeout(120);
const distance35 = Number(await surface.getAttribute('data-camera-distance'));

await zoomButton.click({ force: true });
await page.getByRole('menuitem', { name: '50%', exact: true }).click({ force: true });
await page.waitForTimeout(120);
const distance50 = Number(await surface.getAttribute('data-camera-distance'));
if (!(distance35 > distance50)) throw new Error(`Expected 35% zoom to be farther than 50%: ${distance35} vs ${distance50}.`);

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(160);
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 2 || document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) throw new Error(`Page-level overflow detected at ${viewport.width}x${viewport.height}.`);
  await page.screenshot({ path: `/tmp/world-forge-cloud-cycle-2-2-${viewport.width}x${viewport.height}.png`, fullPage: true });
}
if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

console.log(JSON.stringify({
  renderer: await globe.getAttribute('data-cloud-renderer'),
  coverageProfile: await globe.getAttribute('data-cloud-coverage-profile'),
  seamMode: await globe.getAttribute('data-cloud-seam-mode'),
  advectionMode: await globe.getAttribute('data-cloud-advection-mode'),
  windField: await globe.getAttribute('data-weather-wind-field'),
  cloudEnableMs,
  textureDayBefore,
  textureDayAfter,
  yawBefore,
  yawAfter,
  distance35,
  distance50
}, null, 2));
await browser.close();
