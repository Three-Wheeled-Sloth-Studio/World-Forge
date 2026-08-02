import { describe, expect, it } from 'vitest';
import {
  distributionHardBounds,
  distributionTargetAndSpread,
  worldParameterDistributionsForPreset,
  worldParameterKeys
} from './worldParameterPresets';

describe('world parameter preset distributions', () => {
  it('defines every parameter for every supported preset', () => {
    for (const preset of ['Earthlike', 'Habitable World', 'Waterworld', 'Archipelago', 'Desert World', 'Pangea', 'Random World']) {
      const distributions = worldParameterDistributionsForPreset(preset);
      expect(Object.keys(distributions).sort()).toEqual([...worldParameterKeys].sort());
      for (const key of worldParameterKeys) {
        const bounds = distributionHardBounds(distributions[key]);
        const editable = distributionTargetAndSpread(distributions[key]);
        expect(editable.target).toBeGreaterThanOrEqual(bounds.min);
        expect(editable.target).toBeLessThanOrEqual(bounds.max);
        expect(editable.spread).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps Habitable centered on Earthlike while widening the band', () => {
    const earthlike = worldParameterDistributionsForPreset('Earthlike');
    const habitable = worldParameterDistributionsForPreset('Habitable World');
    for (const key of worldParameterKeys) {
      const earth = distributionTargetAndSpread(earthlike[key]);
      const broad = distributionTargetAndSpread(habitable[key]);
      expect(broad.target).toBe(earth.target);
      expect(broad.spread).toBeGreaterThanOrEqual(earth.spread);
    }
  });

  it('keeps specialized presets centered on their intended world shape', () => {
    const waterworld = worldParameterDistributionsForPreset('Waterworld');
    const archipelago = worldParameterDistributionsForPreset('Archipelago');
    const desert = worldParameterDistributionsForPreset('Desert World');
    const pangea = worldParameterDistributionsForPreset('Pangea');
    expect(distributionTargetAndSpread(waterworld.oceanPercentage).target).toBeGreaterThan(80);
    expect(distributionTargetAndSpread(archipelago.islandDensity).target).toBeGreaterThan(0.75);
    expect(distributionTargetAndSpread(desert.aridity).target).toBeGreaterThan(0.7);
    expect(distributionTargetAndSpread(pangea.continentCount).target).toBeLessThan(2);
  });
});
