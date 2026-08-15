import { beforeEach, describe, expect, it } from 'vitest';
import type { PrimaryWorld, WorldProject } from '@world-forge/shared';
import { WORLD_BODY_DETAIL_SCHEMA } from '@world-forge/shared/worldBodyDetails';
import {
  WORLD_BODY_CATALOG_SCHEMA,
  withActiveWorldBody,
  withWorldBodySurface,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';
import { rememberSessionActiveWorldBody, resetSessionActiveWorldBody } from '@world-forge/shared/worldBodySession';
import {
  activeBodyProject,
  atmosphericPresentationRasterForActiveBody,
  decodeRgb565ToRgba,
  mapProjectForActiveBody,
} from './bodyAwarePresentation';

function surface(id: string, name = id): PrimaryWorld {
  return { id, name } as PrimaryWorld;
}

function project(): MultiBodyWorldProject {
  return {
    projectId: 'system-1',
    projectName: 'System',
    primaryWorld: surface('earth'),
    solarSystem: {
      primaryWorldId: 'earth',
      bodies: [
        { id: 'earth', bodyType: 'rocky', isPrimaryWorld: true, moons: [] },
        { id: 'mars', bodyType: 'rocky', isPrimaryWorld: false, moons: [] },
        { id: 'jupiter', bodyType: 'gas-giant', isPrimaryWorld: false, moons: [] },
      ],
    },
    bodyCatalog: {
      schema: WORLD_BODY_CATALOG_SCHEMA,
      primaryBodyId: 'earth',
      activeBodyId: 'earth',
      bodies: [
        {
          bodyId: 'earth',
          name: 'Earth',
          bodyType: 'rocky',
          capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
          dataOrigin: 'imported',
          detail: {
            schema: WORLD_BODY_DETAIL_SCHEMA,
            kind: 'geographic-surface',
            tier: 'geographic',
            origin: 'imported',
            shape: { kind: 'sphere' },
            surfaceContract: 'PrimaryWorld',
          },
          surface: surface('earth'),
        },
        {
          bodyId: 'mars',
          name: 'Mars',
          bodyType: 'rocky',
          capabilities: { globe: false, map: false, explorer: false, irregularShape: false },
          dataOrigin: 'imported',
        },
        {
          bodyId: 'jupiter',
          name: 'Jupiter',
          bodyType: 'gas-giant',
          capabilities: { globe: true, map: false, explorer: false, irregularShape: false },
          dataOrigin: 'imported',
          detail: {
            schema: WORLD_BODY_DETAIL_SCHEMA,
            kind: 'atmospheric-presentation',
            tier: 'presentation',
            origin: 'imported',
            shape: { kind: 'oblate-spheroid', equatorialRadiusKm: 71_492, polarRadiusKm: 66_854 },
            atmosphere: {
              paletteHex: ['#d8c4aa', '#9f7658'],
              bandCount: 12,
              bandContrast: 0.5,
              hazeStrength: 0.2,
            },
            assets: [{
              assetId: 'jupiter-rgb565',
              role: 'albedo',
              logicalPath: 'bodies/jupiter/albedo.rgb565',
              mediaType: 'application/vnd.world-forge.rgb565',
              encoding: 'rgb565-le',
              resolution: { width: 2, height: 1 },
              byteLength: 4,
            }],
          },
        },
      ],
    },
    bodyAssetPayloads: {
      'jupiter-rgb565': Uint8Array.from([0x00, 0xf8, 0x1f, 0x00]),
    },
  } as unknown as MultiBodyWorldProject;
}

describe('active-body renderer projection', () => {
  beforeEach(() => resetSessionActiveWorldBody());

  it('projects the selected surfaced body without splitting the system project', () => {
    const withMars = withWorldBodySurface(project(), {
      bodyId: 'mars',
      name: 'Mars',
      bodyType: 'rocky',
      capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
      dataOrigin: 'imported',
      surface: surface('mars'),
    });
    const active = withActiveWorldBody(withMars, 'mars');
    const rendered = activeBodyProject(active);

    expect(rendered.projectId).toBe('system-1');
    expect(rendered.primaryWorld.id).toBe('mars');
  });

  it('uses the current primary surface when the catalog still contains an older primary snapshot', () => {
    const source = project();
    source.primaryWorld = surface('earth', 'Earth current');
    const primaryRecord = source.bodyCatalog?.bodies.find((body) => body.bodyId === 'earth');
    if (primaryRecord) primaryRecord.surface = surface('earth', 'Earth stale');

    expect(activeBodyProject(source).primaryWorld.name).toBe('Earth current');
    expect(mapProjectForActiveBody(source)?.primaryWorld.name).toBe('Earth current');
  });

  it('uses the session body selected by the system viewer', () => {
    const withMars = withWorldBodySurface(project(), {
      bodyId: 'mars',
      name: 'Mars',
      bodyType: 'rocky',
      capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
      dataOrigin: 'imported',
      surface: surface('mars'),
    });
    expect(rememberSessionActiveWorldBody(withMars, 'mars')).toBe(true);
    expect(mapProjectForActiveBody(withMars)?.primaryWorld.id).toBe('mars');
  });

  it('reports no mappable project when the active body has no surface', () => {
    const active = withActiveWorldBody(project(), 'mars');
    expect(mapProjectForActiveBody(active)).toBeNull();
    expect(activeBodyProject(active).primaryWorld.id).toBe('earth');
  });

  it('resolves a compact imported atmospheric raster without granting Map capability', () => {
    const active = withActiveWorldBody(project(), 'jupiter');
    const raster = atmosphericPresentationRasterForActiveBody(active);

    expect(mapProjectForActiveBody(active)).toBeNull();
    expect(raster).toMatchObject({
      assetId: 'jupiter-rgb565',
      encoding: 'rgb565-le',
      width: 2,
      height: 1,
    });
    expect(raster?.bytes).toEqual(Uint8Array.from([0x00, 0xf8, 0x1f, 0x00]));
  });

  it('decodes little-endian RGB565 into opaque RGBA pixels', () => {
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
});
