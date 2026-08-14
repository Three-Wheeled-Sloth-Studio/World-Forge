import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology, type GenerationConfig } from '@world-forge/shared';
import { createDefaultConfig, generateProject } from './index';
import { applyDeepTimeFoundation } from './deepTimePipeline';
import { classifyPermanentIce } from './permanentIce';
import { prepareSystemOrbitConfig, reconcileSystemOrbitPresets } from './systemOrbitPreset';
import type { GenerationWorkflowId } from './workflows';

type ExtendedGenerationConfig = GenerationConfig & {
  workflowId?: GenerationWorkflowId;
  starPresetId?: 'sol-like';
  worldPresetId?: string;
  seeds?: { star?: string; world?: string };
};

function generatedLandIceShares(project: ReturnType<typeof reconcileSystemOrbitPresets>) {
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

describe('system-orbit permanent-ice sea-level regression', () => {
  it('uses the authoritative final sea level for the reported sol-reference-v1 failure case', () => {
    const seed = 'sol-reference-v1';
    const config = createDefaultConfig(seed, { width: 128, height: 64 }) as ExtendedGenerationConfig;
    config.topologyResolution = 32;
    config.workflowId = 'core.performance-foundation';
    config.starPresetId = 'sol-like';
    config.worldPresetId = 'Earthlike';
    config.seeds = { star: seed, world: seed };

    const prepared = prepareSystemOrbitConfig(config);
    const project = reconcileSystemOrbitPresets(applyDeepTimeFoundation(generateProject(prepared)));
    const world = project.primaryWorld;
    const topology = buildCubedSphereTopology(world.topology.resolution);
    const expectedIce = new Uint8Array(world.topologyLayers.ice.length);

    classifyPermanentIce({
      ice: expectedIce,
      elevation: world.topologyLayers.elevation,
      water: world.topologyLayers.water,
      temperature: world.topologyLayers.temperature,
      wetness: world.topologyLayers.wetness,
      topology,
      seaLevel: world.seaLevel,
      axialTiltDeg: world.planetaryDynamics.obliquityMeanDeg,
      orbitalEccentricity: world.planetaryDynamics.eccentricityMean
    });

    expect(Array.from(world.topologyLayers.ice)).toEqual(Array.from(expectedIce));
    expect(project.selectedValues.averageTemperatureC).toBeGreaterThan(10);

    const shares = generatedLandIceShares(project);
    expect(shares.landIceShare, 'sol-reference-v1 land ice share').toBeLessThan(0.2);
    expect(shares.lowLatitudeLandIceShare, 'sol-reference-v1 low-latitude land ice share').toBeLessThan(0.02);
  });
});
