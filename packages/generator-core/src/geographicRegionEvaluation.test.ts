import { describe, expect, it } from 'vitest';
import {
  biomeToCode,
  buildCubedSphereTopology,
  type TopologyLayers,
} from '@world-forge/shared';
import {
  buildLegacyLatLonGridMembership,
  evaluateLegacyLatLonGridBaseline,
} from './geographicRegionEvaluation';

describe('geographic region evaluation baseline', () => {
  it('evaluates the legacy latitude-longitude grid with deterministic axis metrics', () => {
    const topology = buildCubedSphereTopology(8);
    const layers = uniformLayers(topology.cellCount);
    const first = evaluateLegacyLatLonGridBaseline(topology, layers, 4, 8);
    const second = evaluateLegacyLatLonGridBaseline(topology, layers, 4, 8);

    expect(first.source).toBe('lat-lon-grid');
    expect(first.algorithmVersion).toBe('lat-lon-grid-4x8');
    expect(first.regionCount).toBe(32);
    expect(first.validMembership).toBe(true);
    expect(first.signature).toBe(second.signature);
    expect(first.latitudeBoundaryConcentration).toBeGreaterThan(0);
    expect(first.longitudeBoundaryConcentration).toBeGreaterThan(0);
    expect(first.axisBoundaryConcentration).toBeGreaterThanOrEqual(
      first.latitudeBoundaryConcentration,
    );
    expect(first.axisBoundaryConcentration).toBeGreaterThanOrEqual(
      first.longitudeBoundaryConcentration,
    );
  });

  it('reproduces the legacy grid membership contract exactly', () => {
    const topology = buildCubedSphereTopology(6);
    const first = buildLegacyLatLonGridMembership(topology, 4, 8);
    const second = buildLegacyLatLonGridMembership(topology, 4, 8);

    expect(Array.from(first)).toEqual(Array.from(second));
    expect(new Set(first).size).toBeGreaterThan(0);
    expect(new Set(first).size).toBeLessThanOrEqual(32);
    expect(Math.max(...first)).toBeLessThan(32);
  });
});

function uniformLayers(cellCount: number): TopologyLayers {
  const biomes = new Uint8Array(cellCount);
  biomes.fill(biomeToCode('grassland'));
  return {
    elevation: new Float32Array(cellCount),
    plates: new Uint16Array(cellCount),
    water: new Uint8Array(cellCount),
    temperature: new Float32Array(cellCount),
    wetness: new Float32Array(cellCount),
    climateMoisture: new Float32Array(cellCount),
    climatePrecipitation: new Float32Array(cellCount),
    climateWetnessDelta: new Float32Array(cellCount),
    biomes,
    ice: new Uint8Array(cellCount),
    river: new Float32Array(cellCount),
    lakes: new Uint8Array(cellCount),
    volcanism: new Float32Array(cellCount),
  };
}
