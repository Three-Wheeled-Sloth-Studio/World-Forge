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

if (await page.locator('[data-enrichment-workflow="project.atmospheric-weather-presentation"]').count()) {
  throw new Error('Weather enrichment appeared during ordinary generation.');
}

await page.getByRole('button', { name: 'Globe view' }).click();
await page.waitForFunction(() => document.querySelector('[data-enrichment-workflow="project.system-orbital-context"]')?.getAttribute('data-enrichment-status') === 'complete', undefined, { timeout: 30000 });

const globe = page.locator('.globe-viewer');
await globe.waitFor({ state: 'visible' });
if (await globe.getAttribute('data-weather-presentation') !== 'pending') throw new Error('Weather artifact existed before first weather-layer use.');

const openLayers = async () => {
  const trigger = page.getByRole('button', { name: 'Layers and display options' });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
};

await openLayers();
await page.getByRole('button', { name: /^Clouds/ }).click();
const weatherStatus = page.locator('[data-enrichment-workflow="project.atmospheric-weather-presentation"]');
await weatherStatus.waitFor({ state: 'visible', timeout: 10000 });
await page.waitForFunction(() => document.querySelector('[data-enrichment-workflow="project.atmospheric-weather-presentation"]')?.getAttribute('data-enrichment-status') === 'complete', undefined, { timeout: 30000 });
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-weather-presentation') === 'ready', undefined, { timeout: 10000 });

const authority = await globe.getAttribute('data-weather-authority');
const bandCount = Number(await globe.getAttribute('data-weather-band-count'));
const systemCount = Number(await globe.getAttribute('data-weather-system-count'));
if (authority !== 'illustrative') throw new Error(`Unexpected weather authority: ${authority}`);
if (!(bandCount >= 3)) throw new Error(`Expected at least three cloud bands, got ${bandCount}`);
if (!(systemCount >= 4)) throw new Error(`Expected at least four weather systems, got ${systemCount}`);
if (await globe.getAttribute('data-cloud-layer') !== 'visible') throw new Error('Cloud layer did not become visible.');
if (await globe.getAttribute('data-weather-layer') !== 'hidden') throw new Error('Weather systems should remain hidden until explicitly enabled.');

await page.waitForFunction(() => Number.isFinite(Number(document.querySelector('.globe-render-surface')?.getAttribute('data-weather-texture-day'))), undefined, { timeout: 10000 });
const surface = page.locator('.globe-render-surface');
const weatherDayBefore = Number(await surface.getAttribute('data-weather-texture-day'));
await page.getByLabel('Simulation speed').selectOption('30');
await page.waitForTimeout(650);
const weatherDayAfter = Number(await surface.getAttribute('data-weather-texture-day'));
if (!(weatherDayAfter > weatherDayBefore + 0.1)) throw new Error(`Weather texture did not advance with shared time: ${weatherDayBefore} -> ${weatherDayAfter}`);

await openLayers();
await page.getByRole('button', { name: /^Weather systems/ }).click();
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-weather-layer') === 'visible');

await openLayers();
await page.getByRole('button', { name: /^Clouds/ }).click();
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-cloud-layer') === 'hidden');
if (await globe.getAttribute('data-weather-layer') !== 'visible') throw new Error('Weather systems did not remain independently visible after clouds were disabled.');

const workflowOptionExists = await page.evaluate(() => Array.from(document.querySelectorAll('option')).some((option) => option.value === 'project.atmospheric-weather-presentation'));
if (!workflowOptionExists) {
  const devButton = page.getByRole('button', { name: /^Dev$/ });
  if (await devButton.count()) {
    await devButton.click();
    await page.waitForTimeout(250);
  }
}
const workflowVisibleAfterDev = await page.evaluate(() => Array.from(document.querySelectorAll('option')).some((option) => option.value === 'project.atmospheric-weather-presentation'));
if (!workflowVisibleAfterDev) throw new Error('Atmospheric weather workflow is not inspectable from the Dev workflow selector.');

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(120);
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 2 || document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) throw new Error(`Page-level overflow detected at ${viewport.width}x${viewport.height}.`);
}
if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

console.log(JSON.stringify({ authority, bandCount, systemCount, weatherDayBefore, weatherDayAfter, cloudLayer: await globe.getAttribute('data-cloud-layer'), weatherLayer: await globe.getAttribute('data-weather-layer') }, null, 2));
await browser.close();
