import { describe, expect, it } from 'vitest';
import { equatorwardCurrentExposure } from '@world-forge/generator-core';
import {
  hydrationRegimeErrorProfiles,
  offshoreEkmanExposure,
  spearmanRankCorrelation,
  type HydrationRegimeSample,
} from './earthMetrics';

describe('Earth downstream metric math', () => {
  it('reports perfect monotonic agreement independent of scale', () => {
    expect(spearmanRankCorrelation([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 10);
  });

  it('handles tied ranks deterministically', () => {
    expect(spearmanRankCorrelation([1, 1, 2, 3], [4, 4, 3, 1])).toBeLessThan(-0.9);
  });

  it('identifies equatorward current exposure in either hemisphere', () => {
    expect(equatorwardCurrentExposure(0, 0.35, 25)).toBeCloseTo(1);
    expect(equatorwardCurrentExposure(0, -0.35, -25)).toBeCloseTo(1);
    expect(equatorwardCurrentExposure(0, -0.35, 25)).toBe(0);
    expect(equatorwardCurrentExposure(0, 0.35, -25)).toBe(0);
    expect(equatorwardCurrentExposure(0, 0.35, 2)).toBe(0);
  });

  it('identifies hemisphere-correct offshore Ekman transport', () => {
    expect(offshoreEkmanExposure(0, -0.35, 1, 0, 25)).toBeCloseTo(1);
    expect(offshoreEkmanExposure(0, 0.35, 1, 0, -25)).toBeCloseTo(1);
    expect(offshoreEkmanExposure(0, 0.35, 1, 0, 25)).toBe(0);
    expect(offshoreEkmanExposure(0, -0.35, 1, 0, -25)).toBe(0);
  });

  it('localizes false wet and false dry extremes by generated regime', () => {
    const observed = [0, 0.1, 0.2, 0.3, 0.7, 0.8, 0.9, 1];
    const generated = [0.9, 0.8, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    const samples: HydrationRegimeSample[] = observed.map((observedWetness, index) => ({
      observedWetness,
      generatedWetness: generated[index],
      temperatureC: index < 2 ? 28 : 14,
      coastDistance: index % 3,
      relief: index / 10,
      absoluteLatitude: index < 4 ? 25 : 45,
    }));

    const profiles = hydrationRegimeErrorProfiles(samples);

    expect(profiles.falseWet.sampleCount).toBe(3);
    expect(profiles.falseWet.value).toBeCloseTo(2 / 3);
    expect(profiles.falseWet.details.temperatureHotSamples).toBe(2);
    expect(profiles.falseWet.details.temperatureHotRate).toBe(1);
    expect(profiles.falseWet.details.temperatureHotLift).toBeCloseTo(1 / 3);
    expect(profiles.falseDry.sampleCount).toBe(3);
    expect(profiles.falseDry.value).toBeCloseTo(2 / 3);
    expect(profiles.falseDry.details.circulationPolarSamples).toBe(0);
    expect(profiles.falseDry.details.circulationPolarRate).toBe(0);
  });
});
