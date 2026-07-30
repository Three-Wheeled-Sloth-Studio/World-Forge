import {
  parameterControlBounds,
  topologyResolutionForOutput,
  type GenerationConfig,
  type NumericRange,
  type ParameterRanges,
  type Resolution
} from '@world-forge/shared';

export type GenerationRangeKey = keyof ParameterRanges;
export type GenerationRangeBound = keyof Pick<NumericRange, 'min' | 'max'>;

export type GenerationParameterControl = {
  key: GenerationRangeKey;
  label: string;
  description: string;
  step: number;
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
  riverDensity: 'River density',
  continentCount: 'Continent count',
  continentScale: 'Continent size and cohesion',
  islandDensity: 'Island density'
};

const controls: Record<GenerationRangeKey, GenerationParameterControl> = {
  systemAgeGy: {
    key: 'systemAgeGy',
    label: generationParameterLabels.systemAgeGy,
    description: 'Age range used for impact history, weathering, and long-term terrain evolution.',
    step: 0.1
  },
  oceanPercentage: {
    key: 'oceanPercentage',
    label: generationParameterLabels.oceanPercentage,
    description: 'Target share of the projected world covered by ocean.',
    step: 1
  },
  averageTemperatureC: {
    key: 'averageTemperatureC',
    label: generationParameterLabels.averageTemperatureC,
    description: 'Planet-wide average temperature range before local climate variation.',
    step: 1
  },
  aridity: {
    key: 'aridity',
    label: generationParameterLabels.aridity,
    description: 'Higher values favor drier climate and reduce broad moisture availability.',
    step: 0.05
  },
  seaLevel: {
    key: 'seaLevel',
    label: generationParameterLabels.seaLevel,
    description: 'Bias applied to the generated elevation field before final ocean targeting.',
    step: 0.01
  },
  axialTiltDeg: {
    key: 'axialTiltDeg',
    label: generationParameterLabels.axialTiltDeg,
    description: 'Axial tilt range controlling seasonal contrast.',
    step: 1
  },
  orbitalEccentricity: {
    key: 'orbitalEccentricity',
    label: generationParameterLabels.orbitalEccentricity,
    description: 'Orbital eccentricity range controlling distance-driven seasonal variation.',
    step: 0.01
  },
  sizeClass: {
    key: 'sizeClass',
    label: generationParameterLabels.sizeClass,
    description: 'Planet radius range relative to Earth.',
    step: 0.05
  },
  moonCount: {
    key: 'moonCount',
    label: generationParameterLabels.moonCount,
    description: 'Range for major generated moons.',
    step: 1
  },
  impactFrequency: {
    key: 'impactFrequency',
    label: generationParameterLabels.impactFrequency,
    description: 'Relative impact activity applied during deep-time terrain evolution.',
    step: 0.1
  },
  plateCount: {
    key: 'plateCount',
    label: generationParameterLabels.plateCount,
    description: 'Requested tectonic plate count range.',
    step: 1
  },
  riverDensity: {
    key: 'riverDensity',
    label: generationParameterLabels.riverDensity,
    description: 'Relative river-network density after terrain and climate generation.',
    step: 0.1
  },
  continentCount: {
    key: 'continentCount',
    label: generationParameterLabels.continentCount,
    description: 'Requested number of primary continental regions.',
    step: 1
  },
  continentScale: {
    key: 'continentScale',
    label: generationParameterLabels.continentScale,
    description: 'Higher values produce broader landmasses with fewer major cuts and rifts.',
    step: 0.05
  },
  islandDensity: {
    key: 'islandDensity',
    label: generationParameterLabels.islandDensity,
    description: 'Higher values increase island frequency and island contribution to land.',
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

export function updateGenerationParameterRange(
  config: GenerationConfig,
  key: GenerationRangeKey,
  bound: GenerationRangeBound,
  rawValue: number
): GenerationConfig {
  const current = config.parameterRanges[key];
  const allowed = parameterControlBounds[key];
  const fallback = current[bound];
  const value = Number.isFinite(rawValue) ? rawValue : fallback;
  const clamped = Math.max(allowed.min, Math.min(allowed.max, value));
  return {
    ...config,
    parameterRanges: {
      ...config.parameterRanges,
      [key]: {
        ...current,
        [bound]: clamped
      }
    }
  };
}
