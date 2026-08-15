import { biomeToCode, codeToBiome, type WorldProject } from '@world-forge/shared';
import {
  cleanGameMapTheme,
  inspectWorldPoint as inspectBaseWorldPoint,
  projectForSurfacePresentation,
  renderWorldToCanvas as renderBaseWorldToCanvas,
  worldToSvg as baseWorldToSvg,
  type MapTheme,
  type RenderOptions,
} from './indexBase';

export * from './indexBase';

export const ttrpgWorldMapTheme: MapTheme = {
  name: 'TTRPG Parchment Map',
  colors: {
    oceanDeep: '#607f85',
    ocean: '#76969a',
    shelf: '#91aa9f',
    ice: '#e8e1cf',
    tundra: '#c9c3a5',
    desert: '#d4b97f',
    grassland: '#b6ae73',
    forest: '#96996b',
    rainforest: '#858d62',
    mountain: '#998970',
    wetland: '#9d9e70',
    river: '#55797c',
    riverShadow: '#405d60',
    coastline: '#4a3a29',
  },
};

export function ttrpgBiomeForSurfacePresentation(biome: string, water: boolean): string {
  if (water) return 'ocean';
  return biome === 'ocean' ? 'grassland' : biome;
}

export function projectForTtrpgWorldMapPresentation(project: WorldProject): WorldProject {
  const normalized = projectForSurfacePresentation(project);
  const world = normalized.primaryWorld;
  let biomes: Uint8Array | undefined;

  for (let index = 0; index < world.layers.biomes.length; index += 1) {
    const current = codeToBiome(world.layers.biomes[index]);
    const presentation = ttrpgBiomeForSurfacePresentation(current, world.layers.water[index] === 1);
    if (presentation === current) continue;
    biomes ??= new Uint8Array(world.layers.biomes);
    biomes[index] = biomeToCode(presentation as Parameters<typeof biomeToCode>[0]);
  }

  if (!biomes) return normalized;
  return {
    ...normalized,
    primaryWorld: {
      ...world,
      layers: {
        ...world.layers,
        biomes,
      },
    },
  };
}

export function renderWorldToCanvas(
  canvas: HTMLCanvasElement,
  project: WorldProject,
  theme?: MapTheme,
  visible?: RenderOptions,
): void {
  const mode = visible?.mode ?? (visible?.heightmap ? 'elevation' : 'biomes');
  const ttrpg = mode === 'biomes' && (visible?.renderMode as string | undefined) === 'ttrpg';
  if (!ttrpg) {
    renderBaseWorldToCanvas(canvas, project, theme, visible);
    return;
  }

  const ttrpgOptions: RenderOptions = {
    rivers: visible?.rivers ?? true,
    plates: visible?.plates ?? false,
    heightmap: visible?.heightmap ?? false,
    coastlineTreatment: 'outlined',
    renderMode: 'data',
    mode: visible?.mode,
    targetResolution: visible?.targetResolution,
  };
  renderBaseWorldToCanvas(
    canvas,
    projectForTtrpgWorldMapPresentation(project),
    ttrpgWorldMapTheme,
    ttrpgOptions,
  );
}

export function inspectWorldPoint(
  project: WorldProject,
  input: Parameters<typeof inspectBaseWorldPoint>[1],
  theme?: MapTheme,
  renderMode?: Parameters<typeof inspectBaseWorldPoint>[3],
  mapMode?: Parameters<typeof inspectBaseWorldPoint>[4],
): ReturnType<typeof inspectBaseWorldPoint> {
  const ttrpg = (renderMode as string | undefined) === 'ttrpg' && (mapMode ?? 'biomes') === 'biomes';
  return inspectBaseWorldPoint(
    ttrpg ? projectForTtrpgWorldMapPresentation(project) : project,
    input,
    ttrpg ? ttrpgWorldMapTheme : theme,
    ttrpg ? 'data' : renderMode,
    mapMode,
  );
}

export function worldToSvg(project: WorldProject, theme: MapTheme = cleanGameMapTheme): string {
  return baseWorldToSvg(project, theme);
}
