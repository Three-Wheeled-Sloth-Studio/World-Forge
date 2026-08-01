import { describe, expect, it, vi } from 'vitest';
import type { AirlessRockyBodyArtifact, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
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

function orbitalContext(): SystemOrbitalContextArtifact {
  return {
    artifactSignature: 'system-test',
    payload: {
      star: { id: 'star-1', massSolar: 1, radiusSolar: 1, luminositySolar: 1, effectiveTemperatureK: 5772, colorHex: '#fff0b0' },
      primaryBodyId: primary.id,
      visibleBodyIds: [],
      bodies: [{ ...primary }, { ...moon }]
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
        [moon.id]: { status, requestedFidelity: 'preview' }
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

  it('falls back to primary for an unresolved moon', () => {
    const lookup = vi.fn();
    const target = resolveGlobeBodyTarget(project('ready'), orbitalContext(), moon.id, lookup);
    expect(target?.bodyId).toBe(primary.id);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('opens a generated moon artifact as the globe target', () => {
    const artifact = { bodyId: moon.id, artifactSignature: 'moon-artifact' } as AirlessRockyBodyArtifact;
    const lookup = vi.fn(() => artifact);
    const target = resolveGlobeBodyTarget(project('generated'), orbitalContext(), moon.id, lookup);
    expect(target).toMatchObject({ bodyId: moon.id, label: 'Selene', mode: 'generated-airless-moon', artifact });
    expect(lookup).toHaveBeenCalledWith(expect.anything(), expect.anything(), moon.id, 'preview');
  });
});
