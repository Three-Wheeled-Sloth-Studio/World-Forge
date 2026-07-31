import { describe, expect, it } from 'vitest';
import type { SolarSystem } from '@world-forge/shared';
import {
  orbitalContextGraphSignature,
  runSystemOrbitalContextWorkflow,
  systemOrbitalContextSourceSignature,
  type SystemOrbitalContextSource
} from './systemOrbitalContext';

function source(): SystemOrbitalContextSource {
  const solarSystem: SolarSystem = {
    star: { id: 'star-primary', type: 'G-type main sequence', massClass: 'solar', luminosityClass: 'V', ageGy: 4.6, colorTemperatureClass: 'yellow' },
    ageGy: 4.6,
    primaryWorldId: 'primary-world',
    visibleBodiesFromPrimary: ['body-2'],
    generatedNotes: [],
    bodies: [
      { id: 'primary-world', bodyType: 'rocky', orbitalOrder: 3, orbitalDistanceClass: 3, eccentricity: 0.02, sizeClass: 1, massClass: 1, visibleFromPrimary: false, isPrimaryWorld: true, moons: [{ id: 'moon-1', name: 'Moon 1', sizeClass: 0.27, orbitalDistanceClass: 0.8, tideInfluence: 0.34 }] },
      { id: 'body-2', bodyType: 'gas-giant', orbitalOrder: 5, orbitalDistanceClass: 6.2, eccentricity: 0.08, sizeClass: 7, massClass: 10, visibleFromPrimary: true, isPrimaryWorld: false, moons: [] }
    ]
  };
  return {
    projectId: 'project-1001001', worldId: 'primary-world', seed: '1001001', generatorVersion: '0.1.1-mvp', appVersion: '0.3.36', sourceCommit: 'test',
    selectedValues: { axialTiltDeg: 23.4, orbitalEccentricity: 0.02 }, solarSystem
  };
}

describe('system orbital context enrichment', () => {
  it('produces deterministic presentation payloads and signatures', async () => {
    const first = await runSystemOrbitalContextWorkflow(source());
    const second = await runSystemOrbitalContextWorkflow(source());
    expect(first.payload).toEqual(second.payload);
    expect(first.artifactSignature).toBe(second.artifactSignature);
    expect(first.workflow.graphSignature).toBe(orbitalContextGraphSignature());
    expect(first.validation.valid).toBe(true);
    expect(first.payload.bodies.some((body) => body.kind === 'moon')).toBe(true);
    expect(first.payload.bodies.find((body) => body.id === 'primary-world')?.placeholder).toBe(false);
  });

  it('emits ordered node instrumentation for the inspectable graph', async () => {
    const events: string[] = [];
    const artifact = await runSystemOrbitalContextWorkflow(source(), { onNodeEvent: (event) => events.push(`${event.nodeId}:${event.phase}`) });
    expect(events).toEqual(artifact.workflow.nodes.flatMap((node) => [`${node.nodeId}:started`, `${node.nodeId}:completed`]));
    expect(artifact.workflow.nodes.every((node) => node.durationMs >= 0)).toBe(true);
  });

  it('invalidates its source signature when the system scaffold changes', () => {
    const first = source();
    const second = source();
    second.solarSystem.bodies[1].orbitalDistanceClass += 1;
    expect(systemOrbitalContextSourceSignature(first)).not.toBe(systemOrbitalContextSourceSignature(second));
  });
});
