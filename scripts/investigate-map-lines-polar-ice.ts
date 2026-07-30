import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import {
  biomeNames,
  buildCubedSphereTopology,
  codeToBiome,
  cubedSphereCellForLonLat,
  parameterControlBounds,
  type Biome,
  type CubedSphereTopology,
  type GenerationConfig,
  type ParameterRanges,
  type PrimaryWorld,
  type WorldProject
} from '@world-forge/shared';
import { createDefaultConfig, type TerrainDiagnosticSnapshot } from '../packages/generator-core/src/index';
import { generateProjectWithNativeStages } from '../packages/generator-core/src/nativeStagePipeline';
import { prepareSystemOrbitConfig, reconcileSystemOrbitPresets } from '../packages/generator-core/src/systemOrbitPreset';
import {
  setGenerationPerformanceTraceSink,
  type GenerationPerformanceTraceRecord
} from '../packages/generator-core/src/generationPerformanceTrace';

type ReproductionCase = {
  starSeed: string;
  worldSeed: string;
  preset: 'Earthlike' | 'Archipelago' | 'Random World';
};

type PathJump = {
  riverId: string;
  pathIndex: number;
  sourceCell: number;
  destinationCell: number;
  sourceFace: number;
  destinationFace: number;
  sourceRaster: [number, number];
  destinationRaster: [number, number];
  sourceLongitudeDeg: number;
  sourceLatitudeDeg: number;
  destinationLongitudeDeg: number;
  destinationLatitudeDeg: number;
  topologyNeighbors: boolean;
  faceSeam: boolean;
  horizontalWrap: boolean;
  rasterDistance: number;
};

type LatitudeBand = {
  minimumLatitudeDeg: number;
  maximumLatitudeDeg: number;
  cells: number;
  landCells: number;
  waterCells: number;
  meanTemperatureC: number;
  iceShare: number;
  landIceShare: number;
  waterIceShare: number;
};

type CaseReport = {
  seed: string;
  preset: string;
  run: number;
  generationMs: number;
  deterministicSignature: string;
  sourceCommit?: string;
  selectedValues: Record<string, number | string>;
  riverDiagnostics: {
    riverCount: number;
    topologySegments: number;
    invalidTopologyJumps: number;
    seamSegments: number;
    projectedWrapSegments: number;
    longProjectedNeighborSegments: number;
    suspiciousSegments: PathJump[];
  };
  iceDiagnostics: {
    totalIceShare: number;
    landIceShare: number;
    waterIceShare: number;
    northPolarIceShare: number;
    southPolarIceShare: number;
    topologyProjectionMismatchShare: number;
    latitudeBands: LatitudeBand[];
  };
  biomeCounts: Partial<Record<Biome, number>>;
  graphNodeTimings: Array<{ name: string; ms: number }>;
  phaseTimings: Array<{ name: string; ms: number }>;
  performanceTrace?: Array<GenerationPerformanceTraceRecord & { invocationCount: number }>;
};

const defaultCases: ReproductionCase[] = [
  { starSeed: '1001001', worldSeed: '1001001', preset: 'Earthlike' },
  { starSeed: '1001001', worldSeed: '1001001', preset: 'Archipelago' },
  { starSeed: '1001001', worldSeed: '1001001', preset: 'Random World' },
  { starSeed: '5336649', worldSeed: '5336649', preset: 'Earthlike' },
  { starSeed: '5336649', worldSeed: '5336649', preset: 'Archipelago' }
];
const requestedCase = readOption('case');
const cases = requestedCase ? [parseCase(requestedCase)] : defaultCases;
const requestedResolution = readOption('resolution');
const outputResolution = requestedResolution ? parseResolution(requestedResolution) : { width: 512, height: 256 };
const topologyResolution = Number(readOption('topology') ?? 64);
const outputRoot = readOption('output') ?? 'map-lines-polar-ice';
const measuredRuns = positiveIntegerOption('runs', 1);
const warmupRuns = nonNegativeIntegerOption('warmups', 0);
const skipImages = process.argv.includes('--skip-images');
const profileGeneration = process.argv.includes('--profile');

const outputDir = join('refs', 'testing', outputRoot);
mkdirSync(outputDir, { recursive: true });
const reports: CaseReport[] = [];

for (const item of cases) {
  const totalRuns = warmupRuns + measuredRuns;
  for (let runIndex = 0; runIndex < totalRuns; runIndex += 1) {
    const warmup = runIndex < warmupRuns;
    const measuredRun = runIndex - warmupRuns + 1;
    const startedAt = performance.now();
    const config = reproductionConfig(item);
    const terrainSnapshots: TerrainDiagnosticSnapshot[] = [];
    const performanceTrace: GenerationPerformanceTraceRecord[] = [];
    setGenerationPerformanceTraceSink(profileGeneration ? (record) => performanceTrace.push(record) : undefined);
    console.log(
      `Generating ${item.starSeed}/${item.worldSeed} ${item.preset} `
      + `${warmup ? `warm-up ${runIndex + 1}/${warmupRuns}` : `measured ${measuredRun}/${measuredRuns}`}...`
    );
    let generatedProject: ReturnType<typeof generateProjectWithNativeStages>;
    try {
      generatedProject = generateProjectWithNativeStages(config, {
        appVersion: 'map-lines-polar-ice-investigation',
        onTerrainDiagnosticSnapshot: skipImages ? undefined : (snapshot) => terrainSnapshots.push(snapshot)
      });
    } finally {
      setGenerationPerformanceTraceSink(undefined);
    }
    const project = reconcileSystemOrbitPresets(generatedProject);
    const generationMs = performance.now() - startedAt;
    if (warmup) {
      console.log(`Warm-up completed in ${generationMs.toFixed(1)} ms.`);
      continue;
    }
    const baseSlug = `${item.starSeed}-${item.worldSeed}-${item.preset.toLowerCase().replaceAll(' ', '-')}`;
    const slug = measuredRuns > 1 ? `${baseSlug}-run${measuredRun}` : baseSlug;
    if (!skipImages) writeLayerImages(project, slug, terrainSnapshots);
    const report = summarizeCase(project, item, measuredRun, generationMs);
    if (profileGeneration) report.performanceTrace = aggregatePerformanceTrace(performanceTrace);
    reports.push(report);
    writeFileSync(join(outputDir, `${slug}.json`), `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      `${slug}: ${generationMs.toFixed(1)} ms, `
      + `${report.riverDiagnostics.invalidTopologyJumps} invalid topology jumps, `
      + `${report.riverDiagnostics.longProjectedNeighborSegments} long projected neighbor spans, `
      + `${(report.iceDiagnostics.northPolarIceShare * 100).toFixed(1)}% north / `
      + `${(report.iceDiagnostics.southPolarIceShare * 100).toFixed(1)}% south polar ice`
    );
  }
}

writeFileSync(join(outputDir, 'baseline-report.json'), `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  workflowId: 'core.performance-foundation',
  resolution: outputResolution,
  topologyResolution,
  warmupRuns,
  measuredRuns,
  medianGenerationMs: median(reports.map((report) => report.generationMs)),
  deterministicSignatures: [...new Set(reports.map((report) => report.deterministicSignature))],
  reports
}, null, 2)}\n`);

function reproductionConfig(item: ReproductionCase): GenerationConfig {
  const config = createDefaultConfig(item.worldSeed, outputResolution) as GenerationConfig & {
    workflowId?: string;
    seeds?: { star?: string; world?: string };
    starPresetId?: string;
    worldPresetId?: string;
  };
  config.seed = item.worldSeed;
  config.seeds = { star: item.starSeed, world: item.worldSeed };
  config.starPresetId = 'sol-like';
  config.worldPresetId = item.preset;
  config.parameterRanges = reproductionPresetRanges(item.preset);
  config.selectedValues = { oceanTolerancePercentagePoints: item.preset === 'Random World' ? 12 : 5 };
  config.outputResolution = outputResolution;
  config.topologyResolution = topologyResolution;
  config.workflowId = 'core.performance-foundation';
  return prepareSystemOrbitConfig(config);
}

function reproductionPresetRanges(preset: ReproductionCase['preset']): ParameterRanges {
  const habitableRanges: ParameterRanges = {
    systemAgeGy: { min: 2.5, max: 7.5, unit: 'Gy' },
    oceanPercentage: { min: 45, max: 72, unit: '%' },
    averageTemperatureC: { min: 10, max: 22, unit: 'C' },
    aridity: { min: 0.35, max: 0.65 },
    seaLevel: { min: -0.08, max: 0.08 },
    axialTiltDeg: { min: 10, max: 32, unit: 'deg' },
    orbitalEccentricity: { min: 0, max: 0.08 },
    sizeClass: { min: 0.85, max: 1.15 },
    moonCount: { min: 0, max: 3 },
    impactFrequency: { min: 0.6, max: 1.4 },
    plateCount: { min: 16, max: 28 },
    riverDensity: { min: 1.2, max: 2.2 },
    continentCount: { min: 3, max: 7 },
    continentScale: { min: 0.45, max: 0.65 },
    islandDensity: { min: 0.25, max: 0.55 }
  };
  if (preset === 'Random World') return parameterControlBounds;
  if (preset === 'Archipelago') {
    return {
      ...habitableRanges,
      oceanPercentage: { min: 64, max: 78, unit: '%' },
      continentCount: { min: 5, max: 10 },
      continentScale: { min: 0.16, max: 0.34 },
      islandDensity: { min: 0.7, max: 1 },
      riverDensity: { min: 0.8, max: 1.8 }
    };
  }
  return {
    ...habitableRanges,
    oceanPercentage: { min: 58, max: 72, unit: '%' },
    aridity: { min: 0.35, max: 0.6 },
    continentCount: { min: 4, max: 7 },
    continentScale: { min: 0.5, max: 0.68 },
    islandDensity: { min: 0.25, max: 0.5 },
    riverDensity: { min: 1.5, max: 2.4 }
  };
}

function summarizeCase(project: WorldProject, item: ReproductionCase, run: number, generationMs: number): CaseReport {
  const world = project.primaryWorld;
  const topology = buildCubedSphereTopology(world.topology.resolution);
  const riverDiagnostics = summarizeRiverPaths(world, topology);
  const iceDiagnostics = summarizeIce(world, topology);
  const biomeCounts: Partial<Record<Biome, number>> = {};
  for (const biome of biomeNames) biomeCounts[biome] = 0;
  for (const code of world.layers.biomes) {
    const biome = codeToBiome(code);
    biomeCounts[biome] = (biomeCounts[biome] ?? 0) + 1;
  }
  return {
    seed: `${item.starSeed}:${item.worldSeed}`,
    preset: item.preset,
    run,
    generationMs: round(generationMs, 2),
    deterministicSignature: projectSignature(project),
    sourceCommit: project.sourceCommit,
    selectedValues: Object.fromEntries(
      Object.entries(project.selectedValues)
        .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    ),
    riverDiagnostics,
    iceDiagnostics,
    biomeCounts,
    graphNodeTimings: [...(project.diagnostics?.graph?.nodes ?? [])]
      .map((node) => ({ name: node.nodeId, ms: round(node.durationMs, 3) }))
      .sort((left, right) => right.ms - left.ms),
    phaseTimings: [...(project.diagnostics?.phases ?? [])]
      .map((phase) => ({ name: phase.name, ms: round(phase.ms, 3) }))
      .sort((left, right) => right.ms - left.ms)
  };
}

function projectSignature(project: WorldProject): string {
  const hash = createHash('sha256');
  const world = project.primaryWorld;
  for (const layer of [
    world.topologyLayers.elevation,
    world.topologyLayers.water,
    world.topologyLayers.biomes,
    world.topologyLayers.ice,
    world.layers.elevation,
    world.layers.water,
    world.layers.biomes,
    world.layers.ice
  ]) {
    hash.update(Buffer.from(layer.buffer, layer.byteOffset, layer.byteLength));
  }
  return hash.digest('hex');
}

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function positiveIntegerOption(name: string, fallback: number): number {
  const value = Number(readOption(name) ?? fallback);
  if (!Number.isInteger(value) || value < 1) throw new Error(`--${name} must be a positive integer.`);
  return value;
}

function nonNegativeIntegerOption(name: string, fallback: number): number {
  const value = Number(readOption(name) ?? fallback);
  if (!Number.isInteger(value) || value < 0) throw new Error(`--${name} must be a non-negative integer.`);
  return value;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, 2);
}

function aggregatePerformanceTrace(
  records: GenerationPerformanceTraceRecord[]
): Array<GenerationPerformanceTraceRecord & { invocationCount: number }> {
  const aggregated = new Map<string, GenerationPerformanceTraceRecord & { invocationCount: number }>();
  for (const record of records) {
    const current = aggregated.get(record.name) ?? {
      ...record,
      elapsedMs: 0,
      invocationCount: 0,
      fullTopologyPasses: 0,
      allocatedBufferBytes: 0
    };
    current.elapsedMs += record.elapsedMs;
    current.invocationCount += 1;
    current.topologyCells = Math.max(current.topologyCells ?? 0, record.topologyCells ?? 0);
    current.activeCells = Math.max(current.activeCells ?? 0, record.activeCells ?? 0);
    current.fullTopologyPasses = (current.fullTopologyPasses ?? 0) + (record.fullTopologyPasses ?? 0);
    current.allocatedBufferBytes = (current.allocatedBufferBytes ?? 0) + (record.allocatedBufferBytes ?? 0);
    aggregated.set(record.name, current);
  }
  return [...aggregated.values()]
    .map((record) => ({ ...record, elapsedMs: round(record.elapsedMs, 3) }))
    .sort((left, right) => right.elapsedMs - left.elapsedMs);
}

function parseCase(value: string): ReproductionCase {
  const [starSeed, worldSeed, ...presetParts] = value.split(':');
  const preset = presetParts.join(':') as ReproductionCase['preset'];
  if (!starSeed || !worldSeed || !['Earthlike', 'Archipelago', 'Random World'].includes(preset)) {
    throw new Error(`Invalid --case value "${value}". Expected starSeed:worldSeed:Earthlike|Archipelago|Random World.`);
  }
  return { starSeed, worldSeed, preset };
}

function parseResolution(value: string): { width: number; height: number } {
  const [width, height] = value.split('x').map(Number);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`Invalid --resolution value "${value}". Expected WIDTHxHEIGHT.`);
  }
  return { width, height };
}

function summarizeRiverPaths(world: PrimaryWorld, topology: CubedSphereTopology): CaseReport['riverDiagnostics'] {
  let topologySegments = 0;
  let invalidTopologyJumps = 0;
  let seamSegments = 0;
  let projectedWrapSegments = 0;
  let longProjectedNeighborSegments = 0;
  const suspiciousSegments: PathJump[] = [];
  const faceSize = topology.resolution * topology.resolution;
  const { width, height } = world.mapModel.resolution;

  for (const river of world.rivers) {
    const topologyPath = river.topologyPath ?? [];
    for (let pathIndex = 1; pathIndex < topologyPath.length; pathIndex += 1) {
      topologySegments += 1;
      const sourceCell = topologyPath[pathIndex - 1];
      const destinationCell = topologyPath[pathIndex];
      const sourceFace = Math.floor(sourceCell / faceSize);
      const destinationFace = Math.floor(destinationCell / faceSize);
      const topologyNeighbors = areNeighbors(topology, sourceCell, destinationCell);
      const sourceRaster = projectCell(topology, sourceCell, width, height);
      const destinationRaster = projectCell(topology, destinationCell, width, height);
      const rawDx = Math.abs(destinationRaster[0] - sourceRaster[0]);
      const wrappedDx = Math.min(rawDx, width - rawDx);
      const dy = Math.abs(destinationRaster[1] - sourceRaster[1]);
      const horizontalWrap = rawDx > width / 2;
      const rasterDistance = Math.hypot(wrappedDx, dy);
      const faceSeam = sourceFace !== destinationFace;
      const longProjectedNeighbor = topologyNeighbors && rasterDistance > 4 && !horizontalWrap;
      if (!topologyNeighbors) invalidTopologyJumps += 1;
      if (faceSeam) seamSegments += 1;
      if (horizontalWrap) projectedWrapSegments += 1;
      if (longProjectedNeighbor) longProjectedNeighborSegments += 1;
      if ((!topologyNeighbors || longProjectedNeighbor || horizontalWrap) && suspiciousSegments.length < 100) {
        suspiciousSegments.push({
          riverId: river.id,
          pathIndex,
          sourceCell,
          destinationCell,
          sourceFace,
          destinationFace,
          sourceRaster,
          destinationRaster,
          sourceLongitudeDeg: round(radToDeg(topology.longitudes[sourceCell]), 5),
          sourceLatitudeDeg: round(radToDeg(topology.latitudes[sourceCell]), 5),
          destinationLongitudeDeg: round(radToDeg(topology.longitudes[destinationCell]), 5),
          destinationLatitudeDeg: round(radToDeg(topology.latitudes[destinationCell]), 5),
          topologyNeighbors,
          faceSeam,
          horizontalWrap,
          rasterDistance: round(rasterDistance, 3)
        });
      }
    }
  }

  return {
    riverCount: world.rivers.length,
    topologySegments,
    invalidTopologyJumps,
    seamSegments,
    projectedWrapSegments,
    longProjectedNeighborSegments,
    suspiciousSegments
  };
}

function summarizeIce(world: PrimaryWorld, topology: CubedSphereTopology): CaseReport['iceDiagnostics'] {
  const { width, height } = world.mapModel.resolution;
  const bands: LatitudeBand[] = [];
  for (let minimumLatitudeDeg = 0; minimumLatitudeDeg < 90; minimumLatitudeDeg += 15) {
    bands.push(summarizeLatitudeBand(world, minimumLatitudeDeg, minimumLatitudeDeg + 15));
  }

  let totalIce = 0;
  let landIce = 0;
  let waterIce = 0;
  let land = 0;
  let water = 0;
  let northPolarCells = 0;
  let northPolarIce = 0;
  let southPolarCells = 0;
  let southPolarIce = 0;
  let projectionMismatches = 0;

  for (let y = 0; y < height; y += 1) {
    const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const icy = world.layers.ice[index] === 1;
      const watery = world.layers.water[index] === 1;
      if (icy) totalIce += 1;
      if (watery) {
        water += 1;
        if (icy) waterIce += 1;
      } else {
        land += 1;
        if (icy) landIce += 1;
      }
      if (latitude >= Math.PI / 3) {
        northPolarCells += 1;
        if (icy) northPolarIce += 1;
      }
      if (latitude <= -Math.PI / 3) {
        southPolarCells += 1;
        if (icy) southPolarIce += 1;
      }
      const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
      const cell = cubedSphereCellForLonLat(topology, longitude, latitude);
      if (icy !== (world.topologyLayers.ice[cell] === 1)) projectionMismatches += 1;
    }
  }

  return {
    totalIceShare: round(totalIce / Math.max(1, width * height), 6),
    landIceShare: round(landIce / Math.max(1, land), 6),
    waterIceShare: round(waterIce / Math.max(1, water), 6),
    northPolarIceShare: round(northPolarIce / Math.max(1, northPolarCells), 6),
    southPolarIceShare: round(southPolarIce / Math.max(1, southPolarCells), 6),
    topologyProjectionMismatchShare: round(projectionMismatches / Math.max(1, width * height), 6),
    latitudeBands: bands
  };
}

function summarizeLatitudeBand(world: PrimaryWorld, minimumLatitudeDeg: number, maximumLatitudeDeg: number): LatitudeBand {
  const { width, height } = world.mapModel.resolution;
  let cells = 0;
  let landCells = 0;
  let waterCells = 0;
  let temperature = 0;
  let ice = 0;
  let landIce = 0;
  let waterIce = 0;
  for (let y = 0; y < height; y += 1) {
    const latitudeDeg = Math.abs(90 - ((y + 0.5) / height) * 180);
    if (latitudeDeg < minimumLatitudeDeg || latitudeDeg >= maximumLatitudeDeg) continue;
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const icy = world.layers.ice[index] === 1;
      const watery = world.layers.water[index] === 1;
      cells += 1;
      temperature += world.layers.temperature[index];
      if (icy) ice += 1;
      if (watery) {
        waterCells += 1;
        if (icy) waterIce += 1;
      } else {
        landCells += 1;
        if (icy) landIce += 1;
      }
    }
  }
  return {
    minimumLatitudeDeg,
    maximumLatitudeDeg,
    cells,
    landCells,
    waterCells,
    meanTemperatureC: round(temperature / Math.max(1, cells), 3),
    iceShare: round(ice / Math.max(1, cells), 6),
    landIceShare: round(landIce / Math.max(1, landCells), 6),
    waterIceShare: round(waterIce / Math.max(1, waterCells), 6)
  };
}

function writeLayerImages(project: WorldProject, slug: string, terrainSnapshots: TerrainDiagnosticSnapshot[]): void {
  const world = project.primaryWorld;
  const { width, height } = world.mapModel.resolution;
  const imageDir = join(outputDir, slug);
  mkdirSync(imageDir, { recursive: true });
  writePng(join(imageDir, 'elevation.png'), width, height, (index) => {
    const value = clamp01((world.layers.elevation[index] + 1) / 2);
    const shade = Math.round(value * 255);
    return [shade, shade, shade];
  });
  writePng(join(imageDir, 'water.png'), width, height, (index) =>
    world.layers.water[index] ? [15, 62, 105] : [221, 207, 164]);
  writePng(join(imageDir, 'temperature.png'), width, height, (index) => temperatureColor(world.layers.temperature[index]));
  writePng(join(imageDir, 'ice.png'), width, height, (index) => {
    if (world.layers.ice[index]) return [245, 250, 255];
    return world.layers.water[index] ? [10, 43, 75] : [70, 87, 52];
  });
  writePng(join(imageDir, 'biomes.png'), width, height, (index) => biomeColor(codeToBiome(world.layers.biomes[index])));
  writePng(join(imageDir, 'rivers.png'), width, height, (index) => {
    if (world.layers.water[index]) return [10, 43, 75];
    if (world.layers.river[index] > 0.08) return [100, 210, 255];
    return [54, 81, 48];
  }, world);
  const topology = buildCubedSphereTopology(world.topology.resolution);
  for (const snapshot of terrainSnapshots) {
    writePng(join(imageDir, `stage-${snapshot.stage}.png`), width, height, (_index, x, y) => {
      const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
      const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
      const cell = cubedSphereCellForLonLat(topology, longitude, latitude);
      const value = clamp01((snapshot.elevation[cell] + 1) / 2);
      const shade = Math.round(value * 255);
      return [shade, shade, shade];
    });
  }
}

function writePng(
  path: string,
  width: number,
  height: number,
  color: (index: number, x: number, y: number) => [number, number, number],
  riverWorld?: PrimaryWorld
): void {
  const pixels = new Uint8Array(width * height * 3);
  for (let index = 0; index < width * height; index += 1) {
    const [red, green, blue] = color(index, index % width, Math.floor(index / width));
    const offset = index * 3;
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
  }
  if (riverWorld) {
    for (const river of riverWorld.rivers) {
      for (let pathIndex = 1; pathIndex < river.path.length; pathIndex += 1) {
        const source = river.path[pathIndex - 1];
        const destination = river.path[pathIndex];
        const sourceX = source % width;
        const destinationX = destination % width;
        if (Math.abs(destinationX - sourceX) > width / 2) continue;
        drawLine(
          pixels,
          width,
          height,
          sourceX,
          Math.floor(source / width),
          destinationX,
          Math.floor(destination / width),
          [255, 80, 72]
        );
      }
    }
  }
  const scanlines = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y += 1) {
    const targetOffset = y * (width * 3 + 1);
    scanlines[targetOffset] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width * 3, width * 3)
      .copy(scanlines, targetOffset + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines)),
    pngChunk('IEND', Buffer.alloc(0))
  ]));
}

function drawLine(
  pixels: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: [number, number, number]
): void {
  let x = startX;
  let y = startY;
  const dx = Math.abs(endX - startX);
  const sx = startX < endX ? 1 : -1;
  const dy = -Math.abs(endY - startY);
  const sy = startY < endY ? 1 : -1;
  let error = dx + dy;
  while (true) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const offset = (y * width + x) * 3;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
    }
    if (x === endX && y === endY) break;
    const twiceError = error * 2;
    if (twiceError >= dy) {
      error += dy;
      x += sx;
    }
    if (twiceError <= dx) {
      error += dx;
      y += sy;
    }
  }
}

function areNeighbors(topology: CubedSphereTopology, source: number, destination: number): boolean {
  for (let direction = 0; direction < 4; direction += 1) {
    if (topology.neighbors[source * 4 + direction] === destination) return true;
  }
  return false;
}

function projectCell(topology: CubedSphereTopology, cell: number, width: number, height: number): [number, number] {
  const longitude = topology.longitudes[cell];
  const latitude = topology.latitudes[cell];
  return [
    Math.max(0, Math.min(width - 1, Math.floor(((longitude + Math.PI) / (Math.PI * 2)) * width))),
    Math.max(0, Math.min(height - 1, Math.floor((0.5 - latitude / Math.PI) * height)))
  ];
}

function temperatureColor(temperatureC: number): [number, number, number] {
  const value = clamp01((temperatureC + 35) / 75);
  return value < 0.5
    ? [Math.round(value * 2 * 245), Math.round(value * 2 * 230), 255]
    : [255, Math.round((1 - value) * 2 * 225), Math.round((1 - value) * 2 * 90)];
}

function biomeColor(biome: Biome): [number, number, number] {
  const colors: Record<Biome, [number, number, number]> = {
    ocean: [18, 65, 105],
    ice_cap: [242, 249, 252],
    tundra: [179, 198, 173],
    desert: [218, 190, 105],
    grassland: [132, 169, 90],
    forest: [59, 120, 72],
    rainforest: [31, 101, 68],
    mountain: [120, 115, 105],
    wetland: [83, 140, 115]
  };
  return colors[biome];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function radToDeg(value: number): number {
  return value * 180 / Math.PI;
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
