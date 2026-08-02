import {
  biomeNames,
  biomeToCode,
  buildCubedSphereTopology,
  clamp,
  codeToBiome,
  cubedSphereCellForLonLat,
  type GenerationConfig,
  type SelectedValues,
  type WorldProject
} from '@world-forge/shared';
import type { DeepTimeProject, PlanetaryDynamicsModel, StellarActivityClass, StellarModel } from './deepTimePipeline';
import { sampleNumericDistribution, type NumericDistribution, type RandomSource } from './numericDistribution';
import { classifyPermanentIce } from './permanentIce';
import { traceGenerationPerformance } from './generationPerformanceTrace';
import {
  distributionHardBounds,
  integerWorldParameterKeys,
  worldParameterDistributionsForPreset,
  worldParameterKeys,
  type WorldParameterKey
} from './worldParameterPresets';

export { plateCountDistributionsByPreset } from './worldParameterPresets';

type StarPresetId = 'sol-like' | 'habitable' | 'exotic';
type ExtendedGenerationConfig = GenerationConfig & {
  starPresetId?: StarPresetId;
  worldPresetId?: string;
  seeds?: { star?: string; world?: string };
  randomWorldArchetype?: string;
  parameterDistributions?: Partial<Record<WorldParameterKey, NumericDistribution>>;
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomSource(seed: string): RandomSource {
  let state = hashSeed(seed) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  return { next, range: (min, max) => min + (max - min) * next() };
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function inferWorldPreset(config: ExtendedGenerationConfig): string {
  const ranges = config.parameterRanges;
  const ocean = ranges.oceanPercentage;
  if (
    ocean.min <= 5
    && ocean.max >= 95
    && ranges.averageTemperatureC.min <= -25
    && ranges.averageTemperatureC.max >= 45
  ) return 'Random World';
  if (ranges.continentCount.max <= 2 || ranges.continentScale.min >= 0.78) return 'Pangea';
  if (ranges.islandDensity.min >= 0.7 || (ranges.continentCount.min >= 5 && ranges.continentScale.max <= 0.35)) return 'Archipelago';
  if (ocean.min >= 78) return 'Waterworld';
  if (ranges.aridity.min >= 0.68) return 'Desert World';
  if (ocean.min >= 58 && ocean.max <= 72) return 'Earthlike';
  return config.worldPresetId ?? 'Habitable World';
}

function chooseHabitableClass(rng: RandomSource): 'F' | 'G' | 'K' {
  const roll = rng.next();
  if (roll < 0.15) return 'F';
  if (roll < 0.65) return 'G';
  return 'K';
}

function stellarBase(spectralClass: 'F' | 'G' | 'K') {
  if (spectralClass === 'F') return { temperature: 6420, mass: 1.17, radius: 1.2, luminosity: 1.65 };
  if (spectralClass === 'K') return { temperature: 5030, mass: 0.79, radius: 0.78, luminosity: 0.43 };
  return { temperature: 5772, mass: 1, radius: 1, luminosity: 1 };
}

function spectralSubtype(spectralClass: 'F' | 'G' | 'K', temperatureK: number): number {
  const ranges = spectralClass === 'F' ? [6000, 7500] : spectralClass === 'G' ? [5200, 6000] : [3700, 5200];
  const hotToCool = 1 - clamp((temperatureK - ranges[0]) / (ranges[1] - ranges[0]), 0, 1);
  return Math.max(0, Math.min(9, Math.round(hotToCool * 9)));
}

function buildPresetStellarModel(project: DeepTimeProject, config: ExtendedGenerationConfig, rng: RandomSource): StellarModel {
  const preset = config.starPresetId ?? 'sol-like';
  const spectralClass: 'F' | 'G' | 'K' = preset === 'sol-like' ? 'G' : chooseHabitableClass(rng);
  const base = stellarBase(spectralClass);
  const spread = preset === 'sol-like' ? 0.045 : 0.1;
  const effectiveTemperatureK = Math.round(base.temperature * rng.range(1 - spread * 0.35, 1 + spread * 0.35));
  const ageGy = project.selectedValues.systemAgeGy;
  const activityScore = clamp(1.15 - ageGy / 7.5 + rng.range(-0.12, 0.12), 0, 1.25);
  const activityClass: StellarActivityClass = activityScore > 1.02 ? 'flare-active' : activityScore > 0.72 ? 'active' : activityScore > 0.38 ? 'moderate' : 'quiet';
  const luminositySolar = base.luminosity * rng.range(1 - spread, 1 + spread);
  const habitableScale = Math.sqrt(luminositySolar);
  return {
    spectralClass: `${spectralClass}${spectralSubtype(spectralClass, effectiveTemperatureK)}`,
    luminosityClass: 'V',
    effectiveTemperatureK,
    massSolar: round(base.mass * rng.range(1 - spread * 0.45, 1 + spread * 0.45)),
    radiusSolar: round(base.radius * rng.range(1 - spread * 0.5, 1 + spread * 0.5)),
    luminositySolar: round(luminositySolar),
    ageGy,
    metallicity: round(rng.range(-0.2, 0.2), 2),
    activityClass,
    cyclePeriodYears: round(rng.range(8, 16), 1),
    cycleAmplitude: round(clamp(activityScore * rng.range(0.006, 0.02), 0.002, 0.035), 4),
    flareFrequency: round(activityScore * rng.range(0.12, 0.9), 3),
    habitableZoneInnerAu: round(0.95 * habitableScale),
    habitableZoneOuterAu: round(1.67 * habitableScale)
  };
}

function buildPresetPlanetaryDynamics(project: DeepTimeProject, stellar: StellarModel, previous: PlanetaryDynamicsModel, worldPreset: string, rng: RandomSource): PlanetaryDynamicsModel {
  const earthlike = worldPreset === 'Earthlike';
  const random = worldPreset === 'Random World';
  const habitableCenterAu = Math.sqrt(stellar.luminositySolar);
  const orbitalFactor = earthlike ? rng.range(0.96, 1.04) : random ? rng.range(0.72, 1.35) : rng.range(0.9, 1.1);
  const lowerBound = random ? stellar.habitableZoneInnerAu * 0.78 : stellar.habitableZoneInnerAu * 1.03;
  const upperBound = random ? stellar.habitableZoneOuterAu * 1.18 : stellar.habitableZoneOuterAu * 0.97;
  const semiMajorAxisAu = clamp(habitableCenterAu * orbitalFactor, lowerBound, upperBound);
  const eccentricityMean = random
    ? round(clamp(project.primaryWorld.orbitalEccentricity, 0, 0.28), 4)
    : earthlike ? round(clamp(project.primaryWorld.orbitalEccentricity, 0, 0.07), 4) : round(clamp(project.primaryWorld.orbitalEccentricity, 0, 0.12), 4);
  return {
    ...previous,
    rotationPeriodHours: earthlike ? round(rng.range(20, 30), 2) : random ? round(rng.range(8, 72), 2) : round(rng.range(16, 40), 2),
    orbitalPeriodDays: round(365.256 * Math.sqrt(semiMajorAxisAu ** 3 / stellar.massSolar), 2),
    semiMajorAxisAu: round(semiMajorAxisAu, 4),
    eccentricityMean,
    obliquityMeanDeg: round(project.primaryWorld.axialTiltDeg, 3)
  };
}

function classifyRandomArchetype(project: WorldProject): string {
  const values = project.selectedValues;
  if (values.averageTemperatureC < -8) return values.oceanPercentage > 65 ? 'frozen_oceanic' : 'cold_supercontinent';
  if (values.averageTemperatureC > 30) return values.aridity > 0.7 ? 'hot_arid_extreme' : 'hot_greenhouse';
  if (values.axialTiltDeg > 45) return 'high_obliquity_seasonal';
  if (values.orbitalEccentricity > 0.16) return 'eccentric_seasonal';
  if (values.oceanPercentage > 82) return 'deep_oceanic';
  if (values.oceanPercentage < 22) return 'dry_marginal';
  return 'marginal_habitable';
}

export function prepareSystemOrbitConfig(input: GenerationConfig): GenerationConfig {
  const config = input as ExtendedGenerationConfig;
  const preset = inferWorldPreset(config);
  const presetDistributions = worldParameterDistributionsForPreset(preset);
  const distributions = {
    ...presetDistributions,
    ...config.parameterDistributions
  };
  const worldSeed = config.seeds?.world || input.seed;
  const sampledValues: Partial<SelectedValues> = {};

  for (const key of worldParameterKeys) {
    const explicit = input.selectedValues?.[key];
    if (explicit !== undefined) {
      sampledValues[key] = explicit;
      continue;
    }
    const distribution = distributions[key];
    const distributionRng = randomSource(`${worldSeed}:${preset}:${key}:distribution-v2`);
    const sampled = sampleNumericDistribution(distribution, distributionRng);
    sampledValues[key] = integerWorldParameterKeys.has(key) ? Math.round(sampled) : sampled;
  }

  const parameterRanges = Object.fromEntries(worldParameterKeys.map((key) => {
    const bounds = distributionHardBounds(distributions[key]);
    return [key, {
      min: bounds.min,
      max: bounds.max,
      unit: input.parameterRanges[key]?.unit
    }];
  })) as GenerationConfig['parameterRanges'];

  return {
    ...input,
    parameterRanges,
    selectedValues: {
      ...sampledValues,
      ...input.selectedValues,
      oceanTolerancePercentagePoints: input.selectedValues?.oceanTolerancePercentagePoints ?? (preset === 'Random World' ? 12 : 5)
    },
    worldPresetId: preset
  } as GenerationConfig;
}

function propagateSystemOrbitForcing(project: DeepTimeProject, stellar: StellarModel, dynamics: PlanetaryDynamicsModel): void {
  const world = project.primaryWorld;
  const topology = buildCubedSphereTopology(world.topology.resolution);
  const layers = world.topologyLayers;
  const flux = stellar.luminositySolar / Math.max(0.05, dynamics.semiMajorAxisAu ** 2);
  const fluxTemperatureDelta = clamp(72 * (Math.pow(flux, 0.25) - 1), -14, 14);
  const eccentricitySeasonality = clamp(dynamics.eccentricityMean * 16, 0, 5);
  const tiltSeasonality = clamp(Math.abs(dynamics.obliquityMeanDeg - 23.4) / 18, 0, 2.5);
  const rotationMoisture = clamp((24 / Math.max(8, dynamics.rotationPeriodHours) - 1) * 0.035, -0.045, 0.06);

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const latitude = Math.abs(topology.latitudes[cell]) / (Math.PI / 2);
    const seasonalDelta = (eccentricitySeasonality + tiltSeasonality) * Math.max(0, latitude - 0.45) * -0.55;
    layers.temperature[cell] += fluxTemperatureDelta + seasonalDelta;
    layers.wetness[cell] = clamp(layers.wetness[cell] + rotationMoisture + fluxTemperatureDelta * 0.002, 0, 1);
    layers.climateMoisture[cell] = clamp(layers.climateMoisture[cell] + rotationMoisture, 0, 1);
    layers.climatePrecipitation[cell] = clamp(layers.climatePrecipitation[cell] + rotationMoisture * 0.8, 0, 1);
  }

  const iceClassification = classifyPermanentIce({
    ice: layers.ice,
    elevation: layers.elevation,
    water: layers.water,
    temperature: layers.temperature,
    wetness: layers.wetness,
    topology,
    seaLevel: project.selectedValues.seaLevel ?? 0,
    axialTiltDeg: dynamics.obliquityMeanDeg,
    orbitalEccentricity: dynamics.eccentricityMean
  });

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    let biome = codeToBiome(layers.biomes[cell]);
    if (!layers.water[cell] && !layers.ice[cell]) {
      if (layers.temperature[cell] <= 1.5) biome = 'tundra';
      else if (layers.wetness[cell] < 0.2) biome = 'desert';
      else if (layers.temperature[cell] > 20 && layers.wetness[cell] > 0.72) biome = 'rainforest';
      else if (layers.wetness[cell] > 0.5) biome = 'forest';
      else if (biome === 'ice_cap' || biome === 'tundra' || biome === 'desert' || biome === 'forest' || biome === 'rainforest') biome = 'grassland';
      layers.biomes[cell] = biomeToCode(biome);
    } else if (layers.ice[cell] && !layers.water[cell]) {
      biome = 'ice_cap';
      layers.biomes[cell] = biomeToCode(biome);
    }
  }

  project.primaryWorld.deepTime.persistentIceCells = iceClassification.iceCells;
  traceGenerationPerformance(
    'topology-to-raster-system-orbit-reprojection',
    {
      topologyCells: topology.cellCount,
      activeCells: world.layers.elevation.length,
      fullTopologyPasses: 0,
      allocatedBufferBytes: 0
    },
    () => projectSystemOrbitLayers(project, topology)
  );

  let iceCount = 0;
  const biomeCounts = Object.fromEntries(biomeNames.map((biome) => [biome, 0])) as Record<string, number>;
  for (let index = 0; index < world.layers.ice.length; index += 1) {
    iceCount += world.layers.ice[index];
    biomeCounts[codeToBiome(world.layers.biomes[index])] += 1;
  }
  project.metrics.icePercentage = round((iceCount / Math.max(1, world.layers.ice.length)) * 100, 2);
  project.metrics.biomeCounts = biomeCounts as typeof project.metrics.biomeCounts;
  if (world.climate) {
    world.climate.notes = [
      ...world.climate.notes.filter((note) => !note.startsWith('Stellar forcing integrated')),
      `Stellar forcing integrated from ${stellar.spectralClass}${stellar.luminosityClass}: relative flux ${round(flux, 3)}, temperature adjustment ${round(fluxTemperatureDelta, 2)} C.`
    ];
  }
}

function projectSystemOrbitLayers(
  project: DeepTimeProject,
  topology: ReturnType<typeof buildCubedSphereTopology>
): void {
  const world = project.primaryWorld;
  const source = world.topologyLayers;
  const target = world.layers;
  const { width, height } = world.mapModel.resolution;
  for (let y = 0; y < height; y += 1) {
    const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
    for (let x = 0; x < width; x += 1) {
      const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
      const cell = cubedSphereCellForLonLat(topology, longitude, latitude);
      const index = y * width + x;
      target.temperature[index] = source.temperature[cell];
      target.wetness[index] = source.wetness[cell];
      target.climateMoisture[index] = source.climateMoisture[cell];
      target.climatePrecipitation[index] = source.climatePrecipitation[cell];
      target.biomes[index] = source.biomes[cell];
      target.ice[index] = source.ice[cell];
    }
  }
}

export function reconcileSystemOrbitPresets(project: WorldProject): DeepTimeProject {
  const mutable = project as DeepTimeProject;
  const config = project.config as ExtendedGenerationConfig;
  const starSeed = config.seeds?.star || `${project.seed}:star`;
  const worldSeed = config.seeds?.world || project.seed;
  const worldPreset = inferWorldPreset(config);
  const stellarRng = randomSource(`${starSeed}:${config.starPresetId ?? 'sol-like'}:system-orbit-v2`);
  const orbitRng = randomSource(`${worldSeed}:${worldPreset}:orbit-v2`);
  const stellar = buildPresetStellarModel(mutable, config, stellarRng);
  const dynamics = buildPresetPlanetaryDynamics(mutable, stellar, mutable.primaryWorld.planetaryDynamics, worldPreset, orbitRng);

  mutable.solarSystem.stellarModel = stellar;
  mutable.solarSystem.star.type = `${stellar.spectralClass}${stellar.luminosityClass}`;
  mutable.solarSystem.star.massClass = stellar.massSolar.toFixed(2);
  mutable.solarSystem.star.luminosityClass = stellar.luminosityClass;
  mutable.solarSystem.star.ageGy = stellar.ageGy;
  mutable.solarSystem.star.colorTemperatureClass = `${stellar.effectiveTemperatureK} K`;
  mutable.primaryWorld.planetaryDynamics = dynamics;
  propagateSystemOrbitForcing(mutable, stellar, dynamics);
  mutable.config = {
    ...mutable.config,
    starPresetId: config.starPresetId ?? 'sol-like',
    worldPresetId: worldPreset,
    randomWorldArchetype: worldPreset === 'Random World' ? classifyRandomArchetype(mutable) : undefined,
    seeds: { star: starSeed, world: worldSeed }
  } as GenerationConfig;
  return mutable;
}