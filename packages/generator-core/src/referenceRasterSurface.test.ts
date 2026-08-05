import { describe, expect, it } from 'vitest';
import {
  WORLD_BODY_DETAIL_SCHEMA,
  type RasterSurfaceDetailV1,
} from '@world-forge/shared/worldBodyDetails';
import { readWorldBodyCatalog } from '@world-forge/shared/worldBodies';
import { importReferenceBodyRaster, REFERENCE_BODY_RASTER_SCHEMA } from './referenceBodyImport';
import {
  REFERENCE_RASTER_SURFACE_PACKAGE_SCHEMA,
  attachReferenceRasterSurface,
} from './referenceRasterSurface';
import { createSolReferenceProject } from './solReferenceProject';

describe('reference raster surface attachment', () => {
  it('preserves prepared body assets without enabling unsupported views early', () => {
    const project = createSolReferenceProject(earthSurface());
    const albedo = Uint8Array.from([0x00, 0xf8, 0xe0, 0x07]);
    const elevation = Uint8Array.from([0x18, 0xfc, 0xd0, 0x07]);
    const detail = marsDetail(albedo.byteLength, elevation.byteLength);

    const enriched = attachReferenceRasterSurface(project, {
      schema: REFERENCE_RASTER_SURFACE_PACKAGE_SCHEMA,
      bodyId: 'mars',
      detail,
      payloads: {
        'mars-albedo': albedo,
        'mars-elevation': elevation,
      },
    });
    const mars = readWorldBodyCatalog(enriched).bodies.find((body) => body.bodyId === 'mars');

    expect(mars?.detail).toEqual(detail);
    expect(mars?.dataOrigin).toBe('imported');
    expect(mars?.capabilities).toEqual({
      globe: false,
      map: false,
      explorer: false,
      irregularShape: false,
    });
    expect([...enriched.bodyAssetPayloads!['mars-albedo']]).toEqual([...albedo]);
    expect([...enriched.bodyAssetPayloads!['mars-elevation']]).toEqual([...elevation]);
  });

  it('rejects missing or cross-body payloads', () => {
    const project = createSolReferenceProject(earthSurface());
    const detail = marsDetail(4, 4);

    expect(() => attachReferenceRasterSurface(project, {
      schema: REFERENCE_RASTER_SURFACE_PACKAGE_SCHEMA,
      bodyId: 'mars',
      detail,
      payloads: { 'mars-albedo': Uint8Array.from([0, 0, 0, 0]) },
    })).toThrow('mars-elevation');

    const unsafe: RasterSurfaceDetailV1 = {
      ...detail,
      assets: detail.assets!.map((asset) => asset.role === 'albedo'
        ? { ...asset, logicalPath: 'bodies/venus/albedo.rgb565' }
        : asset),
    };
    expect(() => attachReferenceRasterSurface(project, {
      schema: REFERENCE_RASTER_SURFACE_PACKAGE_SCHEMA,
      bodyId: 'mars',
      detail: unsafe,
      payloads: {
        'mars-albedo': Uint8Array.from([0, 0, 0, 0]),
        'mars-elevation': Uint8Array.from([0, 0, 0, 0]),
      },
    })).toThrow('body-local');
  });
});

function marsDetail(albedoBytes: number, elevationBytes: number): RasterSurfaceDetailV1 {
  return {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'raster-surface',
    tier: 'reference-surface',
    origin: 'imported',
    shape: { kind: 'sphere' },
    projection: 'equirectangular',
    resolution: { width: 2, height: 1 },
    layerRoles: ['albedo', 'elevation'],
    assets: [{
      assetId: 'mars-albedo',
      role: 'albedo',
      logicalPath: 'bodies/mars/albedo.rgb565',
      mediaType: 'application/vnd.world-forge.rgb565',
      encoding: 'rgb565-le',
      resolution: { width: 2, height: 1 },
      byteLength: albedoBytes,
    }, {
      assetId: 'mars-elevation',
      role: 'elevation',
      logicalPath: 'bodies/mars/elevation.i16',
      mediaType: 'application/vnd.world-forge.numeric-raster',
      encoding: 'int16-le',
      resolution: { width: 2, height: 1 },
      numericRaster: {
        dataType: 'int16',
        byteOrder: 'little-endian',
        units: 'm',
        scale: 1,
        offset: 0,
        datum: 'MOLA areoid',
        preparedRange: { min: -1000, max: 2000 },
        interpretation: 'absolute-elevation',
      },
      byteLength: elevationBytes,
    }],
  };
}

function earthSurface() {
  const width = 8;
  const height = 4;
  const elevationMeters = Float32Array.from({ length: width * height }, (_, index) => index % width < 5 ? -2000 : 500 + index * 10);
  return importReferenceBodyRaster({
    schema: REFERENCE_BODY_RASTER_SCHEMA,
    bodyId: 'earth',
    name: 'Earth',
    resolution: { width, height },
    elevationMeters,
    physical: {
      radiusKm: 6371.0088,
      massEarth: 1,
      axialTiltDeg: 23.439,
      orbitalEccentricity: 0.0167,
      averageTemperatureC: 14,
    },
    topologyResolution: 8,
  });
}
