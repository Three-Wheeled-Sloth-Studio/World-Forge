import {
  parameterControlBounds,
  topologyResolutionForOutput,
  type GenerationConfig,
  type ParameterRanges,
  type Resolution
} from '@world-forge/shared';
import type { NumericDistribution } from '@world-forge/generator-core/numericDistribution';
import {
  distributionTargetAndSpread,
  updateDistributionTargetAndSpread,
  worldParameterDistributionsForPreset,
  type WorldParameterKey
} from '@world-forge/generator-core/worldParameterPresets';

export type GenerationRangeKey = keyof ParameterRanges;
export type GenerationDistributionField = 'target' | 'spread';

type ExtendedGenerationConfig = GenerationConfig & {
  parameterDistributions?: Partial<Record<WorldParameterKey, NumericDistribution>>;
};

export type GenerationParameterControl = {
  key: GenerationRangeKey;
  label: string;
  description: string;
  step: number;
  spreadStep?: number;
};

export type GenerationParameterGroup = {
  id: 'world-shape' | 'climate' | 'geology-history' | 'hydrology' | 'system';
  label: string;
  controls: readonly GenerationParameterControl[];
};

export const generationParameterLabels: Record<GenerationRangeKey, string> = {
  systemAgeGy: 'System age',
  oceanPercentage: 'Ocean target',
  averageTemperatureC: 'Average temperature',
  aridity: 'Aridity',
  seaLevel: 'Sea-level bias',
  axialTiltDeg: 'Axial tilt',
  orbitalEccentricity: 'Orbital eccentricity',
  sizeClass: 'Planet size',
  moonCount: 'Moon count',
  impactFrequency: 'Impact frequency',
  plateCount: 'Plate count',
  riverDensity: 'Runoff and river-network target',
  continentCount: 'Continent count',
  continentScale: 'Continent size and cohesion',
  islandDensity: 'Island density'
};

const controls: Record<GenerationRangeKey, GenerationParameterControl> = {
  systemAgeGy: {
    key: 'systemAgeGy',
    label: generationParameterLabels.systemAgeGy,
    description: 'Target system age and variation used for impact history, weathering, and long-term terrain evolution.',
    step: 0.1
  },
  oceanPercentage: {
    key: 'oceanPercentage',
    label: generationParameterLabels.oceanPercentage,
    description: 'Target share of the projected world covered by ocean, with seed-to-seed variation around that target.',
    step: 1
  },
  averageTemperatureC: {
    key: 'averageTemperatureC',
    label: generationParameterLabels.averageTemperatureC,
    description: 'Planet-wide average temperature target before local climate variation.',
    step: 1
  },
  aridity: {
    key: 'aridity',
    label: generationParameterLabels.aridity,
    description: 'Higher targets favor drier climate and reduce broad moisture availability.',
    step: 0.05
  },
  seaLevel: {
    key: 'seaLevel',
    label: generationParameterLabels.seaLevel,
    description: 'Target bias applied to the generated elevation field before final ocean targeting.',
    step: 0.01
  },
  axialTiltDeg: {
    key: 'axialTiltDeg',
    label: generationParameterLabels.axialTiltDeg,
    description: 'Axial tilt target controlling seasonal contrast.',
    step: 1
  },
  orbitalEccentricity: {
    key: 'orbitalEccentricity',
    label: generationParameterLabels.orbitalEccentricity,
    description: 'Orbital eccentricity target controlling distance-driven seasonal variation.',
    step: 0.01
  },
  sizeClass: {
    key: 'sizeClass',
    label: generationParameterLabels.sizeClass,
    description: 'Planet radius target relative to Earth.',
    step: 0.05
  },
  moonCount: {
    key: 'moonCount',
    label: generationParameterLabels.moonCount,
    description: 'Target number of major generated moons. Sampled values are rounded to whole moons.',
    step: 1
  },
  impactFrequency: {
    key: 'impactFrequency',
    label: generationParameterLabels.impactFrequency,
    description: 'Relative impact-activity target applied during deep-time terrain evolution.',
    step: 0.1
  },
  plateCount: {
    key: 'plateCount',
    label: generationParameterLabels.plateCount,
    description: 'Target tectonic plate count. Sampled values are rounded to whole plates.',
    step: 1
  },
  riverDensity: {
    key: 'riverDensity',
    label: generationParameterLabels.riverDensity,
    description: 'Runoff and drainage-network pressure. The generator adjusts channel thresholds and accepted paths rather than promising a literal river count.',
    step: 0.1
  },
  continentCount: {
    key: 'continentCount',
    label: generationParameterLabels.continentCount,
    description: 'Target number of primary continental regions. Sampled values are rounded to whole regions.',
    step: 1
  },
  continentScale: {
    key: 'continentScale',
    label: generationParameterLabels.continentScale,
    description: 'Higher targets produce broader landmasses with fewer major cuts and rifts.',
    step: 0.05
  },
  islandDensity: {
    key: 'islandDensity',
    label: generationParameterLabels.islandDensity,
    description: 'Higher targets increase island frequency and island contribution to land.',
    step: 0.05
  }
};

export const generationParameterGroups: readonly GenerationParameterGroup[] = [
  {
    id: 'world-shape',
    label: 'World shape',
    controls: [
      controls.oceanPercentage,
      controls.seaLevel,
      controls.continentCount,
      controls.continentScale,
      controls.islandDensity
    ]
  },
  {
    id: 'climate',
    label: 'Climate',
    controls: [
      controls.averageTemperatureC,
      controls.aridity,
      controls.axialTiltDeg,
      controls.orbitalEccentricity
    ]
  },
  {
    id: 'geology-history',
    label: 'Geology and history',
    controls: [
      controls.plateCount,
      controls.impactFrequency,
      controls.systemAgeGy
    ]
  },
  {
    id: 'hydrology',
    label: 'Hydrology',
    controls: [controls.riverDensity]
  },
  {
    id: 'system',
    label: 'System',
    controls: [controls.sizeClass, controls.moonCount]
  }
];

export function generationActionLabel(hasCurrentProject: boolean, isGenerating: boolean): string {
  if (isGenerating) return hasCurrentProject ? 'Regenerating...' : 'Generating...';
  return hasCurrentProject ? 'Regenerate' : 'Generate';
}

export function generationConfigForQuality(
  config: GenerationConfig,
  resolution: Resolution
): GenerationConfig {
  return {
    ...config,
    outputResolution: { width: resolution.width, height: resolution.height },
    topologyResolution: topologyResolutionForOutput(resolution)
  };
}

export function generationParameterDistribution(
  config: GenerationConfig,
  preset: string,
  key: GenerationRangeKey
): NumericDistribution {
  const extended = config as ExtendedGenerationConfig;
  return extended.parameterDistributions?.[key]
    ?? worldParameterDistributionsForPreset(preset)[key];
}

export function updateGenerationParameterDistribution(
  config: GenerationConfig,
  preset: string,
  key: GenerationRangeKey,
  field: GenerationDistributionField,
  rawValue: number
): GenerationConfig {
  const extended = config as ExtendedGenerationConfig;
  const current = generationParameterDistribution(config, preset, key);
  const editable = distributionTargetAndSpread(current);
  const allowed = parameterControlBounds[key];
  const fallback = editable[field];
  const value = Number.isFinite(rawValue) ? rawValue : fallback;
  const target = field === 'target'
    ? Math.max(allowed.min, Math.min(allowed.max, value))
    : editable.target;
  const spread = field === 'spread'
    ? Math.max(0, Math.min(allowed.max - allowed.min, value))
    : editable.spread;
  const nextDistribution = updateDistributionTargetAndSpread(current, target, spread);
  const selectedValues = { ...(config.selectedValues ?? {}) };
  delete selectedValues[key];

  return {
    ...config,
    selectedValues,
    parameterDistributions: {
      ...extended.parameterDistributions,
      [key]: nextDistribution
    }
  } as GenerationConfig;
}
