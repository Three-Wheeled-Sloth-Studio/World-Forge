import { describe, expect, it } from 'vitest';
import type { WorldProject } from '@world-forge/shared';
import { WORLD_BODY_DETAIL_SCHEMA } from '@world-forge/shared/worldBodyDetails';
import {
  WORLD_BODY_CATALOG_SCHEMA,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';
import {
  decodeNumericRasterToFloat32,
  decodeRgb565ToRgba,
  referenceRasterSurfaceForBody,
} from './referenceRasterPresentation';

describe('reference raster presentation', () => {
  it('stages imported albedo and elevation from one Tier 2 body', () => {
    const surface = referenceRasterSurfaceForBody(project(), 'mars');

    expect(surface).toMatchObject({
      bodyId: 'mars',
      albedo: { assetId: 'mars-albedo', width: 2, height: 1 },
      elevation: { assetId: 'mars-elevation', width: 2, height: 1 },
    });
    expect(surface?.elevation?.descriptor.datum).toBe('MOLA areoid');
  });

  it('decodes signed little-endian numeric rasters with scale, offset, and no-data', () => {
    const bytes = Uint8Array.from([
      0x18, 0xfc, // -1000
      0xd0, 0x07, // 2000
      0xff, 0x7f, // 32767 nodata
    ]);
    const values = decodeNumericRasterToFloat32(bytes, {
      dataType: 'int16',
      byteOrder: 'little-endian',
      units: 'm',
      scale: 2,
      offset: 10,
      noData: { kind: 'value', value: 32767 },
      interpretation: 'absolute-elevation',
    });

    expect(values[0]).toBe(-1990);
    expect(values[1]).toBe(4010);
    expect(Number.isNaN(values[2])).toBe(true);
  });

  it('keeps RGB565 decoding shared across atmospheric and solid reference bodies', () => {
    const rgba = decodeRgb565ToRgba(
      Uint8Array.from([0x00, 0xf8, 0xe0, 0x07, 0x1f, 0x00, 0xff, 0xff]),
      4,
      1,
    );

    expect(Array.from(rgba)).toEqual([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 255,
    ]);
  });

  it('rejects incomplete payload staging instead of presenting corrupt data', () => {
    const incomplete = project();
    delete incomplete.bodyAssetPayloads?.['mars-albedo'];
    delete incomplete.bodyAssetPayloads?.['mars-elevation'];
    expect(referenceRasterSurfaceForBody(incomplete, 'mars')).toBeNull();
  });
});

function project(): MultiBodyWorldProject {
  return {
    projectId: 'sol',
    projectName: 'Sol',
    primaryWorld: { id: 'earth', name: 'Earth' },
    solarSystem: {
      primaryWorldId: 'earth',
      bodies: [
        { id: 'earth', bodyType: 'rocky', isPrimaryWorld: true, moons: [] },
        { id: 'mars', bodyType: 'rocky', isPrimaryWorld: false, moons: [] },
      ],
    },
    bodyCatalog: {
      schema: WORLD_BODY_CATALOG_SCHEMA,
      primaryBodyId: 'earth',
      activeBodyId: 'mars',
      bodies: [{
        bodyId: 'earth',
        name: 'Earth',
        bodyType: 'rocky',
        capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
        dataOrigin: 'imported',
      }, {
        bodyId: 'mars',
        name: 'Mars',
        bodyType: 'rocky',
        capabilities: { globe: true, map: true, explorer: false, irregularShape: false },
        dataOrigin: 'imported',
        detail: {
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
            byteLength: 4,
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
            byteLength: 4,
          }],
        },
      }],
    },
    bodyAssetPayloads: {
      'mars-albedo': Uint8Array.from([0x00, 0xf8, 0xe0, 0x07]),
      'mars-elevation': Uint8Array.from([0x18, 0xfc, 0xd0, 0x07]),
    },
  } as unknown as MultiBodyWorldProject & WorldProject;
}
