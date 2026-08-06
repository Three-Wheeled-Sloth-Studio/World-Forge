import {
  buildCubedSphereTopology,
  layerIndex,
  wrapX,
  type CubedSphereTopology,
  type GenerationConfig,
  type River,
  type WorldProject,
} from '@world-forge/shared';
import {
  calculateMetrics,
  generateProject as generateBaseProject,
  type GenerateProjectOptions,
} from './generatorCoreBase';

export * from './generatorCoreBase';

export const CURRENT_GENERATOR_VERSION = '0.1.2-mvp' as const;

type DownstreamRoute = {
  path: number[];
  index: number;
  terminus: River['terminus'];
};

type TracedTopologyRiver = {
  path: number[];
  terminus: River['terminus'];
};

export function generateProject(
  input: Partial<GenerationConfig> = {},
  options: GenerateProjectOptions = {},
): WorldProject {
  const project = supplementNamedTopologyRivers(generateBaseProject(input, options));
  return project.generatorVersion === CURRENT_GENERATOR_VERSION
    ? project
    : { ...project, generatorVersion: CURRENT_GENERATOR_VERSION };
}

export function supplementNamedTopologyRivers(project: WorldProject): WorldProject {
  const world = project.primaryWorld;
  const topology = buildCubedSphereTopology(world.topology.resolution);
  const layers = world.topologyLayers;
  const landCellCount = countLandCells(layers.water);
  const targetCount = expectedNamedRiverCount(
    project.selectedValues.riverDensity,
    landCellCount,
  );
  if (world.rivers.length >= targetCount || targetCount <= 0) return project;

  const rivers = [...world.rivers];
  const downstreamByCell = buildDownstreamLookup(rivers);
  const covered = new Uint8Array(topology.cellCount);
  for (const river of rivers) {
    for (const cell of river.topologyPath ?? []) markCovered(covered, topology, cell);
  }

  const candidates = Array.from({ length: topology.cellCount }, (_, cell) => cell)
    .filter((cell) => (
      layers.water[cell] === 0
      && layers.river[cell] > 0.04
      && layers.elevation[cell] > world.seaLevel + 0.045
      && covered[cell] === 0
    ))
    .sort((left, right) => sourceScore(project, right) - sourceScore(project, left));

  for (const source of candidates) {
    if (rivers.length >= targetCount) break;
    if (covered[source] === 1) continue;
    const traced = traceSignaledTopologyRiver(project, topology, source, downstreamByCell);
    if (!traced || traced.path.length < 4) continue;
    const projected = projectTopologyRiver(
      traced,
      topology,
      world.mapModel.resolution.width,
      world.mapModel.resolution.height,
      rivers.length,
    );
    if (projected.path.length < 2) continue;
    rivers.push(projected);
    const route: DownstreamRoute = {
      path: traced.path,
      index: 0,
      terminus: traced.terminus,
    };
    traced.path.forEach((cell, index) => {
      downstreamByCell.set(cell, { ...route, index });
      markCovered(covered, topology, cell);
    });
  }

  if (rivers.length === world.rivers.length) return project;
  const primaryWorld = { ...world, rivers };
  return {
    ...project,
    primaryWorld,
    metrics: calculateMetrics(primaryWorld, project.selectedValues),
  };
}

export function expectedNamedRiverCount(riverDensity: number, landCellCount: number): number {
  if (landCellCount < 4 || riverDensity <= 0) return 0;
  return Math.max(1, Math.min(
    120,
    Math.round(riverDensity * 30),
    Math.max(1, Math.floor(landCellCount / 12)),
  ));
}

function traceSignaledTopologyRiver(
  project: WorldProject,
  topology: CubedSphereTopology,
  source: number,
  downstreamByCell: Map<number, DownstreamRoute>,
): TracedTopologyRiver | null {
  const world = project.primaryWorld;
  const layers = world.topologyLayers;
  const path: number[] = [];
  const seen = new Set<number>();
  let current = source;

  for (let step = 0; step < 800; step += 1) {
    if (seen.has(current)) return null;
    seen.add(current);
    path.push(current);

    if (layers.water[current] === 1) return { path, terminus: 'ocean' };
    if (layers.lakes[current] === 1 && path.length > 1) return { path, terminus: 'lake' };

    const downstream = downstreamByCell.get(current);
    if (downstream && path.length > 1) {
      appendUnique(path, downstream.path.slice(downstream.index + 1));
      return { path, terminus: downstream.terminus };
    }

    const next = nextRiverCell(project, topology, current, seen, downstreamByCell);
    if (next === null) return null;
    current = next;
  }
  return null;
}

function nextRiverCell(
  project: WorldProject,
  topology: CubedSphereTopology,
  current: number,
  seen: Set<number>,
  downstreamByCell: Map<number, DownstreamRoute>,
): number | null {
  const layers = project.primaryWorld.topologyLayers;
  const currentElevation = layers.elevation[current];
  const candidates: Array<{ cell: number; score: number; terminal: boolean }> = [];

  for (let offset = 0; offset < 4; offset += 1) {
    const neighbor = topology.neighbors[current * 4 + offset];
    if (neighbor < 0 || seen.has(neighbor)) continue;
    const ocean = layers.water[neighbor] === 1;
    const lake = layers.lakes[neighbor] === 1;
    const downstream = downstreamByCell.has(neighbor);
    const allowedElevation = ocean || lake || downstream
      ? Number.POSITIVE_INFINITY
      : currentElevation + 0.004;
    if (layers.elevation[neighbor] > allowedElevation) continue;
    candidates.push({
      cell: neighbor,
      terminal: ocean || lake || downstream,
      score: layers.elevation[neighbor]
        - layers.river[neighbor] * 0.14
        - (ocean ? 10 : 0)
        - (lake ? 6 : 0)
        - (downstream ? 4 : 0),
    });
  }

  candidates.sort((left, right) => (
    Number(right.terminal) - Number(left.terminal)
    || left.score - right.score
    || left.cell - right.cell
  ));
  return candidates[0]?.cell ?? null;
}

function buildDownstreamLookup(rivers: River[]): Map<number, DownstreamRoute> {
  const lookup = new Map<number, DownstreamRoute>();
  for (const river of rivers) {
    const path = river.topologyPath;
    if (!path || path.length < 2) continue;
    path.forEach((cell, index) => {
      if (!lookup.has(cell)) lookup.set(cell, { path, index, terminus: river.terminus });
    });
  }
  return lookup;
}

function sourceScore(project: WorldProject, cell: number): number {
  const world = project.primaryWorld;
  const layers = world.topologyLayers;
  const relief = Math.max(0, layers.elevation[cell] - world.seaLevel);
  return layers.river[cell] * 1.8
    + relief * 1.15
    + layers.wetness[cell] * 0.32;
}

function markCovered(
  covered: Uint8Array,
  topology: CubedSphereTopology,
  cell: number,
): void {
  if (cell < 0 || cell >= covered.length) return;
  covered[cell] = 1;
  for (let offset = 0; offset < 4; offset += 1) {
    const neighbor = topology.neighbors[cell * 4 + offset];
    if (neighbor >= 0) covered[neighbor] = 1;
  }
}

function projectTopologyRiver(
  river: TracedTopologyRiver,
  topology: CubedSphereTopology,
  width: number,
  height: number,
  index: number,
): River {
  const projectedPath: number[] = [];
  for (const cell of river.path) {
    const longitude = topology.longitudes[cell];
    const latitude = topology.latitudes[cell];
    const x = wrapX(Math.round(((longitude + Math.PI) / (Math.PI * 2)) * width), width);
    const y = Math.max(0, Math.min(height - 1, Math.round((0.5 - latitude / Math.PI) * height)));
    const projected = layerIndex(x, y, width);
    if (projectedPath[projectedPath.length - 1] !== projected) projectedPath.push(projected);
  }
  return {
    id: `river-${index + 1}`,
    sourceIndex: projectedPath[0],
    mouthIndex: projectedPath[projectedPath.length - 1],
    path: projectedPath,
    topologyPath: river.path,
    terminus: river.terminus,
  };
}

function appendUnique(target: number[], source: number[]): void {
  for (const cell of source) {
    if (target[target.length - 1] !== cell) target.push(cell);
  }
}

function countLandCells(water: Uint8Array): number {
  let count = 0;
  for (const value of water) if (value === 0) count += 1;
  return count;
}
