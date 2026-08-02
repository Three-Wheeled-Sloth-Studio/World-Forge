#!/usr/bin/env node
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import type { ProductionGenerationTimingRecord } from '../apps/desktop/src/generation/generationTiming';

const productionStagePrefix = 'production.stage.';
const performanceOperationPrefix = 'performance.operation.';

type CommandSpec = { command: string; args: string[] };
type RerankCaseInput = {
  id: string;
  seed: string;
  starSeed?: string;
  preset: string;
  starPreset?: string;
  workflow?: string;
};
type RerankPlan = {
  runs?: number;
  resolution?: string;
  cases: RerankCaseInput[];
};
type Options = {
  selfTest: boolean;
  help: boolean;
  planPath?: string;
  runs: number;
  resolution: string;
  browser: 'chromium' | 'chrome';
  headless: boolean;
  port: number;
  timeoutMinutes: number;
  outputDir?: string;
  skipBuild: boolean;
};
type ScheduledRun = { round: number; sequence: number; testCase: RerankCaseInput };
type CapturedRun = {
  logicalCaseId: string;
  round: number;
  sequence: number;
  sourceDirectory: string;
  record: ProductionGenerationTimingRecord;
};
type MetricSummary = { min: number; median: number; max: number };

type CaseSummary = {
  caseId: string;
  preset: string;
  seed: string;
  resolution: string;
  runs: number;
  wallMs: MetricSummary;
  workerMs: MetricSummary;
  handoffMs: MetricSummary;
  uiMs: MetricSummary;
  productionStageMedians: Array<{ stageId: string; label: string; medianMs: number; workerShare: number }>;
  fineOperationMedians: Array<{ operationId: string; medianMs: number; workerShare: number }>;
};

const defaultCases: RerankCaseInput[] = [
  { id: 'earthlike', seed: '1001001', preset: 'Earthlike', starPreset: 'sol-like', workflow: 'core.performance-foundation' },
  { id: 'archipelago', seed: '3141592', preset: 'Archipelago', starPreset: 'sol-like', workflow: 'core.performance-foundation' }
];

const productionStageLabels: Record<string, string> = {
  foundation: 'Initial foundation',
  motion: 'Motion coupling',
  history: 'Deep-time foundation',
  reconciliation: 'Terminal reconciliation',
  postprocess: 'Biome post-processing',
  unattributed: 'Unattributed production work'
};

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
}

function positiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${flag} must be a positive integer.`);
  return parsed;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    selfTest: false,
    help: false,
    runs: 3,
    resolution: '2048x1024',
    browser: 'chromium',
    headless: false,
    port: 4173,
    timeoutMinutes: 30,
    skipBuild: false
  };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    switch (flag) {
      case '--self-test': options.selfTest = true; break;
      case '--help':
      case '-h': options.help = true; break;
      case '--plan': options.planPath = requireValue(args, ++index, flag); break;
      case '--runs': options.runs = positiveInteger(requireValue(args, ++index, flag), flag); break;
      case '--resolution': options.resolution = requireValue(args, ++index, flag); break;
      case '--browser': {
        const value = requireValue(args, ++index, flag);
        if (value !== 'chromium' && value !== 'chrome') throw new Error('--browser must be chromium or chrome.');
        options.browser = value;
        break;
      }
      case '--headless': options.headless = true; break;
      case '--headed': options.headless = false; break;
      case '--port': options.port = positiveInteger(requireValue(args, ++index, flag), flag); break;
      case '--timeout-minutes': options.timeoutMinutes = positiveInteger(requireValue(args, ++index, flag), flag); break;
      case '--output': options.outputDir = requireValue(args, ++index, flag); break;
      case '--skip-build': options.skipBuild = true; break;
      default: throw new Error(`Unknown argument: ${flag}`);
    }
  }
  if (!/^\d+x\d+$/i.test(options.resolution)) throw new Error('--resolution must use WIDTHxHEIGHT.');
  return options;
}

function sourceCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown-local-commit';
  }
}

function quoteCmdArgument(value: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `"${value.replace(/%/g, '%%').replace(/(["^&|<>])/g, '^$1')}"`;
}

function npmCommand(args: string[]): CommandSpec {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath?.trim()) return { command: process.execPath, args: [npmExecPath, ...args] };
  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec?.trim() || 'cmd.exe',
      args: ['/d', '/s', '/c', `npm.cmd ${args.map(quoteCmdArgument).join(' ')}`]
    };
  }
  return { command: 'npm', args };
}

async function runCommand(spec: CommandSpec, env = process.env): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(spec.command, spec.args, { cwd: process.cwd(), env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${spec.command} ${spec.args.join(' ')} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`));
    });
  });
}

function startPreview(port: number): ChildProcess {
  const spec = npmCommand(['run', 'preview', '--', '--port', String(port), '--strictPort']);
  const child = spawn(spec.command, spec.args, {
    cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32'
  });
  child.stdout?.on('data', (chunk) => process.stdout.write(`[preview] ${String(chunk)}`));
  child.stderr?.on('data', (chunk) => process.stderr.write(`[preview] ${String(chunk)}`));
  return child;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Preview server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Still starting.
    }
    await delay(250);
  }
  throw new Error(`Preview server did not become ready at ${url}.`);
}

async function stopPreview(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.once('exit', () => resolve());
      killer.once('error', () => resolve());
    });
    return;
  }
  try { process.kill(-child.pid, 'SIGTERM'); }
  catch { child.kill('SIGTERM'); }
  await delay(250);
}

async function loadPlan(options: Options): Promise<{ runs: number; resolution: string; cases: RerankCaseInput[] }> {
  if (!options.planPath) return { runs: options.runs, resolution: options.resolution, cases: defaultCases };
  const plan = JSON.parse(await readFile(path.resolve(options.planPath), 'utf8')) as RerankPlan;
  if (!Array.isArray(plan.cases) || plan.cases.length < 2) throw new Error('Rerank plan must contain at least two cases.');
  for (const entry of plan.cases) {
    if (!entry.id || !entry.seed || !entry.preset) throw new Error('Each rerank case requires id, seed, and preset.');
  }
  return {
    runs: plan.runs ?? options.runs,
    resolution: plan.resolution ?? options.resolution,
    cases: plan.cases
  };
}

export function buildAlternatingSchedule(cases: readonly RerankCaseInput[], runs: number): ScheduledRun[] {
  const schedule: ScheduledRun[] = [];
  let sequence = 0;
  for (let round = 1; round <= runs; round += 1) {
    const ordered = round % 2 === 1 ? [...cases] : [...cases].reverse();
    for (const testCase of ordered) schedule.push({ round, sequence: ++sequence, testCase });
  }
  return schedule;
}

function innerArgs(
  item: ScheduledRun,
  resolution: string,
  baseUrl: string,
  outputDir: string,
  options: Options
): string[] {
  const testCase = item.testCase;
  return [
    'run', 'profile:production-page:inner', '--',
    '--base-url', baseUrl,
    '--seed', testCase.seed,
    '--star-seed', testCase.starSeed ?? testCase.seed,
    '--preset', testCase.preset,
    '--star-preset', testCase.starPreset ?? 'sol-like',
    '--workflow', testCase.workflow ?? 'core.performance-foundation',
    '--resolution', resolution,
    '--runs', '1',
    '--warmup', '0',
    '--browser', options.browser,
    options.headless ? '--headless' : '--headed',
    '--timeout-minutes', String(options.timeoutMinutes),
    '--output', outputDir,
    '--fail-fast'
  ];
}

function finite(value: number | undefined): number {
  return Number.isFinite(value) ? value as number : 0;
}

function uiMs(record: ProductionGenerationTimingRecord): number {
  return finite(record.durations.uiProjectAcceptanceMs)
    + finite(record.durations.projectAcceptanceToRenderCommitMs)
    + finite(record.durations.renderCommitToInteractivePaintMs);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function metric(values: number[]): MetricSummary {
  return { min: Math.min(...values), median: median(values), max: Math.max(...values) };
}

function stageMap(record: ProductionGenerationTimingRecord, prefix: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const stage of record.graphNodes) {
    if (!stage.stageId.startsWith(prefix)) continue;
    const id = stage.stageId.slice(prefix.length);
    result.set(id, (result.get(id) ?? 0) + stage.elapsedMs);
  }
  return result;
}

function validateAttribution(record: ProductionGenerationTimingRecord): void {
  const stages = stageMap(record, productionStagePrefix);
  const operations = stageMap(record, performanceOperationPrefix);
  const required = ['foundation', 'motion', 'history', 'reconciliation', 'postprocess', 'unattributed'];
  const missing = required.filter((id) => !stages.has(id));
  if (missing.length) throw new Error(`Production attribution stages missing: ${missing.join(', ')}.`);
  if (!operations.size) throw new Error('No production fine-operation timings were captured.');
  if (record.graphNodes.some((stage) => stage.stageId === 'deep-time-aging' && stage.parentStageId)) {
    throw new Error('Legacy deep-time wrapper is still represented as a child timing.');
  }
}

async function readCapturedRun(directory: string, logicalCaseId: string, round: number, sequence: number): Promise<CapturedRun> {
  const summary = JSON.parse(await readFile(path.join(directory, 'summary.json'), 'utf8')) as {
    runs: Array<{ kind: string; record?: ProductionGenerationTimingRecord; validationErrors?: string[]; error?: string }>;
  };
  const measured = summary.runs.find((run) => run.kind === 'measured');
  if (!measured?.record) throw new Error(measured?.error || 'Inner harness did not produce a measured record.');
  if (measured.validationErrors?.length) throw new Error(measured.validationErrors.join(' '));
  validateAttribution(measured.record);
  return { logicalCaseId, round, sequence, sourceDirectory: directory, record: measured.record };
}

function summarize(cases: readonly RerankCaseInput[], resolution: string, captured: readonly CapturedRun[]): CaseSummary[] {
  return cases.map((testCase) => {
    const records = captured.filter((run) => run.logicalCaseId === testCase.id).map((run) => run.record);
    const workerMedian = median(records.map((record) => finite(record.durations.workerGenerationMs)));
    const productionIds = new Set(records.flatMap((record) => [...stageMap(record, productionStagePrefix).keys()]));
    const operationIds = new Set(records.flatMap((record) => [...stageMap(record, performanceOperationPrefix).keys()]));
    const productionStageMedians = [...productionIds].map((stageId) => {
      const value = median(records.map((record) => stageMap(record, productionStagePrefix).get(stageId) ?? 0));
      return {
        stageId,
        label: productionStageLabels[stageId] ?? stageId,
        medianMs: value,
        workerShare: value / Math.max(1, workerMedian)
      };
    }).sort((left, right) => right.medianMs - left.medianMs);
    const fineOperationMedians = [...operationIds].map((operationId) => {
      const value = median(records.map((record) => stageMap(record, performanceOperationPrefix).get(operationId) ?? 0));
      return { operationId, medianMs: value, workerShare: value / Math.max(1, workerMedian) };
    }).sort((left, right) => right.medianMs - left.medianMs);
    return {
      caseId: testCase.id,
      preset: testCase.preset,
      seed: testCase.seed,
      resolution,
      runs: records.length,
      wallMs: metric(records.map((record) => record.durations.totalUserVisibleMs)),
      workerMs: metric(records.map((record) => finite(record.durations.workerGenerationMs))),
      handoffMs: metric(records.map((record) => finite(record.durations.completedProjectHandoffMs))),
      uiMs: metric(records.map(uiMs)),
      productionStageMedians,
      fineOperationMedians
    };
  });
}

function formatMs(value: number): string {
  if (value >= 60_000) return `${(value / 60_000).toFixed(2)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}s`;
  return `${value.toFixed(1)}ms`;
}

function renderSummary(generatedAt: string, commit: string, summaries: readonly CaseSummary[]): string {
  const lines = [
    '# Production attribution rerank', '',
    `- Generated: ${generatedAt}`,
    `- Source commit: ${commit}`,
    '- Isolation: fresh browser process, browser context, page, and generation worker for every measured run',
    '- Ordering: alternating case order each round', '',
    '| Case | Runs | Wall median | Worker median | Handoff median | UI median | Slowest production stage | Slowest fine operation |',
    '|---|---:|---:|---:|---:|---:|---|---|'
  ];
  for (const summary of summaries) {
    const stage = summary.productionStageMedians[0];
    const operation = summary.fineOperationMedians[0];
    lines.push(`| ${summary.caseId} | ${summary.runs} | ${formatMs(summary.wallMs.median)} | ${formatMs(summary.workerMs.median)} | ${formatMs(summary.handoffMs.median)} | ${formatMs(summary.uiMs.median)} | ${stage ? `${stage.label} ${formatMs(stage.medianMs)} (${(stage.workerShare * 100).toFixed(1)}%)` : 'missing'} | ${operation ? `${operation.operationId} ${formatMs(operation.medianMs)} (${(operation.workerShare * 100).toFixed(1)}%)` : 'missing'} |`);
  }
  lines.push('', 'Production stages are non-overlapping. Fine operations are nested attribution and must not be added to production-stage totals.');
  return `${lines.join('\n')}\n`;
}

function renderCsv(captured: readonly CapturedRun[]): string {
  const header = ['caseId', 'round', 'sequence', 'taskId', 'wallMs', 'workerMs', 'handoffMs', 'uiMs', 'sourceDirectory'];
  const rows = captured.map((run) => [
    run.logicalCaseId,
    run.round,
    run.sequence,
    run.record.taskId,
    run.record.durations.totalUserVisibleMs,
    run.record.durations.workerGenerationMs,
    run.record.durations.completedProjectHandoffMs,
    uiMs(run.record),
    run.sourceDirectory
  ].join(','));
  return `${header.join(',')}\n${rows.join('\n')}\n`;
}

async function run(options: Options): Promise<void> {
  const plan = await loadPlan(options);
  const schedule = buildAlternatingSchedule(plan.cases, plan.runs);
  const generatedAt = new Date().toISOString();
  const commit = sourceCommit();
  const outputRoot = path.resolve(options.outputDir ?? path.join('.local', 'performance', 'production-rerank', generatedAt.replace(/[:.]/g, '-')));
  const baseUrl = `http://127.0.0.1:${options.port}`;
  await mkdir(outputRoot, { recursive: true });
  let server: ChildProcess | undefined;
  const captured: CapturedRun[] = [];

  try {
    if (!options.skipBuild) {
      console.log(`Building production page at ${commit}...`);
      await runCommand(npmCommand(['run', 'build']), { ...process.env, VITE_WORLD_FORGE_COMMIT_SHA: commit });
    }
    server = startPreview(options.port);
    await waitForServer(baseUrl, server);

    for (const item of schedule) {
      const runName = `${String(item.sequence).padStart(2, '0')}-round-${String(item.round).padStart(2, '0')}-${item.testCase.id}`;
      const outputDir = path.join(outputRoot, 'runs', runName);
      console.log(`\n${runName}: ${item.testCase.preset} ${plan.resolution}`);
      await runCommand(npmCommand(innerArgs(item, plan.resolution, baseUrl, outputDir, options)));
      captured.push(await readCapturedRun(outputDir, item.testCase.id, item.round, item.sequence));
    }

    const summaries = summarize(plan.cases, plan.resolution, captured);
    await writeFile(path.join(outputRoot, 'summary.json'), `${JSON.stringify({
      schemaVersion: 1,
      generatedAt,
      sourceCommit: commit,
      isolation: 'fresh-browser-process-context-page-worker-per-run',
      order: 'alternating-by-round',
      plan,
      schedule: schedule.map((item) => ({ round: item.round, sequence: item.sequence, caseId: item.testCase.id })),
      summaries,
      captured
    }, null, 2)}\n`, 'utf8');
    await writeFile(path.join(outputRoot, 'summary.md'), renderSummary(generatedAt, commit, summaries), 'utf8');
    await writeFile(path.join(outputRoot, 'runs.csv'), renderCsv(captured), 'utf8');
    console.log(`\n${renderSummary(generatedAt, commit, summaries)}`);
    console.log(`Evidence written to ${outputRoot}`);
  } finally {
    await stopPreview(server);
  }
}

function selfTest(): void {
  const schedule = buildAlternatingSchedule(defaultCases, 3).map((item) => item.testCase.id);
  const expected = ['earthlike', 'archipelago', 'archipelago', 'earthlike', 'earthlike', 'archipelago'];
  if (JSON.stringify(schedule) !== JSON.stringify(expected)) throw new Error('Alternating schedule self-test failed.');
  const fake = {
    graphNodes: [
      { stageId: 'production.stage.history', label: 'x', elapsedMs: 10 },
      { stageId: 'performance.operation.basin-circulation.pack-gyres', label: 'x', elapsedMs: 4 }
    ]
  } as unknown as ProductionGenerationTimingRecord;
  if (stageMap(fake, productionStagePrefix).get('history') !== 10) throw new Error('Production stage extraction self-test failed.');
  if (stageMap(fake, performanceOperationPrefix).get('basin-circulation.pack-gyres') !== 4) throw new Error('Fine operation extraction self-test failed.');
  console.log('Production rerank harness self-test passed.');
}

function printHelp(): void {
  console.log(`Production attribution rerank\n\nRuns one generation per fresh browser process/context/worker and alternates case order each round.\n\nUsage:\n  npm run profile:production-rerank -- [options]\n\nOptions:\n  --plan <file>             Optional rerank case plan\n  --runs <count>            Runs per case; default 3\n  --resolution <WxH>        Default 2048x1024\n  --browser chromium|chrome Default chromium\n  --headed | --headless     Headed by default\n  --timeout-minutes <count> Default 30\n  --port <port>             Default 4173\n  --output <directory>      Evidence root\n  --skip-build              Reuse the current dist/\n  --self-test               Validate scheduling and attribution extraction\n`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  if (options.selfTest) return selfTest();
  await run(options);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
