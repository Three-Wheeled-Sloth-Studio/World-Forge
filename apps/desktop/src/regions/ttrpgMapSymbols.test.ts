import { describe, expect, it } from 'vitest';
import type { GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import {
  TTRPG_MAP_ICON_SPRITE,
  shouldDrawTtrpgHierarchyLabel,
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

function firstPlacement(overrides: Partial<GeographicTileWindowTile>) {
  for (let index = 0; index < 500; index += 1) {
    const result = ttrpgMapSymbolForTile(tile({ id: `candidate-${index}`, ...overrides }));
    if (result) return result;
  }
  return null;
}

describe('TTRPG map symbol presentation', () => {
  it('keeps a semantic sprite manifest for terrain and reserved map furniture', () => {
    expect(Object.keys(TTRPG_MAP_ICON_SPRITE)).toHaveLength(15);
    expect(TTRPG_MAP_ICON_SPRITE['ttrpg.mountain_chain']).toEqual({ x: 0, y: 0, width: 80, height: 60 });
    expect(TTRPG_MAP_ICON_SPRITE['ttrpg.compass_rose']).toEqual({ x: 160, y: 180, width: 80, height: 60 });
  });

  it('is deterministic and uses mountain-family symbols only for mountainous land', () => {
    const mountainous = tile({ id: 'deterministic-mountain', morphology: 'mountainous', ridgeEdges: ['e', 'se', 'sw'], elevation: 0.72 });
    expect(ttrpgMapSymbolForTile(mountainous)).toEqual(ttrpgMapSymbolForTile(mountainous));

    const placement = firstPlacement({ morphology: 'mountainous', ridgeEdges: ['e', 'se'], elevation: 0.55 });
    expect(placement).not.toBeNull();
    expect(placement!.iconId.startsWith('ttrpg.mountain_')).toBe(true);
  });

  it('uses explicit forest, rainforest, wetland, and volcano facts without changing geography', () => {
    expect(firstPlacement({ featureDetails: ['forest'] })?.iconId).toBe('ttrpg.forest_pine');
    expect(firstPlacement({ featureDetails: ['rainforest'] })?.iconId).toBe('ttrpg.rainforest');
    expect(firstPlacement({ features: ['wet'], featureDetails: ['marsh'], riverTerminus: 'wetland' })?.iconId).toBe('ttrpg.swamp');
    expect(ttrpgMapSymbolForTile(tile({ featureDetails: ['volcano'], volcanism: 0.9 }))?.iconId).toBe('ttrpg.volcano');
  });

  it('does not infer reefs from generic water facts or decorate ordinary flat land', () => {
    expect(ttrpgMapSymbolForTile(tile({ biome: 'marine', morphology: 'coastal', featureDetails: ['aquatic'], water: true }))).toBeNull();
    expect(ttrpgMapSymbolForTile(tile())).toBeNull();
  });

  it('suppresses generated numeric hierarchy labels but preserves meaningful names', () => {
    expect(shouldDrawTtrpgHierarchyLabel('Region 138')).toBe(false);
    expect(shouldDrawTtrpgHierarchyLabel('Local 4')).toBe(false);
    expect(shouldDrawTtrpgHierarchyLabel('Silver Coast')).toBe(true);
    expect(shouldDrawTtrpgHierarchyLabel('The Ashen Hills')).toBe(true);
  });
});
