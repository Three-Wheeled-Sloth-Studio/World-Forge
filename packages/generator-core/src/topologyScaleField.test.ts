import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology, cubedSphereCellIndex } from '@world-forge/shared';
import {
  broadenTopologySignal,
  spreadMaskedTopologySignal,
  stabilizeTopologyField,
  transportMaskedTopologySignal,
} from './topologyScaleField';

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

describe('spreadMaskedTopologySignal', () => {
  it('spreads within active land without crossing an inactive water barrier', () => {
    const resolution = 64;
    const topology = buildCubedSphereTopology(resolution);
    const source = new Float32Array(topology.cellCount);
    const water = new Uint8Array(topology.cellCount).fill(1);
    for (let y = 20; y < 44; y += 1) {
      for (let x = 8; x < 28; x += 1) water[cubedSphereCellIndex(0, x, y, resolution)] = 0;
      for (let x = 36; x < 56; x += 1) water[cubedSphereCellIndex(0, x, y, resolution)] = 0;
    }
    source[cubedSphereCellIndex(0, 12, 32, resolution)] = 1;

    const spread = spreadMaskedTopologySignal(source, topology, water, {
      activeMaskValue: 0,
      passes: 12,
    });

    expect(spread[cubedSphereCellIndex(0, 16, 32, resolution)]).toBeGreaterThan(0);
    expect(spread[cubedSphereCellIndex(0, 40, 32, resolution)]).toBe(0);
  });

  it('keeps masked propagation comparable across topology resolutions', () => {
    const low = maskedSpreadSample(64);
    const high = maskedSpreadSample(256);
    expect(Math.abs(high - low)).toBeLessThan(0.035);
  });
});

describe('transportMaskedTopologySignal', () => {
  it('moves a conserved signal downwind at fixed reference scale', () => {
    const resolution = 128;
    const topology = buildCubedSphereTopology(resolution);
    const source = new Float32Array(topology.cellCount);
    const windX = new Float32Array(topology.cellCount).fill(1);
    const windY = new Float32Array(topology.cellCount);
    const land = new Uint8Array(topology.cellCount).fill(1);
    const sourceCell = cubedSphereCellIndex(0, resolution / 2, resolution / 2, resolution);
    source[sourceCell] = 1;

    const transported = transportMaskedTopologySignal(source, windX, windY, topology, land);

    const total = transported.reduce((sum, value) => sum + value, 0);
    let eastwardDisplacement = 0;
    for (let cell = 0; cell < transported.length; cell += 1) {
      const longitudeDelta = Math.atan2(
        Math.sin(topology.longitudes[cell] - topology.longitudes[sourceCell]),
        Math.cos(topology.longitudes[cell] - topology.longitudes[sourceCell]),
      );
      eastwardDisplacement += transported[cell] * longitudeDelta;
    }
    expect(total).toBeCloseTo(1, 5);
    expect(eastwardDisplacement).toBeGreaterThan(0.02);
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

function maskedSpreadSample(resolution: number): number {
  const topology = buildCubedSphereTopology(resolution);
  const source = new Float32Array(topology.cellCount);
  const mask = new Uint8Array(topology.cellCount);
  for (let y = Math.floor(resolution * 0.25); y < Math.ceil(resolution * 0.75); y += 1) {
    for (let x = Math.floor(resolution * 0.2); x < Math.ceil(resolution * 0.8); x += 1) {
      mask[cubedSphereCellIndex(0, x, y, resolution)] = 1;
    }
  }
  for (let y = Math.floor(resolution * 0.4); y < Math.ceil(resolution * 0.6); y += 1) {
    for (let x = Math.floor(resolution * 0.2); x < Math.ceil(resolution * 0.32); x += 1) {
      source[cubedSphereCellIndex(0, x, y, resolution)] = 1;
    }
  }
  const spread = spreadMaskedTopologySignal(source, topology, mask);
  const sample = cubedSphereCellIndex(0, Math.floor(resolution * 0.36), Math.floor(resolution * 0.5), resolution);
  return spread[sample];
}
