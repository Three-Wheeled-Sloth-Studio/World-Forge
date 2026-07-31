import { describe, expect, it } from 'vitest';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';
import { cloudCoverageSample } from './weatherPresentationTexture';

const artifact = {
  seed: 'weather-qa-seed',
  payload: {
    cloudBands: [
      { id: 'north', centerLatitudeDeg: 42, widthDeg: 18, density: 0.72, phaseRad: 0.4, waveNumber: 2.2, waveAmplitudeDeg: 7, driftDegPerDay: 0.8 },
      { id: 'equator', centerLatitudeDeg: 2, widthDeg: 22, density: 0.84, phaseRad: 1.1, waveNumber: 1.5, waveAmplitudeDeg: 5, driftDegPerDay: 1.25 },
      { id: 'south', centerLatitudeDeg: -46, widthDeg: 16, density: 0.66, phaseRad: 2.4, waveNumber: 2.7, waveAmplitudeDeg: 8, driftDegPerDay: 0.65 }
    ]
  }
} as AtmosphericWeatherPresentationArtifact;

describe('layered cloud presentation', () => {
  it('is deterministic for the same artifact and time', () => {
    expect(cloudCoverageSample(artifact, 0.33, 0.44, 12.5)).toBe(cloudCoverageSample(artifact, 0.33, 0.44, 12.5));
  });

  it('breaks broad climate bands into varied local coverage', () => {
    const samples = Array.from({ length: 96 }, (_, index) => cloudCoverageSample(artifact, index / 96, 0.49, 4));
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / samples.length;
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.25);
    expect(variance).toBeGreaterThan(0.004);
  });

  it('preserves clear-sky gaps instead of producing a continuous haze', () => {
    const samples = Array.from({ length: 512 }, (_, index) => {
      const x = index % 32;
      const y = Math.floor(index / 32);
      return cloudCoverageSample(artifact, (x + 0.5) / 32, (y + 0.5) / 16, 4);
    });
    const clearSkyShare = samples.filter((value) => value < 0.02).length / samples.length;
    const denseCloudShare = samples.filter((value) => value > 0.35).length / samples.length;
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    expect(clearSkyShare).toBeGreaterThan(0.55);
    expect(denseCloudShare).toBeGreaterThan(0.03);
    expect(mean).toBeLessThan(0.18);
  });

  it('advects rather than remaining fixed over simulation time', () => {
    const before = Array.from({ length: 48 }, (_, index) => cloudCoverageSample(artifact, index / 48, 0.36, 0));
    const after = Array.from({ length: 48 }, (_, index) => cloudCoverageSample(artifact, index / 48, 0.36, 18));
    const change = before.reduce((sum, value, index) => sum + Math.abs(value - after[index]), 0) / before.length;
    expect(change).toBeGreaterThan(0.015);
  });
});
