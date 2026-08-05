import type { WorldProject } from '@world-forge/shared';
import type {
  NumericRasterDescriptorV1,
  RasterSurfaceDetailV1,
  WorldBodyAssetRefV1,
} from '@world-forge/shared/worldBodyDetails';
import {
  worldBodyRecord,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';
import type { MapMode, RenderMode } from './index';

export type StagedReferenceRasterAsset = {
  assetId: string;
  width: number;
  height: number;
  bytes: Uint8Array;
};

export type StagedReferenceNumericRasterAsset = StagedReferenceRasterAsset & {
  descriptor: NumericRasterDescriptorV1;
};

export type StagedReferenceRasterSurface = {
  bodyId: string;
  detail: RasterSurfaceDetailV1;
  albedo: StagedReferenceRasterAsset | null;
  elevation: StagedReferenceNumericRasterAsset | null;
};

export function referenceRasterSurfaceForBody(
  project: WorldProject,
  bodyId: string,
): StagedReferenceRasterSurface | null {
  const body = worldBodyRecord(project, bodyId);
  if (body?.detail?.kind !== 'raster-surface') return null;
  const payloads = (project as MultiBodyWorldProject).bodyAssetPayloads ?? {};
  const albedo = stagedRgb565Asset(body.detail, payloads);
  const elevation = stagedNumericAsset(body.detail, payloads, 'elevation');
  if (!albedo && !elevation) return null;
  return {
    bodyId,
    detail: body.detail,
    albedo,
    elevation,
  };
}

export function renderReferenceRasterSurfaceToCanvas(
  canvas: HTMLCanvasElement,
  surface: StagedReferenceRasterSurface,
  options: {
    mode?: MapMode;
    renderMode?: RenderMode;
    targetResolution?: { width: number; height: number };
  } = {},
): void {
  const targetWidth = options.targetResolution?.width ?? surface.detail.resolution.width;
  const targetHeight = options.targetResolution?.height ?? surface.detail.resolution.height;
  if (!positiveInteger(targetWidth) || !positiveInteger(targetHeight)) {
    throw new Error('Reference raster presentation requires positive target dimensions.');
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to acquire canvas context.');
  const image = context.createImageData(targetWidth, targetHeight);
  const mode = options.mode ?? 'biomes';
  const useElevation = Boolean(surface.elevation)
    && (mode === 'elevation' || mode === 'heightmap' || !surface.albedo);
  const albedo = surface.albedo
    ? decodeRgb565ToRgba(surface.albedo.bytes, surface.albedo.width, surface.albedo.height)
    : null;
  const elevation = useElevation && surface.elevation
    ? decodeNumericRasterToFloat32(surface.elevation.bytes, surface.elevation.descriptor)
    : null;
  const elevationRange = elevation && surface.elevation
    ? numericDisplayRange(elevation, surface.elevation.descriptor)
    : null;

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const target = (y * targetWidth + x) * 4;
      if (elevation && surface.elevation && elevationRange) {
        const source = sampleIndex(
          x,
          y,
          targetWidth,
          targetHeight,
          surface.elevation.width,
          surface.elevation.height,
        );
        const color = elevationColor(
          elevation[source],
          elevationRange.min,
          elevationRange.max,
          options.renderMode ?? 'data',
          mode,
        );
        image.data[target] = color[0];
        image.data[target + 1] = color[1];
        image.data[target + 2] = color[2];
        image.data[target + 3] = 255;
      } else if (albedo && surface.albedo) {
        const source = sampleIndex(
          x,
          y,
          targetWidth,
          targetHeight,
          surface.albedo.width,
          surface.albedo.height,
        ) * 4;
        image.data[target] = albedo[source];
        image.data[target + 1] = albedo[source + 1];
        image.data[target + 2] = albedo[source + 2];
        image.data[target + 3] = 255;
      } else {
        image.data[target] = 20;
        image.data[target + 1] = 24;
        image.data[target + 2] = 28;
        image.data[target + 3] = 255;
      }
    }
  }

  context.putImageData(image, 0, 0);
  canvas.dataset.bodyPresentation = useElevation
    ? 'imported-reference-numeric-raster'
    : 'imported-reference-rgb565';
  canvas.dataset.bodyPresentationBodyId = surface.bodyId;
  canvas.dataset.bodyPresentationAssetId = useElevation
    ? surface.elevation?.assetId ?? ''
    : surface.albedo?.assetId ?? '';
  canvas.dataset.bodyPresentationSourceResolution = `${surface.detail.resolution.width}x${surface.detail.resolution.height}`;
}

export function decodeRgb565ToRgba(
  bytes: Uint8Array,
  width: number,
  height: number,
): Uint8ClampedArray {
  const expectedBytes = width * height * 2;
  if (!positiveInteger(width) || !positiveInteger(height) || bytes.byteLength !== expectedBytes) {
    throw new Error(`RGB565 raster expected ${expectedBytes} bytes for ${width} x ${height}, received ${bytes.byteLength}.`);
  }
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const packed = bytes[pixel * 2] | (bytes[pixel * 2 + 1] << 8);
    const target = pixel * 4;
    rgba[target] = Math.round(((packed >> 11) & 0x1f) * 255 / 31);
    rgba[target + 1] = Math.round(((packed >> 5) & 0x3f) * 255 / 63);
    rgba[target + 2] = Math.round((packed & 0x1f) * 255 / 31);
    rgba[target + 3] = 255;
  }
  return rgba;
}

export function decodeNumericRasterToFloat32(
  bytes: Uint8Array,
  descriptor: NumericRasterDescriptorV1,
): Float32Array {
  const bytesPerValue = numericBytesPerValue(descriptor.dataType);
  if (bytes.byteLength % bytesPerValue !== 0) {
    throw new Error(`Numeric raster byte length ${bytes.byteLength} is not aligned to ${descriptor.dataType}.`);
  }
  const values = new Float32Array(bytes.byteLength / bytesPerValue);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const littleEndian = descriptor.byteOrder !== 'big-endian';
  const noDataValue = descriptor.noData?.kind === 'value'
    ? descriptor.noData.value
    : null;
  for (let index = 0; index < values.length; index += 1) {
    const offset = index * bytesPerValue;
    const raw = readNumericValue(view, offset, descriptor.dataType, littleEndian);
    values[index] = noDataValue !== null && raw === noDataValue
      ? Number.NaN
      : raw * descriptor.scale + descriptor.offset;
  }
  return values;
}

function stagedRgb565Asset(
  detail: RasterSurfaceDetailV1,
  payloads: Record<string, Uint8Array>,
): StagedReferenceRasterAsset | null {
  const asset = detail.assets?.find((candidate) => candidate.role === 'albedo'
    && candidate.mediaType === 'application/vnd.world-forge.rgb565'
    && candidate.encoding === 'rgb565-le'
    && candidate.resolution);
  if (!asset?.resolution) return null;
  const bytes = payloads[asset.assetId];
  const expectedBytes = asset.resolution.width * asset.resolution.height * 2;
  if (!bytes || bytes.byteLength !== expectedBytes) return null;
  return {
    assetId: asset.assetId,
    width: asset.resolution.width,
    height: asset.resolution.height,
    bytes,
  };
}

function stagedNumericAsset(
  detail: RasterSurfaceDetailV1,
  payloads: Record<string, Uint8Array>,
  role: WorldBodyAssetRefV1['role'],
): StagedReferenceNumericRasterAsset | null {
  const asset = detail.assets?.find((candidate) => candidate.role === role
    && candidate.mediaType === 'application/vnd.world-forge.numeric-raster'
    && candidate.numericRaster
    && candidate.resolution);
  if (!asset?.resolution || !asset.numericRaster) return null;
  const bytes = payloads[asset.assetId];
  const expectedBytes = asset.resolution.width
    * asset.resolution.height
    * numericBytesPerValue(asset.numericRaster.dataType);
  if (!bytes || bytes.byteLength !== expectedBytes) return null;
  return {
    assetId: asset.assetId,
    width: asset.resolution.width,
    height: asset.resolution.height,
    bytes,
    descriptor: asset.numericRaster,
  };
}

function numericDisplayRange(
  values: Float32Array,
  descriptor: NumericRasterDescriptorV1,
): { min: number; max: number } {
  const declared = descriptor.preparedRange;
  if (declared && declared.max > declared.min) return declared;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return { min: 0, max: 1 };
  return { min, max };
}

function elevationColor(
  value: number,
  min: number,
  max: number,
  renderMode: RenderMode,
  mode: MapMode,
): [number, number, number] {
  if (!Number.isFinite(value)) return [18, 22, 26];
  const normalized = Math.max(0, Math.min(1, (value - min) / Math.max(1e-9, max - min)));
  if (mode === 'heightmap' || renderMode === 'data') {
    const gray = Math.round(normalized * 255);
    return [gray, gray, gray];
  }
  const low = [71, 54, 45] as const;
  const high = [232, 217, 190] as const;
  return [
    Math.round(low[0] + (high[0] - low[0]) * normalized),
    Math.round(low[1] + (high[1] - low[1]) * normalized),
    Math.round(low[2] + (high[2] - low[2]) * normalized),
  ];
}

function sampleIndex(
  x: number,
  y: number,
  targetWidth: number,
  targetHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): number {
  const sourceX = Math.min(sourceWidth - 1, Math.floor(x * sourceWidth / targetWidth));
  const sourceY = Math.min(sourceHeight - 1, Math.floor(y * sourceHeight / targetHeight));
  return sourceY * sourceWidth + sourceX;
}

function readNumericValue(
  view: DataView,
  offset: number,
  dataType: NumericRasterDescriptorV1['dataType'],
  littleEndian: boolean,
): number {
  switch (dataType) {
    case 'uint8': return view.getUint8(offset);
    case 'uint16': return view.getUint16(offset, littleEndian);
    case 'int16': return view.getInt16(offset, littleEndian);
    case 'float32': return view.getFloat32(offset, littleEndian);
  }
}

function numericBytesPerValue(dataType: NumericRasterDescriptorV1['dataType']): number {
  switch (dataType) {
    case 'uint8': return 1;
    case 'uint16':
    case 'int16': return 2;
    case 'float32': return 4;
  }
}

function positiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
