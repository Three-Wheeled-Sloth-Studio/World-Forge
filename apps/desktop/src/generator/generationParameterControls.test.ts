import { describe, expect, it } from 'vitest';
import { createDefaultConfig, topologyResolutionForOutput } from '@world-forge/shared';
import { distributionTargetAndSpread } from '@world-forge/generator-core/worldParameterPresets';
import {
  generationActionLabel,
  generationConfigForQuality,
  generationParameterDistribution,
  generationParameterGroups,
  generationParameterLabels,
  updateGenerationParameterDistribution
} from './generationParameterControls';

describe('generation parameter controls', () => {
  it('groups every generation parameter exactly once', () => {
    const keys = generationParameterGroups.flatMap((group) => group.controls.map((control) => control.key));
    expect(keys).toHaveLength(new Set(keys).size);
    expect(new Set(keys)).toEqual(new Set(Object.keys(generationParameterLabels)));
  });

  it('uses accurate continent and runoff terminology', () => {
    expect(generationParameterLabels.continentCount).toBe('Continent count');
    expect(generationParameterLabels.continentScale).toBe('Continent size and cohesion');
    expect(generationParameterLabels.riverDensity).toBe('Runoff and river-network target');
    expect(Object.values(generationParameterLabels)).not.toContain('Regions');
    expect(Object.values(generationParameterLabels)).not.toContain('Continents');
  });

  it('keeps projected output and source topology aligned for a quality choice', () => {
    const config = createDefaultConfig('quality-test', { width: 512, height: 256 });
    const next = generationConfigForQuality(config, { width: 2048, height: 1024 });
    expect(next.outputResolution).toEqual({ width: 2048, height: 1024 });
    expect(next.topologyResolution).toBe(topologyResolutionForOutput(next.outputResolution));
  });

  it('inherits world-type distributions until a target or spread is explicitly overridden', () => {
    const config = createDefaultConfig('distribution-test');
    const earthlike = distributionTargetAndSpread(generationParameterDistribution(config, 'Earthlike', 'oceanPercentage'));
    const habitable = distributionTargetAndSpread(generationParameterDistribution(config, 'Habitable World', 'oceanPercentage'));
    expect(habitable.target).toBe(earthlike.target);
    expect(habitable.spread).toBeGreaterThan(earthlike.spread);

    const next = updateGenerationParameterDistribution(config, 'Earthlike', 'oceanPercentage', 'spread', 9);
    const overridden = distributionTargetAndSpread(generationParameterDistribution(next, 'Earthlike', 'oceanPercentage'));
    expect(overridden.target).toBe(earthlike.target);
    expect(overridden.spread).toBe(9);
  });

  it('clamps edited targets to the supported control bounds', () => {
    const config = createDefaultConfig('target-test');
    const next = updateGenerationParameterDistribution(config, 'Earthlike', 'continentCount', 'target', 99);
    const edited = distributionTargetAndSpread(generationParameterDistribution(next, 'Earthlike', 'continentCount'));
    expect(edited.target).toBe(12);
  });

  it('labels generation and replacement actions distinctly', () => {
    expect(generationActionLabel(false, false)).toBe('Generate');
    expect(generationActionLabel(true, false)).toBe('Regenerate');
    expect(generationActionLabel(false, true)).toBe('Generating...');
    expect(generationActionLabel(true, true)).toBe('Regenerating...');
  });
});
