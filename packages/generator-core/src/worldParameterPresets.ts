import type { ParameterRanges } from '@world-forge/shared';
import {
  distributionCenter,
  distributionSpread,
  type NormalDistribution,
  type NumericDistribution
} from './numericDistribution';

export type WorldParameterKey = keyof ParameterRanges;
export type WorldParameterDistributions = Record<WorldParameterKey, NumericDistribution>;

export const worldParameterKeys: readonly WorldParameterKey[] = [
  'systemAgeGy',
  'oceanPercentage',
  'averageTemperatureC',
  'aridity',
  'seaLevel',
  'axialTiltDeg',
  'orbitalEccentricity',
  'sizeClass',
  'moonCount',
  'impactFrequency',
  'plateCount',
  'riverDensity',
  'continentCount',
  'continentScale',
  'islandDensity'
];

export const integerWorldParameterKeys = new Set<WorldParameterKey>([
  'moonCount',
  'plateCount',
  'continentCount'
]);

function normal(
  median: number,
  standardDeviation: number,
  hardMin: number,
  hardMax: number
): NormalDistribution {
  return { kind: 'normal', median, standardDeviation, hardMin, hardMax };
}

const earthlike: WorldParameterDistributions = {
  systemAgeGy: normal(4.6, 1.2, 0.8, 10.5),
  oceanPercentage: normal(68, 5, 45, 85),
  averageTemperatureC: normal(15, 3.5, -5, 30),
  aridity: normal(0.48, 0.08, 0.15, 0.8),
  seaLevel: normal(0, 0.025, -0.2, 0.2),
  axialTiltDeg: normal(23.4, 6, 0, 50),
  orbitalEccentricity: normal(0.025, 0.02, 0, 0.12),
  sizeClass: normal(1, 0.08, 0.65, 1.4),
  moonCount: normal(1, 0.9, 0, 4),
  impactFrequency: normal(1, 0.22, 0.2, 2.5),
  plateCount: normal(23, 7, 6, 64),
  riverDensity: normal(1.8, 0.35, 0.2, 3.5),
  continentCount: normal(5, 1.25, 1, 10),
  continentScale: normal(0.58, 0.08, 0.15, 1),
  islandDensity: normal(0.38, 0.12, 0, 1)
};

const habitable: WorldParameterDistributions = {
  systemAgeGy: normal(earthlike.systemAgeGy.median, 2, 0.8, 10.5),
  oceanPercentage: normal(earthlike.oceanPercentage.median, 12, 20, 95),
  averageTemperatureC: normal(earthlike.averageTemperatureC.median, 7, -20, 42),
  aridity: normal(earthlike.aridity.median, 0.18, 0.05, 0.95),
  seaLevel: normal(earthlike.seaLevel.median, 0.06, -0.2, 0.2),
  axialTiltDeg: normal(earthlike.axialTiltDeg.median, 14, 0, 70),
  orbitalEccentricity: normal(earthlike.orbitalEccentricity.median, 0.05, 0, 0.28),
  sizeClass: normal(earthlike.sizeClass.median, 0.2, 0.45, 2.2),
  moonCount: normal(earthlike.moonCount.median, 1.4, 0, 5),
  impactFrequency: normal(earthlike.impactFrequency.median, 0.55, 0.2, 2.5),
  plateCount: normal(earthlike.plateCount.median, 11, 4, 64),
  riverDensity: normal(earthlike.riverDensity.median, 0.7, 0.1, 3.5),
  continentCount: normal(earthlike.continentCount.median, 2.2, 1, 10),
  continentScale: normal(earthlike.continentScale.median, 0.18, 0.15, 1),
  islandDensity: normal(earthlike.islandDensity.median, 0.25, 0, 1)
};

function fromHabitable(overrides: Partial<WorldParameterDistributions>): WorldParameterDistributions {
  return { ...habitable, ...overrides };
}

export const worldParameterDistributionsByPreset: Readonly<Record<string, WorldParameterDistributions>> = {
  Earthlike: earthlike,
  'Habitable World': habitable,
  Waterworld: fromHabitable({
    oceanPercentage: normal(84, 4, 70, 96),
    continentCount: normal(3, 1.5, 1, 7),
    continentScale: normal(0.28, 0.08, 0.12, 0.55),
    islandDensity: normal(0.65, 0.18, 0.15, 1),
    riverDensity: normal(1.3, 0.5, 0.1, 3.2)
  }),
  Archipelago: fromHabitable({
    oceanPercentage: normal(72, 6, 52, 92),
    plateCount: normal(31, 7, 8, 68),
    continentCount: normal(7, 2, 2, 12),
    continentScale: normal(0.24, 0.07, 0.1, 0.5),
    islandDensity: normal(0.82, 0.12, 0.35, 1),
    riverDensity: normal(1.3, 0.5, 0.1, 3.2)
  }),
  'Desert World': fromHabitable({
    oceanPercentage: normal(36, 7, 10, 60),
    averageTemperatureC: normal(24, 6, 5, 45),
    aridity: normal(0.8, 0.08, 0.5, 0.98),
    continentCount: normal(3.5, 1.5, 1, 8),
    continentScale: normal(0.62, 0.12, 0.3, 0.9),
    islandDensity: normal(0.2, 0.1, 0, 0.55),
    riverDensity: normal(0.65, 0.3, 0.05, 2)
  }),
  Pangea: fromHabitable({
    oceanPercentage: normal(55, 5, 35, 75),
    plateCount: normal(9, 3, 2, 48),
    continentCount: normal(1.3, 0.5, 1, 4),
    continentScale: normal(0.9, 0.07, 0.65, 1),
    islandDensity: normal(0.08, 0.06, 0, 0.35),
    riverDensity: normal(2.2, 0.55, 0.4, 3.5)
  }),
  'Random World': {
    systemAgeGy: normal(4.6, 3, 0.8, 10.5),
    oceanPercentage: normal(60, 24, 5, 95),
    averageTemperatureC: normal(12, 18, -25, 45),
    aridity: normal(0.5, 0.28, 0.05, 0.95),
    seaLevel: normal(0, 0.1, -0.2, 0.2),
    axialTiltDeg: normal(25, 24, 0, 70),
    orbitalEccentricity: normal(0.06, 0.09, 0, 0.28),
    sizeClass: normal(1, 0.45, 0.45, 2.2),
    moonCount: normal(1.5, 1.8, 0, 5),
    impactFrequency: normal(1, 0.8, 0.2, 2.5),
    plateCount: normal(23, 18, 3, 68),
    riverDensity: normal(1.7, 1, 0.1, 3.5),
    continentCount: normal(5, 3, 1, 10),
    continentScale: normal(0.55, 0.28, 0.15, 1),
    islandDensity: normal(0.45, 0.35, 0, 1)
  }
};

export function worldParameterDistributionsForPreset(preset: string | undefined): WorldParameterDistributions {
  const source = worldParameterDistributionsByPreset[preset ?? ''] ?? earthlike;
  return Object.fromEntries(
    worldParameterKeys.map((key) => [key, { ...source[key] }])
  ) as WorldParameterDistributions;
}

export function distributionHardBounds(distribution: NumericDistribution): { min: number; max: number } {
  return distribution.kind === 'uniform'
    ? { min: distribution.min, max: distribution.max }
    : { min: distribution.hardMin, max: distribution.hardMax };
}

export function distributionTargetAndSpread(distribution: NumericDistribution): { target: number; spread: number } {
  return {
    target: distributionCenter(distribution),
    spread: distributionSpread(distribution)
  };
}

export function updateDistributionTargetAndSpread(
  distribution: NumericDistribution,
  target: number,
  spread: number
): NormalDistribution {
  const bounds = distributionHardBounds(distribution);
  return normal(
    Math.max(bounds.min, Math.min(bounds.max, target)),
    Math.max(0, spread),
    bounds.min,
    bounds.max
  );
}

export const plateCountDistributionsByPreset: Readonly<Record<string, NumericDistribution>> = Object.fromEntries(
  Object.entries(worldParameterDistributionsByPreset).map(([preset, distributions]) => [preset, distributions.plateCount])
);
