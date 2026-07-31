import { describe, expect, it } from 'vitest';
import type { OrbitalPresentationBody } from '@world-forge/shared';
import {
  deterministicStarDirections,
  displayRadiusForMoon,
  orbitalPositionAtDays,
  relativeOrbitalPositionAtDays
} from './orbitalPresentation';

function body(overrides: Partial<OrbitalPresentationBody> = {}): OrbitalPresentationBody {
  return {
    id: 'body',
    parentBodyId: 'star',
    kind: 'rocky',
    orbitalOrder: 1,
    semiMajorAxisAu: 1,
    semiMajorAxisParentRadii: null,
    eccentricity: 0,
    inclinationDeg: 0,
    longitudeAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    orbitalPeriodDays: 100,
    phaseAtEpochRad: 0,
    rotationPeriodHours: 24,
    axialTiltDeg: 23.5,
    sizeClass: 1,
    massClass: 1,
    visibleFromPrimary: true,
    placeholder: false,
    ...overrides
  };
}

describe('orbital presentation math', () => {
  it('places a circular orbit at deterministic quarter-period positions', () => {
    const start = orbitalPositionAtDays(body(), 0);
    const quarter = orbitalPositionAtDays(body(), 25);
    expect(start.x).toBeCloseTo(1, 6);
    expect(start.y).toBeCloseTo(0, 6);
    expect(quarter.x).toBeCloseTo(0, 6);
    expect(quarter.y).toBeCloseTo(1, 6);
  });

  it('derives a relative body vector from the same shared simulation day', () => {
    const primary = body({ id: 'primary', orbitalPeriodDays: 100, semiMajorAxisAu: 1 });
    const neighbor = body({ id: 'neighbor', orbitalPeriodDays: 200, semiMajorAxisAu: 2 });
    const relative = relativeOrbitalPositionAtDays(neighbor, primary, 0);
    expect(relative.x).toBeCloseTo(1, 6);
    expect(relative.y).toBeCloseTo(0, 6);
  });

  it('keeps deterministic star directions normalized and seed-stable', () => {
    const first = deterministicStarDirections('world-seed', 8);
    const second = deterministicStarDirections('world-seed', 8);
    expect(second).toEqual(first);
    expect(first).toHaveLength(8);
    for (const point of first) {
      expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(1, 6);
      expect(point.brightness).toBeGreaterThanOrEqual(0.42);
      expect(point.brightness).toBeLessThanOrEqual(1);
    }
  });

  it('compresses moon distances into a visible but bounded display radius', () => {
    expect(displayRadiusForMoon(body({ kind: 'moon', semiMajorAxisAu: null, semiMajorAxisParentRadii: 1 }))).toBeGreaterThanOrEqual(1.55);
    expect(displayRadiusForMoon(body({ kind: 'moon', semiMajorAxisAu: null, semiMajorAxisParentRadii: 500 }))).toBeLessThanOrEqual(3.25);
  });
});
