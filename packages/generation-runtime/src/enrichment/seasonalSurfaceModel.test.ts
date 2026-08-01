import { describe, expect, test } from 'vitest';
import type { SeasonalSurfaceModelSource } from './seasonalSurfaceModel';
import {
  runSeasonalSurfaceModelWorkflow,
  seasonalSurfaceStateAtSample
} from './seasonalSurfaceModel';

function source(): SeasonalSurfaceModelSource {
  const width = 16;
  const height = 8;
  const count = width * height;
  const water = new Uint8Array(count);
  const temperature = new Float32Array(count);
  const wetness = new Float32Array(count);
  const elevation = new Float32Array(count);
  const ice = new Uint8Array(count);
  for (let y = 0; y < height; y += 1) {
    const latitude = Math.abs(90 - ((y + 0.5) / height) * 180);
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      water[index] = x < width / 3 ? 1 : 0;
      temperature[index] = 25 - latitude * 0.42;
      wetness[index] = 0.6;
      elevation[index] = water[index] ? -0.2 : 0.25;
      ice[index] = latitude > 72 ? 1 : 0;
    }
  }
  return {
    projectId: 'project-seasonal',
    worldId: 'world-seasonal',
    seed: 'seasonal-test-seed',
    generatorVersion: 'test',
    appVersion: 'test',
    orbitalArtifactSignature: 'orbital-seasonal',
    mapResolution: { width, height },
    coefficientResolution: { width: 8, height: 4 },
    yearLengthDays: 365.256,
    axialTiltDeg: 23.4,
    orbitalEccentricity: 0.0167,
    seaLevel: 0,
    climateDiagnostics: {
      landSeasonalSwingC: 28,
      oceanSeasonalSwingC: 10,
      axialTiltSeasonalityC: 12
    },
    layers: { water, temperature, wetness, elevation, ice }
  };
}

describe('seasonal surface model', () => {
  test('is deterministic and records six completed graph nodes', async () => {
    const events: string[] = [];
    const first = await runSeasonalSurfaceModelWorkflow(source(), { onNodeEvent: (event) => events.push(`${event.phase}:${event.nodeId}`) });
    const second = await runSeasonalSurfaceModelWorkflow(source());
    expect(first.payload).toEqual(second.payload);
    expect(first.artifactSignature).toBe(second.artifactSignature);
    expect(first.workflow.nodes).toHaveLength(6);
    expect(events.filter((event) => event.startsWith('completed:'))).toHaveLength(6);
    expect(first.validation.valid).toBe(true);
  });

  test('warms one hemisphere while cooling the other', async () => {
    const artifact = await runSeasonalSurfaceModelWorkflow(source());
    const width = artifact.payload.coefficientResolution.width;
    const northIndex = width;
    const southIndex = width * (artifact.payload.coefficientResolution.height - 2);
    const north = seasonalSurfaceStateAtSample(artifact, {
      baselineTemperatureC: artifact.payload.baselineTemperatureC[northIndex],
      temperatureAmplitudeC: artifact.payload.temperatureAmplitudeC[northIndex],
      insolationAmplitude: artifact.payload.insolationAmplitude[northIndex],
      snowPotential: artifact.payload.snowPotential[northIndex],
      seaIcePotential: artifact.payload.seaIcePotential[northIndex]
    }, artifact.payload.northSummerPeakDay);
    const south = seasonalSurfaceStateAtSample(artifact, {
      baselineTemperatureC: artifact.payload.baselineTemperatureC[southIndex],
      temperatureAmplitudeC: artifact.payload.temperatureAmplitudeC[southIndex],
      insolationAmplitude: artifact.payload.insolationAmplitude[southIndex],
      snowPotential: artifact.payload.snowPotential[southIndex],
      seaIcePotential: artifact.payload.seaIcePotential[southIndex]
    }, artifact.payload.northSummerPeakDay);
    expect(north.temperatureDeltaC).toBeGreaterThan(0);
    expect(south.temperatureDeltaC).toBeLessThan(0);
    expect(south.snowFraction).toBeGreaterThanOrEqual(north.snowFraction);
  });
});
