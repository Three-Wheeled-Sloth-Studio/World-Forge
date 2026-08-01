import { describe, expect, it } from 'vitest';
import type { SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import {
  cancelActiveBodyGeneration,
  completeBodyGeneration,
  failBodyGeneration,
  queueBodyGeneration,
  queueUnresolvedAirlessMoons,
  reconcileBodyGenerationLifecycle,
  removeQueuedBodyGeneration,
  resumeBodyGenerationQueue,
  retryBodyGeneration,
  startNextBodyGeneration
} from './bodyGenerationLifecycle';
import { runAirlessRockyBodyWorkflow, airlessRockyBodySourceFromProject } from './airlessRockyBody';

const orbitalContext = {
  artifactKey: 'project.system-orbital-context',
  artifactVersion: 1,
  artifactRole: 'presentation',
  status: 'complete',
  workflow: { id: 'project.system-orbital-context', version: '1.0.0', graphSignature: 'graph', nodes: [] },
  source: { projectId: 'project-1', worldId: 'primary-world', sourceSignature: 'source', generatorVersion: 'test', appVersion: '0.3.45' },
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
      moonBody('primary-world', 'rocky', false, null),
      moonBody('primary-world:moon-1', 'moon', true, 'primary-world'),
      moonBody('primary-world:moon-2', 'moon', true, 'primary-world'),
      moonBody('body-2', 'gas-giant', true, 'star-1')
    ]
  }
} satisfies SystemOrbitalContextArtifact;

const project = {
  projectId: 'project-1',
  projectName: 'Lifecycle Test',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  generatorVersion: 'test',
  appVersion: '0.3.45',
  sourceCommit: 'test',
  seed: '1001001',
  primaryWorld: { id: 'primary-world' },
  enrichmentArtifacts: { 'project.system-orbital-context': orbitalContext }
} as unknown as WorldProject;

describe('body generation lifecycle', () => {
  it('initializes eligible moons with stable seeds and leaves unsupported bodies explicit', () => {
    const lifecycle = reconcileBodyGenerationLifecycle(project, orbitalContext, '2026-08-01T00:00:00.000Z');
    expect(lifecycle.executionMode).toBe('sequential');
    expect(lifecycle.records['primary-world'].status).toBe('generated');
    expect(lifecycle.records['primary-world:moon-1'].status).toBe('ready');
    expect(lifecycle.records['primary-world:moon-1'].eligible).toBe(true);
    expect(lifecycle.records['primary-world:moon-1'].stableSeed).toContain('primary-world:moon-1');
    expect(lifecycle.records['body-2'].status).toBe('placeholder');
    expect(lifecycle.records['body-2'].eligible).toBe(false);
  });

  it('runs the queue sequentially and supports remove and cancel', () => {
    const initial = reconcileBodyGenerationLifecycle(project, orbitalContext, '2026-08-01T00:00:00.000Z');
    const queued = queueUnresolvedAirlessMoons(initial, 'preview', '2026-08-01T00:01:00.000Z');
    expect(queued.queue).toEqual(['primary-world:moon-1', 'primary-world:moon-2']);

    const trimmed = removeQueuedBodyGeneration(queued, 'primary-world:moon-2', '2026-08-01T00:01:30.000Z');
    expect(trimmed.queue).toEqual(['primary-world:moon-1']);
    expect(trimmed.records['primary-world:moon-2'].status).toBe('ready');

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
    const queued = queueBodyGeneration(initial, 'primary-world:moon-1');
    const running = startNextBodyGeneration(resumeBodyGenerationQueue(queued));
    const failed = failBodyGeneration(running, 'primary-world:moon-1', 'synthetic failure');
    expect(failed.records['primary-world:moon-1'].status).toBe('failed');
    expect(failed.records['primary-world:moon-1'].failureReason).toBe('synthetic failure');

    const retried = retryBodyGeneration(failed, 'primary-world:moon-1');
    expect(retried.records['primary-world:moon-1'].status).toBe('queued');
    expect(retried.records['primary-world:moon-1'].stableSeed).toBe(initial.records['primary-world:moon-1'].stableSeed);
  });

  it('marks generated output stale when the orbital source changes', async () => {
    const initial = reconcileBodyGenerationLifecycle(project, orbitalContext, '2026-08-01T00:00:00.000Z');
    const source = airlessRockyBodySourceFromProject(project, orbitalContext, 'primary-world:moon-1', 'preview');
    const artifact = await runAirlessRockyBodyWorkflow(source);
    const completed = completeBodyGeneration(initial, artifact, '2026-08-01T00:05:00.000Z');
    const enriched = { ...project, bodyGeneration: completed, enrichmentArtifacts: { ...project.enrichmentArtifacts, [artifact.artifactKey]: artifact } } as WorldProject;
    const changedOrbital = { ...orbitalContext, artifactSignature: 'changed-orbital-artifact' };
    const reconciled = reconcileBodyGenerationLifecycle(enriched, changedOrbital, '2026-08-01T00:06:00.000Z');
    expect(reconciled.records['primary-world:moon-1'].status).toBe('stale');
    expect(reconciled.records['primary-world:moon-1'].staleReason).toBeTruthy();
  });

  it('persists generated artifact references and reconciles them after JSON roundtrip', async () => {
    const initial = reconcileBodyGenerationLifecycle(project, orbitalContext, '2026-08-01T00:00:00.000Z');
    const source = airlessRockyBodySourceFromProject(project, orbitalContext, 'primary-world:moon-1', 'preview');
    const artifact = await runAirlessRockyBodyWorkflow(source);
    const completed = completeBodyGeneration(initial, artifact, '2026-08-01T00:05:00.000Z');
    const enriched = {
      ...project,
      bodyGeneration: completed,
      enrichmentArtifacts: { ...project.enrichmentArtifacts, [artifact.artifactKey]: artifact }
    } as WorldProject;
    const reopened = JSON.parse(JSON.stringify(enriched)) as WorldProject;
    const reconciled = reconcileBodyGenerationLifecycle(reopened, orbitalContext, '2026-08-01T00:06:00.000Z');
    expect(reconciled.records['primary-world:moon-1'].status).toBe('generated');
    expect(reconciled.records['primary-world:moon-1'].artifactKeys).toContain(artifact.artifactKey);
  });
});

function moonBody(
  id: string,
  kind: 'rocky' | 'gas-giant' | 'moon',
  placeholder: boolean,
  parentBodyId: string | null
) {
  return {
    id,
    parentBodyId,
    kind,
    orbitalOrder: id.includes('moon-2') ? 2 : 1,
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
    sizeClass: kind === 'moon' ? 0.28 : 1,
    massClass: kind === 'moon' ? 0.04 : 1,
    visibleFromPrimary: true,
    placeholder
  } as const;
}
