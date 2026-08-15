import { describe, expect, it } from 'vitest';
import type { GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import {
  TTRPG_MAP_ICON_SPRITE,
  TTRPG_MAP_ICON_SPRITE_URL,
  shouldDrawTtrpgHierarchyLabel,
  ttrpgMapReliefContextForTiles,
  ttrpgMapSymbolForTile,
} from './ttrpgMapSymbols';

function tile(overrides: Partial<GeographicTileWindowTile> = {}): GeographicTileWindowTile {
  return {
    id: 'symbol-test',
    q: 0,
    r: 0,
    longitude: 0,
    latitude: 0,
    topologyCell: 0,
    membershipRole: 'parent',
    childIndex: 0,
    plateId: 0,
    biome: 'grassland',
    morphology: 'flat',
    terrainType: 'Grassland',
    features: [],
    featureDetails: [],
    minorRiverEdges: [],
    navigableRiverEdges: [],
    riverMouthEdges: [],
    ridgeEdges: [],
    navigableRiverCenter: false,
    riverSource: false,
    riverTerminus: null,
    riverStrength: 0,
    elevation: 0.2,
    slope: 0.1,
    temperatureC: 18,
    wetness: 0.5,
    volcanism: 0,
    water: false,
    ice: false,
    ...overrides,
  };
}

describe('TTRPG map symbol presentation', () => {
  it('keeps a bundled semantic sprite manifest for terrain and reserved map furniture', () => {
    expect(TTRPG_MAP_ICON_SPRITE_URL.length).toBeGreaterThan(0);
    expect(Object.keys(TTRPG_MAP_ICON_SPRITE)).toHaveLength(15);
    expect(TTRPG_MAP_ICON_SPRITE['ttrpg.mountain_chain']).toEqual({ x: 0, y: 0, width: 80, height: 60 });
    expect(TTRPG_MAP_ICON_SPRITE['ttrpg.compass_rose']).toEqual({ x: 160, y: 180, width: 80, height: 60 });
  });

  it('is deterministic and uses mountain-family symbols for canonical mountainous land', () => {
    const mountainous = tile({ id: 'deterministic-mountain', morphology: 'mountainous', ridgeEdges: ['e', 'se', 'sw'], elevation: 0.72 });
    expect(ttrpgMapSymbolForTile(mountainous)).toEqual(ttrpgMapSymbolForTile(mountainous));
    expect(ttrpgMapSymbolForTile(mountainous)?.iconId.startsWith('ttrpg.mountain_')).toBe(true);
  });

  it('uses visible-window canonical relief when macro-scale center samples are not explicitly mountainous', () => {
    const tiles = [
      tile({ id: 'low-a', elevation: 0.12, slope: 0.02 }),
      tile({ id: 'low-b', elevation: 0.18, slope: 0.03 }),
      tile({ id: 'mid-a', elevation: 0.28, slope: 0.05 }),
      tile({ id: 'mid-b', elevation: 0.36, slope: 0.08 }),
      tile({ id: 'high-a', elevation: 0.52, slope: 0.14 }),
      tile({ id: 'high-b', elevation: 0.68, slope: 0.24 }),
    ];
    const relief = ttrpgMapReliefContextForTiles(tiles);
    const placement = ttrpgMapSymbolForTile(tiles[5], relief);

    expect(relief.mountainElevationFloor).toBeLessThanOrEqual(tiles[5].elevation);
    expect(placement).not.toBeNull();
    expect(placement!.iconId.startsWith('ttrpg.mountain_')).toBe(true);
  });

  it('uses explicit forest, rainforest, wetland, and volcano facts without changing geography', () => {
    expect(ttrpgMapSymbolForTile(tile({ featureDetails: ['forest'] }))?.iconId).toBe('ttrpg.forest_pine');
    expect(ttrpgMapSymbolForTile(tile({ featureDetails: ['rainforest'] }))?.iconId).toBe('ttrpg.rainforest');
    expect(ttrpgMapSymbolForTile(tile({ features: ['wet'], featureDetails: ['marsh'], riverTerminus: 'wetland' }))?.iconId).toBe('ttrpg.swamp');
    expect(ttrpgMapSymbolForTile(tile({ featureDetails: ['volcano'], volcanism: 0.9 }))?.iconId).toBe('ttrpg.volcano');
  });

  it('does not infer reefs from generic water facts or decorate ordinary flat low-relief land', () => {
    expect(ttrpgMapSymbolForTile(tile({ biome: 'marine', morphology: 'coastal', featureDetails: ['aquatic'], water: true }))).toBeNull();
    const flat = [
      tile({ id: 'flat-a', elevation: 0.2, slope: 0.01 }),
      tile({ id: 'flat-b', elevation: 0.21, slope: 0.015 }),
      tile({ id: 'flat-c', elevation: 0.22, slope: 0.02 }),
    ];
    const relief = ttrpgMapReliefContextForTiles(flat);
    expect(ttrpgMapSymbolForTile(flat[2], relief)).toBeNull();
  });

  it('suppresses generated numeric hierarchy labels but preserves meaningful names', () => {
    expect(shouldDrawTtrpgHierarchyLabel('Region 138')).toBe(false);
    expect(shouldDrawTtrpgHierarchyLabel('Local 4')).toBe(false);
    expect(shouldDrawTtrpgHierarchyLabel('Silver Coast')).toBe(true);
    expect(shouldDrawTtrpgHierarchyLabel('The Ashen Hills')).toBe(true);
  });
});
