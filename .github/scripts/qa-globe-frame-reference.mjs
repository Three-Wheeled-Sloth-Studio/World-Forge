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

const globe = page.locator('.globe-viewer');
const surface = page.locator('.globe-render-surface');
await globe.waitFor({ state: 'visible' });
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-frame-reference') === 'clock-spin-observer-separated');
if (await globe.getAttribute('data-moon-shadow-mode') !== 'pcf-soft-proof') throw new Error('Moon shadow proof contract missing.');

const box = await surface.boundingBox();
if (!box) throw new Error('Globe surface has no bounding box.');
const start = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 };
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.waitForTimeout(200);
if (await surface.getAttribute('data-clock-grab-state') !== 'held') throw new Error('Pointer hold did not pause the frame.');
const heldDayA = Number(await surface.getAttribute('data-simulation-days'));
await page.waitForTimeout(350);
const heldDayB = Number(await surface.getAttribute('data-simulation-days'));
if (!Number.isFinite(heldDayA) || Math.abs(heldDayB - heldDayA) > 0.00001) throw new Error(`Simulation advanced while held: ${heldDayA} -> ${heldDayB}`);
const spinBefore = Number(await surface.getAttribute('data-planet-spin-radians'));
await page.mouse.move(start.x + 180, start.y, { steps: 10 });
await page.waitForTimeout(150);
const spinAfter = Number(await surface.getAttribute('data-planet-spin-radians'));
if (!Number.isFinite(spinBefore) || !Number.isFinite(spinAfter) || Math.abs(spinAfter - spinBefore) < 0.05) throw new Error(`Horizontal drag did not scrub physical spin: ${spinBefore} -> ${spinAfter}`);
await page.mouse.up();
await page.waitForTimeout(450);
if (await surface.getAttribute('data-clock-grab-state') !== 'released') throw new Error('Pointer release state missing.');
const resumedDay = Number(await surface.getAttribute('data-simulation-days'));
if (!(resumedDay > heldDayB)) throw new Error(`Clock did not resume after release: ${heldDayB} -> ${resumedDay}`);

if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
console.log(JSON.stringify({ heldDayA, heldDayB, resumedDay, spinBefore, spinAfter, frame: await globe.getAttribute('data-frame-reference'), shadow: await globe.getAttribute('data-moon-shadow-mode') }, null, 2));
await browser.close();
