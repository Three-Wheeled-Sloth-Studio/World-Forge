import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeneratedSystemBodyArtifact, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import { WORLD_BODY_DETAIL_SCHEMA } from '@world-forge/shared/worldBodyDetails';
import { WORLD_BODY_CATALOG_SCHEMA } from '@world-forge/shared/worldBodies';
import { resetSessionActiveWorldBody, sessionActiveWorldBodyId } from '@world-forge/shared/worldBodySession';
import { resolveGlobeBodyTarget } from './globeBodyTarget';

const primary = {
  id: 'world-1', parentBodyId: 'star-1', kind: 'rocky', orbitalOrder: 2,
  semiMajorAxisAu: 1, semiMajorAxisParentRadii: null, eccentricity: 0,
  inclinationDeg: 0, longitudeAscendingNodeDeg: 0, argumentOfPeriapsisDeg: 0,
  orbitalPeriodDays: 365, phaseAtEpochRad: 0, rotationPeriodHours: 24,
  axialTiltDeg: 23, sizeClass: 1, massClass: 1, visibleFromPrimary: true, placeholder: false
} as const;
const moon = {
  id: 'world-1:moon-a', parentBodyId: 'world-1', kind: 'moon', orbitalOrder: 1,
  semiMajorAxisAu: null, semiMajorAxisParentRadii: 18, eccentricity: 0,
  inclinationDeg: 4, longitudeAscendingNodeDeg: 0, argumentOfPeriapsisDeg: 0,
  orbitalPeriodDays: 22, phaseAtEpochRad: 0, rotationPeriodHours: 528,
  axialTiltDeg: 2, sizeClass: 0.35, massClass: 0.04, visibleFromPrimary: true, placeholder: true
} as const;
const giant = {
  id: 'giant-1', parentBodyId: 'star-1', kind: 'gas-giant', orbitalOrder: 5,
  semiMajorAxisAu: 5.2, semiMajorAxisParentRadii: null, eccentricity: 0.048,
  inclinationDeg: 1.3, longitudeAscendingNodeDeg: 100, argumentOfPeriapsisDeg: 274,
  orbitalPeriodDays: 4332.6, phaseAtEpochRad: 0.4, rotationPeriodHours: 9.9,
  axialTiltDeg: 3.1, sizeClass: 11.2, massClass: 317.8, visibleFromPrimary: true, placeholder: false
} as const;
const belt = {
  id: 'belt-1', parentBodyId: 'star-1', kind: 'belt', orbitalOrder: 4,
  semiMajorAxisAu: 3.2, semiMajorAxisParentRadii: null, eccentricity: 0.04,
  inclinationDeg: 2, longitudeAscendingNodeDeg: 0, argumentOfPeriapsisDeg: 0,
  orbitalPeriodDays: 2100, phaseAtEpochRad: 0, rotationPeriodHours: 200,
  axialTiltDeg: 0, sizeClass: 1.2, massClass: 0.2, visibleFromPrimary: true, placeholder: true
} as const;

function orbitalContext(): SystemOrbitalContextArtifact {
  return {
    artifactSignature: 'system-test',
    payload: {
      star: { id: 'star-1', massSolar: 1, radiusSolar: 1, luminositySolar: 1, effectiveTemperatureK: 5772, colorHex: '#fff0b0' },
      primaryBodyId: primary.id,
      visibleBodyIds: [],
      bodies: [{ ...primary }, { ...moon }, { ...giant }, { ...belt }]
    }
  } as unknown as SystemOrbitalContextArtifact;
}

function project(
  status: 'ready' | 'generated',
  importedMoon = false,
  importedGiant = false,
  includeGiantPayload = true,
): WorldProject {
  return {
    projectId: 'project-test-system',
    projectName: 'Test World',
    primaryWorld: { id: primary.id, name: 'Test World' },
    solarSystem: {
      primaryWorldId: primary.id,
      bodies: [
        { id: 'world-1', bodyType: 'rocky', isPrimaryWorld: true, moons: [{ id: 'moon-a', name: 'Selene' }] },
        { id: giant.id, bodyType: 'gas-giant', isPrimaryWorld: false, moons: [] },
      ]
    },
    bodyCatalog: {
      schema: WORLD_BODY_CATALOG_SCHEMA,
      primaryBodyId: primary.id,
      activeBodyId: primary.id,
      bodies: [
        {
          bodyId: primary.id,
          name: 'Test World',
          bodyType: 'rocky',
          capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
          dataOrigin: 'generated',
        },
        {
          bodyId: moon.id,
          name: 'Selene',
          bodyType: 'moon',
          parentBodyId: primary.id,
          capabilities: { globe: true, map: importedMoon, explorer: importedMoon, irregularShape: false },
          dataOrigin: importedMoon ? 'imported' : 'generated',
          surface: importedMoon ? { id: moon.id, name: 'Selene' } : undefined,
        },
        {
          bodyId: giant.id,
          name: 'Jovia',
          bodyType: 'gas-giant',
          capabilities: { globe: importedGiant, map: false, explorer: false, irregularShape: false },
          dataOrigin: importedGiant ? 'imported' : 'generated',
          detail: importedGiant ? {
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
              assetId: 'jovia-rgb565',
              role: 'albedo',
              logicalPath: 'bodies/giant-1/albedo.rgb565',
              mediaType: 'application/vnd.world-forge.rgb565',
              encoding: 'rgb565-le',
              resolution: { width: 2, height: 1 },
              byteLength: 4,
            }],
          } : undefined,
        },
        {
          bodyId: belt.id,
          name: 'Belt',
          bodyType: 'belt',
          capabilities: { globe: true, map: false, explorer: false, irregularShape: false },
          dataOrigin: 'generated',
        },
      ],
    },
    bodyAssetPayloads: importedGiant && includeGiantPayload
      ? { 'jovia-rgb565': Uint8Array.from([0x00, 0xf8, 0x1f, 0x00]) }
      : undefined,
    bodyGeneration: {
      records: {
        [moon.id]: { status, requestedFidelity: 'preview' },
        [belt.id]: { status, requestedFidelity: 'preview' }
      }
    }
  } as unknown as WorldProject;
}

describe('Globe body target resolution', () => {
  beforeEach(() => resetSessionActiveWorldBody());

  it('defaults to the generated primary world', () => {
    const source = project('ready');
    const target = resolveGlobeBodyTarget(source, orbitalContext(), '');
    expect(target?.bodyId).toBe(primary.id);
    expect(target?.mode).toBe('primary-world');
    expect(target?.surfaceProject?.primaryWorld.id).toBe(primary.id);
    expect(sessionActiveWorldBodyId(source)).toBe(primary.id);
  });

  it('falls back to primary for an unresolved body', () => {
    const source = project('ready');
    const lookup = vi.fn();
    const target = resolveGlobeBodyTarget(source, orbitalContext(), moon.id, lookup);
    expect(target?.bodyId).toBe(primary.id);
    expect(lookup).not.toHaveBeenCalled();
    expect(sessionActiveWorldBodyId(source)).toBe(primary.id);
  });

  it('opens an imported canonical surface without a generated replay artifact', () => {
    const source = project('ready', true);
    const lookup = vi.fn();
    const target = resolveGlobeBodyTarget(source, orbitalContext(), moon.id, lookup);

    expect(target).toMatchObject({
      bodyId: moon.id,
      label: 'Selene',
      mode: 'canonical-surface-body',
      artifact: null,
      atmosphericDetail: null,
    });
    expect(target?.surfaceProject?.projectId).toBe(source.projectId);
    expect(target?.surfaceProject?.primaryWorld.id).toBe(moon.id);
    expect(lookup).not.toHaveBeenCalled();
    expect(sessionActiveWorldBodyId(source)).toBe(moon.id);
  });

  it('opens an imported atmospheric body only when its package payload is hydrated', () => {
    const source = project('ready', false, true, true);
    const lookup = vi.fn();
    const target = resolveGlobeBodyTarget(source, orbitalContext(), giant.id, lookup);

    expect(target).toMatchObject({
      bodyId: giant.id,
      label: 'Jovia',
      mode: 'atmospheric-presentation-body',
      artifact: null,
      surfaceProject: null,
    });
    expect(target?.atmosphericDetail?.kind).toBe('atmospheric-presentation');
    expect(target?.atmosphericDetail?.assets?.[0].assetId).toBe('jovia-rgb565');
    expect(lookup).not.toHaveBeenCalled();
    expect(sessionActiveWorldBodyId(source)).toBe(giant.id);
  });

  it('does not advertise an imported atmospheric target when its bytes are missing', () => {
    const source = project('ready', false, true, false);
    const lookup = vi.fn();
    const target = resolveGlobeBodyTarget(source, orbitalContext(), giant.id, lookup);

    expect(target?.bodyId).toBe(primary.id);
    expect(target?.mode).toBe('primary-world');
    expect(lookup).not.toHaveBeenCalled();
    expect(sessionActiveWorldBodyId(source)).toBe(primary.id);
  });

  it('opens any generated body artifact and shares that body with Map', () => {
    const source = project('generated');
    const moonArtifact = { bodyId: moon.id, bodyProfile: 'airless-rocky-body', artifactSignature: 'moon-artifact' } as GeneratedSystemBodyArtifact;
    const moonLookup = vi.fn(() => moonArtifact);
    const moonTarget = resolveGlobeBodyTarget(source, orbitalContext(), moon.id, moonLookup);
    expect(moonTarget).toMatchObject({ bodyId: moon.id, label: 'Selene', mode: 'generated-system-body', artifact: moonArtifact, surfaceProject: null });
    expect(sessionActiveWorldBodyId(source)).toBe(moon.id);

    const beltArtifact = { bodyId: belt.id, bodyProfile: 'debris-belt', artifactSignature: 'belt-artifact' } as GeneratedSystemBodyArtifact;
    const beltLookup = vi.fn(() => beltArtifact);
    const beltTarget = resolveGlobeBodyTarget(source, orbitalContext(), belt.id, beltLookup);
    expect(beltTarget).toMatchObject({ bodyId: belt.id, mode: 'generated-system-body', artifact: beltArtifact, surfaceProject: null });
    expect(beltLookup).toHaveBeenCalledWith(expect.anything(), expect.anything(), belt.id, 'preview');
    expect(sessionActiveWorldBodyId(source)).toBe(belt.id);
  });
});
