import { describe, expect, it } from 'vitest';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';
import { cloudCoverageSample, windOrientedStreamerSample } from './weatherPresentationTexture';

function createArtifact(wind: 'east' | 'north' | 'varied' = 'varied'): AtmosphericWeatherPresentationArtifact {
  const width = 16;
  const height = 8;
  const zonal: number[] = [];
  const meridional: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (wind === 'east') {
        zonal.push(0.85);
        meridional.push(0);
      } else if (wind === 'north') {
        zonal.push(0);
        meridional.push(0.85);
      } else {
        const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
        zonal.push(Math.sin(latitude * 2) * 0.62);
        meridional.push(Math.cos((x / width) * Math.PI * 2) * 0.22);
      }
    }
  }

  return {
    seed: 'weather-qa-seed',
    payload: {
      textureResolution: { width: 512, height: 256 },
      meanCloudCover: 0.46,
      cloudBands: [
        { id: 'north', centerLatitudeDeg: 42, widthDeg: 18, density: 0.72, phaseRad: 0.4, waveNumber: 2, waveAmplitudeDeg: 7, driftDegPerDay: 0.8 },
        { id: 'equator', centerLatitudeDeg: 2, widthDeg: 22, density: 0.84, phaseRad: 1.1, waveNumber: 2, waveAmplitudeDeg: 5, driftDegPerDay: 1.25 },
        { id: 'south', centerLatitudeDeg: -46, widthDeg: 16, density: 0.66, phaseRad: 2.4, waveNumber: 3, waveAmplitudeDeg: 8, driftDegPerDay: 0.65 }
      ],
      systems: [],
      advection: { zonalMeanDegPerDay: 5, meridionalMeanDegPerDay: 0.2 },
      windField: {
        resolution: { width, height },
        zonal,
        meridional
      }
    }
  } as unknown as AtmosphericWeatherPresentationArtifact;
}

describe('wind-oriented spherical cloud presentation', () => {
  it('is deterministic for the same spherical location, flow field, and time', () => {
    const artifact = createArtifact();
    expect(cloudCoverageSample(artifact, 0.33, 0.44, 12.5)).toBe(cloudCoverageSample(artifact, 0.33, 0.44, 12.5));
    expect(windOrientedStreamerSample(artifact, 0.33, 0.44, 12.5)).toBe(windOrientedStreamerSample(artifact, 0.33, 0.44, 12.5));
  });

  it('elongates streamer variation along the generated prevailing wind', () => {
    const artifact = createArtifact('east');
    const angularStep = 0.026;
    const alongStepU = angularStep / (Math.PI * 2);
    const acrossStepV = angularStep / Math.PI;
    let alongVariation = 0;
    let acrossVariation = 0;
    let samples = 0;

    for (let row = 0; row < 9; row += 1) {
      const v = 0.36 + row * 0.035;
      for (let column = 0; column < 40; column += 1) {
        const u = 0.08 + column * 0.021;
        const base = windOrientedStreamerSample(artifact, u, v, 3);
        alongVariation += Math.abs(base - windOrientedStreamerSample(artifact, u + alongStepU, v, 3));
        acrossVariation += Math.abs(base - windOrientedStreamerSample(artifact, u, v + acrossStepV, 3));
        samples += 1;
      }
    }

    expect(alongVariation / samples).toBeLessThan((acrossVariation / samples) * 0.72);
  });

  it('preserves clear-sky gaps instead of producing a continuous haze', () => {
    const artifact = createArtifact();
    const samples = Array.from({ length: 2048 }, (_, index) => {
      const x = index % 64;
      const y = Math.floor(index / 64);
      return cloudCoverageSample(artifact, (x + 0.5) / 64, (y + 0.5) / 32, 4);
    });
    const clearSkyShare = samples.filter((value) => value < 0.02).length / samples.length;
    const denseCloudShare = samples.filter((value) => value > 0.35).length / samples.length;
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    expect(clearSkyShare).toBeGreaterThan(0.55);
    expect(denseCloudShare).toBeGreaterThan(0.03);
    expect(mean).toBeLessThan(0.2);
  });

  it('is intrinsically continuous across the former longitude seam', () => {
    const artifact = createArtifact();
    for (let index = 0; index < 24; index += 1) {
      const v = (index + 0.5) / 24;
      const left = cloudCoverageSample(artifact, 0.000001, v, 7.25);
      const right = cloudCoverageSample(artifact, 0.999999, v, 7.25);
      expect(Math.abs(left - right)).toBeLessThan(0.002);
    }
  });

  it('advects with local flow over shared simulation time', () => {
    const artifact = createArtifact();
    const before = Array.from({ length: 64 }, (_, index) => cloudCoverageSample(artifact, (index + 0.5) / 64, 0.36, 0));
    const after = Array.from({ length: 64 }, (_, index) => cloudCoverageSample(artifact, (index + 0.5) / 64, 0.36, 18));
    const change = before.reduce((sum, value, index) => sum + Math.abs(value - after[index]), 0) / before.length;
    expect(change).toBeGreaterThan(0.015);
  });
});
