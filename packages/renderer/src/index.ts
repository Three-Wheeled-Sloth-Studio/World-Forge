import {
  biomeToCode,
  codeToBiome,
  type WorldProject,
} from '@world-forge/shared';
import {
  createDerivedRenderLayers,
  renderWorldToCanvas as renderLegacyWorldToCanvas,
  worldToSvg as legacyWorldToSvg,
  type MapTheme,
  type RenderOptions,
} from './legacyRenderer';

export * from './legacyRenderer';

const surfaceIcePresentationCache = new WeakMap<WorldProject, WorldProject>();

export function projectForSurfaceIcePresentation(project: WorldProject): WorldProject {
  const cached = surfaceIcePresentationCache.get(project);
  if (cached) return cached;

  const world = project.primaryWorld;
  const derived = createDerivedRenderLayers(world);
  const ice = new Uint8Array(world.layers.ice);
  const biomes = new Uint8Array(world.layers.biomes);
  let changed = false;

  for (let index = 0; index < ice.length; index += 1) {
    if (world.layers.water[index] === 1) continue;
    const permanentIce = derived.surfacePermanentIce[index] === 1 ? 1 : 0;
    if (ice[index] !== permanentIce) {
      ice[index] = permanentIce;
      changed = true;
    }
    if (permanentIce === 0 && codeToBiome(biomes[index]) === 'ice_cap') {
      biomes[index] = biomeToCode('tundra');
      changed = true;
    }
  }

  const presentationProject = changed
    ? {
        ...project,
        primaryWorld: {
          ...world,
          layers: {
            ...world.layers,
            ice,
            biomes,
          },
        },
      }
    : project;
  surfaceIcePresentationCache.set(project, presentationProject);
  return presentationProject;
}

export function renderWorldToCanvas(
  canvas: HTMLCanvasElement,
  project: WorldProject,
  theme?: MapTheme,
  visible?: RenderOptions,
): void {
  const mode = visible?.mode ?? (visible?.heightmap ? 'elevation' : 'biomes');
  renderLegacyWorldToCanvas(
    canvas,
    mode === 'biomes' ? projectForSurfaceIcePresentation(project) : project,
    theme,
    visible,
  );
}

export function worldToSvg(project: WorldProject, theme?: MapTheme): string {
  return legacyWorldToSvg(projectForSurfaceIcePresentation(project), theme);
}
