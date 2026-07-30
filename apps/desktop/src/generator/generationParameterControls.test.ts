import { describe, expect, it } from 'vitest';
import { createDefaultConfig, topologyResolutionForOutput } from '@world-forge/shared';
import {
  generationActionLabel,
  generationConfigForQuality,
  generationParameterGroups,
  generationParameterLabels,
  updateGenerationParameterRange
} from './generationParameterControls';

describe('generation parameter controls', () => {
  it('groups every generation range exactly once', () => {
    const keys = generationParameterGroups.flatMap((group) => group.controls.map((control) => control.key));
    expect(keys).toHaveLength(new Set(keys).size);
    expect(new Set(keys)).toEqual(new Set(Object.keys(generationParameterLabels)));
  });

  it('uses accurate continent terminology', () => {
    expect(generationParameterLabels.continentCount).toBe('Continent count');
    expect(generationParameterLabels.continentScale).toBe('Continent size and cohesion');
    expect(Object.values(generationParameterLabels)).not.toContain('Regions');
    expect(Object.values(generationParameterLabels)).not.toContain('Continents');
  });

  it('keeps projected output and source topology aligned for a quality choice', () => {
    const config = createDefaultConfig('quality-test', { width: 512, height: 256 });
    const next = generationConfigForQuality(config, { width: 2048, height: 1024 });
    expect(next.outputResolution).toEqual({ width: 2048, height: 1024 });
    expect(next.topologyResolution).toBe(topologyResolutionForOutput(next.outputResolution));
  });

  it('clamps edited range values to the supported control bounds', () => {
    const config = createDefaultConfig('range-test');
    const next = updateGenerationParameterRange(config, 'continentCount', 'max', 99);
    expect(next.parameterRanges.continentCount.max).toBe(12);
    expect(config.parameterRanges.continentCount.max).toBe(7);
  });

  it('labels generation and replacement actions distinctly', () => {
    expect(generationActionLabel(false, false)).toBe('Generate');
    expect(generationActionLabel(true, false)).toBe('Regenerate');
    expect(generationActionLabel(false, true)).toBe('Generating...');
    expect(generationActionLabel(true, true)).toBe('Regenerating...');
  });
});
