import { describe, expect, it } from 'vitest';
import { coldHydrationAvailability, equatorwardCurrentExposure } from '@world-forge/generator-core';
import {
  attributeWetlandHydrology,
  createNativeBiomeConfusionAccumulator,
  hydrationRegimeErrorProfiles,
  offshoreEkmanExposure,
  recordNativeBiomeConfusion,
  seasonalForestThresholdAdjustment,
  spearmanRankCorrelation,
  summarizeNativeBiomeConfusion,
  wetlandWaterTableCandidates,
  type HydrationRegimeSample,
} from './earthMetrics';

describe('Earth downstream metric math', () => {
  it('attributes generated wetlands to mutually exclusive production hydrology branches', () => {
    const common = {
      generatedWetland: true,
      lake: false,
      wetness: 0.7,
      river: 0.6,
      altitude: 0.01,
      localRelief: 0.01,
      lakeWetnessSupport: 0.35,
    };

    expect(attributeWetlandHydrology({ ...common, lake: true })).toBe('standingWater');
    expect(attributeWetlandHydrology(common)).toBe('riverineFloodplain');
    expect(attributeWetlandHydrology({ ...common, altitude: 0.08 })).toBe('strongRiver');
    expect(attributeWetlandHydrology({ ...common, river: 0.1 })).toBe('cohesionOrResidual');
    expect(attributeWetlandHydrology({ ...common, generatedWetland: false })).toBe('notWetland');
  });

  it('screens drainage-margin and cold-peatland water-table evidence independently', () => {
    const common = {
      generatedWetland: false,
      lake: false,
      wetness: 0.6,
      river: 0.1,
      altitude: 0.02,
      localRelief: 0.01,
      lakeWetnessSupport: 0.35,
      temperatureC: 8,
      neighborhoodRiver: 0.3,
      neighborhoodLake: false,
    };

    expect(wetlandWaterTableCandidates(common)).toEqual({ drainageMargin: true, coldPeatland: true });
    expect(wetlandWaterTableCandidates({ ...common, temperatureC: 20 })).toEqual({
      drainageMargin: true,
      coldPeatland: false,
    });
    expect(wetlandWaterTableCandidates({ ...common, generatedWetland: true })).toEqual({
      drainageMargin: false,
      coldPeatland: false,
    });
  });

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

  it('reduces usable hydration only as surfaces become deeply frozen', () => {
    expect(coldHydrationAvailability(0.8, 10)).toBe(0.8);
    expect(coldHydrationAvailability(0.8, 5)).toBe(0.8);
    expect(coldHydrationAvailability(0.8, -7.5)).toBeCloseTo(0.5);
    expect(coldHydrationAvailability(0.8, -20)).toBeCloseTo(0.2);
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
      precipitation: index / 10,
      atmosphericMoisture: index / 8,
      recyclableSource: index / 12,
      hydrationLoss: (7 - index) / 20,
      subsidence: index < 4 ? 0.8 : 0.2,
      convergence: index < 4 ? 0.1 : 0.7,
      currentExposure: index / 9,
      coolCurrentStability: index / 11,
      offshoreEkman: index / 13,
      oceanWestExposure: index % 2,
    }));

    const profiles = hydrationRegimeErrorProfiles(samples);

    expect(profiles.falseWet.sampleCount).toBe(3);
    expect(profiles.falseWet.value).toBeCloseTo(2 / 3);
    expect(profiles.falseWet.details.temperatureHotSamples).toBe(2);
    expect(profiles.falseWet.details.temperatureHotRate).toBe(1);
    expect(profiles.falseWet.details.temperatureHotLift).toBeCloseTo(1 / 3);
    expect(profiles.falseWet.details.temperateDryCoastFailures).toBe(0);
    expect(profiles.falseWet.details.temperateDryCoastSuccesses).toBe(0);
    expect(profiles.falseDry.sampleCount).toBe(3);
    expect(profiles.falseDry.value).toBeCloseTo(2 / 3);
    expect(profiles.falseDry.details.circulationPolarSamples).toBe(0);
    expect(profiles.falseDry.details.circulationPolarRate).toBe(0);
    expect(profiles.falseDry.details.deepInteriorWetFailures).toBe(0);
    expect(profiles.falseDry.details.deepInteriorWetSuccesses).toBe(0);
  });

  it('localizes native biome confusion without retaining native samples', () => {
    const accumulator = createNativeBiomeConfusionAccumulator();
    recordNativeBiomeConfusion(accumulator, 4, 5, 12, 0.7, 0.5, 0.75, 0.68, 0.2, 0.1, 0.2, 0.3, 0.1, 40);
    recordNativeBiomeConfusion(accumulator, 4, 5, 18, 0.8, 0.6, 0.85, 0.72, 0.4, 0.2, 0.4, 0.1, 0.2, 30);
    recordNativeBiomeConfusion(accumulator, 4, 4, 15, 0.55, 0.55, 0.6, 0.58, 0.3, 0.15, 0.3, 0.2, 0.15, 35);

    const profile = summarizeNativeBiomeConfusion(accumulator);

    expect(profile.nativeReference4Generated5Samples).toBe(2);
    expect(profile.nativeReference4Generated5MeanTemperature).toBe(15);
    expect(profile.nativeReference4Generated5MeanGeneratedWetness).toBeCloseTo(0.75);
    expect(profile.nativeReference4Generated5MeanReferenceWetness).toBeCloseTo(0.55);
    expect(profile.nativeReference4Generated5MeanWetnessError).toBeCloseTo(0.2);
    expect(profile.nativeReference4Generated5MeanRiver).toBeCloseTo(0.3);
    expect(profile.nativeReference4Generated5MeanLakeShare).toBeCloseTo(0.15);
    expect(profile.nativeReference4Generated4Samples).toBe(1);
    expect(profile.nativeReference3Generated5Samples).toBe(0);
  });

  it('bounds dry-season forest moisture demand without rewarding negative stress', () => {
    expect(seasonalForestThresholdAdjustment(-0.2, 0.4)).toBe(0);
    expect(seasonalForestThresholdAdjustment(0.2, 0.4)).toBeCloseTo(0.08);
    expect(seasonalForestThresholdAdjustment(1, 0.4)).toBe(0.12);
  });
});
