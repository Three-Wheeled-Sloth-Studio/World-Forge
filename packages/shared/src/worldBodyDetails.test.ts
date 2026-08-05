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

  it('supports package-driven basic Globe presentation without granting Map or Explorer', () => {
    const detail: WorldBodyDetailV1 = {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'basic-presentation',
      tier: 'presentation',
      origin: 'derived',
      shape: { kind: 'triaxial-ellipsoid', axisAKm: 14.4, axisBKm: 11.1, axisCKm: 8.7 },
      surface: {
        paletteHex: ['#7c7368', '#a39788'],
        roughness: 0.98,
        metalness: 0,
      },
      halo: { colorHex: '#c5a86d', opacity: 0.1, scale: 1.04 },
      rings: {
        innerRadiusRatio: 1.4,
        outerRadiusRatio: 2.1,
        opacity: 0.3,
        tiltDeg: 17,
        colorHex: '#b7a789',
      },
      sourceNote: 'Bounded visual presentation only.',
    };

    expect(isWorldBodyDetail(detail)).toBe(true);
    expect(worldBodyDetailCapabilities(detail)).toEqual({
      globe: true,
      map: false,
      explorer: false,
      irregularShape: false,
    });
    expect(isWorldBodyDetail({
      ...detail,
      halo: { colorHex: '#c5a86d', opacity: 0.1, scale: 0.9 },
    })).toBe(false);
    expect(isWorldBodyDetail({
      ...detail,
      surface: { ...detail.surface, roughness: 1.4 },
    })).toBe(false);
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

  it('preserves the physical interpretation of scientific numeric rasters', () => {
    const mars: WorldBodyDetailV1 = {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'raster-surface',
      tier: 'reference-surface',
      origin: 'imported',
      shape: { kind: 'sphere' },
      projection: 'equirectangular',
      resolution: { width: 512, height: 256 },
      layerRoles: ['albedo', 'elevation'],
      assets: [{
        assetId: 'mars-albedo',
        role: 'albedo',
        logicalPath: 'bodies/mars/albedo.rgb565',
        mediaType: 'application/vnd.world-forge.rgb565',
        encoding: 'rgb565-le',
        resolution: { width: 512, height: 256 },
      }, {
        assetId: 'mars-mola-elevation',
        role: 'elevation',
        logicalPath: 'bodies/mars/elevation.i16',
        mediaType: 'application/vnd.world-forge.numeric-raster',
        encoding: 'int16-le',
        resolution: { width: 512, height: 256 },
        numericRaster: {
          dataType: 'int16',
          byteOrder: 'little-endian',
          units: 'm',
          scale: 1,
          offset: 0,
          datum: 'MOLA areoid',
          sourceRange: { min: -8200, max: 21_900 },
          preparedRange: { min: -8200, max: 21_900 },
          interpretation: 'absolute-elevation',
        },
      }],
    };

    expect(isWorldBodyDetail(mars)).toBe(true);
    expect(isWorldBodyDetail({
      ...mars,
      assets: mars.assets!.map((asset) => asset.role === 'elevation'
        ? { ...asset, numericRaster: { ...asset.numericRaster!, byteOrder: undefined } }
        : asset),
    })).toBe(false);
    expect(isWorldBodyDetail({
      ...mars,
      assets: mars.assets!.map((asset) => asset.role === 'albedo'
        ? { ...asset, numericRaster: mars.assets![1].numericRaster }
        : asset),
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
