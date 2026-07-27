import type { CubedSphereTopology } from '@world-forge/shared';
import type {
  GeographicRegionEvaluation,
  GeographicRegionInputLayers,
  GeographicWorldRegionSetV2,
} from '@world-forge/shared/geographicRegions';

const UNASSIGNED_REGION = 0xffff;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export function evaluateGeographicRegionSet(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  regionSet: GeographicWorldRegionSetV2,
): GeographicRegionEvaluation {
  const membership = regionSet.membership.regionIndexByTopologyCell;
  const regionCount = regionSet.regions.length;
  const regionCellCounts = Array.from({ length: regionCount }, () => 0);
  const regionAreas = Array.from({ length: regionCount }, () => 0);
  let assignedCellCount = 0;
  let validMembership = membership.length === topology.cellCount;

  for (let cell = 0; cell < Math.min(membership.length, topology.cellCount); cell += 1) {
    const regionIndex = membership[cell];
    if (regionIndex === UNASSIGNED_REGION) continue;
    if (regionIndex >= regionCount) {
      validMembership = false;
      continue;
    }
    assignedCellCount += 1;
    regionCellCounts[regionIndex] += 1;
    regionAreas[regionIndex] += topology.areaWeights[cell] || 1;
  }

  const regionComponentCounts = componentCounts(topology, membership, regionCount);
  const totalArea = regionAreas.reduce((sum, area) => sum + area, 0);
  const areaShares = regionAreas.map((area) => area / Math.max(0.000001, totalArea));
  const boundaries = boundaryMetrics(topology, layers, membership, regionCount);
  const sliverRegionCount = areaShares.filter((share) => share < regionSet.scaleBudget.minAreaShare).length;

  return {
    modelVersion: 'geographic-region-evaluation-v1',
    signature: evaluationSignature(regionSet, membership),
    validMembership: validMembership && assignedCellCount === topology.cellCount,
    cellCount: topology.cellCount,
    assignedCellCount,
    regionCount,
    disconnectedRegionCount: regionComponentCounts.filter((count) => count > 1).length,
    sliverRegionCount,
    minimumAreaShare: round(areaShares.length > 0 ? Math.min(...areaShares) : 0, 8),
    maximumAreaShare: round(areaShares.length > 0 ? Math.max(...areaShares) : 0, 8),
    meanAreaShare: round(areaShares.length > 0 ? areaShares.reduce((sum, value) => sum + value, 0) / areaShares.length : 0, 8),
    geographicBoundaryShare: round(boundaries.geographic / Math.max(1, boundaries.total), 6),
    coastlineBoundaryShare: round(boundaries.coastline / Math.max(1, boundaries.total), 6),
    meridionalBoundaryShare: round(boundaries.meridional / Math.max(1, boundaries.total), 6),
    regionComponentCounts,
    regionCellCounts,
  };
}

function componentCounts(
  topology: CubedSphereTopology,
  membership: Uint16Array,
  regionCount: number,
): number[] {
  const counts = Array.from({ length: regionCount }, () => 0);
  if (membership.length !== topology.cellCount) return counts;
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
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (
          neighbor < 0
          || visited[neighbor] === 1
          || membership[neighbor] !== regionIndex
        ) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
  }

  return counts;
}

function boundaryMetrics(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  regionCount: number,
): { total: number; geographic: number; coastline: number; meridional: number } {
  let total = 0;
  let geographic = 0;
  let coastline = 0;
  let meridional = 0;
  if (membership.length !== topology.cellCount) return { total, geographic, coastline, meridional };

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const leftRegion = membership[cell];
    if (leftRegion === UNASSIGNED_REGION || leftRegion >= regionCount) continue;
    for (let direction = 0; direction < 4; direction += 1) {
      const neighbor = topology.neighbors[cell * 4 + direction];
      if (neighbor <= cell) continue;
      const rightRegion = membership[neighbor];
      if (
        rightRegion === UNASSIGNED_REGION
        || rightRegion >= regionCount
        || rightRegion === leftRegion
      ) continue;
      total += 1;
      const coast = layers.water[cell] !== layers.water[neighbor];
      if (coast) coastline += 1;
      if (
        coast
        || Math.abs(layers.elevation[cell] - layers.elevation[neighbor]) >= 0.08
        || layers.biomes[cell] !== layers.biomes[neighbor]
        || Math.abs(layers.temperature[cell] - layers.temperature[neighbor]) >= 6
        || Math.abs(layers.wetness[cell] - layers.wetness[neighbor]) >= 0.22
        || layers.lakes[cell] !== layers.lakes[neighbor]
        || Math.abs(layers.river[cell] - layers.river[neighbor]) >= 0.35
        || layers.plates[cell] !== layers.plates[neighbor]
      ) geographic += 1;
      if (isMeridionalBoundary(topology, cell, neighbor)) meridional += 1;
    }
  }

  return { total, geographic, coastline, meridional };
}

function isMeridionalBoundary(topology: CubedSphereTopology, left: number, right: number): boolean {
  const latitudeDelta = Math.abs(
    (topology.latitudes[left] - topology.latitudes[right]) * RADIANS_TO_DEGREES,
  );
  const meanLatitude = (topology.latitudes[left] + topology.latitudes[right]) / 2;
  const longitudeDelta = Math.abs(wrappedLongitudeDelta(
    topology.longitudes[left] * RADIANS_TO_DEGREES,
    topology.longitudes[right] * RADIANS_TO_DEGREES,
  )) * Math.max(0.1, Math.cos(meanLatitude));
  return longitudeDelta > latitudeDelta;
}

function evaluationSignature(regionSet: GeographicWorldRegionSetV2, membership: Uint16Array): string {
  let hash = 0x811c9dc5;
  const addByte = (value: number) => {
    hash = Math.imul(hash ^ (value & 0xff), 0x01000193) >>> 0;
  };
  for (const character of regionSet.algorithmVersion) addByte(character.charCodeAt(0));
  for (const region of regionSet.regions) {
    addByte(region.seedTopologyCellId);
    addByte(region.seedTopologyCellId >>> 8);
    addByte(region.seedTopologyCellId >>> 16);
    addByte(region.seedTopologyCellId >>> 24);
  }
  for (const regionIndex of membership) {
    addByte(regionIndex);
    addByte(regionIndex >>> 8);
  }
  return `wfre-v1-${hash.toString(16).padStart(8, '0')}`;
}

function wrappedLongitudeDelta(left: number, right: number): number {
  let delta = right - left;
  while (delta < -180) delta += 360;
  while (delta > 180) delta -= 360;
  return delta;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
