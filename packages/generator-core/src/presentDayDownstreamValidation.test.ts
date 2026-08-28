import { describe, expect, it } from 'vitest';
import { biomeToCode } from '@world-forge/shared';
import { createDefaultConfig } from './generatorCoreBase';
import { reconcilePresentDayDownstream } from './deepTimePipeline';
import { generateProjectWithNativeStages } from './nativeStagePipeline';

describe('present-day downstream validation seam', () => {
  it('reconciles downstream layers without changing final terrain or water', () => {
    const config = createDefaultConfig('downstream-validation-seam', { width: 64, height: 32 });
    config.topologyResolution = 16;
    const project = generateProjectWithNativeStages(config);
    const topologyElevation = new Float32Array(project.primaryWorld.topologyLayers.elevation);
    const topologyWater = new Uint8Array(project.primaryWorld.topologyLayers.water);

    const result = reconcilePresentDayDownstream(project);

    expect(project.primaryWorld.topologyLayers.elevation).toEqual(topologyElevation);
    expect(project.primaryWorld.topologyLayers.water).toEqual(topologyWater);
    expect(result.projectedCellsRefreshed).toBe(64 * 32);
    expect(result.hydrology.landCellCount).toBeGreaterThan(0);
    expect(result.circulation.pressureSystems.resolution).toEqual({ width: 128, height: 64 });
    expect(Object.values(result.stageTimingsMs).every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
    expect(project.primaryWorld.layers.windX.some((value) => Math.abs(value) > 0)).toBe(true);
    expect(project.primaryWorld.layers.currentX.some((value) => Math.abs(value) > 0)).toBe(true);
  });

  it('supports an opt-in pressure-wind ordering diagnostic without changing terrain or water', () => {
    const config = createDefaultConfig('downstream-pressure-ordering-seam', { width: 64, height: 32 });
    config.topologyResolution = 16;
    const project = generateProjectWithNativeStages(config);
    const topologyElevation = new Float32Array(project.primaryWorld.topologyLayers.elevation);
    const topologyWater = new Uint8Array(project.primaryWorld.topologyLayers.water);

    const result = reconcilePresentDayDownstream(project, {
      circulationMoistureOrdering: 'pressure-wind-corrector',
      pressureWindBlend: 0.3,
    });

    expect(project.primaryWorld.topologyLayers.elevation).toEqual(topologyElevation);
    expect(project.primaryWorld.topologyLayers.water).toEqual(topologyWater);
    expect(result.stageTimingsMs['temperature-predictor']).toBeGreaterThanOrEqual(0);
    expect(result.stageTimingsMs['pressure-model']).toBeGreaterThanOrEqual(0);
    expect(result.circulation.pressureSystems.resolution).toEqual({ width: 128, height: 64 });
  });

  it('normalizes delivered river intensity without changing the constructed river network', () => {
    const config = createDefaultConfig('downstream-river-intensity-scale', { width: 64, height: 32 });
    config.topologyResolution = 16;
    const normalizedProject = generateProjectWithNativeStages(config);
    const legacyProject = generateProjectWithNativeStages(config);

    const normalized = reconcilePresentDayDownstream(normalizedProject);
    const legacy = reconcilePresentDayDownstream(legacyProject, {
      normalizeRiverIntensityByTopologyScale: false,
    });

    expect(normalized.hydrology.sourceCandidateCount).toBe(legacy.hydrology.sourceCandidateCount);
    expect(normalized.hydrology.acceptedRiverCount).toBe(legacy.hydrology.acceptedRiverCount);
    expect(normalizedProject.primaryWorld.rivers).toEqual(legacyProject.primaryWorld.rivers);
    expect(normalized.hydrology.topologyRiverCellShare).toBeLessThan(legacy.hydrology.topologyRiverCellShare);
  });

  it('carries lowland floodplain decisions through final raster circulation', () => {
    const config = createDefaultConfig('downstream-lowland-floodplain', { width: 64, height: 32 });
    config.topologyResolution = 16;
    const floodplainProject = generateProjectWithNativeStages(config);
    const legacyProject = generateProjectWithNativeStages(config);

    const floodplain = reconcilePresentDayDownstream(floodplainProject);
    reconcilePresentDayDownstream(legacyProject, { wetlandHydrologyModel: 'legacy' });
    const wetland = biomeToCode('wetland');
    const floodplainWetlands = floodplainProject.primaryWorld.layers.biomes
      .reduce((count, biome) => count + (biome === wetland ? 1 : 0), 0);
    const legacyWetlands = legacyProject.primaryWorld.layers.biomes
      .reduce((count, biome) => count + (biome === wetland ? 1 : 0), 0);

    expect(floodplainWetlands).not.toBe(legacyWetlands);
    expect(floodplain.consistency.biomeCorrections).toBeGreaterThanOrEqual(0);
  });
});
