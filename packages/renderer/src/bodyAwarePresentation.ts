import type { WorldProject } from '@world-forge/shared';
import {
  projectForWorldBody,
  worldBodyRecord,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';
import { sessionActiveWorldBodyId } from '@world-forge/shared/worldBodySession';
import {
  cleanGameMapTheme,
  inspectWorldPoint as inspectPresentationWorldPoint,
  renderWorldToCanvas as renderPresentationWorldToCanvas,
} from './presentation';
import type {
  InspectionSource,
  MapMode,
  MapTheme,
  PointInspectionRecord,
  RenderMode,
} from './index';
import type { FlowRenderOptions } from './presentation';

export * from './presentation';

export type StagedAtmosphericPresentationRaster = {
  assetId: string;
  encoding: 'rgb565-le';
  width: number;
  height: number;
  bytes: Uint8Array;
};

export type AtmosphericPresentationCanvas = HTMLCanvasElement & {
  __worldForgeAtmosphericRaster?: StagedAtmosphericPresentationRaster;
};

export function renderWorldToCanvas(
  canvas: HTMLCanvasElement,
  project: WorldProject,
  theme: MapTheme = cleanGameMapTheme,
  visible: FlowRenderOptions = { rivers: true, plates: false, heightmap: false },
): void {
  const presentationCanvas = canvas as AtmosphericPresentationCanvas;
  delete presentationCanvas.__worldForgeAtmosphericRaster;
  const activeProject = mapProjectForActiveBody(project);
  if (!activeProject) {
    renderUnsupportedBodyMap(canvas, project, visible.targetResolution);
    const atmosphericRaster = atmosphericPresentationRasterForActiveBody(project);
    if (atmosphericRaster) installAtmosphericRasterGlobeHook(presentationCanvas, atmosphericRaster);
    return;
  }
  renderPresentationWorldToCanvas(canvas, activeProject, theme, visible);
}

export function inspectWorldPoint(
  project: WorldProject,
  input: { source: InspectionSource; x: number; y: number; screen?: { x: number; y: number } },
  theme: MapTheme = cleanGameMapTheme,
  renderMode: RenderMode = 'data',
  mapMode: MapMode = 'biomes',
): PointInspectionRecord {
  const activeProject = mapProjectForActiveBody(project);
  if (!activeProject) {
    const bodyId = sessionActiveWorldBodyId(project);
    const body = worldBodyRecord(project, bodyId);
    throw new Error(`${body?.name ?? bodyId} does not have a projected map surface.`);
  }
  return inspectPresentationWorldPoint(activeProject, input, theme, renderMode, mapMode);
}

export function mapProjectForActiveBody(project: WorldProject): WorldProject | null {
  return projectForWorldBody(project, sessionActiveWorldBodyId(project));
}

export function activeBodyProject(project: WorldProject): WorldProject {
  return mapProjectForActiveBody(project) ?? project;
}

export function atmosphericPresentationRasterForActiveBody(
  project: WorldProject,
): StagedAtmosphericPresentationRaster | null {
  const bodyId = sessionActiveWorldBodyId(project);
  const body = worldBodyRecord(project, bodyId);
  if (!body?.capabilities.globe || body.capabilities.map || body.detail?.kind !== 'atmospheric-presentation') return null;
  const asset = body.detail.assets?.find((candidate) => candidate.role === 'albedo'
    && candidate.encoding === 'rgb565-le'
    && candidate.resolution);
  if (!asset?.resolution) return null;
  const bytes = (project as MultiBodyWorldProject).bodyAssetPayloads?.[asset.assetId];
  const expectedBytes = asset.resolution.width * asset.resolution.height * 2;
  if (!bytes || bytes.byteLength !== expectedBytes) return null;
  return {
    assetId: asset.assetId,
    encoding: 'rgb565-le',
    width: asset.resolution.width,
    height: asset.resolution.height,
    bytes,
  };
}

export function decodeRgb565ToRgba(
  bytes: Uint8Array,
  width: number,
  height: number,
): Uint8ClampedArray {
  const expectedBytes = width * height * 2;
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0 || bytes.byteLength !== expectedBytes) {
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

function installAtmosphericRasterGlobeHook(
  canvas: AtmosphericPresentationCanvas,
  raster: StagedAtmosphericPresentationRaster,
): void {
  canvas.__worldForgeAtmosphericRaster = raster;
  const originalGetContext = canvas.getContext.bind(canvas) as (
    contextId: string,
    options?: CanvasRenderingContext2DSettings,
  ) => RenderingContext | null;

  Object.defineProperty(canvas, 'getContext', {
    configurable: true,
    value: (contextId: string, options?: CanvasRenderingContext2DSettings): RenderingContext | null => {
      const context = originalGetContext(contextId, options);
      if (contextId === '2d'
        && options?.willReadFrequently === true
        && context instanceof CanvasRenderingContext2D
        && canvas.__worldForgeAtmosphericRaster) {
        drawAtmosphericRaster(canvas, context, canvas.__worldForgeAtmosphericRaster);
        delete canvas.__worldForgeAtmosphericRaster;
        Object.defineProperty(canvas, 'getContext', {
          configurable: true,
          writable: true,
          value: originalGetContext,
        });
      }
      return context;
    },
  });
}

function drawAtmosphericRaster(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  raster: StagedAtmosphericPresentationRaster,
): void {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = raster.width;
  sourceCanvas.height = raster.height;
  const sourceContext = sourceCanvas.getContext('2d');
  if (!sourceContext) return;
  const rgba = decodeRgb565ToRgba(raster.bytes, raster.width, raster.height);
  sourceContext.putImageData(new ImageData(rgba, raster.width, raster.height), 0, 0);
  context.save();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  context.restore();
  canvas.dataset.bodyPresentation = 'imported-atmospheric-rgb565';
  canvas.dataset.bodyPresentationAssetId = raster.assetId;
  canvas.dataset.bodyPresentationSourceResolution = `${raster.width}x${raster.height}`;
}

function renderUnsupportedBodyMap(
  canvas: HTMLCanvasElement,
  project: WorldProject,
  targetResolution?: { width: number; height: number },
): void {
  const width = targetResolution?.width ?? project.primaryWorld.mapModel.resolution.width;
  const height = targetResolution?.height ?? project.primaryWorld.mapModel.resolution.height;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to acquire canvas context.');
  const bodyId = sessionActiveWorldBodyId(project);
  const body = worldBodyRecord(project, bodyId);
  context.fillStyle = '#071018';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#d9e5ec';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `600 ${Math.max(18, Math.round(Math.min(width, height) * 0.055))}px Segoe UI, sans-serif`;
  context.fillText(`${body?.name ?? bodyId} has no projected map yet`, width / 2, height / 2 - 18);
  context.fillStyle = '#8fa8b6';
  context.font = `400 ${Math.max(13, Math.round(Math.min(width, height) * 0.032))}px Segoe UI, sans-serif`;
  context.fillText('Import or derive a surface layer to enable Map and Explorer.', width / 2, height / 2 + 24);
}
