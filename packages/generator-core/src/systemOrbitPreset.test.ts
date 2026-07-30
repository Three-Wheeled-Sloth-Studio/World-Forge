import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from './index';
import { applyDeepTimeFoundation } from './deepTimePipeline';
import { prepareSystemOrbitConfig, reconcileSystemOrbitPresets } from './systemOrbitPreset';
import { buildCubedSphereTopology, cubedSphereCellForLonLat, type GenerationConfig } from '@world-forge/shared';

type ExtendedGenerationConfig = GenerationConfig & {
  starPresetId?: 'sol-like' | 'habitable';
  worldPresetId?: string;
  seeds?: { star?: string; world?: string };
  randomWorldArchetype?: string;
};

function generate(config: ExtendedGenerationConfig) {
  const prepared = prepareSystemOrbitConfig(config) as ExtendedGenerationConfig;
  return reconcileSystemOrbitPresets(applyDeepTimeFoundation(generateProject(prepared)));
}

function mean(values: Float32Array): number {
  let total = 0;
  for (const value of values) total += value;
  return total / Math.max(1, values.length);
}

describe('preset-driven system and orbit reconciliation', () => {
  it('keeps the default Sol-like Earthlike year near an Earth baseline', () => {
    const config = createDefaultConfig('1001001', { width: 64, height: 32 }) as ExtendedGenerationConfig;
    config.topologyResolution = 16;
    config.starPresetId = 'sol-like';
    config.worldPresetId = 'Earthlike';
    config.seeds = { star: '1001001', world: '1001001' };
    const project = generate(config);
    expect(project.solarSystem.stellarModel.spectralClass.startsWith('G')).toBe(true);
    expect(project.primaryWorld.planetaryDynamics.orbitalPeriodDays).toBeGreaterThan(300);
    expect(project.primaryWorld.planetaryDynamics.orbitalPeriodDays).toBeLessThan(450);
  });

  it('uses the star seed and preset independently and propagates forcing downstream', () => {
    const base = createDefaultConfig('1001005', { width: 64, height: 32 }) as ExtendedGenerationConfig;
    base.topologyResolution = 16;
    base.worldPresetId = 'Earthlike';
    base.seeds = { star: '1001005', world: '1001005' };
    const sol = generate({ ...base, starPresetId: 'sol-like' });
    const friendly = generate({ ...base, starPresetId: 'habitable' });
    expect(sol.solarSystem.stellarModel.spectralClass).not.toBe(friendly.solarSystem.stellarModel.spectralClass);
    expect(sol.primaryWorld.planetaryDynamics.orbitalPeriodDays).not.toBe(friendly.primaryWorld.planetaryDynamics.orbitalPeriodDays);
    expect(mean(sol.primaryWorld.layers.temperature)).not.toBe(mean(friendly.primaryWorld.layers.temperature));
  });

  it('derives spectral subtype coherently from temperature', () => {
    const config = createDefaultConfig('1001005', { width: 64, height: 32 }) as ExtendedGenerationConfig;
    config.topologyResolution = 16;
    config.starPresetId = 'habitable';
    config.worldPresetId = 'Earthlike';
    config.seeds = { star: '1001005', world: '1001005' };
    const project = generate(config);
    const stellar = project.solarSystem.stellarModel;
    const subtype = Number(stellar.spectralClass.slice(1));
    expect(Number.isFinite(subtype)).toBe(true);
    if (stellar.spectralClass.startsWith('G') && stellar.effectiveTemperatureK > 5800) expect(subtype).toBeLessThanOrEqual(4);
  });

  it('gives Random World a broad envelope and a recorded archetype', () => {
    const config = createDefaultConfig('1001001', { width: 64, height: 32 }) as ExtendedGenerationConfig;
    config.topologyResolution = 16;
    config.starPresetId = 'sol-like';
    config.worldPresetId = 'Random World';
    config.seeds = { star: '1001001', world: '1001001' };
    const prepared = prepareSystemOrbitConfig(config) as ExtendedGenerationConfig;
    expect(prepared.parameterRanges.oceanPercentage.min).toBeLessThan(10);
    expect(prepared.parameterRanges.oceanPercentage.max).toBeGreaterThan(90);
    const project = generate(config);
    expect((project.config as ExtendedGenerationConfig).randomWorldArchetype).toBeTruthy();
  });

  it('is deterministic for the same presets and seeds', () => {
    const config = createDefaultConfig('7654321', { width: 64, height: 32 }) as ExtendedGenerationConfig;
    config.topologyResolution = 16;
    config.starPresetId = 'habitable';
    config.worldPresetId = 'Habitable World';
    config.seeds = { star: '1234567', world: '7654321' };
    const first = generate(config);
    const second = generate(config);
    expect(first.solarSystem.stellarModel).toEqual(second.solarSystem.stellarModel);
    expect(first.primaryWorld.planetaryDynamics).toEqual(second.primaryWorld.planetaryDynamics);
    expect(Array.from(first.primaryWorld.layers.temperature)).toEqual(Array.from(second.primaryWorld.layers.temperature));
  });

  it('keeps reconciled topology climate and ice authoritative through projection', () => {
    const config = createDefaultConfig('1001001', { width: 96, height: 48 }) as ExtendedGenerationConfig;
    config.topologyResolution = 16;
    config.starPresetId = 'sol-like';
    config.worldPresetId = 'Earthlike';
    config.seeds = { star: '1001001', world: '1001001' };
    const project = generate(config);
    const world = project.primaryWorld;
    const topology = buildCubedSphereTopology(world.topology.resolution);
    const { width, height } = world.mapModel.resolution;
    for (let y = 0; y < height; y += 1) {
      const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
      for (let x = 0; x < width; x += 1) {
        const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
        const cell = cubedSphereCellForLonLat(topology, longitude, latitude);
        const index = y * width + x;
        expect(world.layers.temperature[index]).toBe(world.topologyLayers.temperature[cell]);
        expect(world.layers.ice[index]).toBe(world.topologyLayers.ice[cell]);
        expect(world.layers.biomes[index]).toBe(world.topologyLayers.biomes[cell]);
      }
    }
  });
});
