import { readFileSync, writeFileSync } from 'node:fs';
import { createDefaultConfig } from '../packages/generator-core/src/index';
import {
  generateProjectWithNativeStages,
  type NativeGenerationStageEvent
} from '../packages/generator-core/src/nativeStagePipeline';

type ExtendedConfig = ReturnType<typeof createDefaultConfig> & { workflowId?: string };

function correctRunnerPatchMarker(): void {
  const patchPath = '/tmp/automation-stage-attribution-biome-0.3.35.py';
  const staleMarker = 'function projectTopologyRiver(';
  const correctMarker = 'function findTopologySeaLevelForOceanTarget(';
  const patch = readFileSync(patchPath, 'utf8');
  const occurrences = patch.split(staleMarker).length - 1;
  if (occurrences === 0) return;
  if (occurrences !== 2) throw new Error(`Expected two stale patch markers, found ${occurrences}`);
  writeFileSync(patchPath, patch.replaceAll(staleMarker, correctMarker));
}

function hashBytes(values: ArrayLike<number>): string {
  let hash = 2166136261;
  for (let index = 0; index < values.length; index += 1) {
    hash ^= Math.round(values[index] * 1_000_000);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

correctRunnerPatchMarker();

const config = createDefaultConfig('stage-attribution-biome-035', { width: 2048, height: 1024 }) as ExtendedConfig;
config.topologyResolution = 128;
config.workflowId = 'core.world-generation-experimental';
config.selectedValues = {
  ...config.selectedValues,
  systemAgeGy: 4.6,
  oceanPercentage: 68,
  averageTemperatureC: 14,
  axialTiltDeg: 23.4,
  orbitalEccentricity: 0.02,
  riverDensity: 1.6,
  oceanTolerancePercentagePoints: 5
};

const completedStages: Array<{ stageId: string; label: string; elapsedMs: number }> = [];
const startedAt = performance.now();
const project = generateProjectWithNativeStages(config, {
  previewResolution: { width: 512, height: 256 },
  onStageEvent: (event: NativeGenerationStageEvent) => {
    if (event.phase === 'completed' && event.elapsedMs !== undefined) {
      completedStages.push({ stageId: event.stageId, label: event.label, elapsedMs: event.elapsedMs });
    }
  }
});
const wallMs = performance.now() - startedAt;
const phases = Object.fromEntries((project.diagnostics?.phases ?? [])
  .filter((phase) => [
    'projection.assembly-node',
    'biomes.cohesion',
    'biomes.diagnostics'
  ].includes(phase.name))
  .map((phase) => [phase.name, phase.ms]));

console.log(JSON.stringify({
  wallMs,
  stages: completedStages,
  phases,
  output: {
    seaLevel: project.primaryWorld.seaLevel,
    riverCount: project.primaryWorld.rivers.length,
    rasterBiomeHash: hashBytes(project.primaryWorld.layers.biomes),
    topologyBiomeHash: hashBytes(project.primaryWorld.topologyLayers.biomes),
    rasterElevationHash: hashBytes(project.primaryWorld.layers.elevation)
  }
}));
