import type { CubedSphereTopology } from '@world-forge/shared';
import { buildTangentSphericalRotation, type RigidSphericalRotation } from './fragmentSphericalTransform';

export type FragmentPlacementRepairInput = {
  sourceCells: Uint8Array;
  targetCells: Uint8Array;
  elevation: Float32Array;
  volcanism: Float32Array;
  originalElevation: Float32Array;
  originalVolcanism: Float32Array;
  seaLevel: number;
  topology: CubedSphereTopology;
};

export type PlateFragmentSeed = {
  plateId: number;
  cellCount: number;
  x: number;
  y: number;
  z: number;
};

export function buildRigidPlateRotations(
  seeds: PlateFragmentSeed[],
  motionX: number[],
  motionY: number[],
  systemAgeGy: number
): Map<number, RigidSphericalRotation> {
  const centroids = new Map<number, { x: number; y: number; z: number }>();
  for (const seed of seeds) {
    const current = centroids.get(seed.plateId) ?? { x: 0, y: 0, z: 0 };
    current.x += seed.x * seed.cellCount;
    current.y += seed.y * seed.cellCount;
    current.z += seed.z * seed.cellCount;
    centroids.set(seed.plateId, current);
  }

  const rotations = new Map<number, RigidSphericalRotation>();
  for (const [plateId, centroid] of centroids) {
    const speed = Math.hypot(motionX[plateId], motionY[plateId]);
    const displacement = speed > 0.0001
      ? clamp(speed * Math.max(0.25, systemAgeGy) * 0.018, 0.012, 0.42)
      : 0;
    const east = speed > 0.0001 ? motionX[plateId] / speed : 0;
    const north = speed > 0.0001 ? motionY[plateId] / speed : 0;
    const length = Math.max(0.000001, Math.hypot(centroid.x, centroid.y, centroid.z));
    rotations.set(plateId, buildTangentSphericalRotation(
      { x: centroid.x / length, y: centroid.y / length, z: centroid.z / length },
      east,
      north,
      displacement
    ));
  }
  return rotations;
}

export function repairVacatedFragmentCorridors(input: FragmentPlacementRepairInput): number {
  const {
    sourceCells,
    targetCells,
    elevation,
    volcanism,
    originalElevation,
    originalVolcanism,
    seaLevel,
    topology
  } = input;
  const eligible = new Uint8Array(topology.cellCount);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (
      sourceCells[cell]
      && !targetCells[cell]
      && originalElevation[cell] > seaLevel
      && elevation[cell] <= seaLevel
    ) {
      eligible[cell] = 1;
    }
  }

  const maxPasses = Math.max(1, Math.ceil(topology.resolution / 64));
  let repaired = 0;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const sourceElevation = new Float32Array(elevation);
    const restore: number[] = [];
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      if (!eligible[cell]) continue;
      const left = topology.neighbors[cell * 4];
      const right = topology.neighbors[cell * 4 + 1];
      const up = topology.neighbors[cell * 4 + 2];
      const down = topology.neighbors[cell * 4 + 3];
      const horizontalLand = isLand(sourceElevation, left, seaLevel) && isLand(sourceElevation, right, seaLevel);
      const verticalLand = isLand(sourceElevation, up, seaLevel) && isLand(sourceElevation, down, seaLevel);
      if (horizontalLand || verticalLand) restore.push(cell);
    }
    if (restore.length === 0) break;
    for (const cell of restore) {
      elevation[cell] = originalElevation[cell];
      volcanism[cell] = originalVolcanism[cell];
      eligible[cell] = 0;
      repaired += 1;
    }
  }
  return repaired;
}

function isLand(elevation: Float32Array, cell: number, seaLevel: number): boolean {
  return cell >= 0 && elevation[cell] > seaLevel;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
