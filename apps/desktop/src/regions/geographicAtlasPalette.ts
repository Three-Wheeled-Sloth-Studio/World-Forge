import type { GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';

export const GEOGRAPHIC_ATLAS_NATURAL_PALETTE = {
  ice: '#e1e8df',
  openWater: '#1f5571',
  coastalWater: '#2f7893',
  tundra: '#b6b79a',
  desert: '#c9a565',
  tropical: '#3f7b45',
  grassland: '#7f964d',
  plains: '#a79a55',
  wetland: '#718252',
  otherLand: '#687a50',
} as const;

export const GEOGRAPHIC_ATLAS_TTRPG_PALETTE = {
  paper: '#d8c59b',
  ice: '#e8e1cf',
  openWater: '#76969a',
  coastalWater: '#91aa9f',
  tundra: '#c9c3a5',
  desert: '#d4b97f',
  tropical: '#9fa76d',
  grassland: '#b6ae73',
  plains: '#c4b47d',
  wetland: '#9d9e70',
  otherLand: '#b0a474',
  ink: '#4a3a29',
  waterInk: '#4f6c70',
} as const;

export function geographicAtlasNaturalBaseColor(tile: GeographicTileWindowTile): string {
  if (tile.ice) return GEOGRAPHIC_ATLAS_NATURAL_PALETTE.ice;
  if (tile.water) {
    return tile.morphology === 'coastal' || tile.morphology === 'lake'
      ? GEOGRAPHIC_ATLAS_NATURAL_PALETTE.coastalWater
      : GEOGRAPHIC_ATLAS_NATURAL_PALETTE.openWater;
  }
  if (isWetlandTile(tile)) return GEOGRAPHIC_ATLAS_NATURAL_PALETTE.wetland;
  switch (tile.biome) {
    case 'tundra': return GEOGRAPHIC_ATLAS_NATURAL_PALETTE.tundra;
    case 'desert': return GEOGRAPHIC_ATLAS_NATURAL_PALETTE.desert;
    case 'tropical': return GEOGRAPHIC_ATLAS_NATURAL_PALETTE.tropical;
    case 'grassland': return GEOGRAPHIC_ATLAS_NATURAL_PALETTE.grassland;
    case 'plains': return GEOGRAPHIC_ATLAS_NATURAL_PALETTE.plains;
    default: return GEOGRAPHIC_ATLAS_NATURAL_PALETTE.otherLand;
  }
}

export function geographicAtlasTtrpgBaseColor(tile: GeographicTileWindowTile): string {
  if (tile.ice) return GEOGRAPHIC_ATLAS_TTRPG_PALETTE.ice;
  if (tile.water) {
    return tile.morphology === 'coastal' || tile.morphology === 'lake'
      ? GEOGRAPHIC_ATLAS_TTRPG_PALETTE.coastalWater
      : GEOGRAPHIC_ATLAS_TTRPG_PALETTE.openWater;
  }
  if (isWetlandTile(tile)) return GEOGRAPHIC_ATLAS_TTRPG_PALETTE.wetland;
  switch (tile.biome) {
    case 'tundra': return GEOGRAPHIC_ATLAS_TTRPG_PALETTE.tundra;
    case 'desert': return GEOGRAPHIC_ATLAS_TTRPG_PALETTE.desert;
    case 'tropical': return GEOGRAPHIC_ATLAS_TTRPG_PALETTE.tropical;
    case 'grassland': return GEOGRAPHIC_ATLAS_TTRPG_PALETTE.grassland;
    case 'plains': return GEOGRAPHIC_ATLAS_TTRPG_PALETTE.plains;
    default: return GEOGRAPHIC_ATLAS_TTRPG_PALETTE.otherLand;
  }
}

export function isWetlandTile(tile: GeographicTileWindowTile): boolean {
  return tile.riverTerminus === 'wetland'
    || tile.features.includes('wet')
    || tile.featureDetails.some((detail) => detail === 'bog' || detail === 'marsh' || detail === 'mangrove');
}
