import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDefaultConfig } from '../packages/generator-core/src/index';
import { generateProjectWithMotionAwareDeepTime } from '../packages/generator-core/src/plateMotionPipeline';
import {
  generationWorkflowDescriptor,
  generationWorkflowIds,
  type GenerationWorkflowId
} from '../packages/generator-core/src/workflows';
import { generationGraphWorkflow } from '../packages/generation-runtime/src/graph/generationWorkflows';
import type { GenerationConfig, WorldProject } from '@world-forge/shared';

type Resolution = { width: number; height: number };
type WorkflowConfig = GenerationConfig & { workflowId: GenerationWorkflowId };
type MemorySnapshot = { rssMb: number; heapUsedMb: number; heapTotalMb: number };
type WorkflowResult = {
  pairId: string;
  runIndex: number;
  seed: string;
  workflowId: GenerationWorkflowId;
  workflowVersion: string;
  workflowContractSignature: string;
  sourceCommit: string;
  resolution: string;
  topologyCells: number;
  measuredWallMs: number;
  reportedTotalMs: number;
  memoryBefore: MemorySnapshot;
  memoryAfter: MemorySnapshot;
  outputSignature: string;
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
  seed: string;
  baselineWorkflowId: GenerationWorkflowId;
  candidateWorkflowId: GenerationWorkflowId;
  baselineMs: number;
  candidateMs: number;
  runtimeDeltaMs: number;
  runtimeDeltaPercent: number;
  signaturesEqual: boolean;
};
type WorkflowComparisonReport = {
  format: 'world-forge-workflow-comparison';
  version: 1;
  generatedAt: string;
  environment: {
    node: string;
    platform: string;
    arch: string;
    sourceCommit: string;
  };
  options: {
    seeds: string[];
    workflows: [GenerationWorkflowId, GenerationWorkflowId];
    resolution: string;
    runs: number;
  };
  results: WorkflowResult[];
  comparisons: PairComparison[];
};

const args = parseArgs(process.argv.slice(2));
const sourceCommit = process.env.GITHUB_SHA || process.env.SOURCE_COMMIT || args.sourceCommit || 'unknown';
const results: WorkflowResult[] = [];

for (const seed of args.seeds) {
  for (let runIndex = 0; runIndex < args.runs; runIndex += 1) {
    const pairId = `${seed}-${formatResolution(args.resolution)}-run${runIndex + 1}`;
    for (const workflowId of args.workflows) {
      results.push(runWorkflow(pairId, seed, runIndex, workflowId, sourceCommit, args.resolution));
      const current = results[results.length - 1];
      console.log(`${current.pairId} ${current.workflowId}: ${current.reportedTotalMs.toFixed(1)} ms`);
    }
  }
}

const comparisons = comparePairs(results, args.workflows[0], args.workflows[1]);
const report: WorkflowComparisonReport = {
  format: 'world-forge-workflow-comparison',
  version: 1,
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    sourceCommit
  },
  options: {
    seeds: args.seeds,
    workflows: args.workflows,
    resolution: formatResolution(args.resolution),
    runs: args.runs
  },
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
  workflows: [GenerationWorkflowId, GenerationWorkflowId];
  resolution: Resolution;
  runs: number;
  sourceCommit?: string;
} {
  const value = (name: string) => argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const seeds = split(value('seeds')) ?? ['1001001', '3141592', '8675309'];
  const workflowValues = split(value('workflows')) ?? [...generationWorkflowIds];
  if (workflowValues.length !== 2) throw new Error('Workflow comparison requires exactly two workflow IDs.');
  const workflows = workflowValues.map((id) => generationWorkflowDescriptor(id).id) as [GenerationWorkflowId, GenerationWorkflowId];
  if (workflows[0] === workflows[1]) throw new Error('Workflow comparison requires two distinct workflow IDs.');
  return {
    seeds,
    workflows,
    resolution: parseResolution(value('resolution') ?? '512x256'),
    runs: Math.max(1, Math.round(Number(value('runs') ?? '1'))),
    sourceCommit: value('source-commit')
  };
}

function runWorkflow(
  pairId: string,
  seed: string,
  runIndex: number,
  workflowId: GenerationWorkflowId,
  sourceCommit: string,
  resolution: Resolution
): WorkflowResult {
  const workflow = generationWorkflowDescriptor(workflowId);
  const config = createDefaultConfig(seed, resolution) as WorkflowConfig;
  config.workflowId = workflowId;
  const memoryBefore = memorySnapshot();
  const started = performance.now();
  const project = generateProjectWithMotionAwareDeepTime(config, {
    appVersion: 'workflow-comparison',
    sourceCommit
  });
  const measuredWallMs = performance.now() - started;
  return {
    pairId,
    runIndex,
    seed,
    workflowId,
    workflowVersion: workflow.version,
    workflowContractSignature: workflowContractSignature(workflowId),
    sourceCommit,
    resolution: formatResolution(resolution),
    topologyCells: project.primaryWorld.topology.cellCount,
    measuredWallMs: round(measuredWallMs),
    reportedTotalMs: round(project.diagnostics?.totalMs ?? measuredWallMs),
    memoryBefore,
    memoryAfter: memorySnapshot(),
    outputSignature: outputSignature(project),
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
    return {
      pairId,
      seed: baseline.seed,
      baselineWorkflowId,
      candidateWorkflowId,
      baselineMs: baseline.reportedTotalMs,
      candidateMs: candidate.reportedTotalMs,
      runtimeDeltaMs: round(runtimeDeltaMs),
      runtimeDeltaPercent: round((runtimeDeltaMs / Math.max(0.001, baseline.reportedTotalMs)) * 100),
      signaturesEqual: baseline.outputSignature === candidate.outputSignature
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
  return [
    '# Generation Workflow Comparison',
    '',
    `Generated: ${report.generatedAt}`,
    `Source commit: ${report.environment.sourceCommit}`,
    `Workflows: ${report.options.workflows.join(' versus ')}`,
    `Seeds: ${report.options.seeds.join(', ')}`,
    `Resolution: ${report.options.resolution}`,
    '',
    '| Pair | Baseline ms | Candidate ms | Delta ms | Delta % | Same signature |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    ...report.comparisons.map((comparison) => `| ${comparison.pairId} | ${comparison.baselineMs.toFixed(1)} | ${comparison.candidateMs.toFixed(1)} | ${comparison.runtimeDeltaMs.toFixed(1)} | ${comparison.runtimeDeltaPercent.toFixed(2)}% | ${comparison.signaturesEqual ? 'yes' : 'no'} |`),
    '',
    'The workflows run sequentially with the same seed and resolved configuration. Workflow and implementation identities are provenance and do not alter semantic stage seed streams.',
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

function round(value: number, places = 3): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
