import { describe, expect, it } from 'vitest';
import { readWorldBodyCatalog, type MultiBodyWorldProject } from '@world-forge/shared/worldBodies';
import { importReferenceBodyRaster, REFERENCE_BODY_RASTER_SCHEMA } from './referenceBodyImport';
import { createSolReferenceProject } from './solReferenceProject';
import {
  attachReferenceAtmosphericAppearance,
  REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA,
} from './referenceAtmosphericPresentation';

function solProject() {
  const width = 8;
  const height = 4;
  const earth = importReferenceBodyRaster({
    schema: REFERENCE_BODY_RASTER_SCHEMA,
    bodyId: 'earth',
    name: 'Earth',
    resolution: { width, height },
    elevationMeters: Float32Array.from({ length: width * height }, (_, index) => index % width < 5 ? -1500 : 500),
    physical: {
      radiusKm: 6371.0088,
      massEarth: 1,
      axialTiltDeg: 23.439,
      orbitalEccentricity: 0.0167,
      averageTemperatureC: 14,
    },
    topologyResolution: 8,
  });
  return createSolReferenceProject(earth);
}

describe('reference atmospheric appearance', () => {
  it('attaches a compact source-backed raster and exposes only the supported Globe capability', () => {
    const source = Uint8Array.from([0x00, 0xf8, 0x1f, 0x00]);
    const project = attachReferenceAtmosphericAppearance(solProject(), {
      schema: REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA,
      bodyId: 'jupiter',
      assetId: 'jupiter-cassini-pia07782-albedo',
      logicalPath: 'bodies/jupiter/albedo.rgb565',
      mediaType: 'application/vnd.world-forge.rgb565',
      encoding: 'rgb565-le',
      bytes: source,
      resolution: { width: 2, height: 1 },
    });
    source[0] = 0xff;

    const jupiter = readWorldBodyCatalog(project).bodies.find((body) => body.bodyId === 'jupiter');
    expect(jupiter?.capabilities).toEqual({ globe: true, map: false, explorer: false, irregularShape: false });
    expect(jupiter?.dataOrigin).toBe('imported');
    expect(jupiter?.detail?.kind).toBe('atmospheric-presentation');
    expect(jupiter?.detail?.origin).toBe('imported');
    expect(jupiter?.detail?.assets?.[0]).toMatchObject({
      assetId: 'jupiter-cassini-pia07782-albedo',
      role: 'albedo',
      logicalPath: 'bodies/jupiter/albedo.rgb565',
      mediaType: 'application/vnd.world-forge.rgb565',
      encoding: 'rgb565-le',
      byteLength: 4,
    });
    expect((project as MultiBodyWorldProject).bodyAssetPayloads?.['jupiter-cassini-pia07782-albedo'])
      .toEqual(Uint8Array.from([0x00, 0xf8, 0x1f, 0x00]));
  });

  it('rejects non-atmospheric targets, unsafe paths, non-equirectangular resolutions, and malformed compact payloads', () => {
    const base = solProject();
    const common = {
      schema: REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA,
      assetId: 'reference-image',
      mediaType: 'image/jpeg',
      bytes: Uint8Array.from([1]),
    } as const;

    expect(() => attachReferenceAtmosphericAppearance(base, {
      ...common,
      bodyId: 'mars',
      logicalPath: 'bodies/mars/albedo.jpg',
    })).toThrow('requires an atmospheric-presentation body');

    expect(() => attachReferenceAtmosphericAppearance(base, {
      ...common,
      bodyId: 'jupiter',
      logicalPath: '../jupiter.jpg',
    })).toThrow('body-local path');

    expect(() => attachReferenceAtmosphericAppearance(base, {
      ...common,
      bodyId: 'jupiter',
      logicalPath: 'bodies/jupiter/albedo.jpg',
      resolution: { width: 1024, height: 1024 },
    })).toThrow('approximately 2:1');

    expect(() => attachReferenceAtmosphericAppearance(base, {
      schema: REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA,
      bodyId: 'jupiter',
      assetId: 'bad-rgb565',
      logicalPath: 'bodies/jupiter/albedo.rgb565',
      mediaType: 'application/vnd.world-forge.rgb565',
      encoding: 'rgb565-le',
      bytes: Uint8Array.from([1, 2, 3]),
      resolution: { width: 2, height: 1 },
    })).toThrow('supported image or RGB565 payload');
  });
});
