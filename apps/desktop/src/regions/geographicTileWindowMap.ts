import type { HexTileEdge } from '@world-forge/shared';
import type {
  GeographicTileWindow,
  GeographicTileWindowTile,
} from '@world-forge/shared/geographicTileWindow';
import { estimatedRiverWidthMiles } from '@world-forge/generator-core/geographicRiverTileProjection';
import { worldHexCoordinateForLatLon } from '@world-forge/generator-core/geographicAdaptiveScale';
import {
  createGeographicWindowTransform,
  type GeographicWindowTransform,
} from './geographicWindowedMap';

export type GeographicTileWindowPresentation = 'natural' | 'terrain';

export type GeographicTileWindowCanvasTransform = GeographicWindowTransform & {
  tileAtCanvasPoint: (x: number, y: number) => GeographicTileWindowTile | null;
};

export type GeographicTileWindowRenderOptions = {
  presentation: GeographicTileWindowPresentation;
  showHexes: boolean;
  selectedChildIndex?: number | null;
};

type TileGeometry = {
  tile: GeographicTileWindowTile;
  centerX: number;
  centerY: number;
  radius: number;
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
): GeographicTileWindowCanvasTransform {
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

  for (const entry of geometry) drawTileFill(context, entry, options, window);
  drawContextVeil(context, geometry);
  drawChildBoundaries(context, geometry, byCoordinate, window);
  drawParentBoundary(context, geometry, byCoordinate, window);
  drawTerrainEdges(context, geometry, window);
  if (options.showHexes) drawHexLines(context, geometry);

  return createTileCanvasTransform(window, width, height, geometry);
}

export function createGeographicTileWindowCanvasTransform(
  window: GeographicTileWindow,
  width: number,
  height: number,
): GeographicTileWindowCanvasTransform {
  const layout = createLayout(window, width, height);
  const geometry = window.tiles.map((tile) => tileGeometry(tile, window, layout));
  return createTileCanvasTransform(window, width, height, geometry);
}

function createTileCanvasTransform(
  window: GeographicTileWindow,
  width: number,
  height: number,
  geometry: TileGeometry[],
): GeographicTileWindowCanvasTransform {
  const fallback = createGeographicWindowTransform(width, height, window.extent, window.scale);
  const byCoordinate = new Map(geometry.map((entry) => [`${entry.tile.q},${entry.tile.r}`, entry]));
  const hitTest = (x: number, y: number): TileGeometry | null => {
    let nearest: TileGeometry | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const entry of geometry) {
      if (Math.abs(x - entry.centerX) > entry.radius || Math.abs(y - entry.centerY) > entry.radius) continue;
      if (!pointInPolygon(x, y, entry.vertices)) continue;
      const distance = (x - entry.centerX) ** 2 + (y - entry.centerY) ** 2;
      if (distance < nearestDistance) {
        nearest = entry;
        nearestDistance = distance;
      }
    }
    return nearest;
  };

  return {
    ...fallback,
    tileAtCanvasPoint: (x, y) => hitTest(x, y)?.tile ?? null,
    canvasPointToGeo: (x, y) => {
      const tile = hitTest(x, y)?.tile;
      return tile
        ? { latitude: tile.latitude, longitude: tile.longitude }
        : fallback.canvasPointToGeo(x, y);
    },
    geoToCanvasPoint: (latitude, longitude) => {
      const coordinate = worldHexCoordinateForLatLon(
        latitude,
        longitude,
        window.scale.worldColumns,
        window.scale.worldRows,
      );
      const entry = byCoordinate.get(`${coordinate.q},${coordinate.r}`);
      return entry
        ? { x: entry.centerX, y: entry.centerY }
        : fallback.geoToCanvasPoint(latitude, longitude);
    },
  };
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
  return { tile, centerX, centerY, radius: layout.radius, vertices };
}

function drawTileFill(
  context: CanvasRenderingContext2D,
  entry: TileGeometry,
  options: GeographicTileWindowRenderOptions,
  window: GeographicTileWindow,
): void {
  context.beginPath();
  tracePolygon(context, entry.vertices);
  context.fillStyle = tileFill(entry.tile, options.presentation, window);
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

function drawTerrainEdges(
  context: CanvasRenderingContext2D,
  geometry: TileGeometry[],
  window: GeographicTileWindow,
): void {
  for (const entry of geometry) {
    for (const edge of entry.tile.ridgeEdges) {
      context.strokeStyle = entry.tile.ice ? 'rgba(215, 229, 235, 0.9)' : 'rgba(76, 55, 39, 0.92)';
      context.lineWidth = 2.1;
      strokeEdge(context, entry.vertices, edge);
    }
    drawRiverNetwork(context, entry, window);
  }
}

function drawRiverNetwork(
  context: CanvasRenderingContext2D,
  entry: TileGeometry,
  window: GeographicTileWindow,
): void {
  const minorEdges = entry.tile.minorRiverEdges.filter((edge) => !entry.tile.navigableRiverEdges.includes(edge));
  if (minorEdges.length > 0) {
    drawRiverConnections(
      context,
      entry,
      minorEdges,
      riverLineWidth(entry, window, false),
      'rgba(99, 190, 229, 0.82)',
      entry.tile.navigableRiverCenter,
    );
  }
  if (entry.tile.navigableRiverEdges.length > 0) {
    drawRiverConnections(
      context,
      entry,
      entry.tile.navigableRiverEdges,
      riverLineWidth(entry, window, true),
      'rgba(73, 183, 238, 0.96)',
      entry.tile.navigableRiverCenter,
    );
  }
}

function drawRiverConnections(
  context: CanvasRenderingContext2D,
  entry: TileGeometry,
  edges: HexTileEdge[],
  lineWidth: number,
  strokeStyle: string,
  dominant: boolean,
): void {
  const uniqueEdges = [...new Set(edges)];
  if (uniqueEdges.length === 0) return;
  const junction = riverJunction(entry, dominant);
  context.save();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  if (uniqueEdges.length === 2) {
    const start = edgeMidpoint(entry, uniqueEdges[0]);
    const end = edgeMidpoint(entry, uniqueEdges[1]);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(junction.x, junction.y, end.x, end.y);
    context.stroke();
  } else {
    for (const edge of uniqueEdges) {
      const midpoint = edgeMidpoint(entry, edge);
      context.beginPath();
      context.moveTo(midpoint.x, midpoint.y);
      context.quadraticCurveTo(
        (midpoint.x + junction.x) / 2,
        (midpoint.y + junction.y) / 2,
        junction.x,
        junction.y,
      );
      context.stroke();
    }
  }
  context.restore();
}

function riverJunction(entry: TileGeometry, dominant: boolean): { x: number; y: number } {
  if (dominant) return { x: entry.centerX, y: entry.centerY };
  const xNoise = hashUnit(`river-junction-x:${entry.tile.q}:${entry.tile.r}`) * 2 - 1;
  const yNoise = hashUnit(`river-junction-y:${entry.tile.q}:${entry.tile.r}`) * 2 - 1;
  return {
    x: entry.centerX + xNoise * entry.radius * 0.18,
    y: entry.centerY + yNoise * entry.radius * 0.18,
  };
}

function edgeMidpoint(entry: TileGeometry, edge: HexTileEdge): { x: number; y: number } {
  const [left, right] = EDGE_VERTICES[edge];
  return {
    x: (entry.vertices[left][0] + entry.vertices[right][0]) / 2,
    y: (entry.vertices[left][1] + entry.vertices[right][1]) / 2,
  };
}

function riverLineWidth(
  entry: TileGeometry,
  window: GeographicTileWindow,
  navigable: boolean,
): number {
  const physicalWidth = estimatedRiverWidthMiles(entry.tile.riverStrength) * (navigable ? 1 : 0.42);
  const widthFraction = physicalWidth / Math.max(0.1, window.scale.nominalHexWidthMiles);
  const projectedWidth = widthFraction * entry.radius * 1.75;
  const minimum = navigable ? 1.15 : 0.72;
  const maximum = entry.tile.navigableRiverCenter ? entry.radius * 1.25 : entry.radius * 0.52;
  return clamp(projectedWidth, minimum, maximum);
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

function tileFill(
  tile: GeographicTileWindowTile,
  presentation: GeographicTileWindowPresentation,
  window: GeographicTileWindow,
): string {
  if (tile.navigableRiverCenter) return riverDominantFill(tile, presentation, window);
  if (presentation === 'terrain') return terrainFill(tile);
  const base = naturalBase(tile);
  const elevationLift = clamp((tile.elevation + 0.35) * 0.22, -0.08, 0.16);
  const wetnessLift = clamp((tile.wetness - 0.5) * 0.08, -0.05, 0.05);
  return adjustHex(base, elevationLift + wetnessLift);
}

function riverDominantFill(
  tile: GeographicTileWindowTile,
  presentation: GeographicTileWindowPresentation,
  window: GeographicTileWindow,
): string {
  const dominance = clamp(
    estimatedRiverWidthMiles(tile.riverStrength) / Math.max(0.1, window.scale.nominalHexWidthMiles),
    0,
    1,
  );
  const base = presentation === 'terrain' ? '#327492' : '#3d86a8';
  return adjustHex(base, dominance * 0.06);
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

function pointInPolygon(x: number, y: number, vertices: Array<[number, number]>): boolean {
  let inside = false;
  for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index, index += 1) {
    const [x1, y1] = vertices[index];
    const [x2, y2] = vertices[previous];
    const intersects = ((y1 > y) !== (y2 > y))
      && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1;
    if (intersects) inside = !inside;
  }
  return inside;
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

function hashUnit(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  return hash / 0xffffffff;
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
