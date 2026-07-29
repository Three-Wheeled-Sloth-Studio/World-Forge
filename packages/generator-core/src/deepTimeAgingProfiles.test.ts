import { describe, expect, it } from 'vitest';
import {
  boundedThreeEraAgingProfile,
  buildDeepTimeEpochs,
  deepTimeAgingProfileForWorkflow,
  legacyDeepTimeAgingProfile,
  scheduledDeepTimeIterations
} from './deepTimeAgingProfiles';

describe('deep-time aging profiles', () => {
  it('preserves the production six-epoch schedule', () => {
    const epochs = buildDeepTimeEpochs(4.6, legacyDeepTimeAgingProfile);
    expect(epochs).toHaveLength(6);
    expect(epochs.map((epoch) => epoch.climateSamples)).toEqual([1, 1, 3, 3, 3, 3]);
    expect(epochs.map((epoch) => epoch.tectonicIterations)).toEqual([3, 3, 3, 2, 2, 2]);
    expect(epochs.map((epoch) => epoch.impactIntensity)).toEqual([1, 0.64, 0.36, 0.16, 0.04, 0]);
    expect(epochs.at(-1)?.endAgeMy).toBe(4600);
    expect(scheduledDeepTimeIterations(epochs)).toBe(103);
  });

  it('uses three bounded eras for the experimental workflow', () => {
    const profile = deepTimeAgingProfileForWorkflow('core.performance-foundation');
    const epochs = buildDeepTimeEpochs(9.5, profile);
    expect(profile.id).toBe(boundedThreeEraAgingProfile.id);
    expect(epochs).toHaveLength(3);
    expect(epochs.map((epoch) => epoch.climateSamples)).toEqual([1, 2, 2]);
    expect(epochs.at(-1)?.endAgeMy).toBe(9500);
    expect(scheduledDeepTimeIterations(epochs)).toBe(24);
  });

  it('keeps the semantic-seed control on legacy six-epoch aging', () => {
    const profile = deepTimeAgingProfileForWorkflow('core.performance-foundation-control');
    const epochs = buildDeepTimeEpochs(4.6, profile);
    expect(profile.id).toBe(legacyDeepTimeAgingProfile.id);
    expect(epochs).toHaveLength(6);
    expect(scheduledDeepTimeIterations(epochs)).toBe(103);
  });

  it('defaults unknown workflows to the production schedule', () => {
    expect(deepTimeAgingProfileForWorkflow(undefined).id).toBe('legacy-six-epoch');
    expect(deepTimeAgingProfileForWorkflow('unknown').id).toBe('legacy-six-epoch');
  });
});
