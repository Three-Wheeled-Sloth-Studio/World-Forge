import { describe, expect, test } from 'vitest';
import {
  runSystemBodyGenerationWorkflow,
  type SystemBodyGenerationSource
} from './systemBodyGeneration';
import type { BodyGenerationProfile, OrbitalPresentationBody } from '@world-forge/shared';

function source(profile: BodyGenerationProfile, kind: OrbitalPresentationBody['kind']): SystemBodyGenerationSource {
  return {
    projectId: 'project-seam',
    worldId: 'world-seam',
    bodyId: `body-${profile}`,
    parentBodyId: 'star-primary',
    seed: `seam:${profile}`,
    generatorVersion: 'test',
    appVersion: 'test',
    orbitalArtifactSignature: 'orbital-test',
    requestedFidelity: 'standard',
    profile,
    systemAgeGy: 4.6,
    body: {
      id: `body-${profile}`,
      parentBodyId: 'star-primary',
      kind,
      orbitalOrder: 6,
      semiMajorAxisAu: 2.4,
      semiMajorAxisParentRadii: null,
      eccentricity: 0.04,
      orbitalPeriodDays: 900,
      rotationPeriodHours: 18,
      axialTiltDeg: 12,
      sizeClass: profile.includes('giant') ? 6 : 1.2,
      massClass: profile.includes('giant') ? 8 : 1.1,
      placeholder: true
    }
  };
}

function maxSeamDelta(field: number[], width: number, height: number): number {
  let maximum = 0;
  for (let y = 0; y < height; y += 1) {
    maximum = Math.max(maximum, Math.abs((field[y * width] ?? 0) - (field[y * width + width - 1] ?? 0)));
  }
  return maximum;
}

describe('generated system body seam normalization', () => {
  test.each([
    ['rocky-body', 'rocky'],
    ['airless-rocky-body', 'moon'],
    ['gas-giant-body', 'gas-giant'],
    ['ice-giant-body', 'ice-giant']
  ] as const)('keeps %s fields continuous across the wrapped longitude', async (profile, kind) => {
    const artifact = await runSystemBodyGenerationWorkflow(source(profile, kind));
    const { width, height } = artifact.payload.resolution;
    expect(artifact.payload.stats.seamMeanDelta).toBeLessThanOrEqual(0.000001);
    for (const field of [artifact.payload.heightField, artifact.payload.albedoField, artifact.payload.thermalField, artifact.payload.bandField]) {
      if (!field.length) continue;
      expect(maxSeamDelta(field, width, height)).toBeLessThanOrEqual(0.000001);
    }
  });
});
