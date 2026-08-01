import { describe, expect, test } from 'vitest';
import type { SelectedValues } from '@world-forge/shared';
import { generateSolarSystem } from './index';
import { SeededRandom } from './random';

const values: SelectedValues = {
  systemAgeGy: 4.6,
  oceanPercentage: 68,
  averageTemperatureC: 15,
  aridity: 0.45,
  seaLevel: 0,
  axialTiltDeg: 23.5,
  orbitalEccentricity: 0.016,
  sizeClass: 1,
  moonCount: 2,
  impactFrequency: 1,
  plateCount: 18,
  riverDensity: 1.6,
  continentCount: 5,
  continentScale: 0.55,
  islandDensity: 0.4,
  oceanTolerancePercentagePoints: 5
};

describe('solar system scaffold population', () => {
  test('adds major moons to non-primary giants without forcing every system to contain one', () => {
    let systemsWithGasGiants = 0;
    let systemsWithoutGiants = 0;
    let secondaryMoonCount = 0;
    for (let index = 0; index < 128; index += 1) {
      const seed = `system-population-${index}`;
      const system = generateSolarSystem(seed, values, new SeededRandom(seed));
      const secondaryBodies = system.bodies.filter((body) => !body.isPrimaryWorld);
      if (secondaryBodies.some((body) => body.bodyType === 'gas-giant')) systemsWithGasGiants += 1;
      if (secondaryBodies.every((body) => body.bodyType !== 'gas-giant' && body.bodyType !== 'ice-giant')) systemsWithoutGiants += 1;
      for (const body of secondaryBodies) {
        if (body.bodyType === 'gas-giant') {
          expect(body.moons.length).toBeGreaterThanOrEqual(3);
          expect(body.moons.length).toBeLessThanOrEqual(6);
        }
        if (body.bodyType === 'ice-giant') {
          expect(body.moons.length).toBeGreaterThanOrEqual(2);
          expect(body.moons.length).toBeLessThanOrEqual(4);
        }
        secondaryMoonCount += body.moons.length;
      }
      expect(system.bodies.find((body) => body.isPrimaryWorld)?.moons).toHaveLength(values.moonCount);
    }
    expect(systemsWithGasGiants).toBeGreaterThan(40);
    expect(systemsWithoutGiants).toBeGreaterThan(0);
    expect(secondaryMoonCount).toBeGreaterThan(200);
  });

  test('keeps scaffold generation deterministic', () => {
    const seed = 'deterministic-satellite-system';
    expect(generateSolarSystem(seed, values, new SeededRandom(seed))).toEqual(
      generateSolarSystem(seed, values, new SeededRandom(seed))
    );
  });
});
