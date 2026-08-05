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
import {
  decodeRgb565ToRgba,
  referenceRasterSurfaceForBody,
  renderReferenceRasterSurfaceToCanvas,
} from './referenceRasterPresentation';

export * from './presentation';
export {
  decodeNumericRasterToFloat32,
  decodeRgb565ToRgba,
  referenceRasterSurfaceForBody,
  renderReferenceRasterSurfaceToCanvas,
} from './referenceRasterPresentation';
export type {
  StagedReferenceNumericRasterAsset,
  StagedReferenceRasterAsset,
  StagedReferenceRasterSurface,
} from './referenceRasterPresentation';

export type StagedAtmosphericPresentationRaster = {
  assetId: string;
  encoding: 'rgb565-le';
  width: number;
  height: number;
  bytes: Uint8Array;
};

type CanvasGetContext = (
  contextId: string,
  options?: CanvasRenderingContext2DSettings,
) => RenderingContext | null;

export type AtmosphericPresentationCanvas = HTMLCanvasElement & {
  __worldForgeAtmosphericRaster?: StagedAtmosphericPresentationRaster;
  __worldForgeOriginalGetContext?: CanvasGetContext;
};

export function renderWorldToCanvas(
  canvas: HTMLCanvasElement,
  project: WorldProject,
  theme: MapTheme = cleanGameMapTheme,
  visible: FlowRenderOptions = { rivers: true, plates: false, heightmap: false },
): void {
  const presentationCanvas = canvas as AtmosphericPresentationCanvas;
  resetAtmosphericRasterGlobeHook(presentationCanvas);
  const activeBodyId = sessionActiveWorldBodyId(project);
  const activeBody = worldBodyRecord(project, activeBodyId);
  const referenceSurface = referenceRasterSurfaceForBody(project, activeBodyId);
  if (activeBody?.capabilities.map && referenceSurface) {
    renderReferenceRasterSurfaceToCanvas(canvas, referenceSurface, {
      mode: visible.mode,
      renderMode: visible.renderMode,
      targetResolution: visible.targetResolution,
    });
    return;
  }

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
  const bodyId = sessionActiveWorldBodyId(project);
  const body = worldBodyRecord(project, bodyId);
  if (body?.detail?.kind === 'raster-surface' && referenceRasterSurfaceForBody(project, bodyId)) {
    throw new Error(`${body.name} uses a compact reference surface; geographic point inspection is not available yet.`);
  }
  const activeProject = mapProjectForActiveBody(project);
  if (!activeProject) {
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

function installAtmosphericRasterGlobeHook(
  canvas: AtmosphericPresentationCanvas,
  raster: StagedAtmosphericPresentationRaster,
): void {
  const originalGetContext = canvas.getContext.bind(canvas) as CanvasGetContext;
  canvas.__worldForgeAtmosphericRaster = raster;
  canvas.__worldForgeOriginalGetContext = originalGetContext;

  Object.defineProperty(canvas, 'getContext', {
    configurable: true,
    value: (contextId: string, options?: CanvasRenderingContext2DSettings): RenderingContext | null => {
      const context = originalGetContext(contextId, options);
      if (contextId === '2d'
        && options?.willReadFrequently === true
        && isCanvas2dContext(context)
        && canvas.__worldForgeAtmosphericRaster) {
        drawAtmosphericRaster(canvas, context, canvas.__worldForgeAtmosphericRaster);
        resetAtmosphericRasterGlobeHook(canvas);
      }
      return context;
    },
  });
}

function resetAtmosphericRasterGlobeHook(canvas: AtmosphericPresentationCanvas): void {
  const originalGetContext = canvas.__worldForgeOriginalGetContext;
  if (originalGetContext) {
    Object.defineProperty(canvas, 'getContext', {
      configurable: true,
      writable: true,
      value: originalGetContext,
    });
  }
  delete canvas.__worldForgeAtmosphericRaster;
  delete canvas.__worldForgeOriginalGetContext;
}

function isCanvas2dContext(context: RenderingContext | null): context is CanvasRenderingContext2D {
  return Boolean(context)
    && typeof (context as CanvasRenderingContext2D).putImageData === 'function'
    && typeof (context as CanvasRenderingContext2D).drawImage === 'function';
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
  const sourceImage = sourceContext.createImageData(raster.width, raster.height);
  sourceImage.data.set(rgba);
  sourceContext.putImageData(sourceImage, 0, 0);
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
