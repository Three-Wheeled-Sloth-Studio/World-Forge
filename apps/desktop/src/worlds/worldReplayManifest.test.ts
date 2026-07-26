import { describe, expect, it } from 'vitest';
import type { WorldProject } from '@world-forge/shared';
import {
  CURRENT_WORLD_FORGE_GENERATOR_VERSION,
  assessWorldReplayCompatibility,
  authoritativeWorldSignature,
  buildWorldReplayManifest,
} from './worldReplayManifest';

function project(): WorldProject {
  return {
    projectId: 'world-101',
    projectName: 'Ashfall',
    createdAt: '2026-07-25T01:00:00.000Z',
    updatedAt: '2026-07-25T02:00:00.000Z',
    appVersion: '0.3.14',
    sourceCommit: 'abc123',
    generatorVersion: CURRENT_WORLD_FORGE_GENERATOR_VERSION,
    seed: '101',
    config: {
      seed: '101',
      parameterRanges: {} as WorldProject['config']['parameterRanges'],
      selectedValues: { oceanTolerancePercentagePoints: 5 },
      generationProfile: 'earthlike-mvp',
      outputResolution: { width: 2, height: 1 },
      projection: 'equirectangular',
      wrapMode: 'east-west',
    },
    selectedValues: {
      systemAgeGy: 4.5,
      oceanPercentage: 65,
      averageTemperatureC: 16,
      aridity: 0.5,
      seaLevel: 0,
      axialTiltDeg: 23,
      orbitalEccentricity: 0.02,
      sizeClass: 1,
      moonCount: 1,
      impactFrequency: 1,
      plateCount: 20,
      riverDensity: 1.6,
      continentCount: 5,
      continentScale: 0.55,
      islandDensity: 0.4,
      oceanTolerancePercentagePoints: 5,
    },
    solarSystem: { star: {}, bodies: [] } as unknown as WorldProject['solarSystem'],
    primaryWorld: {
      id: 'primary-world',
      name: 'Generated World 101',
      layers: { elevation: new Float32Array([0.25, 0.75]) },
      topologyLayers: { elevation: new Float32Array([0.1, 0.9]) },
      plates: [],
      rivers: [],
    } as unknown as WorldProject['primaryWorld'],
    metrics: { oceanPercentage: 65, validation: { oceanWithinTolerance: true, riverPathsValid: true } } as WorldProject['metrics'],
    exports: { packageExtension: '.wforge', supportedFormats: ['png', 'svg', 'json', 'wforge'] },
  };
}

describe('world replay manifest', () => {
  it('preserves the original partial selected-values config instead of replacing it with resolved values', () => {
    const manifest = buildWorldReplayManifest(project());

    expect(manifest.config.selectedValues).toEqual({ oceanTolerancePercentagePoints: 5 });
    expect(manifest.selectedValues.oceanPercentage).toBe(65);
    expect(manifest.outputSignature).toMatch(/^wf-a1-[0-9a-f]{16}$/);
    expect(assessWorldReplayCompatibility(manifest)).toBe('ready');
  });

  it('does not change the authoritative signature when only the display name changes', () => {
    const source = project();
    expect(authoritativeWorldSignature({ ...source, projectName: 'Ashfall Reforged' })).toBe(authoritativeWorldSignature(source));
  });

  it('changes the signature when authoritative layer data changes', () => {
    const source = project();
    const changed = project();
    changed.primaryWorld.layers.elevation[1] = 0.8;

    expect(authoritativeWorldSignature(changed)).not.toBe(authoritativeWorldSignature(source));
  });

  it('rejects a manifest from another generator contract', () => {
    const manifest = buildWorldReplayManifest(project());
    expect(assessWorldReplayCompatibility({ ...manifest, generatorVersion: 'future-generator' })).toBe('incompatible');
  });
});
