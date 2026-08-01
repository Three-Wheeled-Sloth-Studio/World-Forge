import { describe, expect, it } from 'vitest';
import type { OrbitalPresentationBody, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import {
  resolveSystemBodyProfile,
  runSystemBodyGenerationWorkflow,
  systemBodyGenerationNodes,
  systemBodyGenerationSourceFromProject
} from './systemBodyGeneration';

const kinds: OrbitalPresentationBody['kind'][] = ['moon', 'rocky', 'gas-giant', 'ice-giant', 'dwarf', 'belt'];

describe('capability-resolved system body generation', () => {
  it('resolves every supported body kind to a generation profile', () => {
    expect(kinds.map((kind) => resolveSystemBodyProfile({ kind }))).toEqual([
      'airless-rocky-body',
      'rocky-body',
      'gas-giant-body',
      'ice-giant-body',
      'dwarf-body',
      'debris-belt'
    ]);
  });

  it('omits structurally irrelevant nodes instead of running self-skipping nodes', () => {
    const solid = systemBodyGenerationNodes('rocky-body').map((node) => node.id);
    const giant = systemBodyGenerationNodes('gas-giant-body').map((node) => node.id);
    const belt = systemBodyGenerationNodes('debris-belt').map((node) => node.id);
    expect(solid.some((id) => id.includes('solid'))).toBe(true);
    expect(solid.some((id) => id.includes('giant') || id.includes('belt'))).toBe(false);
    expect(giant.some((id) => id.includes('giant'))).toBe(true);
    expect(giant.some((id) => id.includes('solid') || id.includes('belt'))).toBe(false);
    expect(belt.some((id) => id.includes('belt'))).toBe(true);
    expect(belt.some((id) => id.includes('solid') || id.includes('giant'))).toBe(false);
  });

  it('generates deterministic inspectable artifacts for every body kind', async () => {
    const project = testProject();
    const orbital = testOrbital();
    for (const body of orbital.payload.bodies.filter((candidate) => candidate.id !== orbital.payload.primaryBodyId)) {
      const source = systemBodyGenerationSourceFromProject(project, orbital, body.id, 'preview');
      const first = await runSystemBodyGenerationWorkflow(source);
      const second = await runSystemBodyGenerationWorkflow(source);
      expect(first.artifactSignature).toBe(second.artifactSignature);
      expect(first.validation.valid).toBe(true);
      expect(first.bodyProfile).toBe(resolveSystemBodyProfile(body));
      if (body.kind === 'belt') {
        expect(first.payload.belt?.particleCount).toBeGreaterThan(0);
        expect(first.payload.albedoField).toHaveLength(0);
      } else {
        expect(first.payload.albedoField).toHaveLength(64 * 32);
        expect(first.payload.thermalField).toHaveLength(64 * 32);
      }
      if (body.kind === 'gas-giant' || body.kind === 'ice-giant') {
        expect(first.payload.heightField).toHaveLength(0);
        expect(first.payload.bandField).toHaveLength(64 * 32);
        expect(first.payload.features.length).toBeGreaterThan(0);
      }
      if (body.kind === 'moon' || body.kind === 'rocky' || body.kind === 'dwarf') {
        expect(first.payload.heightField).toHaveLength(64 * 32);
        expect(first.payload.bandField).toHaveLength(0);
      }
    }
  });
});

function testProject(): WorldProject {
  return {
    projectId: 'project-1',
    projectName: 'All Bodies',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    generatorVersion: 'test',
    appVersion: '0.3.49',
    sourceCommit: 'test',
    seed: '1001001',
    primaryWorld: { id: 'primary' },
    solarSystem: {
      ageGy: 4.8,
      star: { id: 'star-1', type: 'G2V' },
      primaryWorldId: 'primary',
      bodies: []
    }
  } as unknown as WorldProject;
}

function testOrbital(): SystemOrbitalContextArtifact {
  const bodies: OrbitalPresentationBody[] = [
    body('primary', 'rocky', 1),
    body('moon-1', 'moon', 2, 'primary'),
    body('rocky-2', 'rocky', 3),
    body('gas-1', 'gas-giant', 4),
    body('ice-1', 'ice-giant', 5),
    body('dwarf-1', 'dwarf', 6),
    body('belt-1', 'belt', 7)
  ];
  return {
    artifactSignature: 'orbital-all-bodies',
    payload: {
      modelVersion: 'system-orbital-context-v1',
      star: { id: 'star-1', massSolar: 1, radiusSolar: 1, luminositySolar: 1, effectiveTemperatureK: 5772, colorHex: '#fff0b0' },
      primaryBodyId: 'primary',
      visibleBodyIds: bodies.map((candidate) => candidate.id),
      bodies
    }
  } as unknown as SystemOrbitalContextArtifact;
}

function body(
  id: string,
  kind: OrbitalPresentationBody['kind'],
  orbitalOrder: number,
  parentBodyId: string | null = 'star-1'
): OrbitalPresentationBody {
  return {
    id,
    parentBodyId,
    kind,
    orbitalOrder,
    semiMajorAxisAu: kind === 'moon' ? null : orbitalOrder * 0.6,
    semiMajorAxisParentRadii: kind === 'moon' ? 14 : null,
    eccentricity: 0.03,
    inclinationDeg: 2,
    longitudeAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    orbitalPeriodDays: kind === 'moon' ? 18 : orbitalOrder * 190,
    phaseAtEpochRad: 0.4,
    rotationPeriodHours: kind === 'moon' ? 432 : 20,
    axialTiltDeg: 8,
    sizeClass: kind === 'belt' ? 1.2 : kind === 'gas-giant' ? 4 : kind === 'ice-giant' ? 3 : kind === 'dwarf' ? 0.35 : kind === 'moon' ? 0.28 : 0.9,
    massClass: kind === 'belt' ? 0.2 : kind === 'gas-giant' ? 8 : kind === 'ice-giant' ? 5 : kind === 'dwarf' ? 0.12 : kind === 'moon' ? 0.05 : 0.8,
    visibleFromPrimary: true,
    placeholder: id !== 'primary'
  };
}
