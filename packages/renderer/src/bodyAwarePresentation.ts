import type { WorldProject } from '@world-forge/shared';
import { activeWorldBodyId, projectForWorldBody } from '@world-forge/shared/worldBodies';
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
  renderPresentationWorldToCanvas(canvas, activeBodyProject(project), theme, visible);
}

export function inspectWorldPoint(
  project: WorldProject,
  input: { source: InspectionSource; x: number; y: number; screen?: { x: number; y: number } },
  theme: MapTheme = cleanGameMapTheme,
  renderMode: RenderMode = 'data',
  mapMode: MapMode = 'biomes',
): PointInspectionRecord {
  return inspectPresentationWorldPoint(activeBodyProject(project), input, theme, renderMode, mapMode);
}

export function activeBodyProject(project: WorldProject): WorldProject {
  return projectForWorldBody(project, activeWorldBodyId(project)) ?? project;
}
