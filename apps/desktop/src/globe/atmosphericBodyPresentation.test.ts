import { describe, expect, it } from 'vitest';
import type { AtmosphericPresentationDetailV1 } from '@world-forge/shared/worldBodyDetails';
import { WORLD_BODY_DETAIL_SCHEMA } from '@world-forge/shared/worldBodyDetails';
import {
  atmosphericPolarScale,
  resolveAtmosphericAppearance,
} from './atmosphericBodyPresentation';

function detail(): AtmosphericPresentationDetailV1 {
  return {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'atmospheric-presentation',
    tier: 'presentation',
    origin: 'imported',
    shape: {
      kind: 'oblate-spheroid',
      equatorialRadiusKm: 71_492,
      polarRadiusKm: 66_854,
    },
    atmosphere: {
      paletteHex: ['#d8c4aa', '#9f7658'],
      bandCount: 12,
      bandContrast: 0.5,
      hazeStrength: 0.2,
    },
    assets: [
      {
        assetId: 'jupiter-clouds',
        role: 'clouds',
        logicalPath: 'bodies/jupiter/clouds.jpg',
        mediaType: 'image/jpeg',
      },
      {
        assetId: 'jupiter-albedo',
        role: 'albedo',
        logicalPath: 'bodies/jupiter/albedo.jpg',
        mediaType: 'image/jpeg',
        resolution: { width: 3600, height: 1800 },
      },
    ],
  };
}

describe('atmospheric body presentation', () => {
  it('prefers imported albedo over a cloud-only appearance and resolves hydrated bytes', () => {
    const resolved = resolveAtmosphericAppearance(detail(), {
      'jupiter-clouds': Uint8Array.from([9]),
      'jupiter-albedo': Uint8Array.from([1, 2, 3]),
    });

    expect(resolved?.asset.assetId).toBe('jupiter-albedo');
    expect(resolved?.bytes).toEqual(Uint8Array.from([1, 2, 3]));
  });

  it('returns null when the declared image payload is unavailable', () => {
    expect(resolveAtmosphericAppearance(detail(), {})).toBeNull();
    expect(resolveAtmosphericAppearance(detail(), undefined)).toBeNull();
  });

  it('uses the physical polar-to-equatorial radius ratio for oblate presentation', () => {
    expect(atmosphericPolarScale(detail())).toBeCloseTo(66_854 / 71_492, 6);
    expect(atmosphericPolarScale({ ...detail(), shape: { kind: 'sphere' } })).toBe(1);
  });
});
