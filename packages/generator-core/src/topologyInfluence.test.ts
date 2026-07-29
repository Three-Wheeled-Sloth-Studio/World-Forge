import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import { computeTopologyInfluence, computeTopologyInfluenceSet } from './topologyInfluence';

describe('topology influence reuse', () => {
  it('derives smaller-radius fields exactly from the maximum-radius distance pass', () => {
    const topology = buildCubedSphereTopology(8);
    const mask = new Uint8Array(topology.cellCount);
    for (let cell = 0; cell < mask.length; cell += 1) {
      mask[cell] = cell % 17 === 0 || topology.latitudes[cell] > 0.72 ? 1 : 0;
    }

    const combined = computeTopologyInfluenceSet(mask, topology, [28, 16, 6], 1);
    for (const radius of [28, 16, 6]) {
      expect(combined.get(radius)).toEqual(computeTopologyInfluence(mask, topology, radius, 1));
    }
  });

  it('keeps target inversion independent', () => {
    const topology = buildCubedSphereTopology(6);
    const mask = new Uint8Array(topology.cellCount);
    for (let cell = 0; cell < mask.length; cell += 1) mask[cell] = cell % 5 === 0 ? 1 : 0;

    const water = computeTopologyInfluence(mask, topology, 10, 1);
    const land = computeTopologyInfluence(mask, topology, 10, 0);
    expect(water).not.toEqual(land);
    expect(water.length).toBe(topology.cellCount);
    expect(land.length).toBe(topology.cellCount);
  });
});
