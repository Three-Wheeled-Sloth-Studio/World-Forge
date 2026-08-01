import { describe, expect, it } from 'vitest';
import type { OrbitalPresentationBody, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import {
  bodyArtifactForBody,
  cancelActiveBodyGeneration,
  completeBodyGeneration,
  failBodyGeneration,
  queueBodyGeneration,
  queueUnresolvedBodies,
  reconcileBodyGenerationLifecycle,
  removeQueuedBodyGeneration,
  resumeBodyGenerationQueue,
  retryBodyGeneration,
  startNextBodyGeneration
} from './bodyGenerationLifecycle';
import {
  runSystemBodyGenerationWorkflow,
  systemBodyGenerationSourceFromProject
} from './systemBodyGeneration';

const orbitalContext = {
  artifactKey: 'project.system-orbital-context',
  artifactVersion: 1,
  artifactRole: 'presentation',
  status: 'complete',
  workflow: { id: 'project.system-orbital-context', version: '1.0.0', graphSignature: 'graph', nodes: [] },
  source: { projectId: 'project-1', worldId: 'primary-world', sourceSignature: 'source', generatorVersion: 'test', appVersion: '0.3.49' },
  seed: 'orbital-seed',
  epochIso: '2000-01-01T12:00:00.000Z',
  startedAt: '2026-08-01T00:00:00.000Z',
  completedAt: '2026-08-01T00:00:01.000Z',
  totalMs: 1,
  artifactSignature: 'orbital-artifact',
  validation: { valid: true, issues: [] },
  payload: {
    modelVersion: 'system-orbital-context-v1',
    star: { id: 'star-1', massSolar: 1, radiusSolar: 1, luminositySolar: 1, effectiveTemperatureK: 5772, colorHex: '#fff0b0' },
    primaryBodyId: 'primary-world',
    visibleBodyIds: [],
    bodies: [
      body('primary-world', 'rocky', false, null),
      body('primary-world:moon-1', 'moon', true, 'primary-world'),
      body('body-2', 'gas-giant', true, 'star-1'),
      body('body-3', 'ice-giant', true, 'star-1'),
      body('body-4', 'dwarf', true, 'star-1'),
      body('body-5', 'belt', true, 'star-1')
    ]
  }
} satisfies SystemOrbitalContextArtifact;

const project = {
  projectId: 'project-1',
  projectName: 'Lifecycle Test',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  generatorVersion: 'test',
  appVersion: '0.3.49',
  sourceCommit: 'test',
  seed: '1001001',
  solarSystem: { ageGy: 4.6, star: { id: 'star-1', type: 'G2V' }, bodies: [], primaryWorldId: 'primary-world' },
  primaryWorld: { id: 'primary-world' },
  enrichmentArtifacts: { 'project.system-orbital-context': orbitalContext }
} as unknown as WorldProject;

describe('body generation lifecycle', () => {
  it('makes every non-primary orbital body eligible with a resolved profile', () => {
    const lifecycle = reconcileBodyGenerationLifecycle(project, orbitalContext, '2026-08-01T00:00:00.000Z');
    expect(lifecycle.executionMode).toBe('sequential');
    expect(lifecycle.records['primary-world'].status).toBe('generated');
    expect(lifecycle.records['primary-world'].eligible).toBe(false);
    expect(lifecycle.records['primary-world:moon-1'].profile).toBe('airless-rocky-body');
    expect(lifecycle.records['body-2'].profile).toBe('gas-giant-body');
    expect(lifecycle.records['body-3'].profile).toBe('ice-giant-body');
    expect(lifecycle.records['body-4'].profile).toBe('dwarf-body');
    expect(lifecycle.records['body-5'].profile).toBe('debris-belt');
    for (const id of ['primary-world:moon-1', 'body-2', 'body-3', 'body-4', 'body-5']) {
      expect(lifecycle.records[id].status).toBe('ready');
      expect(lifecycle.records[id].eligible).toBe(true);
      expect(lifecycle.records[id].stableSeed).toContain(id);
    }
    expect(queueBodyGeneration(lifecycle, orbitalContext.payload.star.id)).toBe(lifecycle);
  });

  it('queues all unresolved non-primary bodies sequentially and supports remove and cancel', () => {
    const initial = reconcileBodyGenerationLifecycle(project, orbitalContext, '2026-08-01T00:00:00.000Z');
    const queued = queueUnresolvedBodies(initial, 'preview', '2026-08-01T00:01:00.000Z');
    expect(queued.queue).toEqual(['primary-world:moon-1', 'body-2', 'body-3', 'body-4', 'body-5']);

    const trimmed = removeQueuedBodyGeneration(queued, 'body-5', '2026-08-01T00:01:30.000Z');
    expect(trimmed.queue).not.toContain('body-5');
    expect(trimmed.records['body-5'].status).toBe('ready');

    const running = startNextBodyGeneration(resumeBodyGenerationQueue(trimmed), '2026-08-01T00:02:00.000Z');
    expect(running.activeBodyId).toBe('primary-world:moon-1');
    expect(running.records['primary-world:moon-1'].status).toBe('generating');

    const cancelled = cancelActiveBodyGeneration(running, 'primary-world:moon-1', '2026-08-01T00:03:00.000Z');
    expect(cancelled.activeBodyId).toBeNull();
    expect(cancelled.paused).toBe(true);
    expect(cancelled.records['primary-world:moon-1'].status).toBe('ready');
  });

  it('records failure and retry without losing deterministic identity', () => {
    const initial = reconcileBodyGenerationLifecycle(project, orbitalContext, '2026-08-01T00:00:00.000Z');
    const queued = queueBodyGeneration(initial, 'body-2');
    const running = startNextBodyGeneration(resumeBodyGenerationQueue(queued));
    const failed = failBodyGeneration(running, 'body-2', 'synthetic failure');
    expect(failed.records['body-2'].status).toBe('failed');
    const retried = retryBodyGeneration(failed, 'body-2');
    expect(retried.records['body-2'].status).toBe('queued');
    expect(retried.records['body-2'].stableSeed).toBe(initial.records['body-2'].stableSeed);
  });

  it('marks generated output stale when the orbital source changes', async () => {
    const initial = reconcileBodyGenerationLifecycle(project, orbitalContext, '2026-08-01T00:00:00.000Z');
    const source = systemBodyGenerationSourceFromProject(project, orbitalContext, 'body-2', 'preview');
    const artifact = await runSystemBodyGenerationWorkflow(source);
    const completed = completeBodyGeneration(initial, artifact, '2026-08-01T00:05:00.000Z');
    const enriched = { ...project, bodyGeneration: completed, enrichmentArtifacts: { ...project.enrichmentArtifacts, [artifact.artifactKey]: artifact } } as WorldProject;
    const changedOrbital = { ...orbitalContext, artifactSignature: 'changed-orbital-artifact' };
    const reconciled = reconcileBodyGenerationLifecycle(enriched, changedOrbital, '2026-08-01T00:06:00.000Z');
    expect(reconciled.records['body-2'].status).toBe('stale');
    expect(reconciled.records['body-2'].staleReason).toBeTruthy();
  });

  it('persists and reopens generated artifacts for every profile', async () => {
    let enriched = { ...project } as WorldProject;
    let lifecycle = reconcileBodyGenerationLifecycle(enriched, orbitalContext, '2026-08-01T00:00:00.000Z');
    for (const id of ['primary-world:moon-1', 'body-2', 'body-3', 'body-4', 'body-5']) {
      const source = systemBodyGenerationSourceFromProject(enriched, orbitalContext, id, 'preview');
      const artifact = await runSystemBodyGenerationWorkflow(source);
      lifecycle = completeBodyGeneration(lifecycle, artifact, '2026-08-01T00:05:00.000Z');
      enriched = {
        ...enriched,
        bodyGeneration: lifecycle,
        enrichmentArtifacts: { ...enriched.enrichmentArtifacts, [artifact.artifactKey]: artifact }
      };
    }
    const reopened = JSON.parse(JSON.stringify(enriched)) as WorldProject;
    const reconciled = reconcileBodyGenerationLifecycle(reopened, orbitalContext, '2026-08-01T00:06:00.000Z');
    for (const id of ['primary-world:moon-1', 'body-2', 'body-3', 'body-4', 'body-5']) {
      expect(reconciled.records[id].status).toBe('generated');
      expect(bodyArtifactForBody(reopened, orbitalContext, id, 'preview')).not.toBeNull();
    }
  });
});

function body(
  id: string,
  kind: OrbitalPresentationBody['kind'],
  placeholder: boolean,
  parentBodyId: string | null
): OrbitalPresentationBody {
  return {
    id,
    parentBodyId,
    kind,
    orbitalOrder: id === 'body-5' ? 5 : id === 'body-4' ? 4 : id === 'body-3' ? 3 : id === 'body-2' ? 2 : 1,
    semiMajorAxisAu: kind === 'moon' ? null : 1,
    semiMajorAxisParentRadii: kind === 'moon' ? 12 : null,
    eccentricity: 0.02,
    inclinationDeg: 1,
    longitudeAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    orbitalPeriodDays: kind === 'moon' ? 24 : 365,
    phaseAtEpochRad: 0,
    rotationPeriodHours: kind === 'moon' ? 576 : 24,
    axialTiltDeg: 4,
    sizeClass: kind === 'gas-giant' ? 4 : kind === 'ice-giant' ? 3 : kind === 'dwarf' ? 0.4 : kind === 'belt' ? 1.2 : kind === 'moon' ? 0.28 : 1,
    massClass: kind === 'gas-giant' ? 8 : kind === 'ice-giant' ? 5 : kind === 'dwarf' ? 0.12 : kind === 'belt' ? 0.2 : kind === 'moon' ? 0.04 : 1,
    visibleFromPrimary: true,
    placeholder
  };
}
