import { describe, expect, it } from 'vitest';
import type { StellarSurfacePresentationArtifact } from '@world-forge/shared';
import {
  EXPERIMENTAL_WORLD_WORKFLOW_ID,
  STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
  runStellarSurfacePresentationWorkflow,
  stellarSurfaceGraphSignature,
  stellarSurfacePresentationWorkflowDescriptor,
  stellarSurfaceSourceSignature,
  type StellarSurfacePresentationSource
} from './stellarSurfacePresentation';
import { projectEnrichmentWorkflowDescriptor, projectEnrichmentWorkflowForNode } from './systemOrbitalContext';

function source(): StellarSurfacePresentationSource {
  return {
    projectId: 'project-stellar-test',
    worldId: 'primary-world',
    starId: 'star-primary',
    seed: '1001001',
    generatorVersion: '0.1.1-mvp',
    appVersion: '0.3.48',
    sourceCommit: 'test',
    worldWorkflowId: EXPERIMENTAL_WORLD_WORKFLOW_ID,
    orbitalArtifactSignature: 'orbital-stellar-test',
    stellarAgeGy: 4.6,
    starType: 'G-type main sequence',
    massSolar: 1,
    radiusSolar: 1,
    luminositySolar: 1,
    effectiveTemperatureK: 5772,
    colorHex: '#fff0b0'
  };
}

describe('stellar surface presentation enrichment', () => {
  it('produces deterministic bounded stellar presentation output', async () => {
    const first = await runStellarSurfacePresentationWorkflow(source());
    const second = await runStellarSurfacePresentationWorkflow(source());
    expect(first.payload).toEqual(second.payload);
    expect(first.artifactSignature).toBe(second.artifactSignature);
    expect(first.workflow.graphSignature).toBe(stellarSurfaceGraphSignature());
    expect(first.validation.valid).toBe(true);
    expect(first.payload.activityIndex).toBeGreaterThanOrEqual(0);
    expect(first.payload.activityIndex).toBeLessThanOrEqual(1);
    expect(first.payload.rotationPeriodDays).toBeGreaterThan(0);
    expect(first.payload.spots.length).toBeGreaterThan(0);
    expect(first.payload.faculae.length).toBeGreaterThan(1);
    expect(first.payload.corona.streamers.length).toBeGreaterThanOrEqual(4);
  });

  it('emits ordered instrumentation and registers an inspectable graph', async () => {
    const events: string[] = [];
    const artifact = await runStellarSurfacePresentationWorkflow(source(), { onNodeEvent: (event) => events.push(`${event.nodeId}:${event.phase}`) });
    expect(events).toEqual(artifact.workflow.nodes.flatMap((node) => [`${node.nodeId}:started`, `${node.nodeId}:completed`]));
    expect(artifact.workflow.nodes).toHaveLength(7);
    expect(artifact.workflow.nodes.every((node) => node.durationMs >= 0)).toBe(true);
    expect(projectEnrichmentWorkflowDescriptor(STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID).nodes).toEqual(stellarSurfacePresentationWorkflowDescriptor.nodes);
    expect(projectEnrichmentWorkflowForNode('enrichment.stellar.resolve-corona')?.id).toBe(STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID);
  });

  it('invalidates when the stellar or orbital source changes', () => {
    const first = source();
    const second = source();
    second.effectiveTemperatureK += 75;
    expect(stellarSurfaceSourceSignature(first)).not.toBe(stellarSurfaceSourceSignature(second));
    second.effectiveTemperatureK = first.effectiveTemperatureK;
    second.orbitalArtifactSignature = 'changed-orbital';
    expect(stellarSurfaceSourceSignature(first)).not.toBe(stellarSurfaceSourceSignature(second));
  });

  it('rejects non-Experimental execution and remains presentation-only', async () => {
    const invalid = source();
    invalid.worldWorkflowId = 'core.performance-foundation';
    await expect(runStellarSurfacePresentationWorkflow(invalid)).rejects.toThrow(/Experimental/i);
    const artifact: StellarSurfacePresentationArtifact = await runStellarSurfacePresentationWorkflow(source());
    expect(artifact.artifactKey).toBe(STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID);
    expect(artifact.artifactRole).toBe('presentation');
    expect(artifact.stellarAuthority).toBe('illustrative');
  });
});
