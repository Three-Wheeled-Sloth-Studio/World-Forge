import { readFileSync, writeFileSync } from 'node:fs';
import { createDefaultConfig } from '../packages/generator-core/src/index';
import {
  generateProjectWithNativeStages,
  type NativeGenerationStageEvent
} from '../packages/generator-core/src/nativeStagePipeline';

type ExtendedConfig = ReturnType<typeof createDefaultConfig> & { workflowId?: string };

function correctRunnerPatchMarkers(): void {
  const patchPath = '/tmp/automation-stage-attribution-biome-0.3.35.py';
  let patch = readFileSync(patchPath, 'utf8');

  const staleFunctionMarker = 'function projectTopologyRiver(';
  const functionMarkerOccurrences = patch.split(staleFunctionMarker).length - 1;
  if (functionMarkerOccurrences !== 0) {
    if (functionMarkerOccurrences !== 2) throw new Error(`Expected two stale function markers, found ${functionMarkerOccurrences}`);
    patch = patch.replaceAll(staleFunctionMarker, 'function findTopologySeaLevelForOceanTarget(');
  }

  const staleDeepTimeMarker = '    "  const { width, height } = world.mapModel.resolution;\\n"\n    "  for (let y = 0; y < height; y += 1) {\\n"';
  const deepTimeMarkerOccurrences = patch.split(staleDeepTimeMarker).length - 1;
  if (deepTimeMarkerOccurrences !== 0) {
    if (deepTimeMarkerOccurrences !== 2) throw new Error(`Expected two deep-time markers, found ${deepTimeMarkerOccurrences}`);
    patch = patch.replaceAll(
      staleDeepTimeMarker,
      '    "  const { width, height } = world.mapModel.resolution;\\n"\n    "\\n"\n    "  for (let y = 0; y < height; y += 1) {\\n"'
    );
  }

  const originalHelper = `def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count}: {old[:120]!r}")
    file_path.write_text(text.replace(old, new, 1))
`;
  const fallbackHelper = `def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count == 1:
        file_path.write_text(text.replace(old, new, 1))
        return
    if path == "packages/generator-core/src/biomeCohesion.ts" and old.startswith("function projectBiomeLayer"):
        import re
        pattern = r"function projectBiomeLayer\\(project: WorldProject\\): void \\{.*?\\n\\}\\n\\n(?=function summarizeCollapsed)"
        updated, replacements = re.subn(pattern, new.rstrip() + "\\n\\n", text, count=1, flags=re.S)
        if replacements == 1:
            file_path.write_text(updated)
            return
    raise RuntimeError(f"Expected one match in {path}, found {count}: {old[:120]!r}")
`;
  const helperOccurrences = patch.split(originalHelper).length - 1;
  if (helperOccurrences !== 1) throw new Error(`Expected one patch helper, found ${helperOccurrences}`);
  patch = patch.replace(originalHelper, fallbackHelper);

  writeFileSync(patchPath, patch);
}

function hashBytes(values: ArrayLike<number>): string {
  let hash = 2166136261;
  for (let index = 0; index < values.length; index += 1) {
    hash ^= Math.round(values[index] * 1_000_000);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

correctRunnerPatchMarkers();

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
