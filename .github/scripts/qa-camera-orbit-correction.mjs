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
const canvas = surface.locator('canvas');
await globe.waitFor({ state: 'visible' });
await page.waitForFunction(() => document.querySelector('.globe-viewer')?.getAttribute('data-frame-reference') === 'fixed-world-camera-orbit');
await page.waitForFunction(() => document.querySelector('.globe-render-surface')?.getAttribute('data-observer-control') === 'camera-orbit');
if (await globe.getAttribute('data-moon-shadow-mode') !== 'pcf-soft-proof') throw new Error('Moon shadow proof contract missing.');

const axialTiltBefore = await globe.getAttribute('data-orbital-axial-tilt');
const box = await surface.boundingBox();
if (!box) throw new Error('Globe surface has no bounding box.');
const start = { x: box.x + box.width * 0.72, y: box.y + box.height * 0.52 };
const horizontalTarget = { x: box.x + box.width * 0.28, y: start.y };
const verticalTarget = { x: horizontalTarget.x, y: box.y + box.height * 0.27 };

await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.waitForTimeout(250);
if (await surface.getAttribute('data-clock-grab-state') !== 'held') throw new Error('Pointer hold did not pause the frame.');

const heldDayA = Number(await surface.getAttribute('data-simulation-days'));
await page.waitForTimeout(350);
const heldDayB = Number(await surface.getAttribute('data-simulation-days'));
if (!Number.isFinite(heldDayA) || Math.abs(heldDayB - heldDayA) > 0.00001) throw new Error(`Simulation advanced while held: ${heldDayA} -> ${heldDayB}`);

const spinBefore = Number(await surface.getAttribute('data-planet-spin-radians'));
const yawBefore = Number(await surface.getAttribute('data-camera-orbit-yaw'));
const pitchBefore = Number(await surface.getAttribute('data-camera-orbit-pitch'));
const imageBefore = await canvas.evaluate((node) => node.toDataURL());

await page.mouse.move(horizontalTarget.x, horizontalTarget.y, { steps: 18 });
await page.waitForTimeout(200);
const spinAfterHorizontal = Number(await surface.getAttribute('data-planet-spin-radians'));
const yawAfter = Number(await surface.getAttribute('data-camera-orbit-yaw'));
const imageAfterHorizontal = await canvas.evaluate((node) => node.toDataURL());
if (!Number.isFinite(spinBefore) || !Number.isFinite(spinAfterHorizontal) || Math.abs(spinAfterHorizontal - spinBefore) > 0.00001) throw new Error(`Horizontal camera orbit changed physical spin: ${spinBefore} -> ${spinAfterHorizontal}`);
if (!Number.isFinite(yawBefore) || !Number.isFinite(yawAfter) || Math.abs(yawAfter - yawBefore) < 2) throw new Error(`Horizontal drag did not orbit camera far enough for day/night inspection: ${yawBefore} -> ${yawAfter}`);
if (imageAfterHorizontal === imageBefore) throw new Error('Horizontal camera orbit did not change the rendered view.');

await page.mouse.move(verticalTarget.x, verticalTarget.y, { steps: 12 });
await page.waitForTimeout(200);
const spinAfterVertical = Number(await surface.getAttribute('data-planet-spin-radians'));
const pitchAfter = Number(await surface.getAttribute('data-camera-orbit-pitch'));
if (Math.abs(spinAfterVertical - spinBefore) > 0.00001) throw new Error(`Vertical camera orbit changed physical spin: ${spinBefore} -> ${spinAfterVertical}`);
if (!Number.isFinite(pitchBefore) || !Number.isFinite(pitchAfter) || Math.abs(pitchAfter - pitchBefore) < 0.2) throw new Error(`Vertical drag did not orbit camera pitch: ${pitchBefore} -> ${pitchAfter}`);
if (await globe.getAttribute('data-orbital-axial-tilt') !== axialTiltBefore) throw new Error('Camera orbit changed generated axial tilt metadata.');

await page.mouse.up();
await page.waitForTimeout(450);
if (await surface.getAttribute('data-clock-grab-state') !== 'released') throw new Error('Pointer release state missing.');
const resumedDay = Number(await surface.getAttribute('data-simulation-days'));
if (!(resumedDay > heldDayB)) throw new Error(`Clock did not resume after release: ${heldDayB} -> ${resumedDay}`);

const overflow = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 2 || document.documentElement.scrollWidth > window.innerWidth + 2);
if (overflow) throw new Error('Page-level overflow detected during globe camera-orbit QA.');
if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

console.log(JSON.stringify({
  heldDayA,
  heldDayB,
  resumedDay,
  spinBefore,
  spinAfterHorizontal,
  spinAfterVertical,
  yawBefore,
  yawAfter,
  pitchBefore,
  pitchAfter,
  frame: await globe.getAttribute('data-frame-reference'),
  observer: await surface.getAttribute('data-observer-control')
}, null, 2));
await browser.close();
