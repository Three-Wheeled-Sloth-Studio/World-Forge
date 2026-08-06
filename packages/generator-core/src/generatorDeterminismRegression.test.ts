import { describe, expect, it } from 'vitest';
import {
  buildCubedSphereTopology,
  topologyResolutionForOutput,
  type CubedSphereTopology,
} from '@world-forge/shared';
import { createDefaultConfig, generateProject } from './index';
import { clearEquirectangularTopologyLookupCache } from './equirectangularTopologyLookup';

describe('generation determinism regression diagnostics', () => {
  it('keeps semantic output, caller config, and cached topology stable across repeated runs', () => {
    const config = createDefaultConfig('earthlike-default-001', { width: 256, height: 128 });
    const configBefore = JSON.stringify(config);
    const topologyResolution = config.topologyResolution
      ?? topologyResolutionForOutput(config.outputResolution);

    clearEquirectangularTopologyLookupCache();
    const first = generationSignature(generateProject(config));

    // Capture the topology only after the first generation. Pre-building it here used to
    // hide cold-versus-warm topology-cache differences from this regression test.
    const topology = buildCubedSphereTopology(topologyResolution);
    const topologyAfterFirst = topologySignature(topology);

    const second = generationSignature(generateProject(config));
    const topologyAfterSecond = topologySignature(topology);

    clearEquirectangularTopologyLookupCache();
    const third = generationSignature(generateProject(config));
    const topologyAfterThird = topologySignature(topology);

    expect(JSON.stringify(config), 'generateProject must not mutate caller-owned config').toBe(configBefore);
    expect(
      { topologyAfterSecond, topologyAfterThird },
      'generation must not mutate the shared cached cubed-sphere topology',
    ).toEqual({
      topologyAfterSecond: topologyAfterFirst,
      topologyAfterThird: topologyAfterFirst,
    });
    expect(second, 'warm-cache generation differs from the first run').toEqual(first);
    expect(third, 'cold projection-cache generation differs from the first run').toEqual(first);
  }, 45_000);
});

function generationSignature(project: ReturnType<typeof generateProject>) {
  return {
    seed: project.seed,
    selectedValues: hashJson(project.selectedValues),
    metrics: hashJson(project.metrics),
    climateDiagnostics: hashJson(project.primaryWorld.climate?.diagnostics ?? null),
    elevation: hashFloatLayer(project.primaryWorld.layers.elevation),
    topologyElevation: hashFloatLayer(project.primaryWorld.topologyLayers.elevation),
    biomes: hashIntegerLayer(project.primaryWorld.layers.biomes),
    topologyBiomes: hashIntegerLayer(project.primaryWorld.topologyLayers.biomes),
    rivers: hashJson(project.primaryWorld.rivers.map((river) => [
      river.sourceIndex,
      river.mouthIndex,
      river.terminus,
      river.path.length,
      river.topologyPath?.length ?? 0,
    ])),
  } as const;
}

function topologySignature(topology: CubedSphereTopology) {
  return {
    resolution: topology.resolution,
    cellCount: topology.cellCount,
    positions: hashFloatLayer(topology.positions),
    latitudes: hashFloatLayer(topology.latitudes),
    longitudes: hashFloatLayer(topology.longitudes),
    areaWeights: hashFloatLayer(topology.areaWeights),
    neighbors: hashIntegerLayer(topology.neighbors),
  } as const;
}

function hashJson(value: unknown): string {
  return hashText(JSON.stringify(value));
}

function hashFloatLayer(layer: Float32Array): string {
  let hash = 2166136261;
  for (const value of layer) {
    hash ^= Math.round(value * 100_000);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function hashIntegerLayer(layer: Uint8Array | Uint16Array | Int32Array): string {
  let hash = 2166136261;
  for (const value of layer) {
    hash ^= value;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
