import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeneratedSystemBodyArtifact, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
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
      bodies: [{ ...primary }, { ...moon }, { ...belt }]
    }
  } as unknown as SystemOrbitalContextArtifact;
}

function project(status: 'ready' | 'generated'): WorldProject {
  return {
    projectId: 'project-test-system',
    projectName: 'Test World',
    primaryWorld: { id: primary.id, name: 'Test World' },
    solarSystem: {
      primaryWorldId: primary.id,
      bodies: [{ id: 'world-1', bodyType: 'rocky', isPrimaryWorld: true, moons: [{ id: 'moon-a', name: 'Selene' }] }]
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
          capabilities: { globe: true, map: false, explorer: false, irregularShape: false },
          dataOrigin: 'generated',
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

  it('opens any generated body artifact and shares that body with Map', () => {
    const source = project('generated');
    const moonArtifact = { bodyId: moon.id, bodyProfile: 'airless-rocky-body', artifactSignature: 'moon-artifact' } as GeneratedSystemBodyArtifact;
    const moonLookup = vi.fn(() => moonArtifact);
    const moonTarget = resolveGlobeBodyTarget(source, orbitalContext(), moon.id, moonLookup);
    expect(moonTarget).toMatchObject({ bodyId: moon.id, label: 'Selene', mode: 'generated-system-body', artifact: moonArtifact });
    expect(sessionActiveWorldBodyId(source)).toBe(moon.id);

    const beltArtifact = { bodyId: belt.id, bodyProfile: 'debris-belt', artifactSignature: 'belt-artifact' } as GeneratedSystemBodyArtifact;
    const beltLookup = vi.fn(() => beltArtifact);
    const beltTarget = resolveGlobeBodyTarget(source, orbitalContext(), belt.id, beltLookup);
    expect(beltTarget).toMatchObject({ bodyId: belt.id, mode: 'generated-system-body', artifact: beltArtifact });
    expect(beltLookup).toHaveBeenCalledWith(expect.anything(), expect.anything(), belt.id, 'preview');
    expect(sessionActiveWorldBodyId(source)).toBe(belt.id);
  });
});
