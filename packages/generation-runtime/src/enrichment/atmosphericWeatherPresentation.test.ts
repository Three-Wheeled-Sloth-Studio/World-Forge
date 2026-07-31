import { describe, expect, it } from 'vitest';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';
import {
  ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
  atmosphericWeatherGraphSignature,
  atmosphericWeatherPresentationWorkflowDescriptor,
  atmosphericWeatherSourceSignature,
  runAtmosphericWeatherPresentationWorkflow,
  type AtmosphericWeatherPresentationSource
} from './atmosphericWeatherPresentation';
import { projectEnrichmentWorkflowDescriptor, projectEnrichmentWorkflowForNode } from './systemOrbitalContext';

function source(): AtmosphericWeatherPresentationSource {
  const width = 24;
  const height = 12;
  const length = width * height;
  const water = new Uint8Array(length);
  const temperature = new Float32Array(length);
  const wetness = new Float32Array(length);
  const climateMoisture = new Float32Array(length);
  const climatePrecipitation = new Float32Array(length);
  const windX = new Float32Array(length);
  const windY = new Float32Array(length);
  const elevation = new Float32Array(length);
  for (let y = 0; y < height; y += 1) {
    const latitude = 90 - ((y + 0.5) / height) * 180;
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      water[index] = (x + y) % 4 === 0 ? 1 : 0;
      temperature[index] = 28 - Math.abs(latitude) * 0.42;
      wetness[index] = 0.35 + ((x * 7 + y * 3) % 10) / 20;
      climateMoisture[index] = 0.42 + ((x + y * 2) % 8) / 18;
      climatePrecipitation[index] = 0.28 + ((x * 3 + y * 5) % 11) / 16;
      windX[index] = Math.sin(latitude * Math.PI / 90) * 0.55;
      windY[index] = Math.cos((x / width) * Math.PI * 2) * 0.16;
      elevation[index] = water[index] ? -0.2 : ((x + y) % 6) / 12;
    }
  }
  return {
    projectId: 'project-weather-test',
    worldId: 'primary-world',
    seed: '1001001',
    generatorVersion: '0.1.1-mvp',
    appVersion: '0.3.40',
    sourceCommit: 'test',
    orbitalArtifactSignature: 'wf-orbital-test',
    mapResolution: { width, height },
    seaLevel: 0,
    oceanPercentage: 62,
    averageTemperatureC: 15,
    aridity: 0.48,
    layers: { water, temperature, wetness, climateMoisture, climatePrecipitation, windX, windY, elevation }
  };
}

describe('atmospheric weather presentation enrichment', () => {
  it('produces deterministic illustrative cloud and weather payloads', async () => {
    const first = await runAtmosphericWeatherPresentationWorkflow(source());
    const second = await runAtmosphericWeatherPresentationWorkflow(source());
    expect(first.payload).toEqual(second.payload);
    expect(first.artifactSignature).toBe(second.artifactSignature);
    expect(first.weatherAuthority).toBe('illustrative');
    expect(first.workflow.graphSignature).toBe(atmosphericWeatherGraphSignature());
    expect(first.validation.valid).toBe(true);
    expect(first.payload.cloudBands.length).toBeGreaterThanOrEqual(3);
    expect(first.payload.systems.length).toBeGreaterThanOrEqual(4);
  });

  it('emits ordered instrumentation and registers an inspectable graph', async () => {
    const events: string[] = [];
    const artifact = await runAtmosphericWeatherPresentationWorkflow(source(), { onNodeEvent: (event) => events.push(`${event.nodeId}:${event.phase}`) });
    expect(events).toEqual(artifact.workflow.nodes.flatMap((node) => [`${node.nodeId}:started`, `${node.nodeId}:completed`]));
    expect(artifact.workflow.nodes).toHaveLength(6);
    expect(artifact.workflow.nodes.every((node) => node.durationMs >= 0)).toBe(true);
    expect(projectEnrichmentWorkflowDescriptor(ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID).nodes).toEqual(atmosphericWeatherPresentationWorkflowDescriptor.nodes);
    expect(projectEnrichmentWorkflowForNode('enrichment.weather.seed-systems')?.id).toBe(ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID);
  });

  it('invalidates its source signature when climate inputs change', () => {
    const first = source();
    const second = source();
    second.layers.windX[12] += 0.75;
    expect(atmosphericWeatherSourceSignature(first)).not.toBe(atmosphericWeatherSourceSignature(second));
  });

  it('keeps the artifact contract presentation-only', async () => {
    const artifact: AtmosphericWeatherPresentationArtifact = await runAtmosphericWeatherPresentationWorkflow(source());
    expect(artifact.artifactKey).toBe(ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID);
    expect(artifact.artifactRole).toBe('presentation');
    expect(artifact.payload.textureResolution).toEqual({ width: 512, height: 256 });
  });
});
