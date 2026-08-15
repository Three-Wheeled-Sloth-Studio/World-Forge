import type { GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import { isWetlandTile } from './geographicAtlasPalette';
import spriteUrl from './assets/ttrpg-map-icons.png?url';

export type TtrpgMapIconId =
  | 'ttrpg.mountain_chain'
  | 'ttrpg.mountain_chain_large'
  | 'ttrpg.mountain_chain_with_trees'
  | 'ttrpg.mountain_in_forest'
  | 'ttrpg.hills'
  | 'ttrpg.forest_pine'
  | 'ttrpg.rainforest'
  | 'ttrpg.swamp'
  | 'ttrpg.reefs'
  | 'ttrpg.reef_cluster'
  | 'ttrpg.volcano'
  | 'ttrpg.castle'
  | 'ttrpg.tower'
  | 'ttrpg.village_walled'
  | 'ttrpg.compass_rose';

type SpriteEntry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TtrpgMapSymbolPlacement = {
  iconId: TtrpgMapIconId;
  widthHexes: number;
  opacity: number;
  priority: number;
  verticalOffsetHexes: number;
  tieBreaker: number;
};

export type TtrpgMapReliefContext = {
  hillElevationFloor: number;
  mountainElevationFloor: number;
  hillSlopeFloor: number;
  mountainSlopeFloor: number;
};

const SPRITE_CELL_WIDTH = 80;
const SPRITE_CELL_HEIGHT = 60;

export const TTRPG_MAP_ICON_SPRITE_URL = spriteUrl;

export const TTRPG_MAP_ICON_SPRITE: Readonly<Record<TtrpgMapIconId, SpriteEntry>> = {
  'ttrpg.mountain_chain': spriteCell(0, 0),
  'ttrpg.mountain_chain_large': spriteCell(1, 0),
  'ttrpg.mountain_chain_with_trees': spriteCell(2, 0),
  'ttrpg.mountain_in_forest': spriteCell(3, 0),
  'ttrpg.hills': spriteCell(0, 1),
  'ttrpg.forest_pine': spriteCell(1, 1),
  'ttrpg.rainforest': spriteCell(2, 1),
  'ttrpg.swamp': spriteCell(3, 1),
  'ttrpg.reefs': spriteCell(0, 2),
  'ttrpg.reef_cluster': spriteCell(1, 2),
  'ttrpg.volcano': spriteCell(2, 2),
  'ttrpg.castle': spriteCell(3, 2),
  'ttrpg.tower': spriteCell(0, 3),
  'ttrpg.village_walled': spriteCell(1, 3),
  'ttrpg.compass_rose': spriteCell(2, 3),
};

let spriteImage: HTMLImageElement | null = null;
let spriteReady = false;
const spriteListeners = new Set<() => void>();

export function preloadTtrpgMapIconSprite(): void {
  ensureSpriteImage();
}

export function subscribeTtrpgMapIconSprite(listener: () => void): () => void {
  spriteListeners.add(listener);
  ensureSpriteImage();
  return () => spriteListeners.delete(listener);
}

export function ttrpgMapIconSpriteImage(): HTMLImageElement | null {
  ensureSpriteImage();
  return spriteReady ? spriteImage : null;
}

export function ttrpgMapIconSpriteEntry(iconId: TtrpgMapIconId): SpriteEntry {
  return TTRPG_MAP_ICON_SPRITE[iconId];
}

export function shouldDrawTtrpgHierarchyLabel(label: string): boolean {
  return !/^(Region|Subregion|Local|Detail)\s+\d+$/i.test(label.trim());
}

export function ttrpgMapReliefContextForTiles(tiles: GeographicTileWindowTile[]): TtrpgMapReliefContext {
  const land = tiles.filter((tile) => tile.membershipRole === 'parent' && !tile.water && !tile.ice);
  if (land.length === 0) {
    return {
      hillElevationFloor: Number.POSITIVE_INFINITY,
      mountainElevationFloor: Number.POSITIVE_INFINITY,
      hillSlopeFloor: 0.08,
      mountainSlopeFloor: 0.16,
    };
  }

  const elevations = land.map((tile) => tile.elevation).sort((left, right) => left - right);
  const slopes = land.map((tile) => tile.slope).sort((left, right) => left - right);
  const elevationSpread = percentile(elevations, 0.9) - percentile(elevations, 0.2);

  return {
    hillElevationFloor: elevationSpread >= 0.06 ? percentile(elevations, 0.68) : Number.POSITIVE_INFINITY,
    mountainElevationFloor: elevationSpread >= 0.12 ? percentile(elevations, 0.86) : Number.POSITIVE_INFINITY,
    hillSlopeFloor: Math.max(0.08, percentile(slopes, 0.68)),
    mountainSlopeFloor: Math.max(0.16, percentile(slopes, 0.86)),
  };
}

export function ttrpgMapSymbolForTile(
  tile: GeographicTileWindowTile,
  relief?: TtrpgMapReliefContext,
): TtrpgMapSymbolPlacement | null {
  if (tile.membershipRole !== 'parent' || tile.ice) return null;

  if (tile.water) {
    // Reefs remain reserved until the canonical tile contract exposes reef facts.
    return null;
  }

  // Keep canonical river paths unobstructed by large illustration tokens.
  if (tile.minorRiverEdges.length > 0 || tile.navigableRiverEdges.length > 0) return null;

  const forested = tile.featureDetails.includes('forest') || tile.featureDetails.includes('taiga');
  const rainforest = tile.featureDetails.includes('rainforest');
  if (tile.featureDetails.includes('volcano')) {
    return placement(tile, 'ttrpg.volcano', 2.45, 0.9, 100, -0.25);
  }

  const mountainLike = tile.morphology === 'mountainous'
    || tile.ridgeEdges.length >= 2
    || Boolean(relief && (
      tile.slope >= relief.mountainSlopeFloor
      || (tile.elevation >= relief.mountainElevationFloor && tile.slope >= Math.max(0.055, relief.hillSlopeFloor * 0.7))
    ));
  if (mountainLike) {
    const variant = stableUnit(`${tile.id}:mountain-variant`);
    if (forested) {
      return placement(
        tile,
        variant < 0.48 ? 'ttrpg.mountain_chain_with_trees' : 'ttrpg.mountain_in_forest',
        variant < 0.48 ? 4.0 : 3.65,
        0.88,
        85,
        -0.18,
      );
    }
    if ((tile.ridgeEdges.length >= 3 || Boolean(relief && tile.elevation >= relief.mountainElevationFloor)) && variant < 0.42) {
      return placement(tile, 'ttrpg.mountain_chain_large', 4.55, 0.88, 88, -0.18);
    }
    return placement(tile, 'ttrpg.mountain_chain', 3.85, 0.88, 84, -0.16);
  }

  if (isWetlandTile(tile)) {
    return placement(tile, 'ttrpg.swamp', 2.9, 0.78, 64, -0.02);
  }

  if (rainforest) {
    return placement(tile, 'ttrpg.rainforest', 3.0, 0.8, 62, -0.08);
  }

  if (forested) {
    return placement(tile, 'ttrpg.forest_pine', 2.85, 0.78, 58, -0.1);
  }

  const hillLike = tile.morphology === 'rough'
    || tile.ridgeEdges.length > 0
    || Boolean(relief && (
      tile.slope >= relief.hillSlopeFloor
      || (tile.elevation >= relief.hillElevationFloor && tile.slope >= 0.045)
    ));
  if (hillLike) {
    return placement(tile, 'ttrpg.hills', 3.25, 0.76, 46, -0.06);
  }

  return null;
}

function placement(
  tile: GeographicTileWindowTile,
  iconId: TtrpgMapIconId,
  widthHexes: number,
  opacity: number,
  priority: number,
  verticalOffsetHexes: number,
): TtrpgMapSymbolPlacement {
  return {
    iconId,
    widthHexes,
    opacity,
    priority,
    verticalOffsetHexes,
    tieBreaker: stableUnit(`${tile.id}:${iconId}:order`),
  };
}

function spriteCell(column: number, row: number): SpriteEntry {
  return {
    x: column * SPRITE_CELL_WIDTH,
    y: row * SPRITE_CELL_HEIGHT,
    width: SPRITE_CELL_WIDTH,
    height: SPRITE_CELL_HEIGHT,
  };
}

function ensureSpriteImage(): void {
  if (spriteImage || typeof Image === 'undefined') return;
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    spriteReady = true;
    for (const listener of spriteListeners) listener();
  };
  image.onerror = () => {
    spriteReady = false;
    for (const listener of spriteListeners) listener();
  };
  image.src = TTRPG_MAP_ICON_SPRITE_URL;
  spriteImage = image;
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction)));
  return sorted[index];
}

function stableUnit(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  return hash / 0xffffffff;
}
