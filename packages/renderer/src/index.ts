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
import { drawTtrpgWorldMapSymbols } from './ttrpgWorldMapSymbols';

export * from './indexBase';
export * from './ttrpgWorldMapSymbols';

export const ttrpgWorldMapTheme: MapTheme = {
  name: 'TTRPG Parchment Map',
  colors: {
    oceanDeep: '#4a6b79',
    ocean: '#527685',
    shelf: '#567e91',
    ice: '#eee7d4',
    tundra: '#d4c9aa',
    desert: '#d8bd86',
    grassland: '#c8b77e',
    forest: '#aaa171',
    rainforest: '#9b9368',
    mountain: '#b49a7a',
    wetland: '#a8aa78',
    river: '#58787d',
    riverShadow: '#405d60',
    coastline: '#4a3828',
  },
};

export function ttrpgBiomeForSurfacePresentation(biome: string, water: boolean, lake = false): string {
  if (water || lake) return 'ocean';
  return biome === 'ocean' ? 'grassland' : biome;
}

export function projectForTtrpgWorldMapPresentation(project: WorldProject): WorldProject {
  const normalized = projectForSurfacePresentation(project);
  const world = normalized.primaryWorld;
  const biomes = new Uint8Array(world.layers.biomes);

  for (let index = 0; index < biomes.length; index += 1) {
    const current = codeToBiome(biomes[index]);
    const presentation = ttrpgBiomeForSurfacePresentation(
      current,
      world.layers.water[index] === 1,
      world.layers.lakes[index] === 1,
    );
    if (presentation !== current) {
      biomes[index] = biomeToCode(presentation as Parameters<typeof biomeToCode>[0]);
    }
  }

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

  const ttrpgProject = projectForTtrpgWorldMapPresentation(project);
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
    ttrpgProject,
    ttrpgWorldMapTheme,
    ttrpgOptions,
  );
  drawTtrpgWorldMapSymbols(
    canvas,
    ttrpgProject.primaryWorld,
    ttrpgWorldMapTheme.colors.coastline,
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
