#!/usr/bin/env node
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  formatGenerationDuration,
  generationTimingRecordMarkdown,
  type ProductionGenerationTimingRecord
} from '../apps/desktop/src/generation/generationTiming';
import type { Browser, BrowserContext, Page } from 'playwright';

const timingHistoryKey = 'world-forge:production-generation-timing:v1';
const defaultTimeoutMinutes = 30;

type Resolution = { width: number; height: number; label: string };
type HarnessCaseInput = {
  id?: string;
  seed: string;
  starSeed?: string;
  preset?: string;
  starPreset?: string;
  workflow?: string;
  resolution?: string;
  runs?: number;
  warmupRuns?: number;
  reloadBetweenRuns?: boolean;
};
type HarnessPlanFile = {
  runs?: number;
  warmupRuns?: number;
  reloadBetweenRuns?: boolean;
  cases: HarnessCaseInput[];
};
type HarnessCase = {
  id: string;
  seed: string;
  starSeed: string;
  preset: string;
  starPreset: string;
  workflow: string;
  resolution: Resolution;
  runs: number;
  warmupRuns: number;
  reloadBetweenRuns: boolean;
};
type CliOptions = {
  help: boolean;
  selfTest: boolean;
  planPath?: string;
  seeds: string[];
  presets: string[];
  workflows: string[];
  resolutions: string[];
  starSeed?: string;
  starPreset: string;
  runs: number;
  warmupRuns: number;
  reloadBetweenRuns: boolean;
  headless: boolean;
  browserChannel: 'chromium' | 'chrome';
  baseUrl?: string;
  skipBuild: boolean;
  port: number;
  outputDir?: string;
  timeoutMinutes: number;
  failFast: boolean;
};
type CapturedRun = {
  caseId: string;
  kind: 'warmup' | 'measured';
  sequence: number;
  record?: ProductionGenerationTimingRecord;
  validationErrors: string[];
  warnings: string[];
  error?: string;
};
type MetricSummary = { count: number; min: number; median: number; max: number };
type CaseSummary = {
  case: HarnessCase;
  successfulRuns: number;
  failedRuns: number;
  wallTime?: MetricSummary;
  workerGeneration?: MetricSummary;
  projectHandoff?: MetricSummary;
  uiAcceptanceAndRender?: MetricSummary;
  slowestNativeStage?: { stageId: string; label: string; medianMs: number };
};

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
}

function positiveInteger(value: string, flag: string, allowZero = false): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < (allowZero ? 0 : 1)) {
    throw new Error(`${flag} must be ${allowZero ? 'a non-negative' : 'a positive'} integer.`);
  }
  return parsed;
}

function pushValues(target: string[], raw: string): void {
  for (const value of raw.split(',').map((entry) => entry.trim()).filter(Boolean)) target.push(value);
}

export function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    selfTest: false,
    seeds: [],
    presets: [],
    workflows: [],
    resolutions: [],
    starPreset: 'sol-like',
    runs: 3,
    warmupRuns: 1,
    reloadBetweenRuns: false,
    headless: false,
    browserChannel: 'chromium',
    skipBuild: false,
    port: 4173,
    timeoutMinutes: defaultTimeoutMinutes,
    failFast: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    switch (flag) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--self-test':
        options.selfTest = true;
        break;
      case '--plan':
        options.planPath = requireValue(argv, ++index, flag);
        break;
      case '--seed':
        pushValues(options.seeds, requireValue(argv, ++index, flag));
        break;
      case '--star-seed':
        options.starSeed = requireValue(argv, ++index, flag);
        break;
      case '--preset':
        pushValues(options.presets, requireValue(argv, ++index, flag));
        break;
      case '--star-preset':
        options.starPreset = requireValue(argv, ++index, flag);
        break;
      case '--workflow':
        pushValues(options.workflows, requireValue(argv, ++index, flag));
        break;
      case '--resolution':
        pushValues(options.resolutions, requireValue(argv, ++index, flag));
        break;
      case '--runs':
        options.runs = positiveInteger(requireValue(argv, ++index, flag), flag);
        break;
      case '--warmup':
        options.warmupRuns = positiveInteger(requireValue(argv, ++index, flag), flag, true);
        break;
      case '--reload-between-runs':
        options.reloadBetweenRuns = true;
        break;
      case '--headless':
        options.headless = true;
        break;
      case '--headed':
        options.headless = false;
        break;
      case '--browser': {
        const browser = requireValue(argv, ++index, flag);
        if (browser !== 'chromium' && browser !== 'chrome') throw new Error('--browser must be chromium or chrome.');
        options.browserChannel = browser;
        break;
      }
      case '--base-url':
        options.baseUrl = requireValue(argv, ++index, flag).replace(/\/$/, '');
        break;
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--port':
        options.port = positiveInteger(requireValue(argv, ++index, flag), flag);
        break;
      case '--output':
        options.outputDir = requireValue(argv, ++index, flag);
        break;
      case '--timeout-minutes':
        options.timeoutMinutes = positiveInteger(requireValue(argv, ++index, flag), flag);
        break;
      case '--fail-fast':
        options.failFast = true;
        break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
  }
  return options;
}

export function parseResolution(value: string): Resolution {
  const match = /^(\d+)x(\d+)$/i.exec(value.trim());
  if (!match) throw new Error(`Invalid resolution "${value}". Use WIDTHxHEIGHT, for example 2048x1024.`);
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 1 || height < 1) throw new Error(`Resolution must be positive: ${value}`);
  return { width, height, label: `${width}x${height}` };
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'case';
}

function normalizeCase(input: HarnessCaseInput, index: number, defaults: Pick<CliOptions, 'runs' | 'warmupRuns' | 'reloadBetweenRuns' | 'starPreset'>): HarnessCase {
  if (!input.seed?.trim()) throw new Error(`Plan case ${index + 1} is missing seed.`);
  const preset = input.preset?.trim() || 'Earthlike';
  const workflow = input.workflow?.trim() || 'core.performance-foundation';
  const resolution = parseResolution(input.resolution?.trim() || '2048x1024');
  const id = safeId(input.id || `${preset}-${workflow}-${resolution.label}-${input.seed}`);
  return {
    id,
    seed: input.seed.trim(),
    starSeed: input.starSeed?.trim() || input.seed.trim(),
    preset,
    starPreset: input.starPreset?.trim() || defaults.starPreset,
    workflow,
    resolution,
    runs: input.runs ?? defaults.runs,
    warmupRuns: input.warmupRuns ?? defaults.warmupRuns,
    reloadBetweenRuns: input.reloadBetweenRuns ?? defaults.reloadBetweenRuns
  };
}

export async function resolveHarnessCases(options: CliOptions): Promise<HarnessCase[]> {
  if (options.planPath) {
    const raw = await readFile(path.resolve(options.planPath), 'utf8');
    const plan = JSON.parse(raw) as HarnessPlanFile;
    if (!Array.isArray(plan.cases) || plan.cases.length === 0) throw new Error('The plan must contain at least one case.');
    return plan.cases.map((entry, index) => normalizeCase(entry, index, {
      runs: plan.runs ?? options.runs,
      warmupRuns: plan.warmupRuns ?? options.warmupRuns,
      reloadBetweenRuns: plan.reloadBetweenRuns ?? options.reloadBetweenRuns,
      starPreset: options.starPreset
    }));
  }

  const seeds = options.seeds.length ? options.seeds : ['1001001'];
  const presets = options.presets.length ? options.presets : ['Earthlike'];
  const workflows = options.workflows.length ? options.workflows : ['core.performance-foundation'];
  const resolutions = options.resolutions.length ? options.resolutions : ['2048x1024'];
  const cases: HarnessCase[] = [];
  for (const seed of seeds) {
    for (const preset of presets) {
      for (const workflow of workflows) {
        for (const resolution of resolutions) {
          cases.push(normalizeCase({
            seed,
            starSeed: options.starSeed || seed,
            preset,
            starPreset: options.starPreset,
            workflow,
            resolution
          }, cases.length, options));
        }
      }
    }
  }
  return cases;
}

function commandName(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function sourceCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown-local-commit';
  }
}

async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`));
    });
  });
}

async function waitForServer(url: string, child: ChildProcess, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Preview server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Preview server did not become ready at ${url}.`);
}

async function startPreviewServer(port: number): Promise<ChildProcess> {
  const child = spawn(commandName(), ['run', 'preview', '--', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32'
  });
  child.stdout?.on('data', (chunk) => process.stdout.write(`[preview] ${String(chunk)}`));
  child.stderr?.on('data', (chunk) => process.stderr.write(`[preview] ${String(chunk)}`));
  return child;
}

async function stopPreviewServer(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.once('exit', () => resolve());
      killer.once('error', () => resolve());
    });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
  await delay(250);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function selectByLabel(page: Page, selector: string, label: string, field: string): Promise<void> {
  const optionLabels = await page.locator(`${selector} option`).allTextContents();
  if (!optionLabels.includes(label)) throw new Error(`${field} "${label}" is unavailable. Options: ${optionLabels.join(', ')}`);
  await page.selectOption(selector, { label });
}

async function selectByValue(page: Page, selector: string, value: string, field: string): Promise<void> {
  const optionValues = await page.locator(`${selector} option`).evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  if (!optionValues.includes(value)) throw new Error(`${field} "${value}" is unavailable. Values: ${optionValues.join(', ')}`);
  await page.selectOption(selector, value);
}

async function configureGenerator(page: Page, testCase: HarnessCase): Promise<void> {
  await page.locator('#world-preset').waitFor({ state: 'visible' });
  await selectByLabel(page, '#world-preset', testCase.preset, 'World preset');
  await selectByValue(page, '#star-preset', testCase.starPreset, 'Star preset');
  await selectByValue(page, '#generation-quality', testCase.resolution.label, 'Resolution');
  await page.fill('#star-seed', testCase.starSeed);
  await page.fill('#world-seed', testCase.seed);

  const advanced = page.locator('details.advanced-generator-settings');
  if (!(await advanced.getAttribute('open'))) await advanced.locator('summary').click();
  await selectByValue(page, '#generation-workflow', testCase.workflow, 'Workflow');

  const selected = await page.evaluate(() => ({
    preset: (document.querySelector('#world-preset') as HTMLSelectElement | null)?.selectedOptions[0]?.textContent?.trim(),
    starPreset: (document.querySelector('#star-preset') as HTMLSelectElement | null)?.value,
    resolution: (document.querySelector('#generation-quality') as HTMLSelectElement | null)?.value,
    workflow: (document.querySelector('#generation-workflow') as HTMLSelectElement | null)?.value,
    seed: (document.querySelector('#world-seed') as HTMLInputElement | null)?.value,
    starSeed: (document.querySelector('#star-seed') as HTMLInputElement | null)?.value
  }));
  const expected = {
    preset: testCase.preset,
    starPreset: testCase.starPreset,
    resolution: testCase.resolution.label,
    workflow: testCase.workflow,
    seed: testCase.seed,
    starSeed: testCase.starSeed
  };
  for (const [field, value] of Object.entries(expected)) {
    if (selected[field as keyof typeof selected] !== value) {
      throw new Error(`Generator UI did not retain ${field}: expected ${value}, received ${selected[field as keyof typeof selected] ?? 'missing'}.`);
    }
  }
}

async function latestTaskId(page: Page): Promise<string | null> {
  return page.evaluate((key) => {
    try {
      const history = JSON.parse(localStorage.getItem(key) || '[]') as Array<{ taskId?: string }>;
      return history[0]?.taskId || null;
    } catch {
      return null;
    }
  }, timingHistoryKey);
}

async function waitForNewTimingRecord(page: Page, previousTaskId: string | null, timeoutMs: number): Promise<ProductionGenerationTimingRecord> {
  const handle = await page.waitForFunction(({ key, previous }) => {
    try {
      const history = JSON.parse(localStorage.getItem(key) || '[]') as Array<{ taskId?: string }>;
      const record = history[0];
      return record?.taskId && record.taskId !== previous ? record : null;
    } catch {
      return null;
    }
  }, { key: timingHistoryKey, previous: previousTaskId }, { timeout: timeoutMs, polling: 250 });
  const record = await handle.jsonValue() as ProductionGenerationTimingRecord;
  await handle.dispose();
  return record;
}

function validateRecord(record: ProductionGenerationTimingRecord, testCase: HarnessCase): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (record.status !== 'completed') errors.push(`Generation status was ${record.status}.`);
  if (record.identity.launchSource !== 'generator') errors.push(`Launch source was ${record.identity.launchSource}, not generator.`);
  if (record.identity.seed !== testCase.seed) errors.push(`Seed mismatch: ${record.identity.seed} versus ${testCase.seed}.`);
  if (record.identity.workflowId !== testCase.workflow) errors.push(`Workflow mismatch: ${record.identity.workflowId} versus ${testCase.workflow}.`);
  if (record.identity.outputResolution.width !== testCase.resolution.width || record.identity.outputResolution.height !== testCase.resolution.height) {
    errors.push(`Resolution mismatch: ${record.identity.outputResolution.width}x${record.identity.outputResolution.height} versus ${testCase.resolution.label}.`);
  }
  if (record.timestamps.workerReceivedAtMs === undefined || record.durations.workerGenerationMs === undefined) {
    errors.push('The production worker boundary was not captured.');
  }
  if (record.instrumentationGaps.some((gap) => gap.toLowerCase().includes('same-window fallback'))) {
    errors.push('The page used the same-window generation fallback instead of the production worker.');
  }
  if (!record.identity.pageVisibleAtLaunch) warnings.push('The page was hidden when generation launched.');
  if (!record.identity.pageFocusedAtLaunch) warnings.push('The page was not focused when generation launched.');
  warnings.push(...record.instrumentationGaps.map((gap) => `Instrumentation gap: ${gap}`));
  return { errors, warnings };
}

async function runOne(page: Page, testCase: HarnessCase, kind: CapturedRun['kind'], sequence: number, timeoutMs: number): Promise<CapturedRun> {
  await page.bringToFront();
  await page.evaluate((key) => localStorage.removeItem(key), timingHistoryKey);
  const previousTaskId = await latestTaskId(page);
  const button = page.locator('.generator-primary-actions .primary-button');
  await button.waitFor({ state: 'visible' });
  if (await button.isDisabled()) throw new Error('Generate button is disabled after configuration.');
  await button.click();
  const record = await waitForNewTimingRecord(page, previousTaskId, timeoutMs);
  const validation = validateRecord(record, testCase);
  return { caseId: testCase.id, kind, sequence, record, validationErrors: validation.errors, warnings: validation.warnings };
}

async function writeCapturedRun(outputDir: string, run: CapturedRun): Promise<void> {
  const caseDir = path.join(outputDir, run.caseId);
  await mkdir(caseDir, { recursive: true });
  const prefix = `${run.kind}-${String(run.sequence).padStart(2, '0')}`;
  if (run.record) {
    await writeFile(path.join(caseDir, `${prefix}.json`), `${JSON.stringify(run.record, null, 2)}\n`, 'utf8');
    await writeFile(path.join(caseDir, `${prefix}.md`), `${generationTimingRecordMarkdown(run.record)}\n`, 'utf8');
  }
  if (run.error || run.validationErrors.length || run.warnings.length) {
    await writeFile(path.join(caseDir, `${prefix}-harness.json`), `${JSON.stringify({
      error: run.error,
      validationErrors: run.validationErrors,
      warnings: run.warnings
    }, null, 2)}\n`, 'utf8');
  }
}

function median(values: number[]): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarizeMetric(values: Array<number | undefined>): MetricSummary | undefined {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (!finite.length) return undefined;
  return { count: finite.length, min: Math.min(...finite), median: median(finite), max: Math.max(...finite) };
}

function uiAcceptanceAndRender(record: ProductionGenerationTimingRecord): number | undefined {
  const values = [
    record.durations.uiProjectAcceptanceMs,
    record.durations.projectAcceptanceToRenderCommitMs,
    record.durations.renderCommitToInteractivePaintMs
  ];
  const finite = values.filter((value): value is number => Number.isFinite(value));
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) : undefined;
}

function summarizeCases(cases: HarnessCase[], runs: CapturedRun[]): CaseSummary[] {
  return cases.map((testCase) => {
    const measured = runs.filter((run) => run.caseId === testCase.id && run.kind === 'measured');
    const successful = measured.filter((run) => run.record && !run.error && run.validationErrors.length === 0);
    const records = successful.map((run) => run.record as ProductionGenerationTimingRecord);
    const stageValues = new Map<string, { label: string; values: number[] }>();
    for (const record of records) {
      for (const stage of record.nativeStages) {
        const current = stageValues.get(stage.stageId) ?? { label: stage.label, values: [] };
        current.values.push(stage.elapsedMs);
        stageValues.set(stage.stageId, current);
      }
    }
    const slowest = [...stageValues.entries()]
      .map(([stageId, value]) => ({ stageId, label: value.label, medianMs: median(value.values) }))
      .sort((left, right) => right.medianMs - left.medianMs)[0];
    return {
      case: testCase,
      successfulRuns: successful.length,
      failedRuns: measured.length - successful.length,
      wallTime: summarizeMetric(records.map((record) => record.durations.totalUserVisibleMs)),
      workerGeneration: summarizeMetric(records.map((record) => record.durations.workerGenerationMs)),
      projectHandoff: summarizeMetric(records.map((record) => record.durations.completedProjectHandoffMs)),
      uiAcceptanceAndRender: summarizeMetric(records.map(uiAcceptanceAndRender)),
      slowestNativeStage: slowest
    };
  });
}

function formatMetric(summary: MetricSummary | undefined): string {
  if (!summary) return 'not captured';
  return `${formatGenerationDuration(summary.median)} (${formatGenerationDuration(summary.min)}-${formatGenerationDuration(summary.max)})`;
}

function summaryMarkdown(generatedAt: string, commit: string, baseUrl: string, options: CliOptions, summaries: CaseSummary[]): string {
  const lines = [
    '# Production page performance harness',
    '',
    `- Generated: ${generatedAt}`,
    `- Source commit used for local build: ${commit}`,
    `- Page: ${baseUrl}`,
    `- Browser: ${options.browserChannel}${options.headless ? ' headless' : ' headed'}`,
    '- Measurement layer: production bundle, real browser page, Generator controls, production worker, page timing record',
    '',
    '| Case | Valid runs | User-visible median (range) | Worker median (range) | Handoff median (range) | UI median (range) | Slowest native stage |',
    '|---|---:|---:|---:|---:|---:|---|'
  ];
  for (const summary of summaries) {
    lines.push(`| ${summary.case.id} | ${summary.successfulRuns}/${summary.case.runs} | ${formatMetric(summary.wallTime)} | ${formatMetric(summary.workerGeneration)} | ${formatMetric(summary.projectHandoff)} | ${formatMetric(summary.uiAcceptanceAndRender)} | ${summary.slowestNativeStage ? `${summary.slowestNativeStage.label} (${formatGenerationDuration(summary.slowestNativeStage.medianMs)})` : 'not captured'} |`);
  }
  lines.push('', 'Warmup runs are retained as evidence but excluded from the summary statistics. Parent stage and child operation timings must not be added together.');
  return lines.join('\n');
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function runsCsv(runs: CapturedRun[]): string {
  const header = ['caseId', 'kind', 'sequence', 'status', 'taskId', 'seed', 'workflow', 'resolution', 'wallMs', 'workerMs', 'handoffMs', 'uiMs', 'validationErrors', 'warnings'];
  const rows = runs.map((run) => {
    const record = run.record;
    return [
      run.caseId,
      run.kind,
      run.sequence,
      record?.status ?? 'harness-error',
      record?.taskId,
      record?.identity.seed,
      record?.identity.workflowId,
      record ? `${record.identity.outputResolution.width}x${record.identity.outputResolution.height}` : '',
      record?.durations.totalUserVisibleMs,
      record?.durations.workerGenerationMs,
      record?.durations.completedProjectHandoffMs,
      record ? uiAcceptanceAndRender(record) : undefined,
      run.validationErrors.join(' | '),
      run.warnings.join(' | ')
    ].map(csvCell).join(',');
  });
  return `${header.join(',')}\n${rows.join('\n')}\n`;
}

async function writeSummary(outputDir: string, generatedAt: string, commit: string, baseUrl: string, options: CliOptions, cases: HarnessCase[], runs: CapturedRun[]): Promise<CaseSummary[]> {
  const summaries = summarizeCases(cases, runs);
  await writeFile(path.join(outputDir, 'summary.json'), `${JSON.stringify({
    schemaVersion: 1,
    generatedAt,
    sourceCommit: commit,
    baseUrl,
    browser: options.browserChannel,
    headless: options.headless,
    cases: summaries,
    runs
  }, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputDir, 'summary.md'), `${summaryMarkdown(generatedAt, commit, baseUrl, options, summaries)}\n`, 'utf8');
  await writeFile(path.join(outputDir, 'runs.csv'), runsCsv(runs), 'utf8');
  return summaries;
}

async function openCasePage(context: BrowserContext, baseUrl: string, testCase: HarnessCase, consoleErrors: string[]): Promise<Page> {
  const page = await context.newPage();
  page.on('pageerror', (error) => consoleErrors.push(`Page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`Console error: ${message.text()}`);
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await configureGenerator(page, testCase);
  return page;
}

async function runHarness(options: CliOptions): Promise<void> {
  const cases = await resolveHarnessCases(options);
  const commit = sourceCommit();
  const generatedAt = new Date().toISOString();
  const outputDir = path.resolve(options.outputDir || path.join('.local', 'performance', 'production-page', generatedAt.replace(/[:.]/g, '-')));
  await mkdir(outputDir, { recursive: true });

  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  const baseUrl = options.baseUrl || `http://127.0.0.1:${options.port}`;
  const captured: CapturedRun[] = [];
  let hadFailure = false;

  try {
    if (!options.baseUrl) {
      if (!options.skipBuild) {
        console.log(`Building production page at ${commit}...`);
        await runCommand(commandName(), ['run', 'build'], { ...process.env, VITE_WORLD_FORGE_COMMIT_SHA: commit });
      }
      server = await startPreviewServer(options.port);
      await waitForServer(baseUrl, server);
    }

    const { chromium } = await import('playwright');
    try {
      browser = await chromium.launch({
        headless: options.headless,
        channel: options.browserChannel === 'chrome' ? 'chrome' : undefined
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${message}\nInstall the browser with "npx playwright install chromium", or use "--browser chrome" to drive an installed Google Chrome.`);
    }

    const timeoutMs = options.timeoutMinutes * 60_000;
    for (const testCase of cases) {
      console.log(`\nCase ${testCase.id}: ${testCase.preset}, ${testCase.workflow}, ${testCase.resolution.label}, seed ${testCase.seed}`);
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const consoleErrors: string[] = [];
      let page = await openCasePage(context, baseUrl, testCase, consoleErrors);
      const totalRuns = testCase.warmupRuns + testCase.runs;
      for (let index = 0; index < totalRuns; index += 1) {
        const kind: CapturedRun['kind'] = index < testCase.warmupRuns ? 'warmup' : 'measured';
        const sequence = kind === 'warmup' ? index + 1 : index - testCase.warmupRuns + 1;
        console.log(`  ${kind} ${sequence}/${kind === 'warmup' ? testCase.warmupRuns : testCase.runs}`);
        if (index > 0 && testCase.reloadBetweenRuns) {
          await page.close();
          page = await openCasePage(context, baseUrl, testCase, consoleErrors);
        }
        try {
          const run = await runOne(page, testCase, kind, sequence, timeoutMs);
          if (consoleErrors.length) run.warnings.push(...consoleErrors.splice(0).map((entry) => `Browser: ${entry}`));
          captured.push(run);
          await writeCapturedRun(outputDir, run);
          const wall = run.record ? formatGenerationDuration(run.record.durations.totalUserVisibleMs) : 'no record';
          console.log(`    ${run.validationErrors.length ? 'INVALID' : 'complete'}: ${wall}`);
          if (run.validationErrors.length) {
            hadFailure = true;
            if (options.failFast) throw new Error(run.validationErrors.join(' '));
          }
        } catch (error) {
          hadFailure = true;
          const message = error instanceof Error ? error.message : String(error);
          const run: CapturedRun = { caseId: testCase.id, kind, sequence, validationErrors: [], warnings: consoleErrors.splice(0), error: message };
          captured.push(run);
          await writeCapturedRun(outputDir, run);
          try {
            await page.screenshot({ path: path.join(outputDir, testCase.id, `${kind}-${String(sequence).padStart(2, '0')}-failure.png`), fullPage: true });
          } catch {
            // The browser may already be unavailable.
          }
          console.error(`    failed: ${message}`);
          if (options.failFast) throw error;
        }
      }
      await context.close();
    }

    const summaries = await writeSummary(outputDir, generatedAt, commit, baseUrl, options, cases, captured);
    console.log(`\n${summaryMarkdown(generatedAt, commit, baseUrl, options, summaries)}`);
    console.log(`\nEvidence written to ${outputDir}`);
  } finally {
    await browser?.close().catch(() => undefined);
    await stopPreviewServer(server);
  }

  if (hadFailure) process.exitCode = 1;
}

function printHelp(): void {
  console.log(`Production page performance harness\n\nRuns the built World Forge page in a real browser, operates the Generator UI, waits for the production timing record, and writes per-run and aggregate evidence.\n\nUsage:\n  npm run profile:production-page -- [options]\n\nCommon options:\n  --seed <seed[,seed]>             Repeatable; defaults to 1001001\n  --preset <label[,label]>         Repeatable; defaults to Earthlike\n  --workflow <id[,id]>             Repeatable; defaults to core.performance-foundation\n  --resolution <WIDTHxHEIGHT>      Repeatable; defaults to 2048x1024\n  --runs <count>                   Measured runs per case; default 3\n  --warmup <count>                 Warmup runs per case; default 1\n  --plan <file.json>               Exact case list instead of the Cartesian flags\n  --reload-between-runs            Reload the real page between runs\n  --headed | --headless            Headed is the default for user-visible timing\n  --browser chromium|chrome        Playwright Chromium by default\n  --base-url <url>                 Drive an already running page; do not start preview\n  --skip-build                     Use the existing dist/ when starting preview\n  --output <directory>             Evidence directory\n  --timeout-minutes <count>        Per-generation timeout; default ${defaultTimeoutMinutes}\n  --fail-fast                      Stop at the first invalid or failed run\n\nExamples:\n  npm run profile:production-page -- --seed 1001001 --preset Earthlike --resolution 2048x1024 --runs 3 --warmup 1\n  npm run profile:production-page -- --seed 1001001,3141592,8675309 --preset Earthlike,Archipelago --resolution 1024x512,2048x1024,4096x2048\n  npm run profile:production-page -- --plan refs/testing/production-page-performance-plan.example.json\n`);
}

function assertSelfTest(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Self-test failed: ${message}`);
}

async function runSelfTest(): Promise<void> {
  const resolution = parseResolution('2048x1024');
  assertSelfTest(resolution.width === 2048 && resolution.height === 1024, 'resolution parsing');
  assertSelfTest(median([5, 1, 3]) === 3, 'odd median');
  assertSelfTest(median([4, 1, 2, 3]) === 2.5, 'even median');
  const options = parseCliArgs(['--seed', '1,2', '--preset', 'Earthlike', '--resolution', '1024x512', '--runs', '2', '--warmup', '0']);
  const cases = await resolveHarnessCases(options);
  assertSelfTest(cases.length === 2, 'Cartesian case expansion');
  assertSelfTest(cases.every((entry) => entry.runs === 2 && entry.warmupRuns === 0), 'run defaults');
  console.log('Production page harness self-test passed.');
}

async function main(): Promise<void> {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }
    if (options.selfTest) {
      await runSelfTest();
      return;
    }
    await runHarness(options);
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  }
}

await main();
