import { describe, expect, test } from 'vitest';
import type { BodyGenerationProfile, GeneratedSystemBodyArtifact } from '@world-forge/shared';
import { generatedBodyPaletteFamily } from './generatedBodyPresentation';

function artifact(profile: BodyGenerationProfile, radiusClass: number, thermal: number): GeneratedSystemBodyArtifact {
  return {
    bodyProfile: profile,
    seed: `palette-${profile}-${radiusClass}-${thermal}`,
    payload: {
      radiusClass,
      thermalField: [thermal, thermal],
      stats: { meanAlbedo: 0.5 }
    }
  } as GeneratedSystemBodyArtifact;
}

describe('generated body palette families', () => {
  test('gives massive rocky worlds atmosphere-informed color families', () => {
    expect(generatedBodyPaletteFamily(artifact('rocky-body', 1.1, 0.8))).toBe('rocky-hot-haze');
    expect(generatedBodyPaletteFamily(artifact('rocky-body', 1.1, 0.15))).toMatch(/^rocky-cold-/);
    expect(generatedBodyPaletteFamily(artifact('rocky-body', 0.45, 0.5))).toMatch(/^rocky-airless-/);
  });

  test('uses distinct real-solar-system-inspired giant families', () => {
    expect(generatedBodyPaletteFamily(artifact('gas-giant-body', 7, 0.4))).toMatch(/^gas-/);
    expect(generatedBodyPaletteFamily(artifact('ice-giant-body', 5, 0.3))).toMatch(/^ice-/);
  });
});
