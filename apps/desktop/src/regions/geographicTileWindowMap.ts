import type { HexTileEdge } from '@world-forge/shared';
import type {
  GeographicTileWindow,
  GeographicTileWindowTile,
} from '@world-forge/shared/geographicTileWindow';
import {
  createGeographicWindowTransform,
  type GeographicWindowTransform,
} from './geographicWindowedMap';

export type GeographicTileWindowPresentation = 'natural' | 'terrain';

export type GeographicTileWindowRenderOptions = {
  presentation: GeographicTileWindowPresentation;
  showHexes: boolean;
  selectedChildIndex?: number | null;
};

type TileGeometry = {
  tile: GeographicTileWindowTile;
  centerX: number;
  centerY: number;
  vertices: Array<[number, number]>;
};

const SQRT_THREE = Math.sqrt(3);
const EDGE_VERTICES: Record<HexTileEdge, [number, number]> = {
  ne: [0, 1],
  e: [1, 2],
  se: [2, 3],
  sw: [3, 4],
  w: [4, 5],
  nw: [5, 0],
};

export function renderGeographicTileWindowToCanvas(
  canvas: HTMLCanvasElement,
  window: GeographicTileWindow,
  options: GeographicTileWindowRenderOptions,
): GeographicWindowTransform {
  const width = clampInteger(window.extent.columns * 48, 840, 1500);
  const height = clampInteger(window.extent.rows * 42, 560, 1000);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to acquire geographic tile-window canvas context.');

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#071019';
  context.fillRect(0, 0, width, height);

  const layout = createLayout(window, width, height);
  const byCoordinate = new Map(window.tiles.map((tile) => [`${tile.q},${tile.r}`, tile]));
  const geometry = window.tiles.map((tile) => tileGeometry(tile, window, layout));

  for (const entry of geometry) drawTileFill(context, entry, options);
  drawContextVeil(context, geometry);
  drawChildBoundaries(context, geometry, byCoordinate, window);
  drawParentBoundary(context, geometry, byCoordinate, window);
  drawTerrainEdges(context, geometry);
  if (options.showHexes) drawHexLines(context, geometry);

  return createGeographicWindowTransform(width, height, window.extent, window.scale);
}

function createLayout(window: GeographicTileWindow, width: number, height: number) {
  const horizontalFit = (width - 28) / (SQRT_THREE * (window.extent.columns + 0.5));
  const verticalFit = (height - 28) / (1.5 * Math.max(0, window.extent.rows - 1) + 2);
  const radius = Math.max(5, Math.min(horizontalFit, verticalFit));
  const hexWidth = SQRT_THREE * radius;
  const gridWidth = hexWidth * (window.extent.columns + 0.5);
  const gridHeight = radius * (1.5 * Math.max(0, window.extent.rows - 1) + 2);
  return {
    radius,
    hexWidth,
    originX: (width - gridWidth) / 2 + hexWidth / 2,
    originY: (height - gridHeight) / 2 + radius,
  };
}

function tileGeometry(
  tile: GeographicTileWindowTile,
  window: GeographicTileWindow,
  layout: ReturnType<typeof createLayout>,
): TileGeometry {
  const column = mod(tile.q - window.extent.qMin, window.scale.worldColumns);
  const row = tile.r - window.extent.rMin;
  const centerX = layout.originX + column * layout.hexWidth + (tile.r % 2) * (layout.hexWidth / 2);
  const centerY = layout.originY + row * layout.radius * 1.5;
  const vertices: Array<[number, number]> = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (-90 + index * 60) * Math.PI / 180;
    vertices.push([
      centerX + Math.cos(angle) * layout.radius,
      centerY + Math.sin(angle) * layout.radius,
    ]);
  }
  return { tile, centerX, centerY, vertices };
}

function drawTileFill(
  context: CanvasRenderingContext2D,
  entry: TileGeometry,
  options: GeographicTileWindowRenderOptions,
): void {
  context.beginPath();
  tracePolygon(context, entry.vertices);
  context.fillStyle = tileFill(entry.tile, options.presentation);
  context.fill();

  if (entry.tile.childIndex !== null && entry.tile.childIndex === options.selectedChildIndex) {
    context.fillStyle = 'rgba(255, 232, 151, 0.28)';
    context.fill();
  }
}

function drawContextVeil(context: CanvasRenderingContext2D, geometry: TileGeometry[]): void {
  context.fillStyle = 'rgba(3, 7, 12, 0.36)';
  for (const entry of geometry) {
    if (entry.tile.membershipRole === 'parent') continue;
    context.beginPath();
    tracePolygon(context, entry.vertices);
    context.fill();
  }
}

function drawParentBoundary(
  context: CanvasRenderingContext2D,
  geometry: TileGeometry[],
  byCoordinate: Map<string, GeographicTileWindowTile>,
  window: GeographicTileWindow,
): void {
  context.strokeStyle = 'rgba(255, 255, 246, 0.98)';
  context.lineWidth = 3.1;
  context.lineJoin = 'round';
  for (const entry of geometry) {
    if (entry.tile.membershipRole !== 'parent') continue;
    for (const edge of edgeOrder()) {
      const neighbor = neighborFor(entry.tile, edge, byCoordinate, window);
      if (neighbor?.membershipRole === 'parent') continue;
      strokeEdge(context, entry.vertices, edge);
    }
  }
}

function drawChildBoundaries(
  context: CanvasRenderingContext2D,
  geometry: TileGeometry[],
  byCoordinate: Map<string, GeographicTileWindowTile>,
  window: GeographicTileWindow,
): void {
  context.strokeStyle = 'rgba(247, 210, 123, 0.74)';
  context.lineWidth = 1.4;
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
}

function drawTerrainEdges(context: CanvasRenderingContext2D, geometry: TileGeometry[]): void {
  for (const entry of geometry) {
    for (const edge of entry.tile.ridgeEdges) {
      context.strokeStyle = entry.tile.ice ? 'rgba(215, 229, 235, 0.9)' : 'rgba(76, 55, 39, 0.92)';
      context.lineWidth = 2.1;
      strokeEdge(context, entry.vertices, edge);
    }
    for (const edge of entry.tile.minorRiverEdges) {
      drawRiver(context, entry, edge, false);
    }
    for (const edge of entry.tile.navigableRiverEdges) {
      drawRiver(context, entry, edge, true);
    }
  }
}

function drawRiver(context: CanvasRenderingContext2D, entry: TileGeometry, edge: HexTileEdge, navigable: boolean): void {
  const [left, right] = EDGE_VERTICES[edge];
  const midpointX = (entry.vertices[left][0] + entry.vertices[right][0]) / 2;
  const midpointY = (entry.vertices[left][1] + entry.vertices[right][1]) / 2;
  context.beginPath();
  context.moveTo(entry.centerX, entry.centerY);
  context.lineTo(midpointX, midpointY);
  context.strokeStyle = navigable ? 'rgba(73, 183, 238, 0.96)' : 'rgba(99, 190, 229, 0.86)';
  context.lineWidth = navigable ? 2.8 : 1.45;
  context.lineCap = 'round';
  context.stroke();
}

function drawHexLines(context: CanvasRenderingContext2D, geometry: TileGeometry[]): void {
  context.strokeStyle = 'rgba(236, 225, 192, 0.22)';
  context.lineWidth = 0.7;
  for (const entry of geometry) {
    context.beginPath();
    tracePolygon(context, entry.vertices);
    context.stroke();
  }
}

function tileFill(tile: GeographicTileWindowTile, presentation: GeographicTileWindowPresentation): string {
  if (presentation === 'terrain') return terrainFill(tile);
  const base = naturalBase(tile);
  const elevationLift = clamp((tile.elevation + 0.35) * 0.22, -0.08, 0.16);
  const wetnessLift = clamp((tile.wetness - 0.5) * 0.08, -0.05, 0.05);
  return adjustHex(base, elevationLift + wetnessLift);
}

function naturalBase(tile: GeographicTileWindowTile): string {
  if (tile.ice) return '#dbe8e8';
  if (tile.water) return tile.morphology === 'coastal' || tile.morphology === 'lake' ? '#397a9b' : '#225776';
  switch (tile.biome) {
    case 'tundra': return '#9ca99b';
    case 'desert': return '#c5a768';
    case 'tropical': return '#3f7f4b';
    case 'grassland': return '#789456';
    case 'plains': return '#9a985d';
    default: return '#55745c';
  }
}

function terrainFill(tile: GeographicTileWindowTile): string {
  if (tile.ice) return '#d8e4e6';
  if (tile.water) {
    const depth = clamp(-tile.elevation, 0, 1);
    return adjustHex('#275e7a', -depth * 0.18);
  }
  const normalized = clamp((tile.elevation + 0.15) / 0.9, 0, 1);
  if (tile.morphology === 'mountainous') return adjustHex('#7a6d5d', normalized * 0.16);
  if (tile.morphology === 'rough') return adjustHex('#777563', normalized * 0.12);
  return adjustHex('#77816b', normalized * 0.1);
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

function strokeEdge(context: CanvasRenderingContext2D, vertices: Array<[number, number]>, edge: HexTileEdge): void {
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

function edgeOrder(): HexTileEdge[] {
  return ['ne', 'e', 'se', 'sw', 'w', 'nw'];
}

function adjustHex(value: string, amount: number): string {
  const numeric = Number.parseInt(value.slice(1), 16);
  const shift = Math.round(amount * 255);
  const red = clampInteger((numeric >> 16) + shift, 0, 255);
  const green = clampInteger(((numeric >> 8) & 0xff) + shift, 0, 255);
  const blue = clampInteger((numeric & 0xff) + shift, 0, 255);
  return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}
