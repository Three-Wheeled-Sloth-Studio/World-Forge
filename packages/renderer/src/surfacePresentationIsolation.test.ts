import { describe, expect, it } from 'vitest';
import { biomeToCode, codeToBiome, type WorldProject } from '@world-forge/shared';
import { projectForSurfacePresentation } from './index';

describe('surface presentation isolation', () => {
  it('detaches presentation ice and biome layers from a clean source project', () => {
    const project = fixture();
    const presentation = projectForSurfacePresentation(project);

    expect(presentation).not.toBe(project);
    expect(presentation.primaryWorld.layers.ice).not.toBe(project.primaryWorld.layers.ice);
    expect(presentation.primaryWorld.layers.biomes).not.toBe(project.primaryWorld.layers.biomes);

    project.primaryWorld.layers.ice[0] = 1;
    project.primaryWorld.layers.biomes[0] = biomeToCode('ocean');

    expect(presentation.primaryWorld.layers.ice[0]).toBe(0);
    expect(codeToBiome(presentation.primaryWorld.layers.biomes[0])).toBe('grassland');
  });

  it('recomputes current canonical surface facts instead of returning a cached alias', () => {
    const project = fixture();
    const first = projectForSurfacePresentation(project);

    project.primaryWorld.layers.water[0] = 0;
    project.primaryWorld.layers.biomes[0] = biomeToCode('ocean');
    const second = projectForSurfacePresentation(project);

    expect(second).not.toBe(first);
    expect(codeToBiome(first.primaryWorld.layers.biomes[0])).toBe('grassland');
    expect(codeToBiome(second.primaryWorld.layers.biomes[0])).not.toBe('ocean');
  });
});

function fixture(): WorldProject {
  const mapCellCount = 8;
  const topologyCellCount = 24;
  return {
    config: { biomeRules: undefined },
    primaryWorld: {
      seaLevel: 0,
      mapModel: { resolution: { width: 4, height: 2 } },
      topology: { resolution: 2 },
      topologyLayers: {
        elevation: new Float32Array(topologyCellCount).fill(0.2),
        water: new Uint8Array(topologyCellCount),
        temperature: new Float32Array(topologyCellCount).fill(18),
        ice: new Uint8Array(topologyCellCount),
      },
      layers: {
        elevation: new Float32Array(mapCellCount).fill(0.2),
        water: new Uint8Array(mapCellCount),
        ice: new Uint8Array(mapCellCount),
        biomes: new Uint8Array(mapCellCount).fill(biomeToCode('grassland')),
        temperature: new Float32Array(mapCellCount).fill(18),
        wetness: new Float32Array(mapCellCount).fill(0.4),
        river: new Float32Array(mapCellCount),
        lakes: new Uint8Array(mapCellCount),
      },
    },
  } as unknown as WorldProject;
}
