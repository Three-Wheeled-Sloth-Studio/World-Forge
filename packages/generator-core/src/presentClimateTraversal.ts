
import { clamp, type CubedSphereTopology } from '@world-forge/shared';

export type TopologyDirectionGeometry = {
  dx: Float64Array;
  dy: Float64Array;
  distance: Float64Array;
  distanceSquared: Float64Array;
};

export function buildTopologyDirectionGeometry(topology: CubedSphereTopology): TopologyDirectionGeometry {
  const length = topology.neighbors.length;
  const dx = new Float64Array(length);
  const dy = new Float64Array(length);
  const distance = new Float64Array(length);
  const distanceSquared = new Float64Array(length);

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const longitude = topology.longitudes[cell];
    const latitude = topology.latitudes[cell];
    const longitudeScale = Math.max(0.12, Math.cos(latitude));
    for (let direction = 0; direction < 4; direction += 1) {
      const offset = cell * 4 + direction;
      const neighbor = topology.neighbors[offset];
      if (neighbor < 0) continue;
      const localX = wrappedAngle(topology.longitudes[neighbor] - longitude) * longitudeScale;
      const localY = topology.latitudes[neighbor] - latitude;
      dx[offset] = localX;
      dy[offset] = localY;
      distanceSquared[offset] = Math.max(0.000001, localX * localX + localY * localY);
      distance[offset] = Math.max(0.000001, Math.hypot(localX, localY));
    }
  }

  return { dx, dy, distance, distanceSquared };
}

export function topologyTerrainGradientWithGeometry(
  layer: Float32Array,
  topology: CubedSphereTopology,
  geometry: TopologyDirectionGeometry,
  cell: number
): { x: number; y: number } {
  let gx = 0;
  let gy = 0;
  let count = 0;
  for (let direction = 0; direction < 4; direction += 1) {
    const offset = cell * 4 + direction;
    const neighbor = topology.neighbors[offset];
    if (neighbor < 0) continue;
    const delta = layer[neighbor] - layer[cell];
    gx += (delta * geometry.dx[offset]) / geometry.distanceSquared[offset];
    gy += (delta * geometry.dy[offset]) / geometry.distanceSquared[offset];
    count += 1;
  }
  return count
    ? { x: clamp(gx / count, -1, 1), y: clamp(gy / count, -1, 1) }
    : { x: 0, y: 0 };
}

export function stepTopologyByVectorWithGeometry(
  topology: CubedSphereTopology,
  geometry: TopologyDirectionGeometry,
  cell: number,
  vectorX: number,
  vectorY: number
): number {
  const length = Math.hypot(vectorX, vectorY);
  if (length < 0.0001) return cell;
  let best = cell;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let direction = 0; direction < 4; direction += 1) {
    const offset = cell * 4 + direction;
    const neighbor = topology.neighbors[offset];
    if (neighbor < 0) continue;
    const score = (geometry.dx[offset] / geometry.distance[offset]) * (vectorX / length)
      + (geometry.dy[offset] / geometry.distance[offset]) * (vectorY / length);
    if (score > bestScore) {
      best = neighbor;
      bestScore = score;
    }
  }
  return best;
}

function wrappedAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}
