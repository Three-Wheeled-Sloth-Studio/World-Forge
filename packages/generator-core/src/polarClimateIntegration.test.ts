import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology, type GenerationConfig } from '@world-forge/shared';
import { createDefaultConfig, generateProject } from './index';
import { applyDeepTimeFoundation } from './deepTimePipeline';
import { prepareSystemOrbitConfig, reconcileSystemOrbitPresets } from './systemOrbitPreset';
import type { GenerationWorkflowId } from './workflows';

type ExtendedGenerationConfig = GenerationConfig & {
  workflowId?: GenerationWorkflowId;
  starPresetId?: 'sol-like';
  worldPresetId?: string;
  seeds?: { star?: string; world?: string };
};

function generate(
  seed: string,
  workflowId: GenerationWorkflowId,
  averageTemperatureC = 15,
  axialTiltDeg = 23.4
) {
  const config = createDefaultConfig(seed, { width: 64, height: 32 }) as ExtendedGenerationConfig;
  config.topologyResolution = 16;
  config.workflowId = workflowId;
  config.starPresetId = 'sol-like';
  config.worldPresetId = 'Earthlike';
  config.seeds = { star: seed, world: seed };
  config.selectedValues = {
    averageTemperatureC,
    axialTiltDeg
  };
  const prepared = prepareSystemOrbitConfig(config);
  return reconcileSystemOrbitPresets(applyDeepTimeFoundation(generateProject(prepared)));
}

function polarSummary(project: ReturnType<typeof generate>) {
  const summary = project.primaryWorld.climate?.diagnostics.polarClimate;
  expect(summary).toBeDefined();
  return summary!;
}

function generatedLandIceShares(project: ReturnType<typeof generate>) {
  const world = project.primaryWorld;
  const topology = buildCubedSphereTopology(world.topology.resolution);
  let landCells = 0;
  let landIceCells = 0;
  let lowLatitudeLandCells = 0;
  let lowLatitudeLandIceCells = 0;

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (world.topologyLayers.water[cell]) continue;
    landCells += 1;
    const polarLatitude = Math.abs(topology.latitudes[cell]) / (Math.PI / 2);
    if (world.topologyLayers.ice[cell]) landIceCells += 1;
    if (polarLatitude <= 0.45) {
      lowLatitudeLandCells += 1;
      if (world.topologyLayers.ice[cell]) lowLatitudeLandIceCells += 1;
    }
  }

  return {
    landIceShare: landIceCells / Math.max(1, landCells),
    lowLatitudeLandIceShare: lowLatitudeLandIceCells / Math.max(1, lowLatitudeLandCells)
  };
}

describe('polar climate integration', () => {
  it('keeps the mean-centered polar profile experimental after production visual regression', () => {
    const production = generate('1001001', 'core.performance-foundation');
    const experimental = generate('1001001', 'core.world-generation-experimental');
    expect(experimental.selectedValues).toEqual(production.selectedValues);
    expect(experimental.solarSystem.stellarModel).toEqual(production.solarSystem.stellarModel);
    expect(experimental.primaryWorld.planetaryDynamics).toEqual(production.primaryWorld.planetaryDynamics);

    expect(polarSummary(production).latitudeProfileId).toBe('legacy-linear-v1');
    expect(polarSummary(experimental).latitudeProfileId).toBe('mean-centered-power-v1');
  });

  it('keeps ordinary production Earthlike land ice bounded across representative seeds', () => {
    for (const seed of ['1001001', '5336649', '8675309']) {
      const project = generate(seed, 'core.performance-foundation', 15, 23.4);
      const shares = generatedLandIceShares(project);
      expect(shares.landIceShare, `${seed} land ice share`).toBeLessThan(0.2);
      expect(shares.lowLatitudeLandIceShare, `${seed} low-latitude land ice share`).toBeLessThan(0.02);
    }
  });

  it('allows warm production worlds to remain ice-poor and cold worlds to expand permanent ice', () => {
    const warm = generate('3141592', 'core.performance-foundation', 34);
    const cold = generate('3141592', 'core.performance-foundation', 2);
    expect(cold.metrics.icePercentage).toBeGreaterThan(warm.metrics.icePercentage);
    const warmPolar = polarSummary(warm);
    const coldPolar = polarSummary(cold);
    expect(coldPolar.northPermanentIceShare + coldPolar.southPermanentIceShare)
      .toBeGreaterThan(warmPolar.northPermanentIceShare + warmPolar.southPermanentIceShare);
  });

  it('remains deterministic under the production workflow', () => {
    const first = generate('8675309', 'core.performance-foundation');
    const second = generate('8675309', 'core.performance-foundation');
    expect(first.primaryWorld.climate?.diagnostics.polarClimate)
      .toEqual(second.primaryWorld.climate?.diagnostics.polarClimate);
    expect(Array.from(first.primaryWorld.topologyLayers.temperature))
      .toEqual(Array.from(second.primaryWorld.topologyLayers.temperature));
    expect(Array.from(first.primaryWorld.topologyLayers.ice))
      .toEqual(Array.from(second.primaryWorld.topologyLayers.ice));
  });
});