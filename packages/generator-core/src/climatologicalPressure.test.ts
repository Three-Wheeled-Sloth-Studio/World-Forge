import { biomeToCode } from '@world-forge/shared';
import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from './index';
import { applyBasinAwareCirculation, continentalConvergenceRecycling } from './basinCirculation';
import { buildClimatologicalPressureModel, sampleClimatologicalPressure } from './climatologicalPressure';

function hashNumbers(values: ArrayLike<number>): number {
  let hash = 2166136261;
  for (let index = 0; index < values.length; index += 1) {
    const quantized = Math.round(values[index] * 1_000_000);
    hash ^= quantized;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function layerHasSignal(values: ArrayLike<number>): boolean {
  for (let index = 0; index < values.length; index += 1) {
    if (Math.abs(values[index]) > 0.0001) return true;
  }
  return false;
}

let pressureProject: ReturnType<typeof generateProject> | undefined;

function sharedPressureProject() {
  pressureProject ??= generateProject(createDefaultConfig('pressure-systems-001', { width: 128, height: 64 }));
  return pressureProject;
}

describe('climatological pressure and basin-scale circulation', () => {
  it('builds deterministic fixed-resolution pressure systems', () => {
    const project = sharedPressureProject();
    const first = buildClimatologicalPressureModel(project);
    const second = buildClimatologicalPressureModel(project);

    expect(first.modelVersion).toBe('climatological-pressure-v1');
    expect(first.resolution).toEqual({ width: 128, height: 64 });
    expect(first.pressurePotential).toHaveLength(128 * 64);
    expect(first.inlandDistance).toHaveLength(128 * 64);
    expect(Math.max(...first.inlandDistance)).toBeGreaterThan(0);
    expect(first.centers.some((center) => center.kind === 'high')).toBe(true);
    expect(first.centers.some((center) => center.kind === 'low')).toBe(true);
    expect(first.centers.some((center) => center.regime === 'subtropical')).toBe(true);
    expect(first.centers.some((center) => center.regime === 'equatorial-trough')).toBe(true);
    expect(first.centers).toEqual(second.centers);
    expect(hashNumbers(first.pressurePotential)).toBe(hashNumbers(second.pressurePotential));
    expect(hashNumbers(first.prevailingWindX)).toBe(hashNumbers(second.prevailingWindX));
  }, 20_000);

  it('exposes broad subsidence, convergence, and storm-track regimes', () => {
    const project = sharedPressureProject();
    const model = buildClimatologicalPressureModel(project);
    const equator = sampleClimatologicalPressure(model, 0, 0);
    const subtropicalNorth = sampleClimatologicalPressure(model, 0, 30 * Math.PI / 180);
    const midLatitudeNorth = sampleClimatologicalPressure(model, 0, 55 * Math.PI / 180);

    expect(equator.convergence).toBeGreaterThan(equator.subsidence);
    expect(subtropicalNorth.subsidence).toBeGreaterThan(subtropicalNorth.convergence);
    expect(midLatitudeNorth.stormTrack).toBeGreaterThan(subtropicalNorth.stormTrack);
  }, 20_000);

  it('bounds convergence recycling to continental interiors outside subsiding air', () => {
    expect(continentalConvergenceRecycling(2, 1, 0)).toBe(0);
    expect(continentalConvergenceRecycling(8, 0, 0)).toBe(0);
    expect(continentalConvergenceRecycling(8, 1, 1)).toBe(0);
    expect(continentalConvergenceRecycling(8, 1, 0)).toBe(0.13);
    expect(continentalConvergenceRecycling(5, 0.5, 0.2)).toBeCloseTo(0.042);
  });

  it('uses the north-positive stored-vector convention for three-cell meridional flow', () => {
    const model = buildClimatologicalPressureModel(sharedPressureProject());
    const meanWindY = (latitudeDegrees: number) => {
      let total = 0;
      const samples = 16;
      for (let index = 0; index < samples; index += 1) {
        const longitude = -Math.PI + (index + 0.5) / samples * Math.PI * 2;
        total += sampleClimatologicalPressure(model, longitude, latitudeDegrees * Math.PI / 180).windY;
      }
      return total / samples;
    };

    expect(meanWindY(15)).toBeLessThan(0);
    expect(meanWindY(-15)).toBeGreaterThan(0);
    expect(meanWindY(45)).toBeGreaterThan(0);
    expect(meanWindY(-45)).toBeLessThan(0);
    expect(meanWindY(75)).toBeLessThan(0);
    expect(meanWindY(-75)).toBeGreaterThan(0);
  }, 20_000);

  it('replaces local packing with a small set of basin-scale gyres', () => {
    const project = generateProject(createDefaultConfig('large-scale-gyres-001', { width: 128, height: 64 }));
    const diagnostics = applyBasinAwareCirculation(project);

    expect(diagnostics.modelVersion).toBe('basin-circulation-v10');
    expect(diagnostics.gyreCandidateCount).toBeLessThanOrEqual(10);
    expect(diagnostics.packedGyres.length).toBe(diagnostics.gyreCandidateCount);
    expect(diagnostics.packedGyres.some((gyre) => gyre.kind === 'subtropical')).toBe(true);
    expect(diagnostics.pressureSystems.resolution).toEqual({ width: 128, height: 64 });
    expect(diagnostics.pressureSystems.precipitationAdjustedCells).toBeGreaterThan(0);
    expect(diagnostics.pressureSystems.coolCurrentAdjustedCells).toBeGreaterThan(0);
    expect(diagnostics.pressureSystems.orographicAdjustedCells).toBeGreaterThan(0);
    expect(Number.isFinite(diagnostics.pressureSystems.meanOrographicAdjustment)).toBe(true);
    expect(layerHasSignal(project.primaryWorld.layers.windX)).toBe(true);
    expect(layerHasSignal(project.primaryWorld.layers.windY)).toBe(true);
    expect(layerHasSignal(project.primaryWorld.layers.currentX)).toBe(true);
    expect(layerHasSignal(project.primaryWorld.layers.currentY)).toBe(true);
  }, 20_000);

  it('retains westward equatorial flow and an eastward north-equatorial countercurrent', () => {
    const project = generateProject(createDefaultConfig('equatorial-currents-001', { width: 256, height: 128 }));
    applyBasinAwareCirculation(project);
    const { width, height } = project.primaryWorld.mapModel.resolution;
    const layers = project.primaryWorld.layers;
    let equatorialSupported = 0;
    let equatorialSamples = 0;
    let counterSupported = 0;
    let counterSamples = 0;
    for (let y = 0; y < height; y += 1) {
      const latitude = 90 - ((y + 0.5) / height) * 180;
      for (let x = 0; x < width; x += 1) {
        const cell = y * width + x;
        if (!layers.water[cell]) continue;
        if (latitude >= -2.5 && latitude <= 2.5) {
          equatorialSamples += 1;
          if (layers.currentX[cell] < 0) equatorialSupported += 1;
        }
        if (latitude >= 3 && latitude <= 7) {
          counterSamples += 1;
          if (layers.currentX[cell] > 0) counterSupported += 1;
        }
      }
    }
    expect(equatorialSupported / equatorialSamples).toBeGreaterThan(0.8);
    expect(counterSupported / counterSamples).toBeGreaterThan(0.4);
  }, 20_000);

  it('preserves terrain-defined mountain biomes during projected climate reconciliation', () => {
    const project = generateProject(createDefaultConfig('pressure-mountain-preservation-001', { width: 128, height: 64 }));
    const layers = project.primaryWorld.layers;
    const mountainCell = layers.water.findIndex((water) => water === 0);
    expect(mountainCell).toBeGreaterThanOrEqual(0);
    layers.biomes[mountainCell] = biomeToCode('mountain');

    applyBasinAwareCirculation(project);

    expect(layers.biomes[mountainCell]).toBe(biomeToCode('mountain'));
  }, 20_000);

  it('keeps pressure and current outputs deterministic for the same project', () => {
    const config = createDefaultConfig('circulation-determinism-001', { width: 128, height: 64 });
    const first = generateProject(config);
    const second = generateProject(config);
    const firstDiagnostics = applyBasinAwareCirculation(first);
    const secondDiagnostics = applyBasinAwareCirculation(second);

    expect(firstDiagnostics.packedGyres).toEqual(secondDiagnostics.packedGyres);
    expect(firstDiagnostics.pressureSystems.centers).toEqual(secondDiagnostics.pressureSystems.centers);
    expect(hashNumbers(first.primaryWorld.layers.windX)).toBe(hashNumbers(second.primaryWorld.layers.windX));
    expect(hashNumbers(first.primaryWorld.layers.currentX)).toBe(hashNumbers(second.primaryWorld.layers.currentX));
    expect(hashNumbers(first.primaryWorld.layers.climatePrecipitation)).toBe(hashNumbers(second.primaryWorld.layers.climatePrecipitation));
  }, 30_000);
});
