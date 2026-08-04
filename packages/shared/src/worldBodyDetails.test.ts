import { describe, expect, it } from 'vitest';
import {
  WORLD_BODY_DETAIL_SCHEMA,
  isWorldBodyDetail,
  worldBodyDetailCapabilities,
  type WorldBodyDetailV1,
} from './worldBodyDetails';

describe('world body detail contracts', () => {
  it('keeps atmospheric presentation Globe-capable without pretending it is geographic', () => {
    const detail: WorldBodyDetailV1 = {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'atmospheric-presentation',
      tier: 'presentation',
      origin: 'derived',
      shape: { kind: 'oblate-spheroid', equatorialRadiusKm: 71_492, polarRadiusKm: 66_854 },
      atmosphere: {
        paletteHex: ['#e7d2b4', '#ba865d'],
        bandCount: 12,
        bandContrast: 0.55,
        hazeStrength: 0.18,
      },
    };

    expect(isWorldBodyDetail(detail)).toBe(true);
    expect(worldBodyDetailCapabilities(detail)).toEqual({
      globe: true,
      map: false,
      explorer: false,
      irregularShape: false,
    });
  });

  it('requires package assets for compact raster and irregular-mesh surfaces', () => {
    const raster: WorldBodyDetailV1 = {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'raster-surface',
      tier: 'reference-surface',
      origin: 'imported',
      shape: { kind: 'sphere' },
      projection: 'equirectangular',
      resolution: { width: 512, height: 256 },
      layerRoles: ['albedo'],
      assets: [{
        assetId: 'luna-albedo',
        role: 'albedo',
        logicalPath: 'bodies/luna/albedo.webp',
        mediaType: 'image/webp',
        resolution: { width: 512, height: 256 },
        byteLength: 128,
        sha256: `sha256:${'a'.repeat(64)}`,
      }],
    };
    const mesh: WorldBodyDetailV1 = {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'irregular-mesh',
      tier: 'reference-surface',
      origin: 'imported',
      shape: { kind: 'irregular-mesh' },
      assets: [{
        assetId: 'phobos-mesh',
        role: 'mesh',
        logicalPath: 'bodies/phobos/shape.glb',
        mediaType: 'model/gltf-binary',
      }],
    };

    expect(isWorldBodyDetail(raster)).toBe(true);
    expect(worldBodyDetailCapabilities(raster).map).toBe(true);
    expect(isWorldBodyDetail(mesh)).toBe(true);
    expect(worldBodyDetailCapabilities(mesh).irregularShape).toBe(true);
    expect(isWorldBodyDetail({ ...mesh, assets: [] })).toBe(false);
    expect(isWorldBodyDetail({
      ...raster,
      assets: [{ ...raster.assets![0], sha256: 'sha256:not-a-real-digest' }],
    })).toBe(false);
  });

  it('rejects unsafe package paths and invalid population bounds', () => {
    const population = {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'population',
      tier: 'presentation',
      origin: 'derived',
      distribution: {
        innerRadiusKm: 478_000_000,
        outerRadiusKm: 329_000_000,
        verticalSpreadKm: 10_000_000,
        relativeDensity: 1,
      },
      realizationSeed: 'invalid-belt',
      maxPreviewParticles: 1000,
    };
    const catalogWithUnsafeAsset = {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'catalog',
      tier: 'catalog',
      origin: 'imported',
      shape: { kind: 'sphere' },
      assets: [{
        assetId: 'unsafe',
        role: 'albedo',
        logicalPath: '../secret.map',
        mediaType: 'image/webp',
      }],
    };

    expect(isWorldBodyDetail(population)).toBe(false);
    expect(isWorldBodyDetail(catalogWithUnsafeAsset)).toBe(false);
  });
});
