import { biomeToCode } from '@world-forge/shared';
import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from './index';
import { applyBasinAwareCirculation } from './basinCirculation';
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

  it('replaces local packing with a small set of basin-scale gyres', () => {
    const project = generateProject(createDefaultConfig('large-scale-gyres-001', { width: 128, height: 64 }));
    const diagnostics = applyBasinAwareCirculation(project);

    expect(diagnostics.modelVersion).toBe('basin-circulation-v6');
    expect(diagnostics.gyreCandidateCount).toBeLessThanOrEqual(10);
    expect(diagnostics.packedGyres.length).toBe(diagnostics.gyreCandidateCount);
    expect(diagnostics.packedGyres.some((gyre) => gyre.kind === 'subtropical')).toBe(true);
    expect(diagnostics.pressureSystems.resolution).toEqual({ width: 128, height: 64 });
    expect(diagnostics.pressureSystems.precipitationAdjustedCells).toBeGreaterThan(0);
    expect(layerHasSignal(project.primaryWorld.layers.windX)).toBe(true);
    expect(layerHasSignal(project.primaryWorld.layers.windY)).toBe(true);
    expect(layerHasSignal(project.primaryWorld.layers.currentX)).toBe(true);
    expect(layerHasSignal(project.primaryWorld.layers.currentY)).toBe(true);
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
