import { describe, expect, it } from 'vitest';
import type { SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import {
  buildSystemCatalog,
  systemDisplayOrbitRadius,
  systemDisplayPositions,
  systemOrbitPathPoints,
  systemPhysicalOrbit
} from './systemPresentation';

const bodies = [
  {
    id: 'world-1', parentBodyId: 'star-1', kind: 'rocky', orbitalOrder: 2,
    semiMajorAxisAu: 0.96, semiMajorAxisParentRadii: null, eccentricity: 0.04,
    inclinationDeg: 1.2, longitudeAscendingNodeDeg: 22, argumentOfPeriapsisDeg: 44,
    orbitalPeriodDays: 342, phaseAtEpochRad: 0.7, rotationPeriodHours: 24,
    axialTiltDeg: 21, sizeClass: 1, massClass: 1, visibleFromPrimary: true, placeholder: false
  },
  {
    id: 'planet-1', parentBodyId: 'star-1', kind: 'gas-giant', orbitalOrder: 4,
    semiMajorAxisAu: 3.5, semiMajorAxisParentRadii: null, eccentricity: 0.08,
    inclinationDeg: 2.5, longitudeAscendingNodeDeg: 72, argumentOfPeriapsisDeg: 12,
    orbitalPeriodDays: 2380, phaseAtEpochRad: 1.7, rotationPeriodHours: 11,
    axialTiltDeg: 8, sizeClass: 4, massClass: 7, visibleFromPrimary: true, placeholder: true
  },
  {
    id: 'world-1:moon-a', parentBodyId: 'world-1', kind: 'moon', orbitalOrder: 1,
    semiMajorAxisAu: null, semiMajorAxisParentRadii: 18, eccentricity: 0.01,
    inclinationDeg: 4, longitudeAscendingNodeDeg: 10, argumentOfPeriapsisDeg: 80,
    orbitalPeriodDays: 22, phaseAtEpochRad: 2.1, rotationPeriodHours: 528,
    axialTiltDeg: 2, sizeClass: 0.35, massClass: 0.04, visibleFromPrimary: true, placeholder: true
  }
] as const;

function artifact(): SystemOrbitalContextArtifact {
  return {
    artifactSignature: 'system-artifact-test',
    payload: {
      modelVersion: 'system-orbital-context-v1',
      star: {
        id: 'star-1', massSolar: 1, radiusSolar: 1, luminositySolar: 1,
        effectiveTemperatureK: 5772, colorHex: '#fff0b0'
      },
      primaryBodyId: 'world-1',
      visibleBodyIds: ['planet-1'],
      bodies: bodies.map((body) => ({ ...body }))
    }
  } as unknown as SystemOrbitalContextArtifact;
}

function project(): WorldProject {
  return {
    projectName: 'Test World',
    solarSystem: {
      star: {
        id: 'star-1', type: 'G2V', massClass: 'solar', luminosityClass: 'V',
        ageGy: 4.6, colorTemperatureClass: 'yellow'
      },
      ageGy: 4.6,
      primaryWorldId: 'world-1',
      visibleBodiesFromPrimary: ['planet-1'],
      generatedNotes: [],
      bodies: [
        {
          id: 'world-1', bodyType: 'rocky', orbitalOrder: 2, orbitalDistanceClass: 3,
          eccentricity: 0.04, sizeClass: 1, massClass: 1, visibleFromPrimary: true,
          isPrimaryWorld: true,
          moons: [{ id: 'moon-a', name: 'Selene', sizeClass: 0.35, orbitalDistanceClass: 1, tideInfluence: 0.5 }]
        },
        {
          id: 'planet-1', bodyType: 'gas-giant', orbitalOrder: 4, orbitalDistanceClass: 11,
          eccentricity: 0.08, sizeClass: 4, massClass: 7, visibleFromPrimary: true,
          isPrimaryWorld: false, moons: []
        }
      ]
    }
  } as unknown as WorldProject;
}

describe('System Explore presentation model', () => {
  it('builds a deterministic star, primary, planet, and moon catalog', () => {
    const first = buildSystemCatalog(project(), artifact());
    const second = buildSystemCatalog(project(), artifact());
    expect(first).toEqual(second);
    expect(first.map((entry) => entry.id)).toEqual(['star-1', 'world-1', 'world-1:moon-a', 'planet-1']);
    expect(first.find((entry) => entry.id === 'star-1')?.generationStatus).toBe('generated');
    expect(first.find((entry) => entry.id === 'world-1')?.generationStatus).toBe('generated');
    expect(first.find((entry) => entry.id === 'planet-1')?.generationStatus).toBe('placeholder');
    expect(first.find((entry) => entry.id === 'world-1:moon-a')?.generationStatus).toBe('ready');
    expect(first.find((entry) => entry.id === 'world-1:moon-a')?.generationEligible).toBe(true);
    expect(first.find((entry) => entry.id === 'world-1:moon-a')?.label).toBe('Selene');
  });

  it('produces deterministic system positions and attaches moons to their parent', () => {
    const model = artifact();
    const first = systemDisplayPositions(model, 48.25, 'compressed');
    const second = systemDisplayPositions(model, 48.25, 'compressed');
    expect([...first.entries()]).toEqual([...second.entries()]);
    const parent = first.get('world-1');
    const moon = first.get('world-1:moon-a');
    expect(parent).toBeDefined();
    expect(moon).toBeDefined();
    expect(Math.hypot(
      (moon?.x ?? 0) - (parent?.x ?? 0),
      (moon?.y ?? 0) - (parent?.y ?? 0),
      (moon?.z ?? 0) - (parent?.z ?? 0)
    )).toBeGreaterThan(0.4);
  });

  it('preserves orbital order in compressed and relative-distance modes', () => {
    const primary = artifact().payload.bodies.find((body) => body.id === 'world-1')!;
    const giant = artifact().payload.bodies.find((body) => body.id === 'planet-1')!;
    expect(systemDisplayOrbitRadius(primary, 'compressed')).toBeLessThan(systemDisplayOrbitRadius(giant, 'compressed'));
    expect(systemDisplayOrbitRadius(primary, 'relative')).toBeLessThan(systemDisplayOrbitRadius(giant, 'relative'));
  });

  it('keeps physical orbital values separate from exaggerated display scale', () => {
    const primary = artifact().payload.bodies.find((body) => body.id === 'world-1')!;
    const physical = systemPhysicalOrbit(primary);
    expect(physical).toEqual({ value: 0.96, unit: 'AU' });
    expect(systemDisplayOrbitRadius(primary, 'compressed')).not.toBeCloseTo(physical!.value, 3);
    expect(systemDisplayOrbitRadius(primary, 'relative')).not.toBeCloseTo(physical!.value, 3);
    expect(systemOrbitPathPoints(primary, 'relative')).toHaveLength(96);
  });
});
