import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));

await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.locator('#generation-quality').selectOption('256x128');
await page.getByRole('button', { name: /Generate World|Generate Replacement World|Replace World/i }).click();
await page.locator('.generating-overlay').waitFor({ state: 'visible', timeout: 15000 });
await page.locator('.generating-overlay').waitFor({ state: 'hidden', timeout: 180000 });

if (await page.locator('[data-enrichment-workflow="project.system-orbital-context"]').count()) {
  throw new Error('Orbital enrichment existed before first Globe use.');
}

await page.getByRole('button', { name: 'Globe view' }).click();
const status = page.locator('[data-enrichment-workflow="project.system-orbital-context"]');
await status.waitFor({ state: 'visible', timeout: 10000 });
await page.waitForFunction(() => document.querySelector('[data-enrichment-workflow="project.system-orbital-context"]')?.getAttribute('data-enrichment-status') === 'complete', undefined, { timeout: 30000 });
const statusText = (await status.textContent()) ?? '';
if (!statusText.includes('saved presentation artifact')) throw new Error(`Unexpected orbital status: ${statusText}`);

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(100);
  const overflow = await page.evaluate(() => ({ x: document.documentElement.scrollWidth - window.innerWidth, y: document.documentElement.scrollHeight - window.innerHeight }));
  if (overflow.y > 2) throw new Error(`Page-level vertical overflow at ${viewport.width}x${viewport.height}: ${overflow.y}`);
}

await page.getByRole('tab', { name: 'Dev' }).click();
const graph = page.locator('.graph-workspace');
await graph.waitFor({ state: 'visible', timeout: 10000 });
const graphWorkflow = graph.locator('.graph-toolbar-fields select').first();
await graphWorkflow.selectOption('project.system-orbital-context');
if (await graph.getAttribute('data-workflow-kind') !== 'enrichment') throw new Error('Graph editor did not identify the enrichment workflow.');
const nodes = graph.locator('.graph-node');
if (await nodes.count() !== 6) throw new Error(`Expected 6 enrichment nodes, found ${await nodes.count()}.`);
const completed = graph.locator('.graph-node.status-complete');
if (await completed.count() !== 6) throw new Error(`Expected 6 completed enrichment nodes, found ${await completed.count()}.`);
const elapsedCount = await graph.locator('.graph-node small').filter({ hasText: 'ms elapsed' }).count();
if (elapsedCount !== 6) throw new Error(`Expected timing on all enrichment nodes, found ${elapsedCount}.`);

if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
console.log(JSON.stringify({ statusText, enrichmentNodes: await nodes.count(), completedNodes: await completed.count() }, null, 2));
await browser.close();
