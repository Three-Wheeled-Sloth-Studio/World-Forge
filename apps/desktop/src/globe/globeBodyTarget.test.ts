import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeneratedSystemBodyArtifact, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import { WORLD_BODY_DETAIL_SCHEMA } from '@world-forge/shared/worldBodyDetails';
import { WORLD_BODY_CATALOG_SCHEMA } from '@world-forge/shared/worldBodies';
import { resetSessionActiveWorldBody, sessionActiveWorldBodyId } from '@world-forge/shared/worldBodySession';
import { canOpenGlobeBodyTarget, resolveGlobeBodyTarget } from './globeBodyTarget';

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

function project({
  status = 'ready',
  canonicalMoon = false,
  basicMoon = false,
  atmosphericGiant = false,
}: {
  status?: 'ready' | 'generated';
  canonicalMoon?: boolean;
  basicMoon?: boolean;
  atmosphericGiant?: boolean;
} = {}): WorldProject {
  return {
    projectId: 'project-test-system',
    projectName: 'Test World',
    primaryWorld: { id: primary.id, name: 'Test World' },
    solarSystem: {
      star: { id: 'star-1' },
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
          bodyId: 'star-1',
          name: 'Test Star',
          bodyType: 'star',
          capabilities: { globe: true, map: false, explorer: false, irregularShape: false },
          dataOrigin: 'derived',
          physical: { meanRadiusKm: 695_700, rotationPeriodHours: 600 },
          detail: {
            schema: WORLD_BODY_DETAIL_SCHEMA,
            kind: 'basic-presentation',
            tier: 'presentation',
            origin: 'derived',
            shape: { kind: 'sphere' },
            surface: {
              paletteHex: ['#fff2b0', '#f58b35'],
              roughness: 0.7,
              metalness: 0,
              emissiveHex: '#ffb23f',
              emissiveIntensity: 1.7,
            },
          },
        },
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
          capabilities: {
            globe: canonicalMoon || basicMoon,
            map: canonicalMoon,
            explorer: canonicalMoon,
            irregularShape: false,
          },
          dataOrigin: canonicalMoon || basicMoon ? 'imported' : 'generated',
          detail: basicMoon ? {
            schema: WORLD_BODY_DETAIL_SCHEMA,
            kind: 'basic-presentation',
            tier: 'presentation',
            origin: 'derived',
            shape: { kind: 'sphere' },
            surface: { paletteHex: ['#aaa69e', '#706d68'], roughness: 0.98, metalness: 0 },
          } : undefined,
          surface: canonicalMoon ? { id: moon.id, name: 'Selene' } : undefined,
        },
        {
          bodyId: giant.id,
          name: 'Jovia',
          bodyType: 'gas-giant',
          capabilities: { globe: atmosphericGiant, map: false, explorer: false, irregularShape: false },
          dataOrigin: atmosphericGiant ? 'imported' : 'generated',
          detail: atmosphericGiant ? {
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
          } : undefined,
        },
        {
          bodyId: belt.id,
          name: 'Belt',
          bodyType: 'belt',
          capabilities: { globe: false, map: false, explorer: false, irregularShape: false },
          dataOrigin: 'generated',
        },
      ],
    },
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
    const source = project();
    const context = orbitalContext();
    expect(canOpenGlobeBodyTarget(source, context, primary.id)).toBe(true);
    const target = resolveGlobeBodyTarget(source, context, '');
    expect(target?.bodyId).toBe(primary.id);
    expect(target?.mode).toBe('primary-world');
    expect(target?.surfaceProject?.primaryWorld.id).toBe(primary.id);
    expect(sessionActiveWorldBodyId(source)).toBe(primary.id);
  });

  it('falls back to primary for an unresolved body', () => {
    const source = project();
    const context = orbitalContext();
    const lookup = vi.fn();
    expect(canOpenGlobeBodyTarget(source, context, moon.id, lookup)).toBe(false);
    const target = resolveGlobeBodyTarget(source, context, moon.id, lookup);
    expect(target?.bodyId).toBe(primary.id);
    expect(lookup).not.toHaveBeenCalled();
    expect(sessionActiveWorldBodyId(source)).toBe(primary.id);
  });

  it('opens the canonical star through the generic basic presentation path', () => {
    const source = project();
    const context = orbitalContext();
    expect(canOpenGlobeBodyTarget(source, context, 'star-1')).toBe(true);
    const target = resolveGlobeBodyTarget(source, context, 'star-1');

    expect(target).toMatchObject({
      bodyId: 'star-1',
      label: 'Test Star',
      mode: 'basic-presentation-body',
      body: null,
      artifact: null,
    });
    expect(target?.basicDetail?.surface.emissiveHex).toBe('#ffb23f');
    expect(sessionActiveWorldBodyId(source)).toBe('star-1');
  });

  it('opens an imported canonical surface without a generated replay artifact', () => {
    const source = project({ canonicalMoon: true });
    const context = orbitalContext();
    const lookup = vi.fn();
    expect(canOpenGlobeBodyTarget(source, context, moon.id, lookup)).toBe(true);
    const target = resolveGlobeBodyTarget(source, context, moon.id, lookup);

    expect(target).toMatchObject({
      bodyId: moon.id,
      label: 'Selene',
      mode: 'canonical-surface-body',
      artifact: null,
      atmosphericDetail: null,
      basicDetail: null,
    });
    expect(target?.surfaceProject?.projectId).toBe(source.projectId);
    expect(target?.surfaceProject?.primaryWorld.id).toBe(moon.id);
    expect(lookup).not.toHaveBeenCalled();
    expect(sessionActiveWorldBodyId(source)).toBe(moon.id);
  });

  it('opens a basic moon presentation without a generated replay artifact', () => {
    const source = project({ basicMoon: true });
    const context = orbitalContext();
    const lookup = vi.fn();
    expect(canOpenGlobeBodyTarget(source, context, moon.id, lookup)).toBe(true);
    const target = resolveGlobeBodyTarget(source, context, moon.id, lookup);

    expect(target).toMatchObject({
      bodyId: moon.id,
      label: 'Selene',
      mode: 'basic-presentation-body',
      artifact: null,
      surfaceProject: null,
    });
    expect(target?.basicDetail?.kind).toBe('basic-presentation');
    expect(lookup).not.toHaveBeenCalled();
    expect(sessionActiveWorldBodyId(source)).toBe(moon.id);
  });

  it('opens a derived atmospheric body without requiring texture bytes', () => {
    const source = project({ atmosphericGiant: true });
    const context = orbitalContext();
    const lookup = vi.fn();
    expect(canOpenGlobeBodyTarget(source, context, giant.id, lookup)).toBe(true);
    const target = resolveGlobeBodyTarget(source, context, giant.id, lookup);

    expect(target).toMatchObject({
      bodyId: giant.id,
      label: 'Jovia',
      mode: 'atmospheric-presentation-body',
      artifact: null,
      surfaceProject: null,
    });
    expect(target?.atmosphericDetail?.kind).toBe('atmospheric-presentation');
    expect(lookup).not.toHaveBeenCalled();
    expect(sessionActiveWorldBodyId(source)).toBe(giant.id);
  });

  it('opens a generated body artifact while leaving belts placeholder-only by default', () => {
    const source = project({ status: 'generated' });
    const context = orbitalContext();
    const moonArtifact = { bodyId: moon.id, bodyProfile: 'airless-rocky-body', artifactSignature: 'moon-artifact' } as GeneratedSystemBodyArtifact;
    const moonLookup = vi.fn(() => moonArtifact);
    expect(canOpenGlobeBodyTarget(source, context, moon.id, moonLookup)).toBe(true);
    const moonTarget = resolveGlobeBodyTarget(source, context, moon.id, moonLookup);
    expect(moonTarget).toMatchObject({ bodyId: moon.id, label: 'Selene', mode: 'generated-system-body', artifact: moonArtifact, surfaceProject: null });
    expect(sessionActiveWorldBodyId(source)).toBe(moon.id);

    const unavailableSource = project();
    expect(canOpenGlobeBodyTarget(unavailableSource, context, belt.id)).toBe(false);

    const beltArtifact = { bodyId: belt.id, bodyProfile: 'debris-belt', artifactSignature: 'belt-artifact' } as GeneratedSystemBodyArtifact;
    const beltLookup = vi.fn(() => beltArtifact);
    expect(canOpenGlobeBodyTarget(source, context, belt.id, beltLookup)).toBe(true);
    expect(resolveGlobeBodyTarget(source, context, belt.id, beltLookup)).toMatchObject({
      bodyId: belt.id,
      mode: 'generated-system-body',
      artifact: beltArtifact,
    });
  });
});
