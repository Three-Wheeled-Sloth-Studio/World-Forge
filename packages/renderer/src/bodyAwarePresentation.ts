import type { WorldProject } from '@world-forge/shared';
import { projectForWorldBody, worldBodyRecord } from '@world-forge/shared/worldBodies';
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

export function renderWorldToCanvas(
  canvas: HTMLCanvasElement,
  project: WorldProject,
  theme: MapTheme = cleanGameMapTheme,
  visible: FlowRenderOptions = { rivers: true, plates: false, heightmap: false },
): void {
  const activeProject = mapProjectForActiveBody(project);
  if (!activeProject) {
    renderUnsupportedBodyMap(canvas, project, visible.targetResolution);
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
