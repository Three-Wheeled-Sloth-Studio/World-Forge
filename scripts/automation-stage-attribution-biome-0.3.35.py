from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count}: {old[:120]!r}")
    file_path.write_text(text.replace(old, new, 1))


def append_before(path: str, marker: str, addition: str) -> None:
    replace_once(path, marker, addition + marker)


replace_once(
    "apps/desktop/src/appVersion.ts",
    "export const APP_VERSION = '0.3.34';",
    "export const APP_VERSION = '0.3.35';"
)

append_before(
    "apps/desktop/src/release/ReleaseNotesModal.tsx",
    "          <section>\n            <p className=\"release-kicker\">Release 0.3.34</p>",
    "          <section>\n"
    "            <p className=\"release-kicker\">Release 0.3.35</p>\n"
    "            <h3>The stopwatch was blaming the telescope</h3>\n"
    "            <ul>\n"
    "              <li>Native stage timing now follows the actual foundation graph instead of waiting for preview frames emitted after the work.</li>\n"
    "              <li>Initial topology, crust, climate, hydrology, and projection work is reported as Initial world foundation rather than System and orbit.</li>\n"
    "              <li>Equirectangular projection reuses one deterministic topology lookup across initial projection, previews, final projection, and biome cleanup.</li>\n"
    "              <li>Biome diagnostics sort their variance sample once instead of rebuilding the same ordered data three times.</li>\n"
    "            </ul>\n"
    "          </section>\n\n"
)

lookup_path = Path("packages/generator-core/src/equirectangularTopologyLookup.ts")
lookup_path.write_text("""import { cubedSphereCellForVector, type CubedSphereTopology } from '@world-forge/shared';

const maxCachedLookups = 2;
const lookupCache = new Map<string, Uint32Array>();

function cacheKey(topology: CubedSphereTopology, width: number, height: number): string {
  return `${topology.kind}:${topology.resolution}:${width}x${height}`;
}

export function equirectangularTopologyLookup(
  topology: CubedSphereTopology,
  requestedWidth: number,
  requestedHeight: number
): Uint32Array {
  const width = Math.max(1, Math.round(requestedWidth));
  const height = Math.max(1, Math.round(requestedHeight));
  const key = cacheKey(topology, width, height);
  const cached = lookupCache.get(key);
  if (cached) {
    lookupCache.delete(key);
    lookupCache.set(key, cached);
    return cached;
  }

  const longitudeCos = new Float64Array(width);
  const longitudeSin = new Float64Array(width);
  for (let x = 0; x < width; x += 1) {
    const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
    longitudeCos[x] = Math.cos(longitude);
    longitudeSin[x] = Math.sin(longitude);
  }

  const cells = new Uint32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
    const cosLatitude = Math.cos(latitude);
    const sinLatitude = Math.sin(latitude);
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 1) {
      cells[rowOffset + x] = cubedSphereCellForVector(
        topology,
        cosLatitude * longitudeCos[x],
        sinLatitude,
        cosLatitude * longitudeSin[x]
      );
    }
  }

  lookupCache.set(key, cells);
  while (lookupCache.size > maxCachedLookups) {
    const oldest = lookupCache.keys().next().value as string | undefined;
    if (!oldest) break;
    lookupCache.delete(oldest);
  }
  return cells;
}

export function clearEquirectangularTopologyLookupCache(): void {
  lookupCache.clear();
}
""")

lookup_test_path = Path("packages/generator-core/src/equirectangularTopologyLookup.test.ts")
lookup_test_path.write_text("""import { beforeEach, describe, expect, it } from 'vitest';
import { buildCubedSphereTopology, cubedSphereCellForLonLat } from '@world-forge/shared';
import {
  clearEquirectangularTopologyLookupCache,
  equirectangularTopologyLookup
} from './equirectangularTopologyLookup';

describe('equirectangular topology lookup', () => {
  beforeEach(() => clearEquirectangularTopologyLookupCache());

  it('matches the prior per-pixel spherical lookup exactly', () => {
    const topology = buildCubedSphereTopology(16);
    const width = 96;
    const height = 48;
    const lookup = equirectangularTopologyLookup(topology, width, height);
    const expected = new Uint32Array(width * height);
    for (let y = 0; y < height; y += 1) {
      const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
      for (let x = 0; x < width; x += 1) {
        const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
        expected[y * width + x] = cubedSphereCellForLonLat(topology, longitude, latitude);
      }
    }
    expect(Array.from(lookup)).toEqual(Array.from(expected));
  });

  it('reuses matching lookups while retaining the main and preview sizes', () => {
    const topology = buildCubedSphereTopology(16);
    const main = equirectangularTopologyLookup(topology, 128, 64);
    const preview = equirectangularTopologyLookup(topology, 64, 32);
    expect(equirectangularTopologyLookup(topology, 128, 64)).toBe(main);
    expect(equirectangularTopologyLookup(topology, 64, 32)).toBe(preview);
  });
});
""")

# Main generator projections and preview rendering use the shared deterministic lookup.
replace_once(
    "packages/generator-core/src/index.ts",
    "  createDefaultConfig,\n  cubedSphereCellForLonLat,\n  defaultParameterRanges,",
    "  createDefaultConfig,\n  defaultParameterRanges,"
)
replace_once(
    "packages/generator-core/src/index.ts",
    "import { orchestratePrimaryWorld } from './primary-world-orchestrator';\n",
    "import { orchestratePrimaryWorld } from './primary-world-orchestrator';\n"
    "import { equirectangularTopologyLookup } from './equirectangularTopologyLookup';\n"
)
replace_once(
    "packages/generator-core/src/index.ts",
    "  const [lowElevation, highElevation] = previewPercentileRange(elevation, 0.02, 0.98);\n"
    "  for (let y = 0; y < height; y += 1) {\n"
    "    const latitude = Math.PI / 2 - ((y + 0.5) / Math.max(1, height)) * Math.PI;\n"
    "    for (let x = 0; x < width; x += 1) {\n"
    "      const longitude = ((x + 0.5) / Math.max(1, width)) * Math.PI * 2 - Math.PI;\n"
    "      const cell = cubedSphereCellForLonLat(topology, longitude, latitude);\n"
    "      const color = previewColorForCell(stage, cell, elevation, lowElevation, highElevation, water, seaLevel, plates, wetness, river, biomes, ice);\n"
    "      const offset = (y * width + x) * 4;\n",
    "  const [lowElevation, highElevation] = previewPercentileRange(elevation, 0.02, 0.98);\n"
    "  const lookup = equirectangularTopologyLookup(topology, width, height);\n"
    "  for (let y = 0; y < height; y += 1) {\n"
    "    for (let x = 0; x < width; x += 1) {\n"
    "      const offset = (y * width + x) * 4;\n"
    "      const cell = lookup[y * width + x];\n"
    "      const color = previewColorForCell(stage, cell, elevation, lowElevation, highElevation, water, seaLevel, plates, wetness, river, biomes, ice);\n"
)
replace_once(
    "packages/generator-core/src/index.ts",
    "  for (let y = 0; y < height; y += 1) {\n"
    "    const latitude = Math.PI / 2 - ((y + 0.5) / Math.max(1, height)) * Math.PI;\n"
    "    for (let x = 0; x < width; x += 1) {\n"
    "      const longitude = ((x + 0.5) / Math.max(1, width)) * Math.PI * 2 - Math.PI;\n"
    "      const topologyCell = cubedSphereCellForLonLat(topology, longitude, latitude);\n"
    "      const index = layerIndex(x, y, width);\n"
    "      elevation[index] = topologyElevation[topologyCell];\n",
    "  const lookup = equirectangularTopologyLookup(topology, width, height);\n"
    "  for (let index = 0; index < lookup.length; index += 1) {\n"
    "      const topologyCell = lookup[index];\n"
    "      elevation[index] = topologyElevation[topologyCell];\n"
)
replace_once(
    "packages/generator-core/src/index.ts",
    "      lakes[index] = topologyLakes[topologyCell];\n"
    "    }\n"
    "  }\n"
    "}\n\nfunction projectTopologyFlowToEquirectangular(",
    "      lakes[index] = topologyLakes[topologyCell];\n"
    "  }\n"
    "}\n\nfunction projectTopologyFlowToEquirectangular("
)
replace_once(
    "packages/generator-core/src/index.ts",
    "  for (let y = 0; y < height; y += 1) {\n"
    "    const latitude = Math.PI / 2 - ((y + 0.5) / Math.max(1, height)) * Math.PI;\n"
    "    for (let x = 0; x < width; x += 1) {\n"
    "      const longitude = ((x + 0.5) / Math.max(1, width)) * Math.PI * 2 - Math.PI;\n"
    "      const topologyCell = cubedSphereCellForLonLat(topology, longitude, latitude);\n"
    "      const index = layerIndex(x, y, width);\n"
    "      windX[index] = topologyWindX[topologyCell];\n",
    "  const lookup = equirectangularTopologyLookup(topology, width, height);\n"
    "  for (let index = 0; index < lookup.length; index += 1) {\n"
    "      const topologyCell = lookup[index];\n"
    "      windX[index] = topologyWindX[topologyCell];\n"
)
replace_once(
    "packages/generator-core/src/index.ts",
    "      currentY[index] = topologyCurrentY[topologyCell];\n"
    "    }\n"
    "  }\n"
    "}\n\nfunction projectTopologyRiver(",
    "      currentY[index] = topologyCurrentY[topologyCell];\n"
    "  }\n"
    "}\n\nfunction projectTopologyRiver("
)

# Final deep-time projection reuses the lookup built during initial projection.
replace_once(
    "packages/generator-core/src/deepTimePipeline.ts",
    "import { traceGenerationPerformance } from './generationPerformanceTrace';\n",
    "import { traceGenerationPerformance } from './generationPerformanceTrace';\n"
    "import { equirectangularTopologyLookup } from './equirectangularTopologyLookup';\n"
)
replace_once(
    "packages/generator-core/src/deepTimePipeline.ts",
    "  const { width, height } = world.mapModel.resolution;\n"
    "  for (let y = 0; y < height; y += 1) {\n"
    "    const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;\n"
    "    for (let x = 0; x < width; x += 1) {\n"
    "      const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;\n"
    "      const cell = cubedSphereCellForLonLat(topology, longitude, latitude);\n"
    "      const index = y * width + x;\n"
    "      target.elevation[index] = source.elevation[cell];\n",
    "  const { width, height } = world.mapModel.resolution;\n"
    "  const lookup = equirectangularTopologyLookup(topology, width, height);\n"
    "  for (let index = 0; index < lookup.length; index += 1) {\n"
    "      const cell = lookup[index];\n"
    "      target.elevation[index] = source.elevation[cell];\n"
)
replace_once(
    "packages/generator-core/src/deepTimePipeline.ts",
    "      target.currentY[index] = 0;\n"
    "    }\n"
    "  }\n"
    "  return width * height;\n"
    "}\n",
    "      target.currentY[index] = 0;\n"
    "  }\n"
    "  return lookup.length;\n"
    "}\n"
)

# Biome cleanup shares the topology and cached raster lookup.
replace_once(
    "packages/generator-core/src/biomeCohesion.ts",
    "  cubedSphereCellForLonLat,\n  type Biome,\n  type WorldProject",
    "  type Biome,\n  type CubedSphereTopology,\n  type WorldProject"
)
replace_once(
    "packages/generator-core/src/biomeCohesion.ts",
    "} from '@world-forge/shared';\n",
    "} from '@world-forge/shared';\n"
    "import { equirectangularTopologyLookup } from './equirectangularTopologyLookup';\n"
)
replace_once(
    "packages/generator-core/src/biomeCohesion.ts",
    "function projectBiomeLayer(project: WorldProject): void {\n"
    "  const world = project.primaryWorld;\n"
    "  const topology = buildCubedSphereTopology(world.topology.resolution);\n"
    "  const { width, height } = world.mapModel.resolution;\n"
    "  for (let y = 0; y < height; y += 1) {\n"
    "    const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;\n"
    "    for (let x = 0; x < width; x += 1) {\n"
    "      const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;\n"
    "      const cell = cubedSphereCellForLonLat(topology, longitude, latitude);\n"
    "      world.layers.biomes[y * width + x] = world.topologyLayers.biomes[cell];\n"
    "    }\n"
    "  }\n"
    "}\n",
    "export function projectBiomeLayer(\n"
    "  project: WorldProject,\n"
    "  topology: CubedSphereTopology = buildCubedSphereTopology(project.primaryWorld.topology.resolution)\n"
    "): void {\n"
    "  const world = project.primaryWorld;\n"
    "  const { width, height } = world.mapModel.resolution;\n"
    "  const lookup = equirectangularTopologyLookup(topology, width, height);\n"
    "  for (let index = 0; index < lookup.length; index += 1) {\n"
    "    world.layers.biomes[index] = world.topologyLayers.biomes[lookup[index]];\n"
    "  }\n"
    "}\n"
)
replace_once(
    "packages/generator-core/src/biomeCohesion.ts",
    "export function applyBiomeCohesion(project: WorldProject): number {\n"
    "  const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);",
    "export function applyBiomeCohesion(\n"
    "  project: WorldProject,\n"
    "  topology: CubedSphereTopology = buildCubedSphereTopology(project.primaryWorld.topology.resolution)\n"
    "): number {"
)
replace_once(
    "packages/generator-core/src/biomeCohesion.ts",
    "  if (reassigned > 0) projectBiomeLayer(project);",
    "  if (reassigned > 0) projectBiomeLayer(project, topology);"
)

# Biome diagnostics reuse topology and sort their variance sample once.
replace_once(
    "packages/generator-core/src/biomeDiagnostics.ts",
    "  type Biome,\n  type WorldProject",
    "  type Biome,\n  type CubedSphereTopology,\n  type WorldProject"
)
replace_once(
    "packages/generator-core/src/biomeDiagnostics.ts",
    "function percentile(values: number[], fraction: number): number {\n"
    "  if (!values.length) return 0;\n"
    "  const sorted = [...values].sort((a, b) => a - b);\n"
    "  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction)));\n"
    "  return sorted[index];\n"
    "}",
    "function percentileFromSorted(sorted: readonly number[], fraction: number): number {\n"
    "  if (!sorted.length) return 0;\n"
    "  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction)));\n"
    "  return sorted[index];\n"
    "}"
)
replace_once(
    "packages/generator-core/src/biomeDiagnostics.ts",
    "export function attachBiomeDiagnostics(project: WorldProject): BiomeDiagnostics {\n"
    "  const world = project.primaryWorld;\n"
    "  const topology = buildCubedSphereTopology(world.topology.resolution);",
    "export function attachBiomeDiagnostics(\n"
    "  project: WorldProject,\n"
    "  topology: CubedSphereTopology = buildCubedSphereTopology(project.primaryWorld.topology.resolution)\n"
    "): BiomeDiagnostics {\n"
    "  const world = project.primaryWorld;"
)
replace_once(
    "packages/generator-core/src/biomeDiagnostics.ts",
    "  const lowVarianceCutoff = percentile(varianceValues, 0.25);\n"
    "  const highVarianceCutoff = percentile(varianceValues, 0.75);",
    "  const sortedVarianceValues = [...varianceValues].sort((left, right) => left - right);\n"
    "  const lowVarianceCutoff = percentileFromSorted(sortedVarianceValues, 0.25);\n"
    "  const highVarianceCutoff = percentileFromSorted(sortedVarianceValues, 0.75);"
)
replace_once(
    "packages/generator-core/src/biomeDiagnostics.ts",
    "    p90TemperatureVarianceProxyC: round(percentile(varianceValues, 0.9), 3),",
    "    p90TemperatureVarianceProxyC: round(percentileFromSorted(sortedVarianceValues, 0.9), 3),"
)

# Native stage boundaries now follow graph execution instead of post-hoc previews.
replace_once(
    "packages/generator-core/src/nativeStagePipeline.ts",
    "import type { GenerationConfig, WorldProject } from '@world-forge/shared';",
    "import { buildCubedSphereTopology, type GenerationConfig, type WorldProject } from '@world-forge/shared';"
)
replace_once(
    "packages/generator-core/src/nativeStagePipeline.ts",
    "import type { GenerationPreviewFrame, GenerateProjectOptions } from './index';\n",
    "import type { GenerationPreviewFrame, GenerateProjectOptions } from './index';\n"
    "import type { GenerationGraphNodeRunEvent } from './graph/types';\n"
    "import { topologyConstructionNodeId } from './graph/nodes/topology-construction-node';\n"
    "import { primordialTerrainNodeId } from './graph/nodes/primordial-terrain-node';\n"
    "import { plateConstructionNodeId } from './graph/nodes/plate-construction-node';\n"
    "import { crustFieldsNodeId } from './graph/nodes/crust-fields-node';\n"
    "import { topologyElevationNodeId } from './graph/nodes/topology-elevation-node';\n"
    "import { terrainFinalizationNodeId } from './graph/nodes/terrain-finalization-node';\n"
    "import { waterGeologyNodeId } from './graph/nodes/water-geology-node';\n"
    "import { climateGlaciationNodeId } from './graph/nodes/climate-glaciation-node';\n"
    "import { hydrologyBiomesNodeId } from './graph/nodes/hydrology-biomes-node';\n"
    "import { projectionAssemblyNodeId } from './graph/nodes/projection-assembly-node';\n"
)
replace_once(
    "packages/generator-core/src/nativeStagePipeline.ts",
    "  'world.initial-terrain': 'Initial terrain',",
    "  'world.initial-terrain': 'Initial world foundation',"
)
append_before(
    "packages/generator-core/src/nativeStagePipeline.ts",
    "function nowMs(): number {",
    "type FoundationStageBoundary = {\n"
    "  stageId: NativeGenerationStageId;\n"
    "  stageProgress: number;\n"
    "  overallProgress: number;\n"
    "  message: string;\n"
    "};\n\n"
    "const foundationStageBoundaryByNodeId = new Map<string, FoundationStageBoundary>([\n"
    "  [topologyConstructionNodeId, { stageId: 'world.primordial-crust', stageProgress: 0.08, overallProgress: 0.02, message: 'Building spherical topology' }],\n"
    "  [primordialTerrainNodeId, { stageId: 'world.primordial-crust', stageProgress: 0.72, overallProgress: 0.08, message: 'Building primordial crust' }],\n"
    "  [plateConstructionNodeId, { stageId: 'world.tectonics-cratons', stageProgress: 0.18, overallProgress: 0.12, message: 'Constructing plates' }],\n"
    "  [crustFieldsNodeId, { stageId: 'world.tectonics-cratons', stageProgress: 0.72, overallProgress: 0.19, message: 'Resolving crust fields' }],\n"
    "  [topologyElevationNodeId, { stageId: 'world.initial-terrain', stageProgress: 0.1, overallProgress: 0.22, message: 'Building initial elevation' }],\n"
    "  [terrainFinalizationNodeId, { stageId: 'world.initial-terrain', stageProgress: 0.28, overallProgress: 0.3, message: 'Finalizing the initial terrain surface' }],\n"
    "  [waterGeologyNodeId, { stageId: 'world.initial-terrain', stageProgress: 0.42, overallProgress: 0.35, message: 'Building initial water and geology' }],\n"
    "  [climateGlaciationNodeId, { stageId: 'world.initial-terrain', stageProgress: 0.58, overallProgress: 0.39, message: 'Building initial climate and ice' }],\n"
    "  [hydrologyBiomesNodeId, { stageId: 'world.initial-terrain', stageProgress: 0.76, overallProgress: 0.43, message: 'Building initial hydrology and biomes' }],\n"
    "  [projectionAssemblyNodeId, { stageId: 'world.initial-terrain', stageProgress: 0.92, overallProgress: 0.47, message: 'Projecting the initial world foundation' }]\n"
    "]);\n\n"
)
replace_once(
    "packages/generator-core/src/nativeStagePipeline.ts",
    "  const { onStageEvent, onProgress: originalProgress, ...coreOptions } = options;",
    "  const { onStageEvent, onProgress: originalProgress, onGraphNodeEvent: originalGraphNodeEvent, ...coreOptions } = options;"
)
replace_once(
    "packages/generator-core/src/nativeStagePipeline.ts",
    "    if (targetIndex < activeIndex) {\n"
    "      emit(activeStageId, 'progress', 0.5, overallProgress, message);\n"
    "      return;\n"
    "    }",
    "    if (targetIndex < activeIndex) return;"
)
append_before(
    "packages/generator-core/src/nativeStagePipeline.ts",
    "  emit(activeStageId, 'started', 0, 0, 'Resolving generation configuration, stellar system, orbit, and selected values');",
    "  const observeFoundationNode = (event: GenerationGraphNodeRunEvent) => {\n"
    "    const boundary = foundationStageBoundaryByNodeId.get(event.nodeId);\n"
    "    if (boundary && event.phase === 'started') {\n"
    "      transitionTo(boundary.stageId, boundary.overallProgress, boundary.message);\n"
    "      emit(activeStageId, 'progress', boundary.stageProgress, boundary.overallProgress, boundary.message);\n"
    "    } else if (boundary && event.phase === 'completed' && activeStageId === boundary.stageId) {\n"
    "      emit(activeStageId, 'progress', Math.min(0.98, boundary.stageProgress + 0.08), boundary.overallProgress, boundary.message);\n"
    "    }\n"
    "    originalGraphNodeEvent?.(event);\n"
    "  };\n\n"
)
replace_once(
    "packages/generator-core/src/nativeStagePipeline.ts",
    "      ...coreOptions,\n      onProgress: (preview) => {\n        const stageId = previewStageId(preview);\n        transitionTo(stageId, Math.min(0.47, stageOverallStart[stageId]), preview.label);\n        const stageProgress = stageId === 'world.initial-terrain'\n          ? Math.max(0.02, Math.min(0.98, preview.progress / 0.94))\n          : preview.stage === 'primordial' ? 0.7 : 0.75;\n        emit(activeStageId, 'progress', stageProgress, Math.min(0.47, preview.progress * 0.5), preview.label);\n        originalProgress?.(preview);\n      }",
    "      ...coreOptions,\n      onGraphNodeEvent: observeFoundationNode,\n      onProgress: (preview) => {\n        const stageId = previewStageId(preview);\n        const targetIndex = nativeGenerationStageIds.indexOf(stageId);\n        if (targetIndex >= activeIndex) {\n          transitionTo(stageId, Math.min(0.47, stageOverallStart[stageId]), preview.label);\n          const stageProgress = stageId === 'world.initial-terrain'\n            ? Math.max(0.02, Math.min(0.98, preview.progress / 0.94))\n            : preview.stage === 'primordial' ? 0.7 : 0.75;\n          emit(activeStageId, 'progress', stageProgress, Math.min(0.47, preview.progress * 0.5), preview.label);\n        }\n        originalProgress?.(preview);\n      }"
)
replace_once(
    "packages/generator-core/src/nativeStagePipeline.ts",
    "    applyBiomeCohesion(project);\n    attachBiomeDiagnostics(project);\n    completedProject = project;",
    "    const biomeTopology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);\n"
    "    const cohesionStartedAt = nowMs();\n"
    "    applyBiomeCohesion(project, biomeTopology);\n"
    "    const cohesionCompletedAt = nowMs();\n"
    "    attachBiomeDiagnostics(project, biomeTopology);\n"
    "    const diagnosticsCompletedAt = nowMs();\n"
    "    if (project.diagnostics) {\n"
    "      const cohesionMs = Math.max(0, cohesionCompletedAt - cohesionStartedAt);\n"
    "      const diagnosticsMs = Math.max(0, diagnosticsCompletedAt - cohesionCompletedAt);\n"
    "      project.diagnostics.phases.push({ name: 'biomes.cohesion', ms: Number(cohesionMs.toFixed(3)) });\n"
    "      project.diagnostics.phases.push({ name: 'biomes.diagnostics', ms: Number(diagnosticsMs.toFixed(3)) });\n"
    "      project.diagnostics.totalMs = Number((project.diagnostics.totalMs + cohesionMs + diagnosticsMs).toFixed(3));\n"
    "    }\n"
    "    completedProject = project;"
)

# Assert graph-driven stage boundaries in the existing native telemetry suite.
append_before(
    "packages/generator-core/src/nativeStagePipeline.test.ts",
    "  it('keeps world output deterministic when telemetry is enabled', () => {",
    "  it('moves foundation stages at graph start rather than after post-hoc previews', () => {\n"
    "    const trace: string[] = [];\n"
    "    generateProjectWithNativeStages(testConfig('native-stage-graph-boundaries'), {\n"
    "      onStageEvent: (event) => {\n"
    "        if (event.phase === 'started' || event.phase === 'completed') trace.push(`stage:${event.phase}:${event.stageId}`);\n"
    "      },\n"
    "      onGraphNodeEvent: (event) => {\n"
    "        if (event.phase === 'started') trace.push(`node:${event.nodeId}`);\n"
    "      }\n"
    "    });\n\n"
    "    const expectStageBeforeNode = (stageId: string, nodeId: string) => {\n"
    "      expect(trace.indexOf(`stage:started:${stageId}`)).toBeGreaterThanOrEqual(0);\n"
    "      expect(trace.indexOf(`stage:started:${stageId}`)).toBeLessThan(trace.indexOf(`node:${nodeId}`));\n"
    "    };\n"
    "    expect(trace.indexOf('stage:completed:world.system-orbit')).toBeLessThan(trace.indexOf('node:topology.construct'));\n"
    "    expectStageBeforeNode('world.primordial-crust', 'topology.construct');\n"
    "    expectStageBeforeNode('world.tectonics-cratons', 'plates.construct');\n"
    "    expectStageBeforeNode('world.initial-terrain', 'terrain.topology-elevation');\n"
    "  });\n\n"
)

print('Applied World Forge 0.3.35 stage attribution and projection lookup slice')
