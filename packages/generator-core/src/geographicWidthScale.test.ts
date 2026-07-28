import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import {
  GEOGRAPHIC_DRILLDOWN_MAX_SCALE_RATIO,
  GEOGRAPHIC_DRILLDOWN_TARGET_COLUMNS,
  deriveInitialGeographicScale,
  nextGeographicScaleMiles,
  targetChildCountForExtent,
} from './geographicWidthScale';

describe('width-driven geographic scale', () => {
  it('fits selected width near the 50-column target without forcing height', () => {
    const topology = buildCubedSphereTopology(16);
    const membership = membershipForBounds(topology, -82, 34, -38, 48);

    const first = deriveInitialGeographicScale(topology, 24881, membership);
    const second = deriveInitialGeographicScale(topology, 24881, membership);

    expect(first).toEqual(second);
    expect(first.scale.targetViewportColumns).toBe(GEOGRAPHIC_DRILLDOWN_TARGET_COLUMNS);
    expect(first.extent.columns).toBeGreaterThanOrEqual(35);
    expect(first.extent.columns).toBeLessThanOrEqual(70);
    expect(first.extent.rows).toBeGreaterThan(0);
    expect(first.scale.exactParentHexCount).toBeGreaterThan(0);
  });

  it('inserts scale steps so no drill-down jump exceeds 2.5x', () => {
    const sequence = [400];
    while (sequence[sequence.length - 1] > 60 && sequence.length < 12) {
      sequence.push(nextGeographicScaleMiles(sequence[sequence.length - 1]));
    }

    expect(sequence[sequence.length - 1]).toBe(60);
    for (let index = 1; index < sequence.length; index += 1) {
      expect(sequence[index]).toBeLessThan(sequence[index - 1]);
      expect(sequence[index - 1] / sequence[index]).toBeLessThanOrEqual(GEOGRAPHIC_DRILLDOWN_MAX_SCALE_RATIO + 1e-9);
    }
  });

  it('sizes child counts from next-level viewport coverage rather than raw tile count', () => {
    expect(targetChildCountForExtent({
      minLatitude: -20,
      maxLatitude: 30,
      minLongitude: -80,
      maxLongitude: 40,
      wrapsLongitude: false,
      qMin: 0,
      qMax: 98,
      rMin: 0,
      rMax: 48,
      columns: 99,
      rows: 49,
      contextPaddingHexes: 2,
      selectedMembershipFitsMaximum: true,
    })).toBe(2);
  });
});

function membershipForBounds(
  topology: ReturnType<typeof buildCubedSphereTopology>,
  minLongitude: number,
  maxLongitude: number,
  minLatitude: number,
  maxLatitude: number,
): Uint8Array {
  const membership = new Uint8Array(topology.cellCount);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const latitude = topology.latitudes[cell] * 180 / Math.PI;
    const longitude = topology.longitudes[cell] * 180 / Math.PI;
    if (
      longitude >= minLongitude
      && longitude <= maxLongitude
      && latitude >= minLatitude
      && latitude <= maxLatitude
    ) membership[cell] = 1;
  }
  return membership;
}
