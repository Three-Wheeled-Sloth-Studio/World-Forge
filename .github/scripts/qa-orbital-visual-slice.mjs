import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.locator('#generation-quality').selectOption('256x128');
await page.getByRole('button', { name: 'Generate', exact: true }).click();
await page.locator('.generating-overlay').waitFor({ state: 'visible', timeout: 15000 });
await page.locator('.generating-overlay').waitFor({ state: 'hidden', timeout: 180000 });

if (await page.locator('[data-enrichment-workflow="project.system-orbital-context"]').count()) {
  throw new Error('Orbital enrichment existed before first Globe use.');
}

await page.getByRole('button', { name: 'Globe view' }).click();
const status = page.locator('[data-enrichment-workflow="project.system-orbital-context"]');
await status.waitFor({ state: 'visible', timeout: 10000 });
await page.waitForFunction(() => document.querySelector('[data-enrichment-workflow="project.system-orbital-context"]')?.getAttribute('data-enrichment-status') === 'complete', undefined, { timeout: 30000 });

const globe = page.locator('.globe-viewer');
await globe.waitFor({ state: 'visible', timeout: 10000 });
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-orbital-context') === 'ready');
if (await globe.getAttribute('data-orbital-star-count') !== '1') throw new Error('Expected one visible system star contract.');
if (await globe.getAttribute('data-system-star-light') !== 'coupled') throw new Error('Star position was not coupled to the directional light contract.');
if (!Number.isFinite(Number(await globe.getAttribute('data-orbital-axial-tilt')))) throw new Error('Axial tilt contract is missing.');
if (await globe.locator('canvas').count() !== 1) throw new Error('Globe WebGL canvas is missing.');

const controls = page.locator('[data-system-simulation-controls="ready"]');
await controls.waitFor({ state: 'visible', timeout: 10000 });
const dayOutput = controls.locator('[data-simulation-day]');
const timeOutput = controls.locator('[data-simulation-time]');
await controls.locator('#system-simulation-speed').selectOption('30');
const dayBefore = (await dayOutput.textContent()) ?? '';
await page.waitForTimeout(450);
const dayAfter = (await dayOutput.textContent()) ?? '';
if (dayAfter === dayBefore) throw new Error(`Simulation day did not advance at high speed: ${dayBefore}`);

await controls.getByRole('button', { name: 'Pause simulation' }).click();
const pausedDay = (await dayOutput.textContent()) ?? '';
await page.waitForTimeout(350);
if ((await dayOutput.textContent()) !== pausedDay) throw new Error('Simulation day advanced while paused.');

await setRangeValue(controls.locator('#system-day-of-year'), '120');
await setRangeValue(controls.locator('#system-time-of-day'), '6');
if ((await dayOutput.textContent()) !== 'Day 120') throw new Error(`Day slider failed: ${await dayOutput.textContent()}`);
if ((await timeOutput.textContent()) !== '06:00') throw new Error(`Time slider failed: ${await timeOutput.textContent()}`);

await controls.getByRole('button', { name: 'Reset simulation time' }).click();
if ((await dayOutput.textContent()) !== 'Day 1') throw new Error(`Reset day failed: ${await dayOutput.textContent()}`);
if ((await timeOutput.textContent()) !== '00:00') throw new Error(`Reset time failed: ${await timeOutput.textContent()}`);

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight
  }));
  if (overflow.y > 2) throw new Error(`Page-level vertical overflow at ${viewport.width}x${viewport.height}: ${overflow.y}`);
}

if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
console.log(JSON.stringify({
  status: (await status.textContent())?.trim(),
  dayAfter,
  moonCount: await globe.getAttribute('data-orbital-moon-count'),
  visibleBodyCount: await globe.getAttribute('data-orbital-visible-body-count'),
  axialTilt: await globe.getAttribute('data-orbital-axial-tilt')
}, null, 2));
await browser.close();

async function setRangeValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    const input = element;
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!nativeSetter) throw new Error('Native input value setter is unavailable.');
    nativeSetter.call(input, String(nextValue));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(100);
}
