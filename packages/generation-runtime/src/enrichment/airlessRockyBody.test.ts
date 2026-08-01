import { describe, expect, it } from 'vitest';
import {
  AIRLESS_ROCKY_BODY_WORKFLOW_VERSION,
  airlessRockyBodyGraphSignature,
  airlessRockyBodySourceSignature,
  isCurrentAirlessRockyBodyArtifact,
  runAirlessRockyBodyWorkflow,
  type AirlessRockyBodySource
} from './airlessRockyBody';

const source: AirlessRockyBodySource = {
  projectId: 'project-airless-test',
  worldId: 'primary-world',
  bodyId: 'primary-world:moon-1',
  parentBodyId: 'primary-world',
  seed: '1001001:body:primary-world:moon-1:airless-rocky:v1',
  generatorVersion: 'test-generator',
  appVersion: '0.3.45',
  sourceCommit: 'test-commit',
  orbitalArtifactSignature: 'orbital-signature',
  requestedFidelity: 'preview',
  body: {
    id: 'primary-world:moon-1',
    parentBodyId: 'primary-world',
    kind: 'moon',
    orbitalOrder: 1,
    semiMajorAxisParentRadii: 12,
    orbitalPeriodDays: 24,
    rotationPeriodHours: 576,
    axialTiltDeg: 4,
    sizeClass: 0.28,
    massClass: 0.04,
    placeholder: true
  }
};

describe('airless rocky body workflow', () => {
  it('produces deterministic globe-space fields and provenance', async () => {
    const first = await runAirlessRockyBodyWorkflow(source);
    const second = await runAirlessRockyBodyWorkflow(source);

    expect(first.payload).toEqual(second.payload);
    expect(first.artifactSignature).toBe(second.artifactSignature);
    expect(first.workflow.version).toBe(AIRLESS_ROCKY_BODY_WORKFLOW_VERSION);
    expect(first.workflow.graphSignature).toBe(airlessRockyBodyGraphSignature());
    expect(first.source.sourceSignature).toBe(airlessRockyBodySourceSignature(source));
    expect(first.workflow.nodes).toHaveLength(7);
    expect(first.workflow.nodes.map((node) => node.nodeId).join(' ')).not.toMatch(/climate|hydrology|ecology|civilization/);
    expect(first.validation.valid).toBe(true);
    expect(first.payload.craterCount).toBeGreaterThanOrEqual(20);
    expect(first.payload.heightField).toHaveLength(64 * 32);
    expect(first.payload.albedoField).toHaveLength(64 * 32);
    expect(first.payload.thermalField).toHaveLength(64 * 32);
  });

  it('keeps the spherical wrap boundary continuous', async () => {
    const artifact = await runAirlessRockyBodyWorkflow(source);
    expect(artifact.payload.stats.seamMeanDelta).toBeLessThan(0.34);
    expect(Math.min(...artifact.payload.heightField)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...artifact.payload.heightField)).toBeLessThanOrEqual(1);
  });

  it('invalidates artifacts when source fidelity changes', async () => {
    const artifact = await runAirlessRockyBodyWorkflow(source);
    const standardSource = { ...source, requestedFidelity: 'standard' as const };
    expect(isCurrentAirlessRockyBodyArtifact(source, artifact)).toBe(true);
    expect(isCurrentAirlessRockyBodyArtifact(standardSource, artifact)).toBe(false);
  });

  it('honors cancellation between inspectable nodes', async () => {
    let cancelled = false;
    await expect(runAirlessRockyBodyWorkflow(source, {
      onNodeEvent: (event) => { if (event.phase === 'completed') cancelled = true; },
      isCancelled: () => cancelled
    })).rejects.toThrow('cancelled');
  });

  it('rejects unsupported non-moon scaffolds', async () => {
    const unsupported = {
      ...source,
      bodyId: 'body-2',
      body: { ...source.body, id: 'body-2', kind: 'rocky' as const, parentBodyId: 'star-1' }
    };
    await expect(runAirlessRockyBodyWorkflow(unsupported)).rejects.toThrow('only supports moons');
  });
});
