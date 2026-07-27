import type { CubedSphereTopology } from '@world-forge/shared';
import type {
  GeographicRegionEvaluation,
  GeographicRegionEvaluationSource,
  GeographicRegionInputLayers,
  GeographicWorldRegionSetV2,
} from '@world-forge/shared/geographicRegions';
import { geographicTopologyAdjacency } from './geographicTopologyAdjacency';

const UNASSIGNED_REGION = 0xffff;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const LONGITUDE_BIN_COUNT = 36;
const LATITUDE_BIN_COUNT = 18;

export function evaluateGeographicRegionSet(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  regionSet: GeographicWorldRegionSetV2,
): GeographicRegionEvaluation {
  const evaluation = evaluateRegionMembership(
    topology,
    layers,
    regionSet.membership.regionIndexByTopologyCell,
    regionSet.regions.length,
    regionSet.scaleBudget.minAreaShare,
    'geographic-graph-partition',
    regionSet.algorithmVersion,
    regionSet.signature,
  );
  const domainKindById = new Map(regionSet.surfaceDomains.map((domain) => [domain.id, domain.kind]));
  return {
    ...evaluation,
    disconnectedRegionCount: regionSet.regions.filter((region, index) => (
      evaluation.regionComponentCounts[index] > 1
      && domainKindById.get(region.parentDomainId) !== 'archipelago'
    )).length,
  };
}

export function buildLegacyLatLonGridMembership(
  topology: CubedSphereTopology,
  rows = 4,
  columns = 8,
): Uint16Array {
  const cleanRows = Math.max(1, Math.round(rows));
  const cleanColumns = Math.max(1, Math.round(columns));
  if (cleanRows * cleanColumns >= UNASSIGNED_REGION) {
    throw new Error('Legacy grid evaluation exceeds the uint16 region index budget.');
  }
  const membership = new Uint16Array(topology.cellCount);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const latitude = topology.latitudes[cell] * RADIANS_TO_DEGREES;
    const longitude = topology.longitudes[cell] * RADIANS_TO_DEGREES;
    const row = Math.max(0, Math.min(
      cleanRows - 1,
      Math.floor(((90 - latitude) / 180) * cleanRows),
    ));
    const column = Math.max(0, Math.min(
      cleanColumns - 1,
      Math.floor(((longitude + 180) / 360) * cleanColumns),
    ));
    membership[cell] = row * cleanColumns + column;
  }
  return membership;
}

export function evaluateLegacyLatLonGridBaseline(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  rows = 4,
  columns = 8,
): GeographicRegionEvaluation {
  const cleanRows = Math.max(1, Math.round(rows));
  const cleanColumns = Math.max(1, Math.round(columns));
  const regionCount = cleanRows * cleanColumns;
  const membership = buildLegacyLatLonGridMembership(topology, cleanRows, cleanColumns);
  return evaluateRegionMembership(
    topology,
    layers,
    membership,
    regionCount,
    0.35 / Math.max(1, regionCount),
    'lat-lon-grid',
    `lat-lon-grid-${cleanRows}x${cleanColumns}`,
    `legacy-grid:${cleanRows}:${cleanColumns}`,
  );
}

export function evaluateRegionMembership(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  regionCount: number,
  minimumAreaShare: number,
  source: GeographicRegionEvaluationSource,
  algorithmVersion: string,
  signatureSeed: string,
): GeographicRegionEvaluation {
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
  const sliverRegionCount = areaShares.filter((share) => share < minimumAreaShare).length;
  const latitudeBoundaryConcentration = concentration(boundaries.latitudeBins, boundaries.zonal);
  const longitudeBoundaryConcentration = concentration(boundaries.longitudeBins, boundaries.meridional);

  return {
    modelVersion: 'geographic-region-evaluation-v1',
    source,
    algorithmVersion,
    signature: evaluationSignature(signatureSeed, membership),
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
    latitudeBoundaryConcentration: round(latitudeBoundaryConcentration, 6),
    longitudeBoundaryConcentration: round(longitudeBoundaryConcentration, 6),
    axisBoundaryConcentration: round(Math.max(
      latitudeBoundaryConcentration,
      longitudeBoundaryConcentration,
    ), 6),
    regionComponentCounts,
    regionCellCounts,
  };
}

function componentCounts(
  topology: CubedSphereTopology,
  membership: Uint16Array,
  regionCount: number,
): number[] {
  const adjacency = geographicTopologyAdjacency(topology);
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
      for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
        const neighbor = adjacency.neighbors[offset];
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

type BoundaryMetrics = {
  total: number;
  geographic: number;
  coastline: number;
  meridional: number;
  zonal: number;
  latitudeBins: number[];
  longitudeBins: number[];
};

function boundaryMetrics(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  regionCount: number,
): BoundaryMetrics {
  const adjacency = geographicTopologyAdjacency(topology);
  const metrics: BoundaryMetrics = {
    total: 0,
    geographic: 0,
    coastline: 0,
    meridional: 0,
    zonal: 0,
    latitudeBins: Array.from({ length: LATITUDE_BIN_COUNT }, () => 0),
    longitudeBins: Array.from({ length: LONGITUDE_BIN_COUNT }, () => 0),
  };
  if (membership.length !== topology.cellCount) return metrics;

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const leftRegion = membership[cell];
    if (leftRegion === UNASSIGNED_REGION || leftRegion >= regionCount) continue;
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (neighbor <= cell) continue;
      const rightRegion = membership[neighbor];
      if (
        rightRegion === UNASSIGNED_REGION
        || rightRegion >= regionCount
        || rightRegion === leftRegion
      ) continue;
      metrics.total += 1;
      const coast = layers.water[cell] !== layers.water[neighbor];
      if (coast) metrics.coastline += 1;
      if (
        coast
        || Math.abs(layers.elevation[cell] - layers.elevation[neighbor]) >= 0.08
        || layers.biomes[cell] !== layers.biomes[neighbor]
        || Math.abs(layers.temperature[cell] - layers.temperature[neighbor]) >= 6
        || Math.abs(layers.wetness[cell] - layers.wetness[neighbor]) >= 0.22
        || layers.lakes[cell] !== layers.lakes[neighbor]
        || Math.abs(layers.river[cell] - layers.river[neighbor]) >= 0.35
        || layers.plates[cell] !== layers.plates[neighbor]
      ) metrics.geographic += 1;

      const midpoint = boundaryMidpoint(topology, cell, neighbor);
      if (isMeridionalBoundary(topology, cell, neighbor)) {
        metrics.meridional += 1;
        metrics.longitudeBins[longitudeBin(midpoint.longitude)] += 1;
      } else {
        metrics.zonal += 1;
        metrics.latitudeBins[latitudeBin(midpoint.latitude)] += 1;
      }
    }
  }

  return metrics;
}

function boundaryMidpoint(
  topology: CubedSphereTopology,
  left: number,
  right: number,
): { latitude: number; longitude: number } {
  const leftLatitude = topology.latitudes[left] * RADIANS_TO_DEGREES;
  const rightLatitude = topology.latitudes[right] * RADIANS_TO_DEGREES;
  const leftLongitude = topology.longitudes[left] * RADIANS_TO_DEGREES;
  const rightLongitude = topology.longitudes[right] * RADIANS_TO_DEGREES;
  return {
    latitude: (leftLatitude + rightLatitude) / 2,
    longitude: normalizeLongitude(
      leftLongitude + wrappedLongitudeDelta(leftLongitude, rightLongitude) / 2,
    ),
  };
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

function latitudeBin(latitude: number): number {
  return Math.max(0, Math.min(
    LATITUDE_BIN_COUNT - 1,
    Math.floor(((Math.max(-90, Math.min(90, latitude)) + 90) / 180) * LATITUDE_BIN_COUNT),
  ));
}

function longitudeBin(longitude: number): number {
  return Math.max(0, Math.min(
    LONGITUDE_BIN_COUNT - 1,
    Math.floor(((normalizeLongitude(longitude) + 180) / 360) * LONGITUDE_BIN_COUNT),
  ));
}

function concentration(bins: number[], total: number): number {
  if (total <= 0 || bins.length === 0) return 0;
  return Math.max(...bins) / total;
}

function evaluationSignature(signatureSeed: string, membership: Uint16Array): string {
  let hash = 0x811c9dc5;
  const addByte = (value: number) => {
    hash = Math.imul(hash ^ (value & 0xff), 0x01000193) >>> 0;
  };
  for (const character of signatureSeed) addByte(character.charCodeAt(0));
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

function normalizeLongitude(longitude: number): number {
  let value = longitude;
  while (value < -180) value += 360;
  while (value > 180) value -= 360;
  return value;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
