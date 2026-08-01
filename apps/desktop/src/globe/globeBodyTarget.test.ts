import { describe, expect, it, vi } from 'vitest';
import type { GeneratedSystemBodyArtifact, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
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
    projectName: 'Test World',
    solarSystem: {
      bodies: [{ id: 'world-1', moons: [{ id: 'moon-a', name: 'Selene' }] }]
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
  it('defaults to the generated primary world', () => {
    const target = resolveGlobeBodyTarget(project('ready'), orbitalContext(), '');
    expect(target?.bodyId).toBe(primary.id);
    expect(target?.mode).toBe('primary-world');
  });

  it('falls back to primary for an unresolved body', () => {
    const lookup = vi.fn();
    const target = resolveGlobeBodyTarget(project('ready'), orbitalContext(), moon.id, lookup);
    expect(target?.bodyId).toBe(primary.id);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('opens any generated body artifact as a detailed target', () => {
    const moonArtifact = { bodyId: moon.id, bodyProfile: 'airless-rocky-body', artifactSignature: 'moon-artifact' } as GeneratedSystemBodyArtifact;
    const moonLookup = vi.fn(() => moonArtifact);
    const moonTarget = resolveGlobeBodyTarget(project('generated'), orbitalContext(), moon.id, moonLookup);
    expect(moonTarget).toMatchObject({ bodyId: moon.id, label: 'Selene', mode: 'generated-system-body', artifact: moonArtifact });

    const beltArtifact = { bodyId: belt.id, bodyProfile: 'debris-belt', artifactSignature: 'belt-artifact' } as GeneratedSystemBodyArtifact;
    const beltLookup = vi.fn(() => beltArtifact);
    const beltTarget = resolveGlobeBodyTarget(project('generated'), orbitalContext(), belt.id, beltLookup);
    expect(beltTarget).toMatchObject({ bodyId: belt.id, mode: 'generated-system-body', artifact: beltArtifact });
    expect(beltLookup).toHaveBeenCalledWith(expect.anything(), expect.anything(), belt.id, 'preview');
  });
});
