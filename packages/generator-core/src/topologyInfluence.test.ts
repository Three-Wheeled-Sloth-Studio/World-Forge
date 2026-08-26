import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import {
  computeTopologyDistance,
  computeTopologyInfluence,
  computeTopologyInfluenceSet,
  topologyRadiusForReferenceScale,
} from './topologyInfluence';

describe('topology influence reuse', () => {
  it('uses resolution-stable radii anchored to the ordinary topology scale', () => {
    expect(topologyRadiusForReferenceScale(buildCubedSphereTopology(64), 28)).toBe(7);
    expect(topologyRadiusForReferenceScale(buildCubedSphereTopology(256), 28)).toBe(28);
    expect(topologyRadiusForReferenceScale(buildCubedSphereTopology(1024), 28)).toBe(112);
  });

  it('computes bounded shortest-path distance without scan-order propagation', () => {
    const topology = buildCubedSphereTopology(8);
    const mask = new Uint8Array(topology.cellCount);
    mask[0] = 1;
    const distance = computeTopologyDistance(mask, topology, 3, 1);
    expect(distance[0]).toBe(0);
    expect(Array.from(distance).every((value) => value >= 0 && value <= 4)).toBe(true);
    expect(Array.from(distance).some((value) => value === 3)).toBe(true);
    expect(Array.from(distance).some((value) => value === 4)).toBe(true);
  });

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
