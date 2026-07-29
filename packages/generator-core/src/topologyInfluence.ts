import { clamp, type CubedSphereTopology } from '@world-forge/shared';

export function computeTopologyDistance(
  mask: Uint8Array,
  topology: CubedSphereTopology,
  maxRadius: number,
  targetValue: number
): Float32Array {
  const radius = Math.max(0, Math.round(maxRadius));
  const distance = new Float32Array(mask.length);
  const maxDistance = radius + 1;
  for (let cell = 0; cell < mask.length; cell += 1) {
    distance[cell] = mask[cell] === targetValue ? 0 : maxDistance;
  }
  for (let pass = 0; pass < radius; pass += 1) {
    for (let cell = 0; cell < mask.length; cell += 1) {
      let best = distance[cell];
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor >= 0) best = Math.min(best, distance[neighbor] + 1);
      }
      distance[cell] = best;
    }
  }
  return distance;
}

export function topologyInfluenceFromDistance(distance: Float32Array, radius: number): Float32Array {
  const maxDistance = Math.max(0, Math.round(radius)) + 1;
  const influence = new Float32Array(distance.length);
  for (let cell = 0; cell < distance.length; cell += 1) {
    influence[cell] = clamp(1 - distance[cell] / maxDistance, 0, 1);
  }
  return influence;
}

export function computeTopologyInfluence(
  mask: Uint8Array,
  topology: CubedSphereTopology,
  radius: number,
  targetValue: number
): Float32Array {
  return topologyInfluenceFromDistance(
    computeTopologyDistance(mask, topology, radius, targetValue),
    radius
  );
}

export function computeTopologyInfluenceSet(
  mask: Uint8Array,
  topology: CubedSphereTopology,
  radii: readonly number[],
  targetValue: number
): Map<number, Float32Array> {
  const normalizedRadii = [...new Set(radii.map((radius) => Math.max(0, Math.round(radius))))];
  const maximumRadius = Math.max(0, ...normalizedRadii);
  const distance = computeTopologyDistance(mask, topology, maximumRadius, targetValue);
  return new Map(normalizedRadii.map((radius) => [radius, topologyInfluenceFromDistance(distance, radius)]));
}
