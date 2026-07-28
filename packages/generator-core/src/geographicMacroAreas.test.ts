import { describe, expect, it } from 'vitest';
import type { CubedSphereTopology } from '@world-forge/shared';
import { decomposeLandmassAtIsthmuses } from './geographicMacroAreas';

describe('geographic macro-area isthmus decomposition', () => {
  it('splits two continent-sized cores connected by a narrow land bridge', () => {
    const topology = makeGridTopology(32, 16);
    const { domainMembership, water } = makeLand(topology, (x, y) => (
      (x >= 1 && x <= 12 && y >= 2 && y <= 13)
      || (x >= 19 && x <= 30 && y >= 2 && y <= 13)
      || (x >= 13 && x <= 18 && y === 8)
    ));

    const result = decomposeLandmassAtIsthmuses(topology, domainMembership, water, 2);
    expect(result.pieceCount).toBe(2);
    expect(result.erosionDepth).toBeGreaterThan(0);
    expect(countAssigned(result.pieceIndexByTopologyCell, 0)).toBeGreaterThan(100);
    expect(countAssigned(result.pieceIndexByTopologyCell, 1)).toBeGreaterThan(100);
  });

  it('keeps an ordinary narrow peninsula attached to its continent', () => {
    const topology = makeGridTopology(32, 16);
    const { domainMembership, water } = makeLand(topology, (x, y) => (
      (x >= 2 && x <= 23 && y >= 2 && y <= 13)
      || (x >= 24 && x <= 30 && y === 8)
    ));

    const result = decomposeLandmassAtIsthmuses(topology, domainMembership, water, 2);
    expect(result.pieceCount).toBe(1);
  });

  it('is deterministic and assigns every cell in the display domain', () => {
    const topology = makeGridTopology(28, 14);
    const { domainMembership, water } = makeLand(topology, (x, y) => (
      (x >= 1 && x <= 10 && y >= 2 && y <= 11)
      || (x >= 17 && x <= 26 && y >= 2 && y <= 11)
      || (x >= 11 && x <= 16 && y === 7)
    ), 1);

    const first = decomposeLandmassAtIsthmuses(topology, domainMembership, water, 2);
    const second = decomposeLandmassAtIsthmuses(topology, domainMembership, water, 2);
    expect(first.seedTopologyCellIds).toEqual(second.seedTopologyCellIds);
    expect(Array.from(first.pieceIndexByTopologyCell)).toEqual(Array.from(second.pieceIndexByTopologyCell));
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      if (domainMembership[cell] === 1) expect(first.pieceIndexByTopologyCell[cell]).not.toBe(0xffff);
      else expect(first.pieceIndexByTopologyCell[cell]).toBe(0xffff);
    }
  });
});

function makeGridTopology(width: number, height: number): CubedSphereTopology {
  const cellCount = width * height;
  const positions = new Float32Array(cellCount * 3);
  const latitudes = new Float32Array(cellCount);
  const longitudes = new Float32Array(cellCount);
  const areaWeights = new Float32Array(cellCount);
  areaWeights.fill(1);
  const neighbors = new Int32Array(cellCount * 4);
  neighbors.fill(-1);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
      const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
      longitudes[cell] = longitude;
      latitudes[cell] = latitude;
      const cosLatitude = Math.cos(latitude);
      positions[cell * 3] = cosLatitude * Math.cos(longitude);
      positions[cell * 3 + 1] = Math.sin(latitude);
      positions[cell * 3 + 2] = cosLatitude * Math.sin(longitude);
      neighbors[cell * 4] = x > 0 ? cell - 1 : -1;
      neighbors[cell * 4 + 1] = x + 1 < width ? cell + 1 : -1;
      neighbors[cell * 4 + 2] = y > 0 ? cell - width : -1;
      neighbors[cell * 4 + 3] = y + 1 < height ? cell + width : -1;
    }
  }
  return {
    kind: 'cubed-sphere',
    resolution: Math.max(width, height),
    cellCount,
    positions,
    latitudes,
    longitudes,
    areaWeights,
    neighbors,
  };
}

function makeLand(
  topology: CubedSphereTopology,
  isLand: (x: number, y: number) => boolean,
  territorialPadding = 0,
): { domainMembership: Uint8Array; water: Uint8Array } {
  const width = topology.resolution;
  const height = topology.cellCount / width;
  const domainMembership = new Uint8Array(topology.cellCount);
  const water = new Uint8Array(topology.cellCount);
  water.fill(1);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      if (!isLand(x, y)) continue;
      water[cell] = 0;
      for (let dy = -territorialPadding; dy <= territorialPadding; dy += 1) {
        for (let dx = -territorialPadding; dx <= territorialPadding; dx += 1) {
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          domainMembership[nextY * width + nextX] = 1;
        }
      }
      domainMembership[cell] = 1;
    }
  }
  return { domainMembership, water };
}

function countAssigned(values: Uint16Array, pieceIndex: number): number {
  let count = 0;
  for (const value of values) if (value === pieceIndex) count += 1;
  return count;
}
