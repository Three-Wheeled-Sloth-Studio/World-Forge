import { describe, expect, it } from 'vitest';
import { forestWetnessThreshold } from './biomeClimate';

describe('biome climate thresholds', () => {
  it('preserves cool forests while requiring more moisture in warm climates', () => {
    expect(forestWetnessThreshold(-10)).toBe(0.5);
    expect(forestWetnessThreshold(8)).toBe(0.5);
    expect(forestWetnessThreshold(14)).toBeCloseTo(0.55);
    expect(forestWetnessThreshold(20)).toBeCloseTo(0.6);
    expect(forestWetnessThreshold(35)).toBe(0.6);
  });
});
