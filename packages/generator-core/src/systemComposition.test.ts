import { describe, expect, test } from 'vitest';
import {
  classifySystemBodyType,
  generateSecondaryMoons,
  generatedBodyTypeForOrbit
} from './systemComposition';

describe('system composition', () => {
  test('makes giants likely in outer positions without reserving a mandatory slot', () => {
    expect(classifySystemBodyType(4, 0, 0)).toBe('rocky');
    expect(classifySystemBodyType(6, 0.3, 0.2)).toBe('gas-giant');
    expect(classifySystemBodyType(8, 0.4, 0.8)).toBe('ice-giant');
    expect(classifySystemBodyType(9, 0.99, 0)).toBe('rocky');
  });

  test('raises giant incidence across the outer system', () => {
    const seeds = Array.from({ length: 512 }, (_, index) => `distribution-${index}`);
    const incidence = (order: number) => seeds.filter((seed) => generatedBodyTypeForOrbit(seed, order) !== 'rocky').length / seeds.length;
    expect(incidence(5)).toBeGreaterThan(0.14);
    expect(incidence(5)).toBeLessThan(0.27);
    expect(incidence(6)).toBeGreaterThan(0.54);
    expect(incidence(7)).toBeGreaterThan(0.74);
    expect(incidence(8)).toBeGreaterThan(0.84);
  });

  test('generates bounded deterministic major moon systems', () => {
    const gasParent = { id: 'gas-1', bodyType: 'gas-giant' as const, sizeClass: 7, massClass: 10, orbitalOrder: 6 };
    const iceParent = { id: 'ice-1', bodyType: 'ice-giant' as const, sizeClass: 5, massClass: 6, orbitalOrder: 8 };
    const gasMoons = generateSecondaryMoons('moon-seed', gasParent);
    const iceMoons = generateSecondaryMoons('moon-seed', iceParent);
    expect(gasMoons.length).toBeGreaterThanOrEqual(3);
    expect(gasMoons.length).toBeLessThanOrEqual(6);
    expect(iceMoons.length).toBeGreaterThanOrEqual(2);
    expect(iceMoons.length).toBeLessThanOrEqual(4);
    expect(generateSecondaryMoons('moon-seed', gasParent)).toEqual(gasMoons);
    expect(new Set(gasMoons.map((moon) => moon.id)).size).toBe(gasMoons.length);
    expect(gasMoons.every((moon, index) => index === 0 || moon.orbitalDistanceClass > gasMoons[index - 1].orbitalDistanceClass)).toBe(true);
  });
});
