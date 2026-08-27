import { describe, expect, it } from 'vitest';
import { forestWetnessThreshold } from './biomeClimate';

describe('biome climate thresholds', () => {
  it('preserves cool forests while requiring more moisture in warm climates', () => {
    expect(forestWetnessThreshold(-10)).toBe(0.44);
    expect(forestWetnessThreshold(8)).toBeCloseTo(0.48);
    expect(forestWetnessThreshold(11)).toBeCloseTo(0.525);
    expect(forestWetnessThreshold(14)).toBeCloseTo(0.57);
    expect(forestWetnessThreshold(20)).toBeCloseTo(0.66);
    expect(forestWetnessThreshold(35)).toBeCloseTo(0.66);
  });
});
