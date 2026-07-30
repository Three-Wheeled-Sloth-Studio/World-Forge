import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology, cubedSphereCellIndex } from '@world-forge/shared';
import { angularDistanceBetweenUnitVectors, rotateUnitVector } from './fragmentSphericalTransform';
import { buildRigidPlateRotations, repairVacatedFragmentCorridors } from './fragmentPlacementRepair';

describe('repairVacatedFragmentCorridors', () => {
  it('uses one rigid transform for disconnected fragments on the same plate', () => {
    const first = { x: 1, y: 0, z: 0 };
    const second = { x: 0, y: 0, z: 1 };
    const rotations = buildRigidPlateRotations([
      { plateId: 4, cellCount: 100, ...first },
      { plateId: 4, cellCount: 20, ...second }
    ], [0, 0, 0, 0, 0.8], [0, 0, 0, 0, 0.3], 5);
    const rotation = rotations.get(4)!;
    const before = angularDistanceBetweenUnitVectors(first, second);
    const after = angularDistanceBetweenUnitVectors(
      rotateUnitVector(first, rotation),
      rotateUnitVector(second, rotation)
    );
    expect(after).toBeCloseTo(before, 8);
  });

  it('closes narrow vacated cuts bounded by retained land', () => {
    const fixture = repairFixture(32);
    for (let y = 4; y < 28; y += 1) fixture.vacate(0, 16, y);
    const repaired = fixture.run();
    expect(repaired).toBe(24);
    expect(fixture.elevation[fixture.cell(0, 16, 16)]).toBeGreaterThan(0);
  });

  it('preserves the interior of a genuinely opened basin', () => {
    const fixture = repairFixture(32);
    for (let y = 8; y < 24; y += 1) {
      for (let x = 8; x < 24; x += 1) fixture.vacate(0, x, y);
    }
    fixture.run();
    expect(fixture.elevation[fixture.cell(0, 16, 16)]).toBeLessThan(0);
  });

  it('does not fill a vacated coastal edge with water on one side', () => {
    const fixture = repairFixture(32);
    for (let y = 0; y < 32; y += 1) {
      const coast = fixture.cell(0, 0, y);
      fixture.elevation[coast] = -0.2;
      fixture.originalElevation[coast] = -0.2;
      fixture.vacate(0, 1, y);
    }
    fixture.run();
    expect(fixture.elevation[fixture.cell(0, 1, 16)]).toBeLessThan(0);
  });
});

function repairFixture(resolution: number) {
  const topology = buildCubedSphereTopology(resolution);
  const elevation = new Float32Array(topology.cellCount).fill(0.4);
  const volcanism = new Float32Array(topology.cellCount).fill(0.2);
  const originalElevation = new Float32Array(elevation);
  const originalVolcanism = new Float32Array(volcanism);
  const sourceCells = new Uint8Array(topology.cellCount);
  const targetCells = new Uint8Array(topology.cellCount);
  const cell = (face: number, x: number, y: number) => cubedSphereCellIndex(face, x, y, resolution);
  return {
    elevation,
    originalElevation,
    cell,
    vacate(face: number, x: number, y: number) {
      const index = cell(face, x, y);
      sourceCells[index] = 1;
      elevation[index] = -0.1;
    },
    run() {
      return repairVacatedFragmentCorridors({
        sourceCells,
        targetCells,
        elevation,
        volcanism,
        originalElevation,
        originalVolcanism,
        seaLevel: 0,
        topology
      });
    }
  };
}
