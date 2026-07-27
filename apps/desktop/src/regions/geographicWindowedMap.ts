import {
  cubedSphereCellForLonLat,
  type CubedSphereTopology,
  type WorldProject,
} from '@world-forge/shared';
import type {
  GeographicAdaptiveHexScale,
  GeographicHierarchyMapExtent,
} from '@world-forge/shared/geographicHierarchy';
import {
  renderWorldToCanvas,
  type MapMode,
  type RenderMode,
} from '@world-forge/renderer';
import { worldHexCenter } from '@world-forge/generator-core/geographicAdaptiveScale';

const DEGREES_TO_RADIANS = Math.PI / 180;
const UNASSIGNED_INDEX = 0xffff;

export type GeographicWindowRenderOptions = {
  mapMode?: MapMode;
  renderMode?: RenderMode;
  rivers?: boolean;
  showHexes?: boolean;
  parentMembership: Uint8Array;
  childMembership?: Uint16Array | null;
  selectedChildIndex?: number | null;
};

export type GeographicWindowTransform = {
  width: number;
  height: number;
  extent: GeographicHierarchyMapExtent;
  scale: GeographicAdaptiveHexScale;
  canvasPointToGeo: (x: number, y: number) => { latitude: number; longitude: number };
  geoToCanvasPoint: (latitude: number, longitude: number) => { x: number; y: number };
};

export function renderGeographicWindowToCanvas(
  canvas: HTMLCanvasElement,
  project: WorldProject,
  topology: CubedSphereTopology,
  scale: GeographicAdaptiveHexScale,
  extent: GeographicHierarchyMapExtent,
  options: GeographicWindowRenderOptions,
): GeographicWindowTransform {
  const width = clampInteger(extent.columns * 36, 720, 1500);
  const height = clampInteger(extent.rows * 34, 520, 1050);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to acquire drilldown map canvas context.');

  const source = document.createElement('canvas');
  const sourceResolution = project.primaryWorld.mapModel.resolution;
  renderWorldToCanvas(source, project, undefined, {
    rivers: options.rivers ?? true,
    plates: false,
    heightmap: false,
    coastlineTreatment: 'toned',
    renderMode: options.renderMode ?? 'natural',
    mode: options.mapMode ?? 'biomes',
    targetResolution: sourceResolution,
  });
  drawWindowedSource(context, source, extent, width, height);
  const transform = createGeographicWindowTransform(width, height, extent, scale);
  drawMembershipOverlay(context, topology, transform, options);
  if (options.showHexes ?? true) drawWorldAnchoredHexGrid(context, transform);
  return transform;
}

export function createGeographicWindowTransform(
  width: number,
  height: number,
  extent: GeographicHierarchyMapExtent,
  scale: GeographicAdaptiveHexScale,
): GeographicWindowTransform {
  const longitudeSpan = extentLongitudeSpan(extent);
  return {
    width,
    height,
    extent,
    scale,
    canvasPointToGeo: (x, y) => ({
      latitude: extent.maxLatitude - (clamp(y / Math.max(1, height), 0, 1) * (extent.maxLatitude - extent.minLatitude)),
      longitude: normalizeLongitude(extent.minLongitude + clamp(x / Math.max(1, width), 0, 1) * longitudeSpan),
    }),
    geoToCanvasPoint: (latitude, longitude) => ({
      x: (longitudeOffsetFromExtentStart(longitude, extent) / Math.max(0.000001, longitudeSpan)) * width,
      y: ((extent.maxLatitude - latitude) / Math.max(0.000001, extent.maxLatitude - extent.minLatitude)) * height,
    }),
  };
}

export function topologyCellAtWindowPoint(
  topology: CubedSphereTopology,
  transform: GeographicWindowTransform,
  x: number,
  y: number,
): number {
  const geo = transform.canvasPointToGeo(x, y);
  return cubedSphereCellForLonLat(
    topology,
    geo.longitude * DEGREES_TO_RADIANS,
    geo.latitude * DEGREES_TO_RADIANS,
  );
}

function drawWindowedSource(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  extent: GeographicHierarchyMapExtent,
  width: number,
  height: number,
): void {
  const sourceYMin = latitudeToSourceY(extent.maxLatitude, source.height);
  const sourceYMax = latitudeToSourceY(extent.minLatitude, source.height);
  const sourceHeight = Math.max(1, sourceYMax - sourceYMin);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  if (!extent.wrapsLongitude) {
    const sourceXMin = longitudeToSourceX(extent.minLongitude, source.width);
    const sourceXMax = longitudeToSourceX(extent.maxLongitude, source.width);
    context.drawImage(
      source,
      sourceXMin,
      sourceYMin,
      Math.max(1, sourceXMax - sourceXMin),
      sourceHeight,
      0,
      0,
      width,
      height,
    );
    return;
  }

  const firstX = longitudeToSourceX(extent.minLongitude, source.width);
  const firstWidth = source.width - firstX;
  const secondWidth = longitudeToSourceX(extent.maxLongitude, source.width);
  const totalSourceWidth = Math.max(1, firstWidth + secondWidth);
  const firstDestinationWidth = width * (firstWidth / totalSourceWidth);
  context.drawImage(
    source,
    firstX,
    sourceYMin,
    firstWidth,
    sourceHeight,
    0,
    0,
    firstDestinationWidth,
    height,
  );
  context.drawImage(
    source,
    0,
    sourceYMin,
    Math.max(1, secondWidth),
    sourceHeight,
    firstDestinationWidth,
    0,
    width - firstDestinationWidth,
    height,
  );
}

function drawMembershipOverlay(
  context: CanvasRenderingContext2D,
  topology: CubedSphereTopology,
  transform: GeographicWindowTransform,
  options: GeographicWindowRenderOptions,
): void {
  const rasterWidth = Math.min(transform.width, 900);
  const rasterHeight = Math.min(transform.height, 700);
  const parent = new Uint8Array(rasterWidth * rasterHeight);
  const children = new Uint16Array(rasterWidth * rasterHeight);
  children.fill(UNASSIGNED_INDEX);
  for (let y = 0; y < rasterHeight; y += 1) {
    for (let x = 0; x < rasterWidth; x += 1) {
      const geo = transform.canvasPointToGeo(
        ((x + 0.5) / rasterWidth) * transform.width,
        ((y + 0.5) / rasterHeight) * transform.height,
      );
      const cell = cubedSphereCellForLonLat(
        topology,
        geo.longitude * DEGREES_TO_RADIANS,
        geo.latitude * DEGREES_TO_RADIANS,
      );
      const index = y * rasterWidth + x;
      parent[index] = options.parentMembership[cell] === 1 ? 1 : 0;
      children[index] = options.childMembership?.[cell] ?? UNASSIGNED_INDEX;
    }
  }

  const image = context.createImageData(rasterWidth, rasterHeight);
  for (let y = 0; y < rasterHeight; y += 1) {
    for (let x = 0; x < rasterWidth; x += 1) {
      const index = y * rasterWidth + x;
      const pixel = index * 4;
      const inside = parent[index] === 1;
      const childIndex = children[index];
      if (!inside) {
        image.data[pixel] = 8;
        image.data[pixel + 1] = 12;
        image.data[pixel + 2] = 18;
        image.data[pixel + 3] = 55;
      } else if (childIndex !== UNASSIGNED_INDEX) {
        const tint = childTint(childIndex);
        image.data[pixel] = tint[0];
        image.data[pixel + 1] = tint[1];
        image.data[pixel + 2] = tint[2];
        image.data[pixel + 3] = childIndex === options.selectedChildIndex ? 68 : 16;
      }

      const leftIndex = y * rasterWidth + (x === 0 ? rasterWidth - 1 : x - 1);
      const rightIndex = y * rasterWidth + (x === rasterWidth - 1 ? 0 : x + 1);
      const aboveIndex = y > 0 ? index - rasterWidth : index;
      const belowIndex = y < rasterHeight - 1 ? index + rasterWidth : index;
      const parentBoundary = parent[index] !== parent[leftIndex]
        || parent[index] !== parent[rightIndex]
        || parent[index] !== parent[aboveIndex]
        || parent[index] !== parent[belowIndex];
      const childBoundary = inside && childIndex !== UNASSIGNED_INDEX && (
        childIndex !== children[leftIndex]
        || childIndex !== children[rightIndex]
        || childIndex !== children[aboveIndex]
        || childIndex !== children[belowIndex]
      );
      if (childBoundary) {
        image.data[pixel] = 247;
        image.data[pixel + 1] = 210;
        image.data[pixel + 2] = 123;
        image.data[pixel + 3] = childIndex === options.selectedChildIndex ? 235 : 155;
      }
      if (parentBoundary) {
        image.data[pixel] = 255;
        image.data[pixel + 1] = 255;
        image.data[pixel + 2] = 248;
        image.data[pixel + 3] = 255;
      }
    }
  }

  const overlay = document.createElement('canvas');
  overlay.width = rasterWidth;
  overlay.height = rasterHeight;
  overlay.getContext('2d')?.putImageData(image, 0, 0);
  context.drawImage(overlay, 0, 0, transform.width, transform.height);
}

function drawWorldAnchoredHexGrid(
  context: CanvasRenderingContext2D,
  transform: GeographicWindowTransform,
): void {
  const { scale, extent } = transform;
  context.save();
  context.lineWidth = 0.7;
  context.strokeStyle = 'rgba(236, 225, 192, 0.34)';
  for (let r = extent.rMin; r <= extent.rMax; r += 1) {
    for (let offset = 0; offset < extent.columns; offset += 1) {
      const q = mod(extent.qMin + offset, scale.worldColumns);
      const center = worldHexCenter(q, r, scale.worldColumns, scale.worldRows);
      const point = transform.geoToCanvasPoint(center.latitude, center.longitude);
      const horizontalRadius = transform.width / Math.max(1, extent.columns) * 0.5;
      const verticalRadius = transform.height / Math.max(1, extent.rows) * 0.58;
      drawPointyHex(context, point.x, point.y, horizontalRadius, verticalRadius);
    }
  }
  context.restore();
}

function drawPointyHex(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
): void {
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = (-90 + index * 60) * Math.PI / 180;
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.stroke();
}

function childTint(index: number): [number, number, number] {
  const hue = (index * 137.508) % 360;
  const sector = Math.floor(hue / 60);
  const fraction = hue / 60 - sector;
  const high = 205;
  const low = 92;
  const middle = Math.round(low + (high - low) * fraction);
  switch (sector) {
    case 0: return [high, middle, low];
    case 1: return [middle, high, low];
    case 2: return [low, high, middle];
    case 3: return [low, middle, high];
    case 4: return [middle, low, high];
    default: return [high, low, middle];
  }
}

function extentLongitudeSpan(extent: GeographicHierarchyMapExtent): number {
  if (!extent.wrapsLongitude) return Math.max(0.000001, extent.maxLongitude - extent.minLongitude);
  return 180 - extent.minLongitude + (extent.maxLongitude + 180);
}

function longitudeOffsetFromExtentStart(
  longitude: number,
  extent: GeographicHierarchyMapExtent,
): number {
  const normalized = normalizeLongitude(longitude);
  if (!extent.wrapsLongitude) return normalized - extent.minLongitude;
  if (normalized >= extent.minLongitude) return normalized - extent.minLongitude;
  return 180 - extent.minLongitude + (normalized + 180);
}

function longitudeToSourceX(longitude: number, width: number): number {
  return clamp(((normalizeLongitude(longitude) + 180) / 360) * width, 0, width);
}

function latitudeToSourceY(latitude: number, height: number): number {
  return clamp(((90 - clamp(latitude, -90, 90)) / 180) * height, 0, height);
}

function normalizeLongitude(longitude: number): number {
  let value = longitude;
  while (value < -180) value += 360;
  while (value > 180) value -= 360;
  return value;
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
