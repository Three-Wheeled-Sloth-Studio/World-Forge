import {
  biomeToCode,
  classifyBiomeFromRules,
  codeToBiome,
  defaultBiomeClassificationRules,
  type Biome,
  type BiomeClassificationRule,
  type WorldProject,
} from '@world-forge/shared';
import {
  cleanGameMapTheme,
  createDerivedRenderLayers,
  inspectWorldPoint as inspectLegacyWorldPoint,
  renderWorldToCanvas as renderLegacyWorldToCanvas,
  worldToSvg as legacyWorldToSvg,
  type MapTheme,
  type RenderOptions,
} from './legacyRenderer';

export * from './legacyRenderer';

const terrestrialFallbackColors: Record<string, string> = {
  tundra: '#b9baa0',
  desert: '#d2b86f',
  grassland: '#91a65e',
  forest: '#50784b',
  rainforest: '#326a46',
  mountain: '#80766a',
  wetland: '#788d62',
};

export function projectForSurfacePresentation(project: WorldProject): WorldProject {
  const world = project.primaryWorld;
  const derived = createDerivedRenderLayers(world);
  const ice = new Uint8Array(world.layers.ice);
  const biomes = new Uint8Array(world.layers.biomes);
  const configuredRules = (project.config as typeof project.config & { biomeRules?: BiomeClassificationRule[] })?.biomeRules;
  const rules = configuredRules?.length ? configuredRules : defaultBiomeClassificationRules;
  const { width, height } = world.mapModel.resolution;

  for (let index = 0; index < biomes.length; index += 1) {
    const water = world.layers.water[index] === 1;
    const currentBiome = codeToBiome(biomes[index]);

    if (water) {
      biomes[index] = biomeToCode('ocean');
      continue;
    }

    const permanentIce = derived.surfacePermanentIce[index] === 1 ? 1 : 0;
    ice[index] = permanentIce;

    if (permanentIce === 0 && currentBiome === 'ice_cap') {
      biomes[index] = biomeToCode('tundra');
      continue;
    }

    if (permanentIce === 0 && currentBiome === 'ocean') {
      biomes[index] = biomeToCode(reclassifyCanonicalLand(project, index, width, height, rules));
    }
  }

  // Presentation layers must never alias the mutable source project. Enrichment
  // can update source layers after an earlier render, and returning the source
  // object here would allow stale ice/biome state to leak into later Data or
  // TTRPG frames while Natural recomputes its own derived surface facts.
  return {
    ...project,
    primaryWorld: {
      ...world,
      layers: {
        ...world.layers,
        ice,
        biomes,
      },
    },
  };
}

export function projectForSurfaceIcePresentation(project: WorldProject): WorldProject {
  return projectForSurfacePresentation(project);
}

export function surfacePresentationTheme(theme: MapTheme = cleanGameMapTheme): MapTheme {
  const colors = { ...theme.colors };
  const waterColors = ['oceanDeep', 'ocean', 'shelf']
    .map((key) => parseThemeColor(colors[key]))
    .filter((color): color is [number, number, number] => color !== null);

  for (const [key, fallback] of Object.entries(terrestrialFallbackColors)) {
    const candidate = parseThemeColor(colors[key]);
    if (!candidate || waterColors.some((water) => colorDistance(candidate, water) < 82)) {
      colors[key] = fallback;
    }
  }

  return {
    ...theme,
    name: `${theme.name} / surface-separated`,
    colors,
  };
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
    mode === 'biomes' ? projectForSurfacePresentation(project) : project,
    mode === 'biomes' ? surfacePresentationTheme(theme) : theme,
    visible,
  );
}

export function inspectWorldPoint(
  project: WorldProject,
  input: Parameters<typeof inspectLegacyWorldPoint>[1],
  theme?: MapTheme,
  renderMode?: Parameters<typeof inspectLegacyWorldPoint>[3],
  mapMode?: Parameters<typeof inspectLegacyWorldPoint>[4],
): ReturnType<typeof inspectLegacyWorldPoint> {
  return inspectLegacyWorldPoint(
    projectForSurfacePresentation(project),
    input,
    surfacePresentationTheme(theme),
    renderMode,
    mapMode,
  );
}

export function worldToSvg(project: WorldProject, theme?: MapTheme): string {
  return legacyWorldToSvg(projectForSurfacePresentation(project), surfacePresentationTheme(theme));
}

function reclassifyCanonicalLand(
  project: WorldProject,
  index: number,
  width: number,
  height: number,
  rules: BiomeClassificationRule[],
): Biome {
  const world = project.primaryWorld;
  const y = Math.floor(index / Math.max(1, width));
  const latitude = Math.PI / 2 - ((y + 0.5) / Math.max(1, height)) * Math.PI;
  const classified = classifyBiomeFromRules({
    water: false,
    ice: false,
    temperatureC: world.layers.temperature[index] ?? 14,
    elevationAboveSeaLevel: (world.layers.elevation[index] ?? world.seaLevel) - world.seaLevel,
    lake: world.layers.lakes[index] === 1,
    river: world.layers.river[index] ?? 0,
    wetness: world.layers.wetness[index] ?? 0.4,
    polarLatitude: Math.abs(latitude) / (Math.PI / 2),
  }, rules);
  if (classified === 'ocean') return 'grassland';
  if (classified === 'ice_cap') return 'tundra';
  return classified;
}

function parseThemeColor(value: string | undefined): [number, number, number] | null {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return null;
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function colorDistance(left: [number, number, number], right: [number, number, number]): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}
