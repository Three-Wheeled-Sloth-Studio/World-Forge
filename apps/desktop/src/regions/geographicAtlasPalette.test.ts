import { describe, expect, it } from 'vitest';
import type { GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import {
  GEOGRAPHIC_ATLAS_NATURAL_PALETTE,
  GEOGRAPHIC_ATLAS_TTRPG_PALETTE,
  geographicAtlasNaturalBaseColor,
  geographicAtlasTtrpgBaseColor,
  isWetlandTile,
} from './geographicAtlasPalette';

function tile(overrides: Partial<GeographicTileWindowTile> = {}): GeographicTileWindowTile {
  return {
    id: 'palette-test',
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
    elevation: 0.04,
    slope: 0,
    temperatureC: 18,
    wetness: 0.5,
    volcanism: 0,
    water: false,
    ice: false,
    ...overrides,
  };
}

describe('geographic atlas palettes', () => {
  it('keeps lowland land on an earthy palette distinct from open and coastal water', () => {
    const lowland = geographicAtlasNaturalBaseColor(tile());
    const openWater = geographicAtlasNaturalBaseColor(tile({ biome: 'marine', morphology: 'ocean', water: true }));
    const coastalWater = geographicAtlasNaturalBaseColor(tile({ biome: 'marine', morphology: 'coastal', water: true }));

    expect(lowland).toBe(GEOGRAPHIC_ATLAS_NATURAL_PALETTE.grassland);
    expect(openWater).toBe(GEOGRAPHIC_ATLAS_NATURAL_PALETTE.openWater);
    expect(coastalWater).toBe(GEOGRAPHIC_ATLAS_NATURAL_PALETTE.coastalWater);
    expect(new Set([lowland, openWater, coastalWater]).size).toBe(3);
  });

  it('treats explicit wetland facts as land instead of collapsing them into water', () => {
    const wetland = tile({
      biome: 'plains',
      features: ['wet'],
      featureDetails: ['marsh'],
      riverTerminus: 'wetland',
    });

    expect(isWetlandTile(wetland)).toBe(true);
    expect(wetland.water).toBe(false);
    expect(geographicAtlasNaturalBaseColor(wetland)).toBe(GEOGRAPHIC_ATLAS_NATURAL_PALETTE.wetland);
    expect(geographicAtlasNaturalBaseColor(wetland)).not.toBe(GEOGRAPHIC_ATLAS_NATURAL_PALETTE.coastalWater);
  });

  it('provides a restrained parchment palette without changing tile classification', () => {
    const land = tile({ biome: 'plains' });
    const water = tile({ biome: 'marine', morphology: 'coastal', water: true });

    expect(geographicAtlasTtrpgBaseColor(land)).toBe(GEOGRAPHIC_ATLAS_TTRPG_PALETTE.plains);
    expect(geographicAtlasTtrpgBaseColor(water)).toBe(GEOGRAPHIC_ATLAS_TTRPG_PALETTE.coastalWater);
    expect(land.water).toBe(false);
    expect(water.water).toBe(true);
  });
});
