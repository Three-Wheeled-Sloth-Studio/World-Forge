import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import { deriveAdaptiveGeographicScale } from './geographicAdaptiveScale';

describe('adaptive geographic scale', () => {
  it('selects a deterministic world-anchored scale near the viewport target', () => {
    const topology = buildCubedSphereTopology(12);
    const membership = new Uint8Array(topology.cellCount);
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      const latitude = topology.latitudes[cell] * 180 / Math.PI;
      const longitude = topology.longitudes[cell] * 180 / Math.PI;
      if (latitude >= -30 && latitude <= 45 && longitude >= -90 && longitude <= 20) membership[cell] = 1;
    }

    const first = deriveAdaptiveGeographicScale(topology, 24881, membership);
    const second = deriveAdaptiveGeographicScale(topology, 24881, membership);

    expect(first).toEqual(second);
    expect(first.scale.origin).toBe('world-equirectangular-pointy-odd-r');
    expect(first.scale.exactParentHexCount).toBeGreaterThan(0);
    expect(first.extent.columns).toBeGreaterThanOrEqual(10);
    expect(first.extent.rows).toBeGreaterThanOrEqual(10);
    expect(first.extent.columns).toBeLessThanOrEqual(50);
    expect(first.extent.rows).toBeLessThanOrEqual(50);
    expect(first.scale.idFormat).toContain('q{q}:r{r}');
  });

  it('uses a compact wrapped extent for membership crossing the longitude seam', () => {
    const topology = buildCubedSphereTopology(12);
    const membership = new Uint8Array(topology.cellCount);
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      const latitude = topology.latitudes[cell] * 180 / Math.PI;
      const longitude = topology.longitudes[cell] * 180 / Math.PI;
      if (Math.abs(latitude) <= 45 && Math.abs(longitude) >= 145) membership[cell] = 1;
    }

    const result = deriveAdaptiveGeographicScale(topology, 24881, membership);

    expect(result.extent.wrapsLongitude).toBe(true);
    expect(result.extent.columns).toBeLessThan(result.scale.worldColumns / 2);
    expect(result.scale.exactParentHexCount).toBeGreaterThan(0);
  });
});
