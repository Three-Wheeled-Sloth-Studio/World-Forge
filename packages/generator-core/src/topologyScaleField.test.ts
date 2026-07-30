import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology, cubedSphereCellIndex } from '@world-forge/shared';
import { broadenTopologySignal, stabilizeTopologyField } from './topologyScaleField';

describe('broadenTopologySignal', () => {
  it('keeps deformation width stable as topology resolution increases', () => {
    const lowShare = broadenedShare(64);
    const highShare = broadenedShare(256);
    expect(Math.abs(highShare - lowShare)).toBeLessThan(0.025);
  });

  it('does not turn a local boundary response into a global field', () => {
    const topology = buildCubedSphereTopology(128);
    const source = boundarySignal(128);
    const broadened = broadenTopologySignal(source, topology);
    const active = Array.from(broadened).filter((value) => Math.abs(value) > 0.005).length;
    expect(active).toBeGreaterThan(128);
    expect(active / broadened.length).toBeLessThan(0.2);
  });

  it('softens narrow masked cuts without erasing broad basins', () => {
    const resolution = 256;
    const topology = buildCubedSphereTopology(resolution);
    const elevation = new Float32Array(topology.cellCount).fill(0.35);
    const mask = new Uint8Array(topology.cellCount);
    for (let y = 40; y < 216; y += 1) {
      for (let x = 120; x < 136; x += 1) {
        const cell = cubedSphereCellIndex(0, x, y, resolution);
        elevation[cell] = -0.08;
        mask[cell] = 1;
      }
    }
    for (let y = 80; y < 176; y += 1) {
      for (let x = 24; x < 88; x += 1) {
        const cell = cubedSphereCellIndex(0, x, y, resolution);
        elevation[cell] = -0.08;
        mask[cell] = 1;
      }
    }
    stabilizeTopologyField(elevation, topology, mask);
    expect(elevation[cubedSphereCellIndex(0, 128, 128, resolution)]).toBeGreaterThan(0);
    expect(elevation[cubedSphereCellIndex(0, 56, 128, resolution)]).toBeLessThan(0);
  });
});

function broadenedShare(resolution: number): number {
  const topology = buildCubedSphereTopology(resolution);
  const broadened = broadenTopologySignal(boundarySignal(resolution), topology);
  const active = Array.from(broadened).filter((value) => Math.abs(value) > 0.005).length;
  return active / broadened.length;
}

function boundarySignal(resolution: number): Float32Array {
  const signal = new Float32Array(6 * resolution * resolution);
  const x = Math.floor(resolution / 2);
  for (let y = Math.floor(resolution * 0.2); y < Math.ceil(resolution * 0.8); y += 1) {
    signal[cubedSphereCellIndex(0, x, y, resolution)] = 0.18;
  }
  return signal;
}
