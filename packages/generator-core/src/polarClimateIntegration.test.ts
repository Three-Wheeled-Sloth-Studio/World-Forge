import { describe, expect, it } from 'vitest';
import type { GenerationConfig } from '@world-forge/shared';
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

describe('Experimental polar climate integration', () => {
  it('isolates the polar climate candidate without changing system generation', () => {
    const detailed = generate('1001001', 'core.performance-foundation');
    const experimental = generate('1001001', 'core.world-generation-experimental');
    expect(experimental.selectedValues).toEqual(detailed.selectedValues);
    expect(experimental.solarSystem.stellarModel).toEqual(detailed.solarSystem.stellarModel);
    expect(experimental.primaryWorld.planetaryDynamics).toEqual(detailed.primaryWorld.planetaryDynamics);

    const detailedPolar = polarSummary(detailed);
    const experimentalPolar = polarSummary(experimental);
    expect(detailedPolar.latitudeProfileId).toBe('legacy-linear-v1');
    expect(experimentalPolar.latitudeProfileId).toBe('mean-centered-power-v1');
    expect(experimentalPolar.northHighLatitudeMeanTemperatureC).toBeLessThan(detailedPolar.northHighLatitudeMeanTemperatureC - 2);
    expect(experimentalPolar.southHighLatitudeMeanTemperatureC).toBeLessThan(detailedPolar.southHighLatitudeMeanTemperatureC - 2);
    expect(experimental.metrics.icePercentage).toBeGreaterThanOrEqual(detailed.metrics.icePercentage);
  });

  it('allows warm worlds to remain ice-poor and cold worlds to expand permanent ice', () => {
    const warm = generate('3141592', 'core.world-generation-experimental', 34);
    const cold = generate('3141592', 'core.world-generation-experimental', 2);
    expect(cold.metrics.icePercentage).toBeGreaterThan(warm.metrics.icePercentage);
    const warmPolar = polarSummary(warm);
    const coldPolar = polarSummary(cold);
    expect(coldPolar.northPermanentIceShare + coldPolar.southPermanentIceShare)
      .toBeGreaterThan(warmPolar.northPermanentIceShare + warmPolar.southPermanentIceShare);
  });

  it('remains deterministic under the Experimental workflow', () => {
    const first = generate('8675309', 'core.world-generation-experimental');
    const second = generate('8675309', 'core.world-generation-experimental');
    expect(first.primaryWorld.climate?.diagnostics.polarClimate)
      .toEqual(second.primaryWorld.climate?.diagnostics.polarClimate);
    expect(Array.from(first.primaryWorld.topologyLayers.temperature))
      .toEqual(Array.from(second.primaryWorld.topologyLayers.temperature));
    expect(Array.from(first.primaryWorld.topologyLayers.ice))
      .toEqual(Array.from(second.primaryWorld.topologyLayers.ice));
  });
});
