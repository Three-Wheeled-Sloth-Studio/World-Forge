import { describe, expect, test } from 'vitest';
import { seasonalSurfaceOverlayColor } from './seasonalSurfacePresentation';

describe('seasonal surface presentation', () => {
  test('snow brightens land and sea ice cools water', () => {
    const snowy = seasonalSurfaceOverlayColor([80, 100, 70], {
      temperatureC: -8,
      temperatureDeltaC: -10,
      insolationIndex: 0.2,
      snowFraction: 0.9,
      seaIceFraction: 0
    }, false);
    const icy = seasonalSurfaceOverlayColor([25, 80, 125], {
      temperatureC: -4,
      temperatureDeltaC: -7,
      insolationIndex: 0.25,
      snowFraction: 0,
      seaIceFraction: 0.85
    }, true);
    expect(snowy[0]).toBeGreaterThan(180);
    expect(snowy[2]).toBeGreaterThan(180);
    expect(icy[0]).toBeGreaterThan(140);
    expect(icy[2]).toBeGreaterThan(170);
  });

  test('warm and cool thermal response remain subtle without cryosphere cover', () => {
    const base = [120, 130, 100] as const;
    const warm = seasonalSurfaceOverlayColor(base, {
      temperatureC: 28,
      temperatureDeltaC: 8,
      insolationIndex: 0.8,
      snowFraction: 0,
      seaIceFraction: 0
    }, false);
    const cool = seasonalSurfaceOverlayColor(base, {
      temperatureC: 8,
      temperatureDeltaC: -8,
      insolationIndex: 0.2,
      snowFraction: 0,
      seaIceFraction: 0
    }, false);
    expect(warm[0]).toBeGreaterThan(base[0]);
    expect(cool[2]).toBeGreaterThan(base[2]);
    expect(Math.abs(warm[0] - base[0])).toBeLessThan(15);
  });
});
