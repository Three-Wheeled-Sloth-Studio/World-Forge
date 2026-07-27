import type { CubedSphereTopology } from '@world-forge/shared';
import type { GeographicWorldRegionV2 } from '@world-forge/shared/geographicRegions';
import { geographicTopologyAdjacency } from './geographicTopologyAdjacency';

const RADIANS_TO_DEGREES = 180 / Math.PI;
const UNASSIGNED_REGION = 0xffff;

export function assignInteriorRegionLabelPoints(
  topology: CubedSphereTopology,
  membership: Uint16Array,
  regions: GeographicWorldRegionV2[],
): GeographicWorldRegionV2[] {
  const adjacency = geographicTopologyAdjacency(topology);
  const distanceFromBoundary = new Int32Array(topology.cellCount);
  distanceFromBoundary.fill(-1);
  const queue = new Int32Array(topology.cellCount);
  let head = 0;
  let tail = 0;

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const regionIndex = membership[cell];
    if (regionIndex === UNASSIGNED_REGION || regionIndex >= regions.length) continue;
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      if (membership[adjacency.neighbors[offset]] === regionIndex) continue;
      distanceFromBoundary[cell] = 0;
      queue[tail++] = cell;
      break;
    }
  }

  while (head < tail) {
    const cell = queue[head++];
    const regionIndex = membership[cell];
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (membership[neighbor] !== regionIndex || distanceFromBoundary[neighbor] >= 0) continue;
      distanceFromBoundary[neighbor] = distanceFromBoundary[cell] + 1;
      queue[tail++] = neighbor;
    }
  }

  const bestCell = regions.map((region) => region.seedTopologyCellId);
  const bestDistance = regions.map(() => -1);
  const bestCenterDot = regions.map(() => Number.NEGATIVE_INFINITY);
  const centerVectors = regions.map((region) => latLonVector(region.center.latitude, region.center.longitude));

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const regionIndex = membership[cell];
    if (regionIndex === UNASSIGNED_REGION || regionIndex >= regions.length) continue;
    const distance = distanceFromBoundary[cell];
    const offset = cell * 3;
    const center = centerVectors[regionIndex];
    const centerDot = topology.positions[offset] * center.x
      + topology.positions[offset + 1] * center.y
      + topology.positions[offset + 2] * center.z;
    if (
      distance > bestDistance[regionIndex]
      || (distance === bestDistance[regionIndex] && centerDot > bestCenterDot[regionIndex])
      || (
        distance === bestDistance[regionIndex]
        && centerDot === bestCenterDot[regionIndex]
        && cell < bestCell[regionIndex]
      )
    ) {
      bestCell[regionIndex] = cell;
      bestDistance[regionIndex] = distance;
      bestCenterDot[regionIndex] = centerDot;
    }
  }

  return regions.map((region, index) => {
    const cell = bestCell[index];
    return {
      ...region,
      labelPoint: {
        topologyCellId: cell,
        latitude: round(topology.latitudes[cell] * RADIANS_TO_DEGREES, 4),
        longitude: round(topology.longitudes[cell] * RADIANS_TO_DEGREES, 4),
      },
    };
  });
}

function latLonVector(latitude: number, longitude: number): { x: number; y: number; z: number } {
  const lat = latitude / RADIANS_TO_DEGREES;
  const lon = longitude / RADIANS_TO_DEGREES;
  const cosLatitude = Math.cos(lat);
  return {
    x: cosLatitude * Math.cos(lon),
    y: Math.sin(lat),
    z: cosLatitude * Math.sin(lon),
  };
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
