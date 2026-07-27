import {
  biomeNames,
  codeToBiome,
  type Biome,
  type CubedSphereTopology,
  type WorldHexOverlay,
} from '@world-forge/shared';
import {
  GEOGRAPHIC_REGION_ALGORITHM_VERSION,
  type GeographicRegionBoundaryKind,
  type GeographicRegionBuildOptions,
  type GeographicRegionInputLayers,
  type GeographicRegionSeed,
  type GeographicSurfaceDomain,
  type GeographicWorldRegionSetV2,
  type GeographicWorldRegionV2,
} from '@world-forge/shared/geographicRegions';
import {
  buildGeographicOverviewSectors,
  deriveGeographicRegionScaleBudget,
} from './geographicRegionBudget';
import { buildGeographicSurfaceDomains } from './geographicSurfaceDomains';
import { geographicTopologyAdjacency } from './geographicTopologyAdjacency';
import { assignInteriorRegionLabelPoints } from './geographicRegionLabels';
import { hexCoverageForLatLonBounds } from './worldHexOverlay';

const UNASSIGNED_REGION = 0xffff;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const MAXIMUM_DEFAULT_CANDIDATES = 8192;
const BOUNDARY_KINDS: GeographicRegionBoundaryKind[] = [
  'coastline',
  'elevation-break',
  'biome-transition',
  'climate-transition',
  'hydrology-transition',
  'plate-boundary',
  'distance-balance',
];

type RegionAccumulator = {
  seedTopologyCellId: number;
  parentDomainIndex: number;
  topologyCellCount: number;
  areaWeight: number;
  landArea: number;
  waterArea: number;
  biomeArea: Record<Biome, number>;
  highestCell: number;
  highestElevation: number;
  largestRiverCell: number;
  largestRiverSignal: number;
  latitudeMin: number;
  latitudeMax: number;
  longitudeMin: number;
  longitudeMax: number;
  minimumPositiveLongitude: number;
  maximumNegativeLongitude: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  neighborIndexes: Set<number>;
  boundaryEdgeCount: number;
  geographicBoundaryEdges: number;
  boundaryKinds: Record<GeographicRegionBoundaryKind, number>;
};

type PartitionBoundarySummary = {
  boundaryEdgeCount: number;
  geographicBoundaryEdges: number;
  coastlineBoundaryEdges: number;
  meridionalBoundaryEdges: number;
};

export function buildGeographicMacroRegions(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  hexOverlay: WorldHexOverlay,
  options: GeographicRegionBuildOptions = {},
): GeographicWorldRegionSetV2 {
  validateInputs(topology, layers);
  const scaleBudget = deriveGeographicRegionScaleBudget(hexOverlay, options.targetRegionCount);
  const surface = buildGeographicSurfaceDomains(
    topology,
    layers,
    hexOverlay,
    scaleBudget,
  );
  const seeds = selectDomainRegionSeeds(
    topology,
    layers,
    surface.domains,
    surface.regionDomainIndexByTopologyCell,
    options,
  );
  if (seeds.length === 0) throw new Error('Geographic region decomposition could not select any region seeds.');

  const membership = partitionTopology(topology, layers, seeds, surface.regionDomainIndexByTopologyCell);
  assignUnreachedDomainCells(topology, membership, seeds, surface.regionDomainIndexByTopologyCell);
  makePartitionSeedConnected(topology, layers, membership, seeds, surface.regionDomainIndexByTopologyCell);
  const componentCounts = connectedComponentCounts(topology, membership, seeds.length);
  const accumulators = createAccumulators(seeds);
  accumulateRegionCells(topology, layers, membership, accumulators);
  const boundarySummary = accumulateRegionBoundaries(topology, layers, membership, accumulators);
  const totalArea = accumulators.reduce((sum, region) => sum + region.areaWeight, 0);
  const regions = assignInteriorRegionLabelPoints(
    topology,
    membership,
    finalizeRegions(
      topology,
      accumulators,
      componentCounts,
      totalArea,
      scaleBudget.minAreaShare,
      hexOverlay,
      surface.domains,
    ),
  );
  const areaShares = regions.map((region) => region.diagnostics.areaShare);
  const unassignedCellCount = countUnassigned(membership);
  const signature = regionSetSignature(seeds, membership);

  return {
    modelVersion: 'world-regions-v2',
    algorithmVersion: GEOGRAPHIC_REGION_ALGORITHM_VERSION,
    scheme: 'geographic-graph-partition',
    regionLevel: 'region',
    sourceTopologyKind: topology.kind,
    sourceTopologyResolution: topology.resolution,
    targetDisplayLevelId: scaleBudget.targetDisplayLevelId,
    scaleBudget,
    membership: {
      encoding: 'uint16-region-index',
      regionIndexByTopologyCell: membership,
    },
    regions,
    overviewSectors: buildGeographicOverviewSectors(),
    surfaceDomains: surface.domains,
    surfaceDomainIndexByTopologyCell: surface.domainIndexByTopologyCell,
    regionDomainIndexByTopologyCell: surface.regionDomainIndexByTopologyCell,
    crossRegionEntities: [],
    diagnostics: {
      targetRegionCount: scaleBudget.targetRegionCount,
      actualRegionCount: regions.length,
      unassignedCellCount,
      disconnectedRegionCount: regions.filter((region) => (
        region.diagnostics.connectedComponentCount > 1
        && surface.domains[seeds[region.index].parentDomainIndex]?.kind !== 'archipelago'
      )).length,
      sliverRegionCount: regions.filter((region) => region.diagnostics.sliver).length,
      minimumAreaShare: round(areaShares.length > 0 ? Math.min(...areaShares) : 0, 8),
      maximumAreaShare: round(areaShares.length > 0 ? Math.max(...areaShares) : 0, 8),
      meanAreaShare: round(areaShares.length > 0 ? areaShares.reduce((sum, value) => sum + value, 0) / areaShares.length : 0, 8),
      geographicBoundaryShare: round(
        boundarySummary.geographicBoundaryEdges / Math.max(1, boundarySummary.boundaryEdgeCount),
        6,
      ),
      coastlineBoundaryShare: round(
        boundarySummary.coastlineBoundaryEdges / Math.max(1, boundarySummary.boundaryEdgeCount),
        6,
      ),
      meridionalBoundaryShare: round(
        boundarySummary.meridionalBoundaryEdges / Math.max(1, boundarySummary.boundaryEdgeCount),
        6,
      ),
      surfaceDomainCount: surface.domains.length,
      landmassDomainCount: surface.domains.filter((domain) => domain.kind === 'landmass').length,
      archipelagoDomainCount: surface.domains.filter((domain) => domain.kind === 'archipelago').length,
      openOceanDomainCount: surface.domains.filter((domain) => domain.kind === 'open-ocean').length,
    },
    signature,
  };
}

export function selectGeographicRegionSeeds(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  targetRegionCount: number,
  options: GeographicRegionBuildOptions = {},
): GeographicRegionSeed[] {
  const totalArea = sumArea(topology.areaWeights);
  let landArea = 0;
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (layers.water[cell] !== 1) landArea += topology.areaWeights[cell] || 1;
  }
  const waterArea = Math.max(0, totalArea - landArea);
  const hasLand = landArea > 0;
  const hasWater = waterArea > 0;
  let landTarget = hasLand ? Math.round(targetRegionCount * (landArea / Math.max(0.000001, totalArea))) : 0;
  let waterTarget = targetRegionCount - landTarget;

  if (hasLand) landTarget = Math.max(1, landTarget);
  if (hasWater) waterTarget = Math.max(1, waterTarget);
  while (landTarget + waterTarget > targetRegionCount) {
    if (landTarget > waterTarget && landTarget > 1) landTarget -= 1;
    else if (waterTarget > 1) waterTarget -= 1;
    else break;
  }
  while (landTarget + waterTarget < targetRegionCount) {
    if (landArea >= waterArea) landTarget += 1;
    else waterTarget += 1;
  }

  const maximumCandidateCells = Math.max(
    targetRegionCount * 16,
    Math.round(options.maximumCandidateCells ?? MAXIMUM_DEFAULT_CANDIDATES),
  );
  const seedText = options.seed?.trim() || 'world-regions';
  const landCandidates = collectCandidates(topology, layers.water, false, maximumCandidateCells, seedText);
  const waterCandidates = collectCandidates(topology, layers.water, true, maximumCandidateCells, seedText);

  const selected = [
    ...selectFarthestSeeds(topology, landCandidates, landTarget, `${seedText}:land`).map((topologyCellId) => ({
      topologyCellId,
      water: false,
      parentDomainIndex: 0,
    })),
    ...selectFarthestSeeds(topology, waterCandidates, waterTarget, `${seedText}:water`).map((topologyCellId) => ({
      topologyCellId,
      water: true,
      parentDomainIndex: 0,
    })),
  ];

  return selected
    .filter((seed, index, entries) => entries.findIndex((candidate) => candidate.topologyCellId === seed.topologyCellId) === index)
    .sort((left, right) => left.topologyCellId - right.topologyCellId);
}

function assignUnreachedDomainCells(
  topology: CubedSphereTopology,
  membership: Uint16Array,
  seeds: GeographicRegionSeed[],
  domainIndexByTopologyCell: Uint16Array,
): void {
  const seedsByDomain = new Map<number, Array<{ seed: GeographicRegionSeed; regionIndex: number }>>();
  for (let regionIndex = 0; regionIndex < seeds.length; regionIndex += 1) {
    const seed = seeds[regionIndex];
    const entries = seedsByDomain.get(seed.parentDomainIndex) ?? [];
    entries.push({ seed, regionIndex });
    seedsByDomain.set(seed.parentDomainIndex, entries);
  }
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (membership[cell] !== UNASSIGNED_REGION) continue;
    const candidates = seedsByDomain.get(domainIndexByTopologyCell[cell]) ?? [];
    const nearest = candidates
      .map((candidate) => ({
        regionIndex: candidate.regionIndex,
        distance: chordDistanceSquared(topology.positions, cell, candidate.seed.topologyCellId),
      }))
      .sort((left, right) => left.distance - right.distance || left.regionIndex - right.regionIndex)[0];
    if (nearest) membership[cell] = nearest.regionIndex;
  }
}

function selectDomainRegionSeeds(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  domains: GeographicSurfaceDomain[],
  domainIndexByTopologyCell: Uint16Array,
  options: GeographicRegionBuildOptions,
): GeographicRegionSeed[] {
  const maximumCandidateCells = Math.max(
    domains.reduce((sum, domain) => sum + domain.targetRegionCount, 0) * 16,
    Math.round(options.maximumCandidateCells ?? MAXIMUM_DEFAULT_CANDIDATES),
  );
  const seedText = options.seed?.trim() || 'world-regions';
  const seeds: GeographicRegionSeed[] = [];
  for (const domain of domains) {
    const candidates = collectDomainCandidates(
      topology,
      domainIndexByTopologyCell,
      domain.index,
      maximumCandidateCells,
      `${seedText}:${domain.id}`,
    );
    const selected = selectFarthestSeeds(
      topology,
      candidates,
      Math.min(domain.targetRegionCount, candidates.length),
      `${seedText}:${domain.id}`,
    );
    for (const topologyCellId of selected) {
      seeds.push({
        topologyCellId,
        water: layers.water[topologyCellId] === 1,
        parentDomainIndex: domain.index,
      });
    }
  }
  return seeds.sort((left, right) => (
    left.parentDomainIndex - right.parentDomainIndex
      || left.topologyCellId - right.topologyCellId
  ));
}

function partitionTopology(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  seeds: GeographicRegionSeed[],
  domainIndexByTopologyCell: Uint16Array,
): Uint16Array {
  const adjacency = geographicTopologyAdjacency(topology);
  const membership = new Uint16Array(topology.cellCount);
  membership.fill(UNASSIGNED_REGION);
  const distances = new Float64Array(topology.cellCount);
  distances.fill(Number.POSITIVE_INFINITY);
  const heap = new RegionMinHeap();

  for (let regionIndex = 0; regionIndex < seeds.length; regionIndex += 1) {
    const cell = seeds[regionIndex].topologyCellId;
    distances[cell] = 0;
    membership[cell] = regionIndex;
    heap.push(0, cell, regionIndex);
  }

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current) break;
    if (current.cost > distances[current.cell] + 1e-9) continue;
    if (membership[current.cell] !== current.regionIndex) continue;

    for (let direction = 0; direction < 4; direction += 1) {
      const neighbor = topology.neighbors[current.cell * 4 + direction];
      if (neighbor < 0) continue;
      if (domainIndexByTopologyCell[neighbor] !== seeds[current.regionIndex].parentDomainIndex) continue;
      const nextCost = current.cost + traversalCost(
        current.cell,
        neighbor,
        seeds[current.regionIndex].water,
        layers,
      );
      const previousCost = distances[neighbor];
      if (nextCost + 1e-9 >= previousCost) continue;
      distances[neighbor] = nextCost;
      membership[neighbor] = current.regionIndex;
      heap.push(nextCost, neighbor, current.regionIndex);
    }
  }

  return membership;
}

function traversalCost(
  from: number,
  to: number,
  seedWater: boolean,
  layers: GeographicRegionInputLayers,
): number {
  const fromWater = layers.water[from] === 1;
  const toWater = layers.water[to] === 1;
  let cost = 1;

  if (fromWater !== toWater) cost += 12;
  if (toWater !== seedWater) cost += 5;
  cost += Math.min(4, Math.abs(layers.elevation[from] - layers.elevation[to]) * 10);
  if (layers.biomes[from] !== layers.biomes[to]) cost += 0.8;
  cost += Math.min(2, Math.abs(layers.temperature[from] - layers.temperature[to]) / 12);
  cost += Math.min(1.5, Math.abs(layers.wetness[from] - layers.wetness[to]) * 2);
  if (layers.plates[from] !== layers.plates[to]) cost += 0.45;
  if (layers.lakes[from] !== layers.lakes[to]) cost += 1.2;

  const minimumRiverSignal = Math.min(layers.river[from], layers.river[to]);
  if (!fromWater && !toWater && minimumRiverSignal >= 0.35) cost *= 0.88;
  return Math.max(0.1, cost);
}

function createAccumulators(seeds: GeographicRegionSeed[]): RegionAccumulator[] {
  return seeds.map((seed) => ({
    seedTopologyCellId: seed.topologyCellId,
    parentDomainIndex: seed.parentDomainIndex,
    topologyCellCount: 0,
    areaWeight: 0,
    landArea: 0,
    waterArea: 0,
    biomeArea: emptyBiomeRecord(),
    highestCell: -1,
    highestElevation: Number.NEGATIVE_INFINITY,
    largestRiverCell: -1,
    largestRiverSignal: 0,
    latitudeMin: Number.POSITIVE_INFINITY,
    latitudeMax: Number.NEGATIVE_INFINITY,
    longitudeMin: Number.POSITIVE_INFINITY,
    longitudeMax: Number.NEGATIVE_INFINITY,
    minimumPositiveLongitude: Number.POSITIVE_INFINITY,
    maximumNegativeLongitude: Number.NEGATIVE_INFINITY,
    centerX: 0,
    centerY: 0,
    centerZ: 0,
    neighborIndexes: new Set<number>(),
    boundaryEdgeCount: 0,
    geographicBoundaryEdges: 0,
    boundaryKinds: emptyBoundaryRecord(),
  }));
}

function accumulateRegionCells(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  accumulators: RegionAccumulator[],
): void {
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const regionIndex = membership[cell];
    if (regionIndex === UNASSIGNED_REGION || !accumulators[regionIndex]) continue;
    const region = accumulators[regionIndex];
    const area = topology.areaWeights[cell] || 1;
    const latitude = topology.latitudes[cell] * RADIANS_TO_DEGREES;
    const longitude = topology.longitudes[cell] * RADIANS_TO_DEGREES;
    const water = layers.water[cell] === 1;
    const biome = codeToBiome(layers.biomes[cell]);
    const positionOffset = cell * 3;

    region.topologyCellCount += 1;
    region.areaWeight += area;
    if (water) region.waterArea += area;
    else region.landArea += area;
    region.biomeArea[biome] += area;
    region.latitudeMin = Math.min(region.latitudeMin, latitude);
    region.latitudeMax = Math.max(region.latitudeMax, latitude);
    region.longitudeMin = Math.min(region.longitudeMin, longitude);
    region.longitudeMax = Math.max(region.longitudeMax, longitude);
    if (longitude >= 0) region.minimumPositiveLongitude = Math.min(region.minimumPositiveLongitude, longitude);
    else region.maximumNegativeLongitude = Math.max(region.maximumNegativeLongitude, longitude);
    region.centerX += topology.positions[positionOffset] * area;
    region.centerY += topology.positions[positionOffset + 1] * area;
    region.centerZ += topology.positions[positionOffset + 2] * area;

    if (!water && layers.elevation[cell] > region.highestElevation) {
      region.highestCell = cell;
      region.highestElevation = layers.elevation[cell];
    }
    if (!water && layers.river[cell] > region.largestRiverSignal) {
      region.largestRiverCell = cell;
      region.largestRiverSignal = layers.river[cell];
    }
  }
}

function accumulateRegionBoundaries(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  accumulators: RegionAccumulator[],
): PartitionBoundarySummary {
  const adjacency = geographicTopologyAdjacency(topology);
  let boundaryEdgeCount = 0;
  let geographicBoundaryEdges = 0;
  let coastlineBoundaryEdges = 0;
  let meridionalBoundaryEdges = 0;

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const leftRegionIndex = membership[cell];
    if (leftRegionIndex === UNASSIGNED_REGION) continue;
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (neighbor <= cell) continue;
      const rightRegionIndex = membership[neighbor];
      if (rightRegionIndex === UNASSIGNED_REGION || rightRegionIndex === leftRegionIndex) continue;

      boundaryEdgeCount += 1;
      const left = accumulators[leftRegionIndex];
      const right = accumulators[rightRegionIndex];
      left.neighborIndexes.add(rightRegionIndex);
      right.neighborIndexes.add(leftRegionIndex);
      left.boundaryEdgeCount += 1;
      right.boundaryEdgeCount += 1;

      const reasons = boundaryReasons(cell, neighbor, layers);
      const geographic = reasons.some((reason) => reason !== 'distance-balance');
      if (geographic) {
        geographicBoundaryEdges += 1;
        left.geographicBoundaryEdges += 1;
        right.geographicBoundaryEdges += 1;
      }
      if (reasons.includes('coastline')) coastlineBoundaryEdges += 1;
      if (isMeridionalBoundary(topology, cell, neighbor)) meridionalBoundaryEdges += 1;

      for (const reason of reasons) {
        left.boundaryKinds[reason] += 1;
        right.boundaryKinds[reason] += 1;
      }
    }
  }

  return {
    boundaryEdgeCount,
    geographicBoundaryEdges,
    coastlineBoundaryEdges,
    meridionalBoundaryEdges,
  };
}

function finalizeRegions(
  topology: CubedSphereTopology,
  accumulators: RegionAccumulator[],
  componentCounts: number[],
  totalArea: number,
  minimumAreaShare: number,
  hexOverlay: WorldHexOverlay,
  surfaceDomains: GeographicSurfaceDomain[],
): GeographicWorldRegionV2[] {
  const regionIds = accumulators.map((region) => regionId(region.seedTopologyCellId));

  return accumulators.map((region, index) => {
    const area = Math.max(0.000001, region.areaWeight);
    const areaShare = region.areaWeight / Math.max(0.000001, totalArea);
    const landAreaShare = region.landArea / area;
    const waterAreaShare = region.waterArea / area;
    const center = vectorCenter(region);
    const bounds = regionBounds(region);
    const boundaryRationale = BOUNDARY_KINDS
      .filter((kind) => region.boundaryKinds[kind] > 0)
      .map((kind) => ({
        kind,
        edgeCount: region.boundaryKinds[kind],
        share: round(region.boundaryKinds[kind] / Math.max(1, region.boundaryEdgeCount), 4),
      }))
      .sort((left, right) => right.edgeCount - left.edgeCount || left.kind.localeCompare(right.kind));

    return {
      id: regionIds[index],
      index,
      level: 'region',
      parentId: surfaceDomains[region.parentDomainIndex]?.id ?? 'primary-world',
      parentDomainId: surfaceDomains[region.parentDomainIndex]?.id ?? 'primary-world',
      label: `Region ${index + 1}`,
      classification: classifyRegion(landAreaShare, waterAreaShare),
      seedTopologyCellId: region.seedTopologyCellId,
      bounds,
      center,
      labelPoint: {
        topologyCellId: region.seedTopologyCellId,
        latitude: round(topology.latitudes[region.seedTopologyCellId] * RADIANS_TO_DEGREES, 4),
        longitude: round(topology.longitudes[region.seedTopologyCellId] * RADIANS_TO_DEGREES, 4),
      },
      topologyCellCount: region.topologyCellCount,
      areaWeight: round(region.areaWeight, 6),
      landAreaShare: round(landAreaShare, 4),
      waterAreaShare: round(waterAreaShare, 4),
      dominantBiomes: biomeNames
        .map((biome) => ({ biome, share: round(region.biomeArea[biome] / area, 4) }))
        .filter((entry) => entry.share > 0)
        .sort((left, right) => right.share - left.share || left.biome.localeCompare(right.biome))
        .slice(0, 4),
      highestPoint: region.highestCell >= 0
        ? {
            topologyCellId: region.highestCell,
            latitude: round(topology.latitudes[region.highestCell] * RADIANS_TO_DEGREES, 4),
            longitude: round(topology.longitudes[region.highestCell] * RADIANS_TO_DEGREES, 4),
            elevation: round(region.highestElevation, 6),
          }
        : null,
      largestRiver: region.largestRiverCell >= 0 && region.largestRiverSignal > 0
        ? {
            topologyCellId: region.largestRiverCell,
            latitude: round(topology.latitudes[region.largestRiverCell] * RADIANS_TO_DEGREES, 4),
            longitude: round(topology.longitudes[region.largestRiverCell] * RADIANS_TO_DEGREES, 4),
            signal: round(region.largestRiverSignal, 6),
          }
        : null,
      hexCoverage: [hexCoverageForLatLonBounds(hexOverlay, bounds, 'world-60mi')],
      neighborRegionIds: [...region.neighborIndexes].map((neighborIndex) => regionIds[neighborIndex]).sort(),
      boundaryRationale,
      diagnostics: {
        areaShare: round(areaShare, 8),
        compactness: round(graphCompactness(region.topologyCellCount, region.boundaryEdgeCount), 6),
        cohesion: round(1 - region.boundaryEdgeCount / Math.max(1, region.topologyCellCount * 4), 6),
        connectedComponentCount: componentCounts[index] ?? 0,
        boundaryEdgeCount: region.boundaryEdgeCount,
        geographicBoundaryShare: round(
          region.geographicBoundaryEdges / Math.max(1, region.boundaryEdgeCount),
          6,
        ),
        sliver: areaShare < minimumAreaShare
          && (surfaceDomains[region.parentDomainIndex]?.targetRegionCount ?? 1) > 1,
      },
      subdivision: {
        scheme: GEOGRAPHIC_REGION_ALGORITHM_VERSION,
        childLevel: 'subregion',
        status: 'deferred',
      },
    };
  });
}

function collectDomainCandidates(
  topology: CubedSphereTopology,
  domainIndexByTopologyCell: Uint16Array,
  domainIndex: number,
  maximumCandidateCells: number,
  seedText: string,
): number[] {
  const domainCellCount = countDomainCells(domainIndexByTopologyCell, domainIndex);
  const stride = Math.max(1, Math.floor(domainCellCount / Math.max(1, maximumCandidateCells)));
  const offset = hashText(`${seedText}:offset`) % stride;
  const candidates: number[] = [];
  let seen = 0;
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (domainIndexByTopologyCell[cell] !== domainIndex) continue;
    if (seen % stride === offset) candidates.push(cell);
    seen += 1;
  }
  return candidates;
}

function countDomainCells(domainIndexByTopologyCell: Uint16Array, domainIndex: number): number {
  let count = 0;
  for (const value of domainIndexByTopologyCell) if (value === domainIndex) count += 1;
  return count;
}

function connectedComponentCounts(
  topology: CubedSphereTopology,
  membership: Uint16Array,
  regionCount: number,
): number[] {
  const adjacency = geographicTopologyAdjacency(topology);
  const visited = new Uint8Array(topology.cellCount);
  const queue = new Int32Array(topology.cellCount);
  const counts = Array.from({ length: regionCount }, () => 0);

  for (let start = 0; start < topology.cellCount; start += 1) {
    if (visited[start] === 1) continue;
    const regionIndex = membership[start];
    visited[start] = 1;
    if (regionIndex === UNASSIGNED_REGION || regionIndex >= regionCount) continue;
    counts[regionIndex] += 1;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    while (head < tail) {
      const cell = queue[head++];
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor < 0 || visited[neighbor] === 1 || membership[neighbor] !== regionIndex) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
  }

  return counts;
}

function makePartitionSeedConnected(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  seeds: GeographicRegionSeed[],
  domainIndexByTopologyCell: Uint16Array,
): void {
  const adjacency = geographicTopologyAdjacency(topology);
  const visited = new Uint8Array(topology.cellCount);
  const queue = new Int32Array(topology.cellCount);
  const connected = new Uint16Array(topology.cellCount);
  connected.fill(UNASSIGNED_REGION);
  for (let regionIndex = 0; regionIndex < seeds.length; regionIndex += 1) {
    let head = 0;
    let tail = 0;
    const seedCell = seeds[regionIndex].topologyCellId;
    queue[tail++] = seedCell;
    visited[seedCell] = 1;
    connected[seedCell] = regionIndex;
    while (head < tail) {
      const cell = queue[head++];
      for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
        const neighbor = adjacency.neighbors[offset];
        if (neighbor < 0 || visited[neighbor] === 1 || membership[neighbor] !== regionIndex) continue;
        visited[neighbor] = 1;
        connected[neighbor] = regionIndex;
        queue[tail++] = neighbor;
      }
    }
  }

  const distances = new Float64Array(topology.cellCount);
  distances.fill(Number.POSITIVE_INFINITY);
  const heap = new RegionMinHeap();
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (connected[cell] === UNASSIGNED_REGION) continue;
    distances[cell] = 0;
    heap.push(0, cell, connected[cell]);
  }
  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || current.cost > distances[current.cell] + 1e-9) continue;
    for (let offset = adjacency.offsets[current.cell]; offset < adjacency.offsets[current.cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (neighbor < 0 || connected[neighbor] !== UNASSIGNED_REGION) continue;
      if (domainIndexByTopologyCell[neighbor] !== seeds[current.regionIndex].parentDomainIndex) continue;
      const nextCost = current.cost + traversalCost(
        current.cell,
        neighbor,
        seeds[current.regionIndex].water,
        layers,
      );
      if (nextCost + 1e-9 >= distances[neighbor]) continue;
      distances[neighbor] = nextCost;
      connected[neighbor] = current.regionIndex;
      heap.push(nextCost, neighbor, current.regionIndex);
    }
  }
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (connected[cell] !== UNASSIGNED_REGION) {
      membership[cell] = connected[cell];
    } else {
      const previous = membership[cell];
      if (
        previous !== UNASSIGNED_REGION
        && seeds[previous]?.parentDomainIndex === domainIndexByTopologyCell[cell]
      ) {
        membership[cell] = previous;
      }
    }
  }
}

function collectCandidates(
  topology: CubedSphereTopology,
  water: Uint8Array,
  targetWater: boolean,
  maximumCandidateCells: number,
  seedText: string,
): number[] {
  const stride = Math.max(1, Math.floor(topology.cellCount / maximumCandidateCells));
  const offset = hashText(`${seedText}:${targetWater ? 'water' : 'land'}:offset`) % stride;
  const candidates: number[] = [];
  for (let cell = offset; cell < topology.cellCount; cell += stride) {
    if ((water[cell] === 1) === targetWater) candidates.push(cell);
  }
  if (candidates.length > 0) return candidates;

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if ((water[cell] === 1) === targetWater) candidates.push(cell);
  }
  return candidates;
}

function selectFarthestSeeds(
  topology: CubedSphereTopology,
  candidates: number[],
  targetCount: number,
  seedText: string,
): number[] {
  if (targetCount <= 0 || candidates.length === 0) return [];
  const selected: number[] = [];
  const firstIndex = hashText(`${seedText}:first`) % candidates.length;
  selected.push(candidates[firstIndex]);

  while (selected.length < Math.min(targetCount, candidates.length)) {
    let bestCell = -1;
    let bestDistance = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      if (selected.includes(candidate)) continue;
      let minimumDistance = Number.POSITIVE_INFINITY;
      for (const seed of selected) {
        minimumDistance = Math.min(minimumDistance, chordDistanceSquared(topology.positions, candidate, seed));
      }
      const tieBreaker = (hashText(`${seedText}:${candidate}`) & 0xffff) / 0xffff * 1e-8;
      const score = minimumDistance + tieBreaker;
      if (score > bestDistance || (score === bestDistance && candidate < bestCell)) {
        bestDistance = score;
        bestCell = candidate;
      }
    }
    if (bestCell < 0) break;
    selected.push(bestCell);
  }

  return selected;
}

function chordDistanceSquared(positions: Float32Array, leftCell: number, rightCell: number): number {
  const left = leftCell * 3;
  const right = rightCell * 3;
  const dx = positions[left] - positions[right];
  const dy = positions[left + 1] - positions[right + 1];
  const dz = positions[left + 2] - positions[right + 2];
  return dx * dx + dy * dy + dz * dz;
}

function boundaryReasons(
  left: number,
  right: number,
  layers: GeographicRegionInputLayers,
): GeographicRegionBoundaryKind[] {
  const reasons: GeographicRegionBoundaryKind[] = [];
  if (layers.water[left] !== layers.water[right]) reasons.push('coastline');
  if (Math.abs(layers.elevation[left] - layers.elevation[right]) >= 0.08) reasons.push('elevation-break');
  if (layers.biomes[left] !== layers.biomes[right]) reasons.push('biome-transition');
  if (
    Math.abs(layers.temperature[left] - layers.temperature[right]) >= 6
    || Math.abs(layers.wetness[left] - layers.wetness[right]) >= 0.22
  ) reasons.push('climate-transition');
  if (
    layers.lakes[left] !== layers.lakes[right]
    || Math.abs(layers.river[left] - layers.river[right]) >= 0.35
  ) reasons.push('hydrology-transition');
  if (layers.plates[left] !== layers.plates[right]) reasons.push('plate-boundary');
  return reasons.length > 0 ? reasons : ['distance-balance'];
}

function isMeridionalBoundary(topology: CubedSphereTopology, left: number, right: number): boolean {
  const leftLatitude = topology.latitudes[left] * RADIANS_TO_DEGREES;
  const rightLatitude = topology.latitudes[right] * RADIANS_TO_DEGREES;
  const meanLatitudeRadians = (topology.latitudes[left] + topology.latitudes[right]) / 2;
  const latitudeDelta = Math.abs(leftLatitude - rightLatitude);
  const longitudeDelta = Math.abs(wrappedLongitudeDelta(
    topology.longitudes[left] * RADIANS_TO_DEGREES,
    topology.longitudes[right] * RADIANS_TO_DEGREES,
  )) * Math.max(0.1, Math.cos(meanLatitudeRadians));
  return longitudeDelta > latitudeDelta;
}

function vectorCenter(region: RegionAccumulator): { latitude: number; longitude: number } {
  const length = Math.hypot(region.centerX, region.centerY, region.centerZ);
  if (length <= 1e-9) return { latitude: 0, longitude: 0 };
  const x = region.centerX / length;
  const y = region.centerY / length;
  const z = region.centerZ / length;
  return {
    latitude: round(Math.asin(y) * RADIANS_TO_DEGREES, 4),
    longitude: round(Math.atan2(z, x) * RADIANS_TO_DEGREES, 4),
  };
}

function regionBounds(region: RegionAccumulator) {
  const normalSpan = region.longitudeMax - region.longitudeMin;
  const wrapsLongitude = normalSpan > 180
    && Number.isFinite(region.minimumPositiveLongitude)
    && Number.isFinite(region.maximumNegativeLongitude);
  return {
    minLatitude: round(Number.isFinite(region.latitudeMin) ? region.latitudeMin : 0, 4),
    maxLatitude: round(Number.isFinite(region.latitudeMax) ? region.latitudeMax : 0, 4),
    minLongitude: round(
      wrapsLongitude ? region.minimumPositiveLongitude : (Number.isFinite(region.longitudeMin) ? region.longitudeMin : 0),
      4,
    ),
    maxLongitude: round(
      wrapsLongitude ? region.maximumNegativeLongitude : (Number.isFinite(region.longitudeMax) ? region.longitudeMax : 0),
      4,
    ),
    wrapsLongitude,
  };
}

function classifyRegion(landAreaShare: number, waterAreaShare: number) {
  if (landAreaShare >= 0.88) return 'land' as const;
  if (waterAreaShare >= 0.9) return 'water' as const;
  if (waterAreaShare >= 0.4 && landAreaShare >= 0.1) return 'archipelago' as const;
  return 'mixed' as const;
}

function graphCompactness(cellCount: number, boundaryEdgeCount: number): number {
  if (cellCount <= 0) return 0;
  if (boundaryEdgeCount <= 0) return 1;
  return Math.max(0, Math.min(1, (4 * Math.PI * cellCount) / (boundaryEdgeCount ** 2)));
}

function emptyBiomeRecord(): Record<Biome, number> {
  return Object.fromEntries(biomeNames.map((biome) => [biome, 0])) as Record<Biome, number>;
}

function emptyBoundaryRecord(): Record<GeographicRegionBoundaryKind, number> {
  return Object.fromEntries(BOUNDARY_KINDS.map((kind) => [kind, 0])) as Record<GeographicRegionBoundaryKind, number>;
}

function validateInputs(topology: CubedSphereTopology, layers: GeographicRegionInputLayers): void {
  const lengths = [
    layers.elevation.length,
    layers.water.length,
    layers.plates.length,
    layers.temperature.length,
    layers.wetness.length,
    layers.biomes.length,
    layers.river.length,
    layers.lakes.length,
  ];
  if (lengths.some((length) => length !== topology.cellCount)) {
    throw new Error('Geographic region input layers must match the topology cell count.');
  }
}

function countUnassigned(membership: Uint16Array): number {
  let count = 0;
  for (const value of membership) if (value === UNASSIGNED_REGION) count += 1;
  return count;
}

function regionSetSignature(seeds: GeographicRegionSeed[], membership: Uint16Array): string {
  let hash = 0x811c9dc5;
  const addByte = (value: number) => {
    hash = Math.imul(hash ^ (value & 0xff), 0x01000193) >>> 0;
  };
  for (const character of GEOGRAPHIC_REGION_ALGORITHM_VERSION) addByte(character.charCodeAt(0));
  for (const seed of seeds) {
    addByte(seed.topologyCellId);
    addByte(seed.topologyCellId >>> 8);
    addByte(seed.topologyCellId >>> 16);
    addByte(seed.topologyCellId >>> 24);
    addByte(seed.water ? 1 : 0);
    addByte(seed.parentDomainIndex);
    addByte(seed.parentDomainIndex >>> 8);
  }
  for (const regionIndex of membership) {
    addByte(regionIndex);
    addByte(regionIndex >>> 8);
  }
  return `wfr-v2-${hash.toString(16).padStart(8, '0')}`;
}

function sumArea(areaWeights: Float32Array): number {
  let total = 0;
  for (const area of areaWeights) total += area || 1;
  return total;
}

function regionId(seedTopologyCellId: number): string {
  return `region-v2-c${String(seedTopologyCellId).padStart(8, '0')}`;
}

function wrappedLongitudeDelta(left: number, right: number): number {
  let delta = right - left;
  while (delta < -180) delta += 360;
  while (delta > 180) delta -= 360;
  return delta;
}

function hashText(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

class RegionMinHeap {
  private readonly costs: number[] = [];
  private readonly cells: number[] = [];
  private readonly regions: number[] = [];

  get size(): number {
    return this.costs.length;
  }

  push(cost: number, cell: number, regionIndex: number): void {
    let index = this.costs.length;
    this.costs.push(cost);
    this.cells.push(cell);
    this.regions.push(regionIndex);

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.precedes(index, parent)) break;
      this.swap(index, parent);
      index = parent;
    }
  }

  pop(): { cost: number; cell: number; regionIndex: number } | null {
    if (this.costs.length === 0) return null;
    const result = {
      cost: this.costs[0],
      cell: this.cells[0],
      regionIndex: this.regions[0],
    };
    const last = this.costs.length - 1;
    if (last === 0) {
      this.costs.pop();
      this.cells.pop();
      this.regions.pop();
      return result;
    }

    this.costs[0] = this.costs[last];
    this.cells[0] = this.cells[last];
    this.regions[0] = this.regions[last];
    this.costs.pop();
    this.cells.pop();
    this.regions.pop();

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let next = index;
      if (left < this.costs.length && this.precedes(left, next)) next = left;
      if (right < this.costs.length && this.precedes(right, next)) next = right;
      if (next === index) break;
      this.swap(index, next);
      index = next;
    }

    return result;
  }

  private precedes(left: number, right: number): boolean {
    if (this.costs[left] !== this.costs[right]) return this.costs[left] < this.costs[right];
    if (this.regions[left] !== this.regions[right]) return this.regions[left] < this.regions[right];
    return this.cells[left] < this.cells[right];
  }

  private swap(left: number, right: number): void {
    [this.costs[left], this.costs[right]] = [this.costs[right], this.costs[left]];
    [this.cells[left], this.cells[right]] = [this.cells[right], this.cells[left]];
    [this.regions[left], this.regions[right]] = [this.regions[right], this.regions[left]];
  }
}
