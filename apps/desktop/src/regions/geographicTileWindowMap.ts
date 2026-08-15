import type { HexTileEdge } from '@world-forge/shared';
import type {
  GeographicTileWindow,
  GeographicTileWindowTile,
} from '@world-forge/shared/geographicTileWindow';
import {
  renderGeographicTileWindowToCanvas as renderBaseGeographicTileWindowToCanvas,
  visibleGeographicAtlasTileIds,
  type GeographicTileWindowCanvasTransform,
  type GeographicTileWindowRenderOptions,
} from './geographicTileWindowMapBase';
import {
  ttrpgMapIconSpriteEntry,
  ttrpgMapIconSpriteImage,
  ttrpgMapSymbolForTile,
  type TtrpgMapSymbolPlacement,
} from './ttrpgMapSymbols';

export * from './geographicTileWindowMapBase';

const SQRT_THREE = Math.sqrt(3);
const EDGE_ORDER: HexTileEdge[] = ['ne', 'e', 'se', 'sw', 'w', 'nw'];
const EDGE_VERTICES: Record<HexTileEdge, [number, number]> = {
  ne: [0, 1],
  e: [1, 2],
  se: [2, 3],
  sw: [3, 4],
  w: [4, 5],
  nw: [5, 0],
};

type TileGeometry = {
  tile: GeographicTileWindowTile;
  centerX: number;
  centerY: number;
  radius: number;
  vertices: Array<[number, number]>;
};

type DrawBounds = { left: number; top: number; right: number; bottom: number };

type SymbolCandidate = {
  entry: TileGeometry;
  placement: TtrpgMapSymbolPlacement;
  bounds: DrawBounds;
};

export function renderGeographicTileWindowToCanvas(
  canvas: HTMLCanvasElement,
  window: GeographicTileWindow,
  options: GeographicTileWindowRenderOptions,
): GeographicTileWindowCanvasTransform {
  const transform = renderBaseGeographicTileWindowToCanvas(canvas, window, options);
  if (options.presentation !== 'ttrpg') return transform;

  const context = canvas.getContext('2d');
  if (!context) return transform;
  const geometry = buildVisibleGeometry(window, canvas.width, canvas.height);
  const byCoordinate = new Map(window.tiles.map((tile) => [`${tile.q},${tile.r}`, tile]));

  drawTtrpgMapSymbols(context, geometry);
  redrawRidges(context, geometry);
  if (options.showHexes) drawStrongTtrpgHexes(context, geometry);
  redrawCoastlines(context, geometry, byCoordinate, window);
  redrawChildBoundaries(context, geometry, byCoordinate, window);
  redrawParentBoundary(context, geometry, byCoordinate, window);

  return transform;
}

function buildVisibleGeometry(window: GeographicTileWindow, width: number, height: number): TileGeometry[] {
  const horizontalFit = (width - 28) / (SQRT_THREE * (window.extent.columns + 0.5));
  const verticalFit = (height - 28) / (1.5 * Math.max(0, window.extent.rows - 1) + 2);
  const radius = Math.max(5, Math.min(horizontalFit, verticalFit));
  const hexWidth = SQRT_THREE * radius;
  const gridWidth = hexWidth * (window.extent.columns + 0.5);
  const gridHeight = radius * (1.5 * Math.max(0, window.extent.rows - 1) + 2);
  const originX = (width - gridWidth) / 2 + hexWidth / 2;
  const originY = (height - gridHeight) / 2 + radius;
  const visibleIds = visibleGeographicAtlasTileIds(window);

  return window.tiles
    .filter((tile) => visibleIds.has(tile.id))
    .map((tile) => {
      const column = mod(tile.q - window.extent.qMin, window.scale.worldColumns);
      const row = tile.r - window.extent.rMin;
      const centerX = originX + column * hexWidth + (tile.r % 2) * (hexWidth / 2);
      const centerY = originY + row * radius * 1.5;
      const vertices: Array<[number, number]> = [];
      for (let index = 0; index < 6; index += 1) {
        const angle = (-90 + index * 60) * Math.PI / 180;
        vertices.push([
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
        ]);
      }
      return { tile, centerX, centerY, radius, vertices };
    });
}

function drawTtrpgMapSymbols(context: CanvasRenderingContext2D, geometry: TileGeometry[]): void {
  const sprite = ttrpgMapIconSpriteImage();
  if (!sprite) return;

  const parentCount = geometry.filter((entry) => entry.tile.membershipRole === 'parent').length;
  const maximumSymbols = clampInteger(Math.round(parentCount / 24), 10, 48);
  const candidates: SymbolCandidate[] = [];

  for (const entry of geometry) {
    const placement = ttrpgMapSymbolForTile(entry.tile);
    if (!placement) continue;
    const flatToFlat = entry.radius * SQRT_THREE;
    const width = flatToFlat * placement.widthHexes;
    const height = width * 0.75;
    const centerY = entry.centerY + flatToFlat * placement.verticalOffsetHexes;
    candidates.push({
      entry,
      placement,
      bounds: {
        left: entry.centerX - width / 2,
        top: centerY - height / 2,
        right: entry.centerX + width / 2,
        bottom: centerY + height / 2,
      },
    });
  }

  candidates.sort((left, right) =>
    right.placement.priority - left.placement.priority
    || left.placement.tieBreaker - right.placement.tieBreaker
    || left.entry.tile.id.localeCompare(right.entry.tile.id));

  const occupied: DrawBounds[] = [];
  let drawn = 0;
  context.save();
  context.imageSmoothingEnabled = true;
  for (const candidate of candidates) {
    if (drawn >= maximumSymbols) break;
    const padded = expandRectangle(candidate.bounds, 2.5);
    if (occupied.some((bounds) => rectanglesOverlap(padded, bounds))) continue;
    const source = ttrpgMapIconSpriteEntry(candidate.placement.iconId);
    const { left, top, right, bottom } = candidate.bounds;
    context.globalAlpha = candidate.placement.opacity;
    context.drawImage(
      sprite,
      source.x,
      source.y,
      source.width,
      source.height,
      left,
      top,
      right - left,
      bottom - top,
    );
    occupied.push(padded);
    drawn += 1;
  }
  context.restore();
}

function redrawRidges(context: CanvasRenderingContext2D, geometry: TileGeometry[]): void {
  context.save();
  context.strokeStyle = 'rgba(79, 60, 39, 0.76)';
  context.lineWidth = 1.6;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const entry of geometry) {
    for (const edge of entry.tile.ridgeEdges) strokeEdge(context, entry.vertices, edge);
  }
  context.restore();
}

function drawStrongTtrpgHexes(context: CanvasRenderingContext2D, geometry: TileGeometry[]): void {
  context.save();
  context.strokeStyle = 'rgba(74, 58, 41, 0.4)';
  context.lineWidth = 0.9;
  for (const entry of geometry) {
    context.beginPath();
    tracePolygon(context, entry.vertices);
    context.stroke();
  }
  context.restore();
}

function redrawCoastlines(
  context: CanvasRenderingContext2D,
  geometry: TileGeometry[],
  byCoordinate: Map<string, GeographicTileWindowTile>,
  window: GeographicTileWindow,
): void {
  context.save();
  context.strokeStyle = 'rgba(68, 52, 35, 0.96)';
  context.lineWidth = 2.15;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const entry of geometry) {
    if (entry.tile.water) continue;
    for (const edge of EDGE_ORDER) {
      if (neighborFor(entry.tile, edge, byCoordinate, window)?.water) {
        strokeEdge(context, entry.vertices, edge);
      }
    }
  }
  context.restore();
}

function redrawChildBoundaries(
  context: CanvasRenderingContext2D,
  geometry: TileGeometry[],
  byCoordinate: Map<string, GeographicTileWindowTile>,
  window: GeographicTileWindow,
): void {
  context.save();
  context.strokeStyle = 'rgba(96, 72, 45, 0.62)';
  context.lineWidth = 1.15;
  context.lineJoin = 'round';
  for (const entry of geometry) {
    const childIndex = entry.tile.childIndex;
    if (entry.tile.membershipRole !== 'parent' || childIndex === null) continue;
    for (const edge of ['e', 'se', 'sw'] as HexTileEdge[]) {
      const neighbor = neighborFor(entry.tile, edge, byCoordinate, window);
      if (!neighbor || neighbor.membershipRole !== 'parent' || neighbor.childIndex === childIndex) continue;
      strokeEdge(context, entry.vertices, edge);
    }
  }
  context.restore();
}

function redrawParentBoundary(
  context: CanvasRenderingContext2D,
  geometry: TileGeometry[],
  byCoordinate: Map<string, GeographicTileWindowTile>,
  window: GeographicTileWindow,
): void {
  context.save();
  context.strokeStyle = 'rgba(62, 46, 31, 0.98)';
  context.lineWidth = 2.55;
  context.lineJoin = 'round';
  for (const entry of geometry) {
    if (entry.tile.membershipRole !== 'parent') continue;
    for (const edge of EDGE_ORDER) {
      const neighbor = neighborFor(entry.tile, edge, byCoordinate, window);
      if (neighbor?.membershipRole === 'parent') continue;
      strokeEdge(context, entry.vertices, edge);
    }
  }
  context.restore();
}

function neighborFor(
  tile: GeographicTileWindowTile,
  edge: HexTileEdge,
  byCoordinate: Map<string, GeographicTileWindowTile>,
  window: GeographicTileWindow,
): GeographicTileWindowTile | undefined {
  const odd = tile.r % 2 === 1;
  const offsets: Record<HexTileEdge, [number, number, number, number]> = {
    e: [1, 0, 1, 0],
    se: [0, 1, 1, 1],
    sw: [-1, 1, 0, 1],
    w: [-1, 0, -1, 0],
    nw: [-1, -1, 0, -1],
    ne: [0, -1, 1, -1],
  };
  const [dqEven, drEven, dqOdd, drOdd] = offsets[edge];
  const q = mod(tile.q + (odd ? dqOdd : dqEven), window.scale.worldColumns);
  const r = tile.r + (odd ? drOdd : drEven);
  return byCoordinate.get(`${q},${r}`);
}

function strokeEdge(
  context: CanvasRenderingContext2D,
  vertices: Array<[number, number]>,
  edge: HexTileEdge,
): void {
  const [left, right] = EDGE_VERTICES[edge];
  context.beginPath();
  context.moveTo(vertices[left][0], vertices[left][1]);
  context.lineTo(vertices[right][0], vertices[right][1]);
  context.stroke();
}

function tracePolygon(context: CanvasRenderingContext2D, vertices: Array<[number, number]>): void {
  vertices.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
}

function expandRectangle(bounds: DrawBounds, amount: number): DrawBounds {
  return {
    left: bounds.left - amount,
    top: bounds.top - amount,
    right: bounds.right + amount,
    bottom: bounds.bottom + amount,
  };
}

function rectanglesOverlap(left: DrawBounds, right: DrawBounds): boolean {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}
