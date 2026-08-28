import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderValidationReportMarkdown,
  runValidationScenario,
  type ValidationBaseline,
  type ValidationTier,
} from '@world-forge/validation-core';
import { earthDownstreamMetrics, earthWetlandMetrics } from './downstream-validation/earthMetrics';
import { createEarthDownstreamAdapter, loadEarthDownstreamScenario } from './downstream-validation/earthScenario';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tier = argument('--tier') as ValidationTier ?? 'fast';
if (!['fast', 'standard', 'ultra'].includes(tier)) throw new Error(`Unsupported validation tier: ${tier}`);
const defaults = {
  fast: { width: 256, height: 128, topologyResolution: 64 },
  standard: { width: 1024, height: 512, topologyResolution: 256 },
  ultra: { width: 4096, height: 2048, topologyResolution: 1024 },
}[tier];
const resolution = parseResolution(argument('--resolution') ?? `${defaults.width}x${defaults.height}`);
const topologyResolution = Number(argument('--topology-resolution') ?? defaults.topologyResolution);
const scenario = await loadEarthDownstreamScenario({
  repositoryRoot,
  tier,
  resolution,
  topologyResolution,
  bundleDirectory: argument('--input') ?? undefined,
  wetlandBundleDirectory: argument('--wetland-input') ?? undefined,
});
const baselinePath = path.resolve(
  repositoryRoot,
  argument('--baseline') ?? path.join('refs', 'testing', 'downstream-earth-baselines', `${scenario.id}.json`),
);
const baseline = await loadBaselineIfPresent(baselinePath);
const circulationMoistureOrdering = process.argv.includes('--pressure-wind-corrector')
  ? 'pressure-wind-corrector'
  : 'legacy';
const pressureWindBlend = Number(argument('--pressure-wind-blend') ?? 1);
if (!Number.isFinite(pressureWindBlend) || pressureWindBlend < 0 || pressureWindBlend > 1) {
  throw new Error(`Invalid pressure wind blend: ${pressureWindBlend}`);
}
const normalizeRiverIntensityByTopologyScale = !process.argv.includes('--legacy-river-intensity');
const wetlandHydrologyModel = process.argv.includes('--legacy-wetland-hydrology')
  ? 'legacy' as const
  : 'lowland-floodplain-v1' as const;
const adapter = createEarthDownstreamAdapter({
  circulationMoistureOrdering,
  pressureWindBlend,
  normalizeRiverIntensityByTopologyScale,
  wetlandHydrologyModel,
});
const metrics = scenario.observations.wetlandPercent
  ? [...earthDownstreamMetrics, ...earthWetlandMetrics]
  : earthDownstreamMetrics;
const report = await runValidationScenario(scenario, adapter, metrics, { baseline });
const outputDirectory = path.resolve(
  repositoryRoot,
  argument('--output') ?? path.join('.local', 'validation', 'downstream-earth'),
);
await mkdir(outputDirectory, { recursive: true });
const basename = `${scenario.id}-${report.generatedAt.replace(/[:.]/g, '-')}`;
const jsonPath = path.join(outputDirectory, `${basename}.json`);
const markdownPath = path.join(outputDirectory, `${basename}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, renderValidationReportMarkdown(report));
console.log(`Earth downstream validation: ${report.summary.passed ? 'PASS' : 'FAIL'}`);
for (const metric of report.metrics) {
  console.log(`${metric.id}: ${metric.value.toFixed(4)} ${metric.unit}${metric.thresholdPassed === false ? ' [FAIL]' : ''}`);
}
console.log(`Wall time: ${report.performance.wallMs.toFixed(1)} ms`);
console.log(baseline ? `Compared with ${path.relative(repositoryRoot, baselinePath)}` : 'No matching baseline found; component gates only.');
console.log(`Wrote ${path.relative(repositoryRoot, jsonPath)}`);
console.log(`Wrote ${path.relative(repositoryRoot, markdownPath)}`);

function argument(name: string): string | null {
  const equals = process.argv.find((value) => value.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function parseResolution(value: string): { width: number; height: number } {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) throw new Error(`Invalid resolution: ${value}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

async function loadBaselineIfPresent(filePath: string): Promise<ValidationBaseline | undefined> {
  try {
    await access(filePath);
  } catch {
    return undefined;
  }
  return JSON.parse(await readFile(filePath, 'utf8')) as ValidationBaseline;
}
