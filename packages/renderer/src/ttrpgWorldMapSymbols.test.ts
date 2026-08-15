import { describe, expect, it } from 'vitest';
import { biomeToCode } from '@world-forge/shared';
import {
  ttrpgWorldMapSymbolPlacements,
  type TtrpgWorldMapSymbolWorld,
} from './ttrpgWorldMapSymbols';

function symbolWorld(): TtrpgWorldMapSymbolWorld {
  const width = 96;
  const height = 48;
  const count = width * height;
  const water = new Uint8Array(count);
  const ice = new Uint8Array(count);
  const lakes = new Uint8Array(count);
  const biomes = new Uint8Array(count);
  const elevation = new Float32Array(count);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (y > 41) {
        water[index] = 1;
        biomes[index] = biomeToCode('ocean');
        elevation[index] = -0.2;
        continue;
      }
      if (x < 24) {
        biomes[index] = biomeToCode('mountain');
        elevation[index] = 0.72 + y * 0.002;
      } else if (x < 48) {
        biomes[index] = biomeToCode('forest');
        elevation[index] = 0.34 + y * 0.001;
      } else if (x < 72) {
        biomes[index] = biomeToCode('rainforest');
        elevation[index] = 0.27 + y * 0.001;
      } else {
        biomes[index] = biomeToCode('wetland');
        elevation[index] = 0.18 + y * 0.001;
      }
    }
  }
  lakes[20 * width + 80] = 1;
  ice[4 * width + 4] = 1;

  return {
    mapModel: {
      resolution: { width, height },
      projection: 'equirectangular',
      wrapMode: 'east-west',
    },
    seaLevel: 0,
    layers: { water, ice, lakes, biomes, elevation },
    rivers: [],
  };
}

describe('top-level TTRPG world map symbols', () => {
  it('places deterministic semantic terrain symbols from canonical world facts', () => {
    const world = symbolWorld();
    const first = ttrpgWorldMapSymbolPlacements(world, 1024, 512);
    const second = ttrpgWorldMapSymbolPlacements(world, 1024, 512);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(20);
    expect(first.length).toBeLessThanOrEqual(78);
    expect(new Set(first.map((placement) => placement.kind))).toEqual(
      new Set(['mountain', 'forest', 'rainforest', 'swamp']),
    );
  });

  it('never decorates canonical ocean, ice, or lake cells', () => {
    const world = symbolWorld();
    const placements = ttrpgWorldMapSymbolPlacements(world, 1024, 512);
    for (const placement of placements) {
      expect(world.layers.water[placement.sourceIndex]).toBe(0);
      expect(world.layers.ice[placement.sourceIndex]).toBe(0);
      expect(world.layers.lakes[placement.sourceIndex]).toBe(0);
    }
  });
});
