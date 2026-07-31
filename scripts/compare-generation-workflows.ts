import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDefaultConfig } from '../packages/generator-core/src/index';
import {
  generateProjectWithDeepTimeInstrumentation,
  type DeepTimeInstrumentationProfile,
  type DeepTimeSubstageId
} from '../packages/generator-core/src/deepTimeInstrumentation';
import {
  generationWorkflowDescriptor,
  type GenerationSeedStrategy,
  type GenerationWorkflowId
} from '../packages/generator-core/src/workflows';
import { generationGraphWorkflow } from '../packages/generation-runtime/src/graph/generationWorkflows';
import { authoritativeWorldSignature } from '../apps/desktop/src/worlds/worldReplayManifest';
import type { GenerationConfig, SelectedValues, WorldProject } from '@world-forge/shared';

type Resolution = { width: number; height: number };
type ScenarioId = 'earthlike-standard' | 'archipelago-standard' | 'geology-glacial-stress';
type BenchmarkScenario = {
  id: ScenarioId;
  label: string;
  worldPresetId: string;
  selectedValues: Partial<SelectedValues>;
};
type WorkflowConfig = GenerationConfig & { workflowId: GenerationWorkflowId; worldPresetId?: string };
type MemorySnapshot = { rssMb: number; heapUsedMb: number; heapTotalMb: number };
type WorkflowResult = {
  pairId: string;
  runIndex: number;
  scenarioId: ScenarioId;
  scenarioLabel: string;
  worldPresetId: string;
  seed: string;
  workflowId: GenerationWorkflowId;
  workflowVersion: string;
  seedStrategy: GenerationSeedStrategy;
  workflowContractSignature: string;
  sourceCommit: string;
  resolution: string;
  topologyCells: number;
  measuredWallMs: number;
  reportedTotalMs: number;
  memoryBefore: MemorySnapshot;
  memoryAfter: MemorySnapshot;
  outputSignature: string;
  authoritativeSignature: string;
  deepTime: DeepTimeInstrumentationProfile;
  metrics: {
    oceanPercentage: number;
    icePercentage: number;
    riverCount: number;
    oceanWithinTolerance: boolean;
    riverPathsValid: boolean;
  };
};
type PairComparison = {
  pairId: string;
  scenarioId: ScenarioId;
  seed: string;
  baselineWorkflowId: GenerationWorkflowId;
  candidateWorkflowId: GenerationWorkflowId;
  baselineMs: number;
  candidateMs: number;
  runtimeDeltaMs: number;
  runtimeDeltaPercent: number;
  baselineDeepTimeMs: number;
  candidateDeepTimeMs: number;
  deepTimeDeltaMs: number;
  deepTimeDeltaPercent: number;
  signaturesEqual: boolean;
  authoritativeSignaturesEqual: boolean;
};
type WorkflowComparisonReport = {
  format: 'world-forge-workflow-comparison';
  version: 3;
  generatedAt: string;
  environment: {
    node: string;
    platform: string;
    arch: string;
    sourceCommit: string;
  };
  options: {
    seeds: string[];
    scenarios: ScenarioId[];
    workflows: [GenerationWorkflowId, GenerationWorkflowId];
    resolution: string;
    runs: number;
  };
  scenarioDefinitions: BenchmarkScenario[];
  results: WorkflowResult[];
  comparisons: PairComparison[];
};

const benchmarkScenarios: readonly BenchmarkScenario[] = [
  {
    id: 'earthlike-standard',
    label: 'Earthlike standard activity',
    worldPresetId: 'Earthlike',
    selectedValues: {
      systemAgeGy: 4.6,
      oceanPercentage: 66,
      averageTemperatureC: 15,
      aridity: 0.48,
      axialTiltDeg: 23.4,
      plateCount: 23,
      continentCount: 5,
      continentScale: 0.58,
      islandDensity: 0.38,
      impactFrequency: 1,
      riverDensity: 1.9
    }
  },
  {
    id: 'archipelago-standard',
    label: 'Archipelago standard activity',
    worldPresetId: 'Archipelago',
    selectedValues: {
      systemAgeGy: 5.2,
      oceanPercentage: 72,
      averageTemperatureC: 17,
      aridity: 0.46,
      axialTiltDeg: 27,
      plateCount: 31,
      continentCount: 8,
      continentScale: 0.26,
      islandDensity: 0.84,
      impactFrequency: 1.15,
      riverDensity: 1.3
    }
  },
  {
    id: 'geology-glacial-stress',
    label: 'High-age geological and glacial stress',
    worldPresetId: 'Habitable World',
    selectedValues: {
      systemAgeGy: 9.5,
      oceanPercentage: 62,
      averageTemperatureC: 2,
      aridity: 0.42,
      axialTiltDeg: 42,
      orbitalEccentricity: 0.14,
      plateCount: 60,
      continentCount: 7,
      continentScale: 0.62,
      islandDensity: 0.64,
      impactFrequency: 2.2,
      riverDensity: 2.8
    }
  }
];

const args = parseArgs(process.argv.slice(2));
const sourceCommit = args.sourceCommit || process.env.SOURCE_COMMIT || process.env.GITHUB_SHA || 'unknown';
const selectedScenarios = args.scenarios.map(resolveScenario);
const results: WorkflowResult[] = [];

for (const scenario of selectedScenarios) {
  for (const seed of args.seeds) {
    for (let runIndex = 0; runIndex < args.runs; runIndex += 1) {
      const pairId = `${scenario.id}-${seed}-${formatResolution(args.resolution)}-run${runIndex + 1}`;
      for (const workflowId of args.workflows) {
        results.push(runWorkflow(pairId, scenario, seed, runIndex, workflowId, sourceCommit, args.resolution));
        const current = results[results.length - 1];
        console.log(`${current.pairId} ${current.workflowId}: total ${current.reportedTotalMs.toFixed(1)} ms, deep-time ${current.deepTime.reportedDeepTimeMs.toFixed(1)} ms`);
      }
    }
  }
}

const comparisons = comparePairs(results, args.workflows[0], args.workflows[1]);
const report: WorkflowComparisonReport = {
  format: 'world-forge-workflow-comparison',
  version: 2,
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    sourceCommit
  },
  options: {
    seeds: args.seeds,
    scenarios: args.scenarios,
    workflows: args.workflows,
    resolution: formatResolution(args.resolution),
    runs: args.runs
  },
  scenarioDefinitions: selectedScenarios,
  results,
  comparisons
};

const stamp = report.generatedAt.replace(/[:.]/g, '-');
const outputDir = join('refs', 'testing');
mkdirSync(outputDir, { recursive: true });
const jsonPath = join(outputDir, `generation-workflow-comparison-${stamp}.json`);
const markdownPath = join(outputDir, `generation-workflow-comparison-${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownPath, renderMarkdown(report));
console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${markdownPath}`);

function parseArgs(argv: string[]): {
  seeds: string[];
  scenarios: ScenarioId[];
  workflows: [GenerationWorkflowId, GenerationWorkflowId];
  resolution: Resolution;
  runs: number;
  sourceCommit?: string;
} {
  const value = (name: string) => argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const seeds = split(value('seeds')) ?? ['1001001', '3141592', '8675309'];
  const scenarioValues = split(value('scenarios')) ?? benchmarkScenarios.map((scenario) => scenario.id);
  const scenarios = scenarioValues.map((id) => resolveScenario(id).id);
  const workflowValues = split(value('workflows')) ?? ['core.live-world', 'core.performance-foundation'];
  if (workflowValues.length !== 2) throw new Error('Workflow comparison requires exactly two workflow IDs.');
  const workflows = workflowValues.map((id) => generationWorkflowDescriptor(id).id) as [GenerationWorkflowId, GenerationWorkflowId];
  if (workflows[0] === workflows[1]) throw new Error('Workflow comparison requires two distinct workflow IDs.');
  return {
    seeds,
    scenarios,
    workflows,
    resolution: parseResolution(value('resolution') ?? '512x256'),
    runs: Math.max(1, Math.round(Number(value('runs') ?? '1'))),
    sourceCommit: value('source-commit')
  };
}

function resolveScenario(id: string): BenchmarkScenario {
  const scenario = benchmarkScenarios.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Unknown benchmark scenario: ${id}`);
  return scenario;
}

function runWorkflow(
  pairId: string,
  scenario: BenchmarkScenario,
  seed: string,
  runIndex: number,
  workflowId: GenerationWorkflowId,
  sourceCommit: string,
  resolution: Resolution
): WorkflowResult {
  const workflow = generationWorkflowDescriptor(workflowId);
  const config = createDefaultConfig(seed, resolution) as WorkflowConfig;
  config.workflowId = workflowId;
  config.worldPresetId = scenario.worldPresetId;
  config.selectedValues = {
    ...config.selectedValues,
    ...scenario.selectedValues,
    oceanTolerancePercentagePoints: scenario.id === 'geology-glacial-stress' ? 10 : 6
  };
  const memoryBefore = memorySnapshot();
  const started = performance.now();
  const { project, profile } = generateProjectWithDeepTimeInstrumentation(config, {
    appVersion: 'workflow-comparison-v2',
    sourceCommit
  });
  const measuredWallMs = performance.now() - started;
  return {
    pairId,
    runIndex,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    worldPresetId: scenario.worldPresetId,
    seed,
    workflowId,
    workflowVersion: workflow.version,
    seedStrategy: workflow.seedStrategy,
    workflowContractSignature: workflowContractSignature(workflowId),
    sourceCommit,
    resolution: formatResolution(resolution),
    topologyCells: project.primaryWorld.topology.cellCount,
    measuredWallMs: round(measuredWallMs),
    reportedTotalMs: round(project.diagnostics?.totalMs ?? measuredWallMs),
    memoryBefore,
    memoryAfter: memorySnapshot(),
    outputSignature: outputSignature(project),
    authoritativeSignature: normalizedAuthoritativeSignature(project),
    deepTime: profile,
    metrics: {
      oceanPercentage: project.metrics.oceanPercentage,
      icePercentage: project.metrics.icePercentage,
      riverCount: project.metrics.riverCount,
      oceanWithinTolerance: project.metrics.validation.oceanWithinTolerance,
      riverPathsValid: project.metrics.validation.riverPathsValid
    }
  };
}

function comparePairs(
  results: WorkflowResult[],
  baselineWorkflowId: GenerationWorkflowId,
  candidateWorkflowId: GenerationWorkflowId
): PairComparison[] {
  const byPair = new Map<string, WorkflowResult[]>();
  for (const result of results) {
    const current = byPair.get(result.pairId) ?? [];
    current.push(result);
    byPair.set(result.pairId, current);
  }
  return [...byPair.entries()].map(([pairId, pair]) => {
    const baseline = pair.find((result) => result.workflowId === baselineWorkflowId);
    const candidate = pair.find((result) => result.workflowId === candidateWorkflowId);
    if (!baseline || !candidate) throw new Error(`Incomplete workflow pair: ${pairId}`);
    const runtimeDeltaMs = candidate.reportedTotalMs - baseline.reportedTotalMs;
    const deepTimeDeltaMs = candidate.deepTime.reportedDeepTimeMs - baseline.deepTime.reportedDeepTimeMs;
    return {
      pairId,
      scenarioId: baseline.scenarioId,
      seed: baseline.seed,
      baselineWorkflowId,
      candidateWorkflowId,
      baselineMs: baseline.reportedTotalMs,
      candidateMs: candidate.reportedTotalMs,
      runtimeDeltaMs: round(runtimeDeltaMs),
      runtimeDeltaPercent: percentDelta(runtimeDeltaMs, baseline.reportedTotalMs),
      baselineDeepTimeMs: baseline.deepTime.reportedDeepTimeMs,
      candidateDeepTimeMs: candidate.deepTime.reportedDeepTimeMs,
      deepTimeDeltaMs: round(deepTimeDeltaMs),
      deepTimeDeltaPercent: percentDelta(deepTimeDeltaMs, baseline.deepTime.reportedDeepTimeMs),
      signaturesEqual: baseline.outputSignature === candidate.outputSignature,
      authoritativeSignaturesEqual: baseline.authoritativeSignature === candidate.authoritativeSignature
    };
  });
}

function workflowContractSignature(workflowId: GenerationWorkflowId): string {
  const workflow = generationGraphWorkflow(workflowId);
  return hashText([
    workflow.id,
    workflow.version,
    ...workflow.nodes.map((node) => `${node.id}:${node.implementationId}:${node.inputs.join(',')}:${node.outputs.join(',')}`)
  ].join('|'));
}

function normalizedAuthoritativeSignature(project: WorldProject): string {
  const config = { ...project.config } as GenerationConfig & { workflowId?: string };
  delete config.workflowId;
  return authoritativeWorldSignature({ ...project, config });
}

function outputSignature(project: WorldProject): string {
  const world = project.primaryWorld;
  return [
    hashBytes(new Uint8Array(world.topologyLayers.elevation.buffer)),
    hashBytes(new Uint8Array(world.topologyLayers.water.buffer)),
    hashBytes(new Uint8Array(world.topologyLayers.biomes.buffer)),
    hashBytes(new Uint8Array(world.layers.elevation.buffer)),
    hashBytes(new Uint8Array(world.layers.water.buffer)),
    hashBytes(new Uint8Array(world.layers.biomes.buffer)),
    project.metrics.oceanPercentage.toFixed(4),
    project.metrics.icePercentage.toFixed(4),
    project.metrics.riverCount
  ].join(':');
}

function hashText(text: string): string {
  return `wf-g1-${hashBytes(new TextEncoder().encode(text))}`;
}

function hashBytes(bytes: Uint8Array): string {
  let hash = 2166136261;
  const stride = Math.max(1, Math.floor(bytes.length / 200_000));
  for (let index = 0; index < bytes.length; index += stride) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function memorySnapshot(): MemorySnapshot {
  const memory = process.memoryUsage();
  return {
    rssMb: round(memory.rss / 1024 / 1024, 1),
    heapUsedMb: round(memory.heapUsed / 1024 / 1024, 1),
    heapTotalMb: round(memory.heapTotal / 1024 / 1024, 1)
  };
}

function renderMarkdown(report: WorkflowComparisonReport): string {
  const strategies = report.results
    .filter((result, index, all) => all.findIndex((candidate) => candidate.workflowId === result.workflowId) === index)
    .map((result) => `${result.workflowId}=${result.seedStrategy}`)
    .join(', ');
  const comparisonRows = report.comparisons.map((comparison) => `| ${comparison.pairId} | ${comparison.baselineMs.toFixed(1)} | ${comparison.candidateMs.toFixed(1)} | ${comparison.runtimeDeltaPercent.toFixed(2)}% | ${comparison.baselineDeepTimeMs.toFixed(1)} | ${comparison.candidateDeepTimeMs.toFixed(1)} | ${comparison.deepTimeDeltaPercent.toFixed(2)}% | ${comparison.signaturesEqual ? 'yes' : 'no'} | ${comparison.authoritativeSignaturesEqual ? 'yes' : 'no'} |`);
  const substageRows = report.comparisons.flatMap((comparison) => {
    const pair = report.results.filter((result) => result.pairId === comparison.pairId);
    const baseline = pair.find((result) => result.workflowId === comparison.baselineWorkflowId);
    const candidate = pair.find((result) => result.workflowId === comparison.candidateWorkflowId);
    if (!baseline || !candidate) return [];
    const stageIds = new Set<DeepTimeSubstageId>([
      ...baseline.deepTime.substages.map((stage) => stage.id),
      ...candidate.deepTime.substages.map((stage) => stage.id)
    ]);
    return [...stageIds].map((stageId) => {
      const baselineMs = baseline.deepTime.substages.find((stage) => stage.id === stageId)?.elapsedMs ?? 0;
      const candidateMs = candidate.deepTime.substages.find((stage) => stage.id === stageId)?.elapsedMs ?? 0;
      return `| ${comparison.pairId} | ${stageId} | ${baselineMs.toFixed(1)} | ${candidateMs.toFixed(1)} | ${percentDelta(candidateMs - baselineMs, baselineMs).toFixed(2)}% |`;
    });
  });
  return [
    '# Generation Workflow Comparison',
    '',
    `Generated: ${report.generatedAt}`,
    `Source commit: ${report.environment.sourceCommit}`,
    `Workflows: ${report.options.workflows.join(' versus ')}`,
    `Seed strategies: ${strategies}`,
    `Seeds: ${report.options.seeds.join(', ')}`,
    `Scenarios: ${report.options.scenarios.join(', ')}`,
    `Resolution: ${report.options.resolution}`,
    '',
    '## Runtime comparison',
    '',
    '| Pair | Baseline total ms | Candidate total ms | Total delta | Baseline deep-time ms | Candidate deep-time ms | Deep-time delta | Same coarse signature | Same authoritative signature |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
    ...comparisonRows,
    '',
    '## Deep-time substage comparison',
    '',
    '| Pair | Substage | Baseline ms | Candidate ms | Delta |',
    '| --- | --- | ---: | ---: | ---: |',
    ...substageRows,
    '',
    'The workflows run sequentially with the same seed, scenario, and resolved configuration. Production preserves its legacy shared-stream contract; the experimental workflow uses semantic node streams, so signature differences are expected and must be evaluated through the quality scorecard.',
    '',
    'Substage timing is captured from the existing deep-time progress contract. The ledger-and-unattributed row exposes mutation-ledger setup/finalization and any work not yet bounded by an explicit progress transition.',
    ''
  ].join('\n');
}

function split(value: string | undefined): string[] | undefined {
  return value?.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function parseResolution(value: string): Resolution {
  const match = /^(\d+)x(\d+)$/.exec(value.trim());
  if (!match) throw new Error(`Invalid resolution: ${value}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function formatResolution(value: Resolution): string {
  return `${value.width}x${value.height}`;
}

function percentDelta(delta: number, baseline: number): number {
  return round((delta / Math.max(0.001, baseline)) * 100);
}

function round(value: number, places = 3): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
