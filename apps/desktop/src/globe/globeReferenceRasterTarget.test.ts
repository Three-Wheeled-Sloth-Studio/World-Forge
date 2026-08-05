import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import { WORLD_BODY_DETAIL_SCHEMA } from '@world-forge/shared/worldBodyDetails';
import {
  WORLD_BODY_CATALOG_SCHEMA,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';
import {
  resetSessionActiveWorldBody,
  sessionActiveWorldBodyId,
} from '@world-forge/shared/worldBodySession';
import { canOpenGlobeBodyTarget, resolveGlobeBodyTarget } from './globeBodyTarget';

const earth = {
  id: 'earth', parentBodyId: 'sol', kind: 'rocky', orbitalOrder: 3,
  semiMajorAxisAu: 1, semiMajorAxisParentRadii: null, eccentricity: 0.0167,
  inclinationDeg: 0, longitudeAscendingNodeDeg: 0, argumentOfPeriapsisDeg: 0,
  orbitalPeriodDays: 365.25, phaseAtEpochRad: 0, rotationPeriodHours: 24,
  axialTiltDeg: 23.439, sizeClass: 1, massClass: 1, visibleFromPrimary: true, placeholder: false,
} as const;
const mars = {
  id: 'mars', parentBodyId: 'sol', kind: 'rocky', orbitalOrder: 4,
  semiMajorAxisAu: 1.524, semiMajorAxisParentRadii: null, eccentricity: 0.0934,
  inclinationDeg: 1.85, longitudeAscendingNodeDeg: 49.6, argumentOfPeriapsisDeg: 286.5,
  orbitalPeriodDays: 686.98, phaseAtEpochRad: 0.5, rotationPeriodHours: 24.62,
  axialTiltDeg: 25.19, sizeClass: 0.532, massClass: 0.107, visibleFromPrimary: true, placeholder: false,
} as const;

describe('Tier 2 Globe target resolution', () => {
  beforeEach(() => resetSessionActiveWorldBody());

  it('opens a hydrated reference raster without fabricating a PrimaryWorld', () => {
    const source = project(true);
    const context = orbitalContext();
    const artifactLookup = vi.fn();

    expect(canOpenGlobeBodyTarget(source, context, 'mars', artifactLookup)).toBe(true);
    const target = resolveGlobeBodyTarget(source, context, 'mars', artifactLookup);

    expect(target).toMatchObject({
      bodyId: 'mars',
      label: 'Mars',
      mode: 'reference-raster-surface-body',
      artifact: null,
      surfaceProject: null,
      atmosphericDetail: null,
    });
    expect(target?.rasterDetail?.kind).toBe('raster-surface');
    expect(target?.rasterDetail?.assets?.[0].assetId).toBe('mars-albedo');
    expect(artifactLookup).not.toHaveBeenCalled();
    expect(sessionActiveWorldBodyId(source)).toBe('mars');
  });

  it('does not advertise the target when the prepared appearance bytes are absent', () => {
    const source = project(false);
    const context = orbitalContext();
    const artifactLookup = vi.fn();

    expect(canOpenGlobeBodyTarget(source, context, 'mars', artifactLookup)).toBe(false);
    expect(resolveGlobeBodyTarget(source, context, 'mars', artifactLookup)?.bodyId).toBe('earth');
    expect(artifactLookup).not.toHaveBeenCalled();
  });
});

function orbitalContext(): SystemOrbitalContextArtifact {
  return {
    artifactSignature: 'sol-test',
    seed: 'sol-test',
    payload: {
      star: {
        id: 'sol', massSolar: 1, radiusSolar: 1, luminositySolar: 1,
        effectiveTemperatureK: 5772, colorHex: '#fff0b0',
      },
      primaryBodyId: 'earth',
      visibleBodyIds: ['mars'],
      bodies: [{ ...earth }, { ...mars }],
    },
  } as unknown as SystemOrbitalContextArtifact;
}

function project(includePayload: boolean): WorldProject {
  return {
    projectId: 'sol-reference',
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
      activeBodyId: 'earth',
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
          shape: { kind: 'oblate-spheroid', equatorialRadiusKm: 3396.19, polarRadiusKm: 3376.2 },
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
              dataType: 'int16', byteOrder: 'little-endian', units: 'm',
              scale: 1, offset: 0, datum: 'MOLA areoid',
              interpretation: 'absolute-elevation',
            },
            byteLength: 4,
          }],
        },
      }],
    },
    bodyAssetPayloads: includePayload
      ? {
          'mars-albedo': Uint8Array.from([0x00, 0xf8, 0xe0, 0x07]),
          'mars-elevation': Uint8Array.from([0x18, 0xfc, 0xd0, 0x07]),
        }
      : undefined,
  } as unknown as MultiBodyWorldProject & WorldProject;
}
