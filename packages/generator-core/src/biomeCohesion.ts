import {
  biomeToCode,
  buildCubedSphereTopology,
  codeToBiome,
  type Biome,
  type CubedSphereTopology,
  type WorldProject
} from '@world-forge/shared';
import { equirectangularTopologyLookup } from './equirectangularTopologyLookup';
import {
  LOWLAND_FLOODPLAIN_COHESION_SUPPORT,
  LOWLAND_FLOODPLAIN_MAX_ALTITUDE,
  LOWLAND_FLOODPLAIN_MIN_RIVER,
  LOWLAND_FLOODPLAIN_MIN_WETNESS,
} from './wetlandHydrology';

type BiomeInputs = {
  temperature: number;
  wetness: number;
  precipitation: number;
  elevation: number;
  river: number;
  lake: boolean;
};

export type CollapsedBiomeDetail = {
  originalBiome: Biome;
  replacementBiome: Biome;
  cells: number[];
  areaCells: number;
  meanTemperatureC: number;
  meanWetness: number;
  meanPrecipitation: number;
  elevationRange: [number, number];
  climateSupport: number;
  hydrologySupport: number;
  collapseReason: string;
};

function inputs(project: WorldProject, cell: number): BiomeInputs {
  const layers = project.primaryWorld.topologyLayers as typeof project.primaryWorld.topologyLayers & {
    climateMoisture?: Float32Array;
    climatePrecipitation?: Float32Array;
  };
  return {
    temperature: layers.temperature[cell],
    wetness: layers.climateMoisture?.[cell] ?? layers.wetness[cell],
    precipitation: layers.climatePrecipitation?.[cell] ?? layers.climateMoisture?.[cell] ?? layers.wetness[cell],
    elevation: layers.elevation[cell],
    river: layers.river[cell],
    lake: layers.lakes[cell] === 1
  };
}

type BiomeCohesionOptions = {
  projectRaster?: boolean;
  preserveLowlandFloodplains?: boolean;
};

function supportScore(project: WorldProject, cell: number, biome: Biome, options: BiomeCohesionOptions = {}): number {
  const value = inputs(project, cell);
  if (biome === 'ice_cap') return value.temperature <= -8 ? 1 : value.temperature <= -2 ? 0.65 : 0;
  if (biome === 'wetland') {
    const altitude = value.elevation - project.primaryWorld.seaLevel;
    const lowlandFloodplain = options.preserveLowlandFloodplains
      && altitude >= 0
      && altitude < LOWLAND_FLOODPLAIN_MAX_ALTITUDE
      && value.river > LOWLAND_FLOODPLAIN_MIN_RIVER
      && value.wetness > LOWLAND_FLOODPLAIN_MIN_WETNESS;
    return lowlandFloodplain
      ? LOWLAND_FLOODPLAIN_COHESION_SUPPORT
      : Math.min(1, (value.lake ? 0.75 : 0) + value.river * 0.5 + value.precipitation * 0.35);
  }
  if (biome === 'tundra') return value.temperature <= -1 ? 1 : value.temperature <= 5 ? 0.55 : 0;
  if (biome === 'desert') return value.wetness <= 0.14 ? 1 : value.wetness <= 0.28 ? 0.55 : 0;
  if (biome === 'rainforest') return value.temperature >= 22 && value.precipitation >= 0.78 ? 1 : value.temperature >= 17 && value.precipitation >= 0.62 ? 0.6 : 0;
  if (biome === 'forest') return value.temperature >= 4 && value.wetness >= 0.6 ? 1 : value.temperature > -3 && value.wetness >= 0.42 ? 0.55 : 0;
  if (biome === 'grassland') return value.temperature > 0 && value.wetness >= 0.15 ? 0.7 : 0.2;
  return 0;
}

function stronglySupported(project: WorldProject, cell: number, biome: Biome, options: BiomeCohesionOptions): boolean {
  return supportScore(project, cell, biome, options) >= 0.8;
}

function compatible(project: WorldProject, cell: number, biome: Biome, options: BiomeCohesionOptions): boolean {
  return supportScore(project, cell, biome, options) >= 0.45;
}

function minimumComponentSize(biome: Biome): number {
  if (biome === 'wetland') return 3;
  if (biome === 'ice_cap') return 4;
  if (biome === 'tundra' || biome === 'desert' || biome === 'rainforest') return 7;
  if (biome === 'forest') return 6;
  return 5;
}

export function projectBiomeLayer(
  project: WorldProject,
  topology: CubedSphereTopology = buildCubedSphereTopology(project.primaryWorld.topology.resolution)
): void {
  const world = project.primaryWorld;
  const { width, height } = world.mapModel.resolution;
  const lookup = equirectangularTopologyLookup(topology, width, height);
  for (let index = 0; index < lookup.length; index += 1) {
    world.layers.biomes[index] = world.topologyLayers.biomes[lookup[index]];
  }
}

function summarizeCollapsed(project: WorldProject, cells: number[], originalBiome: Biome, replacementBiome: Biome, options: BiomeCohesionOptions): CollapsedBiomeDetail {
  let temperature = 0;
  let wetness = 0;
  let precipitation = 0;
  let minElevation = Number.POSITIVE_INFINITY;
  let maxElevation = Number.NEGATIVE_INFINITY;
  let climateSupport = 0;
  let hydrologySupport = 0;
  for (const cell of cells) {
    const value = inputs(project, cell);
    temperature += value.temperature;
    wetness += value.wetness;
    precipitation += value.precipitation;
    minElevation = Math.min(minElevation, value.elevation);
    maxElevation = Math.max(maxElevation, value.elevation);
    climateSupport += supportScore(project, cell, originalBiome, options);
    hydrologySupport += Math.min(1, (value.lake ? 0.8 : 0) + value.river * 0.6);
  }
  const count = Math.max(1, cells.length);
  return {
    originalBiome,
    replacementBiome,
    cells: [...cells],
    areaCells: cells.length,
    meanTemperatureC: temperature / count,
    meanWetness: wetness / count,
    meanPrecipitation: precipitation / count,
    elevationRange: [minElevation, maxElevation],
    climateSupport: climateSupport / count,
    hydrologySupport: hydrologySupport / count,
    collapseReason: 'Unsupported micro-biome component merged into the most compatible surrounding biome; retained for future local-detail generation.'
  };
}

export function applyBiomeCohesion(
  project: WorldProject,
  topology: CubedSphereTopology = buildCubedSphereTopology(project.primaryWorld.topology.resolution),
  options: BiomeCohesionOptions = {},
): number {
  const layers = project.primaryWorld.topologyLayers;
  const next = new Uint8Array(layers.biomes);
  let reassigned = 0;

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (layers.water[cell]) continue;
    const currentCode = layers.biomes[cell];
    const currentBiome = codeToBiome(currentCode);
    const counts = new Map<number, number>();
    let same = 0;
    let landNeighbors = 0;
    for (let direction = 0; direction < 4; direction += 1) {
      const neighbor = topology.neighbors[cell * 4 + direction];
      if (neighbor < 0 || layers.water[neighbor]) continue;
      landNeighbors += 1;
      const code = layers.biomes[neighbor];
      counts.set(code, (counts.get(code) ?? 0) + 1);
      if (code === currentCode) same += 1;
    }
    if (landNeighbors < 3 || same > 0 || stronglySupported(project, cell, currentBiome, options)) continue;
    const [candidateCode, support] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [-1, 0];
    if (support < 3 || candidateCode < 0 || candidateCode === currentCode) continue;
    const candidateBiome = codeToBiome(candidateCode);
    if (!compatible(project, cell, candidateBiome, options)) continue;
    next[cell] = biomeToCode(candidateBiome);
    reassigned += 1;
  }

  layers.biomes.set(next);
  const visited = new Uint8Array(topology.cellCount);
  const collapsed: CollapsedBiomeDetail[] = [];
  for (let start = 0; start < topology.cellCount; start += 1) {
    if (visited[start] || layers.water[start]) continue;
    const biomeCode = layers.biomes[start];
    const biome = codeToBiome(biomeCode);
    const queue = [start];
    const component: number[] = [];
    visited[start] = 1;
    let head = 0;
    while (head < queue.length) {
      const cell = queue[head++];
      component.push(cell);
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor < 0 || visited[neighbor] || layers.water[neighbor] || layers.biomes[neighbor] !== biomeCode) continue;
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    if (component.length >= minimumComponentSize(biome)) continue;
    const meanSupport = component.reduce((sum, cell) => sum + supportScore(project, cell, biome, options), 0) / Math.max(1, component.length);
    if (meanSupport >= 0.68) continue;
    const boundaryCounts = new Map<number, number>();
    for (const cell of component) {
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor < 0 || layers.water[neighbor] || layers.biomes[neighbor] === biomeCode) continue;
        const candidateCode = layers.biomes[neighbor];
        if (!compatible(project, cell, codeToBiome(candidateCode), options)) continue;
        boundaryCounts.set(candidateCode, (boundaryCounts.get(candidateCode) ?? 0) + 1);
      }
    }
    const [replacementCode] = [...boundaryCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [-1, 0];
    if (replacementCode < 0) continue;
    const replacementBiome = codeToBiome(replacementCode);
    collapsed.push(summarizeCollapsed(project, component, biome, replacementBiome, options));
    for (const cell of component) layers.biomes[cell] = replacementCode;
    reassigned += component.length;
  }

  const world = project.primaryWorld as typeof project.primaryWorld & {
    deepTime?: Record<string, unknown> & { biomeConsolidation?: { collapsedComponents: CollapsedBiomeDetail[]; collapsedCellCount: number } };
  };
  world.deepTime = world.deepTime ?? {};
  world.deepTime.biomeConsolidation = {
    collapsedComponents: collapsed,
    collapsedCellCount: collapsed.reduce((sum, item) => sum + item.areaCells, 0)
  };

  if (reassigned > 0 && options.projectRaster !== false) projectBiomeLayer(project, topology);
  return reassigned;
}
