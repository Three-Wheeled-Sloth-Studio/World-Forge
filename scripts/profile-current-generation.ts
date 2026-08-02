import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GenerationConfig, SelectedValues } from '@world-forge/shared';
import { createDefaultConfig } from '../packages/generator-core/src/index';
import {
  generateProjectWithDeepTimeInstrumentation,
  type DeepTimeInstrumentationProfile
} from '../packages/generator-core/src/deepTimeInstrumentation';
import {
  setGenerationPerformanceTraceSink,
  type GenerationPerformanceTraceRecord
} from '../packages/generator-core/src/generationPerformanceTrace';
import {
  generationWorkflowDescriptor,
  type GenerationWorkflowId
} from '../packages/generator-core/src/workflows';

type Resolution = { width: number; height: number };
type ScenarioId = 'earthlike-standard' | 'archipelago-standard' | 'geology-glacial-stress';
type Scenario = {
  id: ScenarioId;
  label: string;
  worldPresetId: string;
  selectedValues: Partial<SelectedValues>;
};
type ExtendedConfig = GenerationConfig & {
  workflowId: GenerationWorkflowId;
  worldPresetId?: string;
};
type RunResult = {
  runId: string;
  scenarioId: ScenarioId;
  seed: string;
  runIndex: number;
  resolution: string;
  workflowId: GenerationWorkflowId;
  workflowVersion: string;
  totalMs: number;
  wallMs: number;
  topologyCells: number;
  outputPixels: number;
  deepTime: DeepTimeInstrumentationProfile;
  traces: GenerationPerformanceTraceRecord[];
  metrics: {
    oceanPercentage: number;
    icePercentage: number;
    riverCount: number;
  };
};
type PhaseSummary = {
  name: string;
  samples: number;
  averageMs: number;
  medianMs: number;
  p90Ms: number;
  averagePercentOfTotal: number;
  averageNsPerTopologyCell?: number;
  averageActiveCellShare?: number;
  averageFullTopologyPasses?: number;
  averageAllocatedBufferMb?: number;
};
type Report = {
  format: 'world-forge-current-generation-profile';
  version: 1;
  generatedAt: string;
  sourceCommit: string;
  environment: {
    node: string;
    platform: string;
    arch: string;
  };
  options: {
    workflowId: GenerationWorkflowId;
    workflowVersion: string;
    seeds: string[];
    scenarios: ScenarioId[];
    resolution: string;
    runs: number;
  };
  results: RunResult[];
  finePhaseRanking: PhaseSummary[];
  deepTimeSubstageRanking: PhaseSummary[];
};

const scenarios: readonly Scenario[] = [
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
const workflow = generationWorkflowDescriptor(args.workflowId);
const selectedScenarios = args.scenarioIds.map(resolveScenario);
const results: RunResult[] = [];

for (const scenario of selectedScenarios) {
  for (const seed of args.seeds) {
    for (let runIndex = 0; runIndex < args.runs; runIndex += 1) {
      const result = runProfile(scenario, seed, runIndex, args.resolution, workflow.id);
      results.push(result);
      const top = result.traces
        .filter((trace) => !trace.parent)
        .sort((left, right) => right.elapsedMs - left.elapsedMs)
        .slice(0, 4)
        .map((trace) => `${trace.name} ${trace.elapsedMs.toFixed(1)} ms`)
        .join(', ');
      console.log(`${result.runId}: total ${result.totalMs.toFixed(1)} ms; ${top}`);
    }
  }
}

const report: Report = {
  format: 'world-forge-current-generation-profile',
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceCommit: args.sourceCommit,
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  },
  options: {
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    seeds: args.seeds,
    scenarios: args.scenarioIds,
    resolution: formatResolution(args.resolution),
    runs: args.runs
  },
  results,
  finePhaseRanking: summarizeFinePhases(results),
  deepTimeSubstageRanking: summarizeDeepTimeSubstages(results)
};

const stamp = report.generatedAt.replace(/[:.]/g, '-');
const outputDir = join('refs', 'testing');
mkdirSync(outputDir, { recursive: true });
const basename = `current-generation-profile-${formatResolution(args.resolution)}-${stamp}`;
const jsonPath = join(outputDir, `${basename}.json`);
const markdownPath = join(outputDir, `${basename}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownPath, renderMarkdown(report));
console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${markdownPath}`);

function parseArgs(argv: string[]): {
  workflowId: GenerationWorkflowId;
  seeds: string[];
  scenarioIds: ScenarioId[];
  resolution: Resolution;
  runs: number;
  sourceCommit: string;
} {
  const value = (name: string) => argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const workflowId = generationWorkflowDescriptor(value('workflow') ?? 'core.performance-foundation').id;
  const seeds = split(value('seeds')) ?? ['1001001', '3141592', '8675309'];
  const requestedScenarios = split(value('scenarios')) ?? scenarios.map((scenario) => scenario.id);
  const scenarioIds = requestedScenarios.map((id) => resolveScenario(id).id);
  const resolution = parseResolution(value('resolution') ?? '512x256');
  const runs = Math.max(1, Math.round(Number(value('runs') ?? '1')));
  const sourceCommit = value('source-commit') ?? process.env.SOURCE_COMMIT ?? process.env.GITHUB_SHA ?? 'unknown';
  return { workflowId, seeds, scenarioIds, resolution, runs, sourceCommit };
}

function resolveScenario(id: string): Scenario {
  const scenario = scenarios.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}

function runProfile(
  scenario: Scenario,
  seed: string,
  runIndex: number,
  resolution: Resolution,
  workflowId: GenerationWorkflowId
): RunResult {
  const config = createDefaultConfig(seed, resolution) as ExtendedConfig;
  config.workflowId = workflowId;
  config.worldPresetId = scenario.worldPresetId;
  config.selectedValues = {
    ...config.selectedValues,
    ...scenario.selectedValues,
    oceanTolerancePercentagePoints: scenario.id === 'geology-glacial-stress' ? 10 : 6
  };
  const traces: GenerationPerformanceTraceRecord[] = [];
  setGenerationPerformanceTraceSink((record) => traces.push({ ...record }));
  const started = performance.now();
  try {
    const { project, profile } = generateProjectWithDeepTimeInstrumentation(config, {
      appVersion: 'current-generation-profile-v1',
      sourceCommit: process.env.SOURCE_COMMIT ?? process.env.GITHUB_SHA ?? 'unknown'
    });
    const wallMs = performance.now() - started;
    return {
      runId: `${scenario.id}-${seed}-${formatResolution(resolution)}-run${runIndex + 1}`,
      scenarioId: scenario.id,
      seed,
      runIndex,
      resolution: formatResolution(resolution),
      workflowId,
      workflowVersion: generationWorkflowDescriptor(workflowId).version,
      totalMs: round(project.diagnostics?.totalMs ?? wallMs),
      wallMs: round(wallMs),
      topologyCells: project.primaryWorld.topology.cellCount,
      outputPixels: resolution.width * resolution.height,
      deepTime: profile,
      traces: traces.map((trace) => ({ ...trace, elapsedMs: round(trace.elapsedMs) })),
      metrics: {
        oceanPercentage: project.metrics.oceanPercentage,
        icePercentage: project.metrics.icePercentage,
        riverCount: project.metrics.riverCount
      }
    };
  } finally {
    setGenerationPerformanceTraceSink(undefined);
  }
}

function summarizeFinePhases(results: RunResult[]): PhaseSummary[] {
  const grouped = new Map<string, Array<{ record: GenerationPerformanceTraceRecord; result: RunResult }>>();
  for (const result of results) {
    for (const record of result.traces) {
      if (record.parent) continue;
      const current = grouped.get(record.name) ?? [];
      current.push({ record, result });
      grouped.set(record.name, current);
    }
  }
  return [...grouped.entries()]
    .map(([name, samples]) => summarizeRecords(name, samples))
    .sort((left, right) => right.averageMs - left.averageMs);
}

function summarizeDeepTimeSubstages(results: RunResult[]): PhaseSummary[] {
  const grouped = new Map<string, number[]>();
  for (const result of results) {
    for (const substage of result.deepTime.substages) {
      const current = grouped.get(substage.id) ?? [];
      current.push(substage.elapsedMs);
      grouped.set(substage.id, current);
    }
  }
  return [...grouped.entries()]
    .map(([name, values]) => {
      const sorted = [...values].sort((left, right) => left - right);
      return {
        name,
        samples: values.length,
        averageMs: round(average(values)),
        medianMs: round(percentile(sorted, 0.5)),
        p90Ms: round(percentile(sorted, 0.9)),
        averagePercentOfTotal: round(average(values.map((value, index) => value / Math.max(1, results[index % results.length].totalMs) * 100)), 2)
      };
    })
    .sort((left, right) => right.averageMs - left.averageMs);
}

function summarizeRecords(
  name: string,
  samples: Array<{ record: GenerationPerformanceTraceRecord; result: RunResult }>
): PhaseSummary {
  const elapsed = samples.map(({ record }) => record.elapsedMs);
  const sorted = [...elapsed].sort((left, right) => left - right);
  const topologyCellSamples = samples.filter(({ record }) => (record.topologyCells ?? 0) > 0);
  const activeCellSamples = samples.filter(({ record }) => (record.topologyCells ?? 0) > 0 && record.activeCells !== undefined);
  const passSamples = samples.filter(({ record }) => record.fullTopologyPasses !== undefined);
  const bufferSamples = samples.filter(({ record }) => record.allocatedBufferBytes !== undefined);
  return {
    name,
    samples: samples.length,
    averageMs: round(average(elapsed)),
    medianMs: round(percentile(sorted, 0.5)),
    p90Ms: round(percentile(sorted, 0.9)),
    averagePercentOfTotal: round(average(samples.map(({ record, result }) => record.elapsedMs / Math.max(1, result.totalMs) * 100)), 2),
    averageNsPerTopologyCell: topologyCellSamples.length
      ? round(average(topologyCellSamples.map(({ record }) => record.elapsedMs * 1_000_000 / Math.max(1, record.topologyCells ?? 1))), 1)
      : undefined,
    averageActiveCellShare: activeCellSamples.length
      ? round(average(activeCellSamples.map(({ record }) => (record.activeCells ?? 0) / Math.max(1, record.topologyCells ?? 1))), 4)
      : undefined,
    averageFullTopologyPasses: passSamples.length
      ? round(average(passSamples.map(({ record }) => record.fullTopologyPasses ?? 0)), 2)
      : undefined,
    averageAllocatedBufferMb: bufferSamples.length
      ? round(average(bufferSamples.map(({ record }) => (record.allocatedBufferBytes ?? 0) / 1024 / 1024)), 2)
      : undefined
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Current Generation Performance Profile',
    '',
    `Generated: ${report.generatedAt}`,
    `Source commit: ${report.sourceCommit}`,
    `Workflow: ${report.options.workflowId}@${report.options.workflowVersion}`,
    `Environment: ${report.environment.node} on ${report.environment.platform}/${report.environment.arch}`,
    `Matrix: ${report.options.seeds.length} seeds x ${report.options.scenarios.length} scenarios x ${report.options.runs} run(s), ${report.options.resolution}`,
    '',
    '## Fine phase ranking',
    '',
    '| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...report.finePhaseRanking.slice(0, 30).map((phase, index) =>
      `| ${index + 1} | ${phase.name} | ${phase.samples} | ${phase.averageMs.toFixed(1)} | ${phase.medianMs.toFixed(1)} | ${phase.p90Ms.toFixed(1)} | ${phase.averagePercentOfTotal.toFixed(2)}% | ${formatOptional(phase.averageNsPerTopologyCell, 1)} | ${formatOptional(phase.averageActiveCellShare, 4)} | ${formatOptional(phase.averageFullTopologyPasses, 2)} | ${formatOptional(phase.averageAllocatedBufferMb, 2)} |`
    ),
    '',
    '## Deep-time substage ranking',
    '',
    '| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: |',
    ...report.deepTimeSubstageRanking.map((phase, index) =>
      `| ${index + 1} | ${phase.name} | ${phase.samples} | ${phase.averageMs.toFixed(1)} | ${phase.medianMs.toFixed(1)} | ${phase.p90Ms.toFixed(1)} | ${phase.averagePercentOfTotal.toFixed(2)}% |`
    ),
    '',
    '## Runs',
    '',
    '| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...report.results.map((result) =>
      `| ${result.runId} | ${result.totalMs.toFixed(1)} | ${result.wallMs.toFixed(1)} | ${result.deepTime.reportedDeepTimeMs.toFixed(1)} | ${result.metrics.oceanPercentage.toFixed(2)} | ${result.metrics.icePercentage.toFixed(2)} | ${result.metrics.riverCount} |`
    ),
    '',
    '## Interpretation rule',
    '',
    'Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.',
    ''
  ];
  return `${lines.join('\n')}\n`;
}

function split(value: string | undefined): string[] | undefined {
  return value?.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseResolution(value: string): Resolution {
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) throw new Error(`Invalid resolution: ${value}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function formatResolution(resolution: Resolution): string {
  return `${resolution.width}x${resolution.height}`;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentile(sorted: number[], fraction: number): number {
  if (!sorted.length) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction)));
  return sorted[index];
}

function round(value: number, digits = 1): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function formatOptional(value: number | undefined, digits: number): string {
  return value === undefined ? '' : value.toFixed(digits);
}
