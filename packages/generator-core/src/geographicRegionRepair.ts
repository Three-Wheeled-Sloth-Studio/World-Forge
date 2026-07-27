import {
  biomeNames,
  codeToBiome,
  type Biome,
  type CubedSphereTopology,
  type WorldHexOverlay,
} from '@world-forge/shared';
import {
  GEOGRAPHIC_REGION_ALGORITHM_VERSION,
  GEOGRAPHIC_REGION_SLIVER_REPAIR_VERSION,
  type GeographicRegionBoundaryKind,
  type GeographicRegionInputLayers,
  type GeographicWorldRegionSetV2,
  type GeographicWorldRegionV2,
} from '@world-forge/shared/geographicRegions';
import { hexCoverageForLatLonBounds } from './worldHexOverlay';
import { geographicTopologyAdjacency } from './geographicTopologyAdjacency';
import { assignInteriorRegionLabelPoints } from './geographicRegionLabels';

const UNASSIGNED_REGION = 0xffff;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const MINIMUM_SURVIVING_REGION_COUNT = 4;
const BOUNDARY_KINDS: GeographicRegionBoundaryKind[] = [
  'coastline',
  'elevation-break',
  'biome-transition',
  'climate-transition',
  'hydrology-transition',
  'plate-boundary',
  'distance-balance',
];

type RegionAreaStats = {
  area: number;
  landArea: number;
  waterArea: number;
};

type MergeBoundaryStats = {
  targetRegionIndex: number;
  sharedBoundaryEdges: number;
  geographicBoundaryEdges: number;
  sameSurfaceClass: boolean;
};

type RegionAccumulator = RegionAreaStats & {
  seedTopologyCellId: number;
  id: string;
  parentDomainId: string;
  topologyCellCount: number;
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

type BoundarySummary = {
  boundaryEdgeCount: number;
  geographicBoundaryEdges: number;
  coastlineBoundaryEdges: number;
  meridionalBoundaryEdges: number;
};

export function repairGeographicRegionSlivers(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  hexOverlay: WorldHexOverlay,
  initial: GeographicWorldRegionSetV2,
): GeographicWorldRegionSetV2 {
  if (initial.membership.regionIndexByTopologyCell.length !== topology.cellCount) {
    throw new Error('Geographic region repair requires complete topology membership.');
  }

  const membership = new Uint16Array(initial.membership.regionIndexByTopologyCell);
  const active = new Set(initial.regions.map((region) => region.index));
  const merges: NonNullable<GeographicWorldRegionSetV2['repair']>['merges'] = [];
  const minimumAreaShare = initial.scaleBudget.minAreaShare;
  const parentDomainIdByRegion = initial.regions.map((region) => region.parentDomainId);

  while (active.size > MINIMUM_SURVIVING_REGION_COUNT) {
    const stats = summarizeAreas(topology, layers, membership, initial.regions.length);
    const totalArea = stats.reduce((sum, region) => sum + region.area, 0);
    const activeCountByParent = new Map<string, number>();
    for (const regionIndex of active) {
      const parentId = parentDomainIdByRegion[regionIndex];
      activeCountByParent.set(parentId, (activeCountByParent.get(parentId) ?? 0) + 1);
    }
    const donors = [...active]
      .filter((regionIndex) => stats[regionIndex].area / Math.max(0.000001, totalArea) < minimumAreaShare)
      .filter((regionIndex) => (activeCountByParent.get(parentDomainIdByRegion[regionIndex]) ?? 0) > 1)
      .sort((left, right) => stats[left].area - stats[right].area || left - right);
    let donor: number | undefined;
    let mergeTarget: MergeBoundaryStats | null = null;
    for (const candidate of donors) {
      mergeTarget = selectMergeTarget(
        topology,
        layers,
        membership,
        active,
        stats,
        candidate,
        parentDomainIdByRegion,
      );
      if (mergeTarget) {
        donor = candidate;
        break;
      }
    }
    if (donor === undefined || !mergeTarget) break;
    const removedRegionId = initial.regions[donor]?.id ?? `region-${donor}`;
    const retainedRegionId = initial.regions[mergeTarget.targetRegionIndex]?.id ?? `region-${mergeTarget.targetRegionIndex}`;

    for (let cell = 0; cell < membership.length; cell += 1) {
      if (membership[cell] === donor) membership[cell] = mergeTarget.targetRegionIndex;
    }
    active.delete(donor);
    merges.push({
      removedRegionId,
      retainedRegionId,
      sharedBoundaryEdges: mergeTarget.sharedBoundaryEdges,
      geographicBoundaryShare: round(
        mergeTarget.geographicBoundaryEdges / Math.max(1, mergeTarget.sharedBoundaryEdges),
        6,
      ),
      sameSurfaceClass: mergeTarget.sameSurfaceClass,
    });
  }

  return rebuildRegionSet(topology, layers, hexOverlay, initial, membership, active, merges);
}

function selectMergeTarget(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  active: Set<number>,
  stats: RegionAreaStats[],
  donor: number,
  parentDomainIdByRegion: string[],
): MergeBoundaryStats | null {
  const adjacency = geographicTopologyAdjacency(topology);
  const byTarget = new Map<number, MergeBoundaryStats>();
  const donorWater = majorityWater(stats[donor]);

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (membership[cell] !== donor) continue;
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (neighbor < 0) continue;
      const target = membership[neighbor];
      if (target === donor || target === UNASSIGNED_REGION || !active.has(target)) continue;
      if (parentDomainIdByRegion[target] !== parentDomainIdByRegion[donor]) continue;
      const current = byTarget.get(target) ?? {
        targetRegionIndex: target,
        sharedBoundaryEdges: 0,
        geographicBoundaryEdges: 0,
        sameSurfaceClass: donorWater === majorityWater(stats[target]),
      };
      current.sharedBoundaryEdges += 1;
      if (boundaryReasons(cell, neighbor, layers).some((reason) => reason !== 'distance-balance')) {
        current.geographicBoundaryEdges += 1;
      }
      byTarget.set(target, current);
    }
  }

  const candidates = [...byTarget.values()];
  candidates.sort((left, right) => {
    if (left.sameSurfaceClass !== right.sameSurfaceClass) return left.sameSurfaceClass ? -1 : 1;
    const leftGeographicShare = left.geographicBoundaryEdges / Math.max(1, left.sharedBoundaryEdges);
    const rightGeographicShare = right.geographicBoundaryEdges / Math.max(1, right.sharedBoundaryEdges);
    if (leftGeographicShare !== rightGeographicShare) return leftGeographicShare - rightGeographicShare;
    if (left.sharedBoundaryEdges !== right.sharedBoundaryEdges) return right.sharedBoundaryEdges - left.sharedBoundaryEdges;
    if (stats[left.targetRegionIndex].area !== stats[right.targetRegionIndex].area) {
      return stats[right.targetRegionIndex].area - stats[left.targetRegionIndex].area;
    }
    return left.targetRegionIndex - right.targetRegionIndex;
  });
  return candidates[0] ?? null;
}

function summarizeAreas(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  regionCount: number,
): RegionAreaStats[] {
  const stats = Array.from({ length: regionCount }, () => ({ area: 0, landArea: 0, waterArea: 0 }));
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const regionIndex = membership[cell];
    if (regionIndex === UNASSIGNED_REGION || regionIndex >= regionCount) continue;
    const area = topology.areaWeights[cell] || 1;
    stats[regionIndex].area += area;
    if (layers.water[cell] === 1) stats[regionIndex].waterArea += area;
    else stats[regionIndex].landArea += area;
  }
  return stats;
}

function rebuildRegionSet(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  hexOverlay: WorldHexOverlay,
  initial: GeographicWorldRegionSetV2,
  oldMembership: Uint16Array,
  active: Set<number>,
  merges: NonNullable<GeographicWorldRegionSetV2['repair']>['merges'],
): GeographicWorldRegionSetV2 {
  const survivors = [...active].sort((left, right) => {
    const leftSeed = initial.regions[left]?.seedTopologyCellId ?? Number.MAX_SAFE_INTEGER;
    const rightSeed = initial.regions[right]?.seedTopologyCellId ?? Number.MAX_SAFE_INTEGER;
    return leftSeed - rightSeed || left - right;
  });
  const compactIndexByOld = new Map(survivors.map((oldIndex, newIndex) => [oldIndex, newIndex]));
  const membership = new Uint16Array(topology.cellCount);
  membership.fill(UNASSIGNED_REGION);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const compactIndex = compactIndexByOld.get(oldMembership[cell]);
    if (compactIndex !== undefined) membership[cell] = compactIndex;
  }

  const accumulators = survivors.map((oldIndex) => {
    const source = initial.regions[oldIndex];
    return createAccumulator(
      source?.id ?? `region-${oldIndex}`,
      source?.seedTopologyCellId ?? 0,
      source?.parentDomainId ?? 'primary-world',
    );
  });
  accumulateCells(topology, layers, membership, accumulators);
  const boundarySummary = accumulateBoundaries(topology, layers, membership, accumulators);
  const componentCounts = connectedComponentCounts(topology, membership, accumulators.length);
  const totalArea = accumulators.reduce((sum, region) => sum + region.area, 0);
  const regions = assignInteriorRegionLabelPoints(
    topology,
    membership,
    finalizeRegions(
      topology,
      accumulators,
      componentCounts,
      totalArea,
      initial.scaleBudget.minAreaShare,
      hexOverlay,
    ),
  );
  const regionCountByParent = new Map<string, number>();
  for (const region of regions) {
    regionCountByParent.set(region.parentDomainId, (regionCountByParent.get(region.parentDomainId) ?? 0) + 1);
  }
  for (const region of regions) {
    if ((regionCountByParent.get(region.parentDomainId) ?? 0) === 1) {
      region.diagnostics.sliver = false;
    }
  }
  const areaShares = regions.map((region) => region.diagnostics.areaShare);
  const unresolvedSliverCount = regions.filter((region) => region.diagnostics.sliver).length;
  const domainKindById = new Map(initial.surfaceDomains.map((domain) => [domain.id, domain.kind]));

  return {
    ...initial,
    membership: {
      encoding: 'uint16-region-index',
      regionIndexByTopologyCell: membership,
    },
    regions,
    crossRegionEntities: [],
    diagnostics: {
      targetRegionCount: initial.scaleBudget.targetRegionCount,
      actualRegionCount: regions.length,
      unassignedCellCount: countUnassigned(membership),
      disconnectedRegionCount: regions.filter((region, index) => (
        componentCounts[index] > 1 && domainKindById.get(region.parentDomainId) !== 'archipelago'
      )).length,
      sliverRegionCount: unresolvedSliverCount,
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
      surfaceDomainCount: initial.diagnostics.surfaceDomainCount,
      landmassDomainCount: initial.diagnostics.landmassDomainCount,
      archipelagoDomainCount: initial.diagnostics.archipelagoDomainCount,
      openOceanDomainCount: initial.diagnostics.openOceanDomainCount,
    },
    repair: {
      modelVersion: GEOGRAPHIC_REGION_SLIVER_REPAIR_VERSION,
      initialRegionCount: initial.regions.length,
      finalRegionCount: regions.length,
      mergeCount: merges.length,
      unresolvedSliverCount,
      merges,
    },
    signature: repairedSignature(regions, membership),
  };
}

function createAccumulator(id: string, seedTopologyCellId: number, parentDomainId: string): RegionAccumulator {
  return {
    id,
    parentDomainId,
    seedTopologyCellId,
    topologyCellCount: 0,
    area: 0,
    landArea: 0,
    waterArea: 0,
    biomeArea: Object.fromEntries(biomeNames.map((biome) => [biome, 0])) as Record<Biome, number>,
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
    boundaryKinds: Object.fromEntries(BOUNDARY_KINDS.map((kind) => [kind, 0])) as Record<GeographicRegionBoundaryKind, number>,
  };
}

function accumulateCells(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  accumulators: RegionAccumulator[],
): void {
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const regionIndex = membership[cell];
    const region = accumulators[regionIndex];
    if (!region) continue;
    const area = topology.areaWeights[cell] || 1;
    const water = layers.water[cell] === 1;
    const latitude = topology.latitudes[cell] * RADIANS_TO_DEGREES;
    const longitude = topology.longitudes[cell] * RADIANS_TO_DEGREES;
    const positionOffset = cell * 3;

    region.topologyCellCount += 1;
    region.area += area;
    if (water) region.waterArea += area;
    else region.landArea += area;
    region.biomeArea[codeToBiome(layers.biomes[cell])] += area;
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

function accumulateBoundaries(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  accumulators: RegionAccumulator[],
): BoundarySummary {
  const adjacency = geographicTopologyAdjacency(topology);
  const summary: BoundarySummary = {
    boundaryEdgeCount: 0,
    geographicBoundaryEdges: 0,
    coastlineBoundaryEdges: 0,
    meridionalBoundaryEdges: 0,
  };
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const leftIndex = membership[cell];
    if (!accumulators[leftIndex]) continue;
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (neighbor <= cell) continue;
      const rightIndex = membership[neighbor];
      if (rightIndex === leftIndex || !accumulators[rightIndex]) continue;
      summary.boundaryEdgeCount += 1;
      const left = accumulators[leftIndex];
      const right = accumulators[rightIndex];
      left.neighborIndexes.add(rightIndex);
      right.neighborIndexes.add(leftIndex);
      left.boundaryEdgeCount += 1;
      right.boundaryEdgeCount += 1;
      const reasons = boundaryReasons(cell, neighbor, layers);
      if (reasons.some((reason) => reason !== 'distance-balance')) {
        summary.geographicBoundaryEdges += 1;
        left.geographicBoundaryEdges += 1;
        right.geographicBoundaryEdges += 1;
      }
      if (reasons.includes('coastline')) summary.coastlineBoundaryEdges += 1;
      if (isMeridionalBoundary(topology, cell, neighbor)) summary.meridionalBoundaryEdges += 1;
      for (const reason of reasons) {
        left.boundaryKinds[reason] += 1;
        right.boundaryKinds[reason] += 1;
      }
    }
  }
  return summary;
}

function finalizeRegions(
  topology: CubedSphereTopology,
  accumulators: RegionAccumulator[],
  componentCounts: number[],
  totalArea: number,
  minimumAreaShare: number,
  hexOverlay: WorldHexOverlay,
): GeographicWorldRegionV2[] {
  return accumulators.map((region, index) => {
    const area = Math.max(0.000001, region.area);
    const areaShare = region.area / Math.max(0.000001, totalArea);
    const landAreaShare = region.landArea / area;
    const waterAreaShare = region.waterArea / area;
    const bounds = regionBounds(region);
    return {
      id: region.id,
      index,
      level: 'region',
      parentId: region.parentDomainId,
      parentDomainId: region.parentDomainId,
      label: `Region ${index + 1}`,
      classification: classifyRegion(landAreaShare, waterAreaShare),
      seedTopologyCellId: region.seedTopologyCellId,
      bounds,
      center: vectorCenter(region),
      labelPoint: {
        topologyCellId: region.seedTopologyCellId,
        latitude: round(topology.latitudes[region.seedTopologyCellId] * RADIANS_TO_DEGREES, 4),
        longitude: round(topology.longitudes[region.seedTopologyCellId] * RADIANS_TO_DEGREES, 4),
      },
      topologyCellCount: region.topologyCellCount,
      areaWeight: round(region.area, 6),
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
      neighborRegionIds: [...region.neighborIndexes].map((neighborIndex) => accumulators[neighborIndex].id).sort(),
      boundaryRationale: BOUNDARY_KINDS
        .filter((kind) => region.boundaryKinds[kind] > 0)
        .map((kind) => ({
          kind,
          edgeCount: region.boundaryKinds[kind],
          share: round(region.boundaryKinds[kind] / Math.max(1, region.boundaryEdgeCount), 4),
        }))
        .sort((left, right) => right.edgeCount - left.edgeCount || left.kind.localeCompare(right.kind)),
      diagnostics: {
        areaShare: round(areaShare, 8),
        compactness: round(graphCompactness(region.topologyCellCount, region.boundaryEdgeCount), 6),
        cohesion: round(1 - region.boundaryEdgeCount / Math.max(1, region.topologyCellCount * 4), 6),
        connectedComponentCount: componentCounts[index] ?? 0,
        boundaryEdgeCount: region.boundaryEdgeCount,
        geographicBoundaryShare: round(region.geographicBoundaryEdges / Math.max(1, region.boundaryEdgeCount), 6),
        sliver: areaShare < minimumAreaShare,
      },
      subdivision: {
        scheme: GEOGRAPHIC_REGION_ALGORITHM_VERSION,
        childLevel: 'subregion',
        status: 'deferred',
      },
    };
  });
}

function connectedComponentCounts(
  topology: CubedSphereTopology,
  membership: Uint16Array,
  regionCount: number,
): number[] {
  const adjacency = geographicTopologyAdjacency(topology);
  const counts = Array.from({ length: regionCount }, () => 0);
  const visited = new Uint8Array(topology.cellCount);
  const queue = new Int32Array(topology.cellCount);
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
      for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
        const neighbor = adjacency.neighbors[offset];
        if (neighbor < 0 || visited[neighbor] === 1 || membership[neighbor] !== regionIndex) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
  }
  return counts;
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

function majorityWater(stats: RegionAreaStats): boolean {
  return stats.waterArea > stats.landArea;
}

function classifyRegion(landAreaShare: number, waterAreaShare: number) {
  if (landAreaShare >= 0.88) return 'land' as const;
  if (waterAreaShare >= 0.9) return 'water' as const;
  if (waterAreaShare >= 0.4 && landAreaShare >= 0.1) return 'archipelago' as const;
  return 'mixed' as const;
}

function vectorCenter(region: RegionAccumulator): { latitude: number; longitude: number } {
  const length = Math.hypot(region.centerX, region.centerY, region.centerZ);
  if (length <= 1e-9) return { latitude: 0, longitude: 0 };
  return {
    latitude: round(Math.asin(region.centerY / length) * RADIANS_TO_DEGREES, 4),
    longitude: round(Math.atan2(region.centerZ / length, region.centerX / length) * RADIANS_TO_DEGREES, 4),
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

function isMeridionalBoundary(topology: CubedSphereTopology, left: number, right: number): boolean {
  const latitudeDelta = Math.abs((topology.latitudes[left] - topology.latitudes[right]) * RADIANS_TO_DEGREES);
  const meanLatitude = (topology.latitudes[left] + topology.latitudes[right]) / 2;
  let longitudeDelta = (topology.longitudes[right] - topology.longitudes[left]) * RADIANS_TO_DEGREES;
  while (longitudeDelta < -180) longitudeDelta += 360;
  while (longitudeDelta > 180) longitudeDelta -= 360;
  return Math.abs(longitudeDelta) * Math.max(0.1, Math.cos(meanLatitude)) > latitudeDelta;
}

function repairedSignature(regions: GeographicWorldRegionV2[], membership: Uint16Array): string {
  let hash = 0x811c9dc5;
  const addByte = (value: number) => {
    hash = Math.imul(hash ^ (value & 0xff), 0x01000193) >>> 0;
  };
  for (const character of `${GEOGRAPHIC_REGION_ALGORITHM_VERSION}:${GEOGRAPHIC_REGION_SLIVER_REPAIR_VERSION}`) {
    addByte(character.charCodeAt(0));
  }
  for (const region of regions) {
    addByte(region.seedTopologyCellId);
    addByte(region.seedTopologyCellId >>> 8);
    addByte(region.seedTopologyCellId >>> 16);
    addByte(region.seedTopologyCellId >>> 24);
    for (const character of region.parentDomainId) addByte(character.charCodeAt(0));
  }
  for (const regionIndex of membership) {
    addByte(regionIndex);
    addByte(regionIndex >>> 8);
  }
  return `wfr-v2-${hash.toString(16).padStart(8, '0')}`;
}

function graphCompactness(cellCount: number, boundaryEdgeCount: number): number {
  if (cellCount <= 0) return 0;
  if (boundaryEdgeCount <= 0) return 1;
  return Math.max(0, Math.min(1, (4 * Math.PI * cellCount) / (boundaryEdgeCount ** 2)));
}

function countUnassigned(membership: Uint16Array): number {
  let count = 0;
  for (const regionIndex of membership) if (regionIndex === UNASSIGNED_REGION) count += 1;
  return count;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
