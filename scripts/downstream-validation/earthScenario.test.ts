import { describe, expect, it } from 'vitest';
import { reduceWetlandReference } from './earthScenario';

describe('GLWD reference reduction', () => {
  it('averages valid fractional coverage and preserves the modal dominant class', () => {
    const result = reduceWetlandReference(
      { width: 4, height: 2 },
      { width: 2, height: 1 },
      new Uint8Array([
        10, 30, 255, 60,
        20, 40, 80, 100,
      ]),
      new Uint8Array([
        0, 10, 255, 12,
        10, 10, 12, 12,
      ]),
    );

    expect([...result.wetlandPercent!]).toEqual([25, 80]);
    expect([...result.wetlandDominantClass!]).toEqual([10, 12]);
  });

  it('retains nodata when a reduced cell has no valid source coverage', () => {
    const result = reduceWetlandReference(
      { width: 2, height: 2 },
      { width: 1, height: 1 },
      new Uint8Array([255, 255, 255, 255]),
      new Uint8Array([255, 255, 255, 255]),
    );

    expect(result.wetlandPercent![0]).toBe(255);
    expect(result.wetlandDominantClass![0]).toBe(255);
  });
});
