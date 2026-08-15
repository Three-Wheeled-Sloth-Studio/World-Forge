import type { GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import { isWetlandTile } from './geographicAtlasPalette';

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

const SPRITE_CELL_WIDTH = 80;
const SPRITE_CELL_HEIGHT = 60;
const SPRITE_PATH = 'ttrpg-icons/ttrpg-map-icons.png';

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

export function ttrpgMapSymbolForTile(tile: GeographicTileWindowTile): TtrpgMapSymbolPlacement | null {
  if (tile.membershipRole !== 'parent' || tile.ice) return null;

  if (tile.water) {
    // Reefs are intentionally reserved in the sprite until the canonical tile contract
    // exposes reef facts. Generic aquatic/coastal water is not specific enough to assert one.
    return null;
  }

  // Keep canonical river paths unobstructed by large illustration tokens.
  if (tile.minorRiverEdges.length > 0 || tile.navigableRiverEdges.length > 0) return null;

  const forested = tile.featureDetails.includes('forest') || tile.featureDetails.includes('taiga');
  const rainforest = tile.featureDetails.includes('rainforest');
  if (tile.featureDetails.includes('volcano')) {
    return placement(tile, 'ttrpg.volcano', 2.45, 0.9, 100, -0.25);
  }

  if (tile.morphology === 'mountainous' && stableUnit(`${tile.id}:mountain-density`) < 0.27) {
    const variant = stableUnit(`${tile.id}:mountain-variant`);
    if (forested) {
      return placement(
        tile,
        variant < 0.48 ? 'ttrpg.mountain_chain_with_trees' : 'ttrpg.mountain_in_forest',
        variant < 0.48 ? 4.0 : 3.65,
        0.86,
        85,
        -0.18,
      );
    }
    if ((tile.ridgeEdges.length >= 3 || tile.elevation >= 0.62) && variant < 0.42) {
      return placement(tile, 'ttrpg.mountain_chain_large', 4.55, 0.86, 88, -0.18);
    }
    return placement(tile, 'ttrpg.mountain_chain', 3.85, 0.86, 84, -0.16);
  }

  if (isWetlandTile(tile) && stableUnit(`${tile.id}:swamp-density`) < 0.16) {
    return placement(tile, 'ttrpg.swamp', 2.9, 0.76, 64, -0.02);
  }

  if (rainforest && stableUnit(`${tile.id}:rainforest-density`) < 0.15) {
    return placement(tile, 'ttrpg.rainforest', 3.0, 0.78, 62, -0.08);
  }

  if (forested && stableUnit(`${tile.id}:forest-density`) < 0.13) {
    return placement(tile, 'ttrpg.forest_pine', 2.85, 0.76, 58, -0.1);
  }

  if (tile.morphology === 'rough' && stableUnit(`${tile.id}:hill-density`) < 0.18) {
    return placement(tile, 'ttrpg.hills', 3.25, 0.72, 46, -0.06);
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
  if (spriteImage || typeof Image === 'undefined' || typeof document === 'undefined') return;
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    spriteReady = true;
    for (const listener of spriteListeners) listener();
  };
  image.onerror = () => {
    spriteReady = false;
  };
  image.src = new URL(SPRITE_PATH, document.baseURI).href;
  spriteImage = image;
}

function stableUnit(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  return hash / 0xffffffff;
}
