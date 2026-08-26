import {
  biomeToCode,
  type WorldProject,
} from '@world-forge/shared';
import type { ValidationMetricDefinition } from '@world-forge/validation-core';
import type { EarthDownstreamOutput, EarthObservations } from './earthScenario';

type EarthMetric = ValidationMetricDefinition<EarthDownstreamOutput, EarthObservations>;

export const earthDownstreamMetrics: readonly EarthMetric[] = [
  {
    id: 'atmosphere.zonal-band-direction-agreement',
    label: 'Zonal wind-band direction agreement',
    component: 'atmosphere',
    evidence: 'structural-invariant',
    unit: 'share',
    proves: 'Broad tropical easterlies, midlatitude westerlies, and polar easterlies have the expected zonal signs.',
    doesNotProve: 'Local observed winds, calibrated speeds, storms, or seasonal circulation.',
    threshold: { minimum: 0.65 },
    evaluate: ({ project }) => zonalWindAgreement(project),
  },
  {
    id: 'atmosphere.tropical-convergence-direction-agreement',
    label: 'Tropical convergence direction agreement',
    component: 'atmosphere',
    evidence: 'structural-invariant',
    unit: 'share',
    proves: 'Low-latitude meridional winds converge toward the equatorial zone in both hemispheres.',
    doesNotProve: 'Observed ITCZ longitude, seasonal migration, or convective rainfall intensity.',
    threshold: { minimum: 0.55 },
    evaluate: ({ project }) => tropicalConvergenceAgreement(project),
  },
  {
    id: 'ocean.land-current-confinement',
    label: 'Ocean-current land confinement',
    component: 'ocean',
    evidence: 'structural-invariant',
    unit: 'share',
    proves: 'Final current vectors are absent from land cells.',
    doesNotProve: 'That currents follow observed routes or do not cross narrow unresolved barriers.',
    threshold: { minimum: 0.9999 },
    evaluate: ({ project }) => currentLandConfinement(project),
  },
  {
    id: 'ocean.gyre-rotation-agreement',
    label: 'Gyre rotation agreement',
    component: 'ocean',
    evidence: 'structural-invariant',
    unit: 'share',
    proves: 'Resolved current vectors retain the intended hemisphere-dependent rotation after coastline alignment and smoothing.',
    doesNotProve: 'Observed gyre boundaries, transport, depth structure, or current speed calibration.',
    threshold: { minimum: 0.6 },
    evaluate: ({ project, reconciliation }) => gyreRotationAgreement(project, reconciliation.circulation),
  },
  {
    id: 'hydration.koppen-wetness-rank-correlation',
    label: 'Köppen-derived wetness rank correlation',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'rho',
    proves: 'Generated land wetness broadly ranks humid and arid Earth regions similarly to the Köppen-derived proxy.',
    doesNotProve: 'Measured precipitation totals, seasonality, soil moisture, or local hydrology.',
    evaluate: ({ project }, observations) => wetnessRankCorrelation(project, observations),
  },
  {
    id: 'hydration.koppen-extreme-balanced-accuracy',
    label: 'Köppen wet/dry extreme balanced accuracy',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'share',
    proves: 'Generated wetness separates the driest and wettest observed-proxy quartiles without assuming matching numeric scales.',
    doesNotProve: 'Correct values for middle climates, precipitation totals, or seasonal timing.',
    evaluate: ({ project }, observations) => wetDryBalancedAccuracy(project, observations),
  },
  {
    id: 'hydration.amazon-sahara-contrast',
    label: 'Amazon–Sahara wetness contrast',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'wetness',
    proves: 'The generated Earth surface makes the equatorial Amazon wetter than the subtropical Sahara.',
    doesNotProve: 'Correct boundaries, seasonal rainfall, or absolute precipitation in either region.',
    threshold: { minimum: 0.1 },
    evaluate: ({ project }, observations) => amazonSaharaContrast(project, observations),
  },
  {
    id: 'hydration.orographic-wind-alignment',
    label: 'Orographic wind/precipitation alignment',
    component: 'hydration',
    evidence: 'structural-invariant',
    unit: 'precipitation-delta',
    proves: 'High-relief cells facing the delivered wind are wetter on average than high-relief cells facing downwind.',
    doesNotProve: 'Correct local rain shadows or causal consistency for every mountain range.',
    threshold: { minimum: 0 },
    evaluate: ({ project }) => orographicWindAlignment(project),
  },
  {
    id: 'biomes.koppen-macro-f1',
    label: 'Köppen-derived biome macro-F1',
    component: 'biomes',
    evidence: 'derived-proxy',
    unit: 'F1',
    proves: 'Generated broad ecological classes overlap the compact Köppen-derived reference categories.',
    doesNotProve: 'Species ecology, biome boundaries at native resolution, or independent validation of the Köppen mapping.',
    evaluate: ({ project }, observations) => biomeMacroF1(project, observations),
  },
  {
    id: 'biomes.final-climate-classification-consistency',
    label: 'Final climate-to-biome consistency',
    component: 'biomes',
    evidence: 'structural-invariant',
    unit: 'share',
    proves: 'The delivered raster biome agrees with production classification rules applied to the delivered raster climate and hydrology.',
    doesNotProve: 'That the classification thresholds are scientifically correct.',
    threshold: { minimum: 0.995 },
    evaluate: ({ project }) => finalBiomeConsistency(project),
  },
  {
    id: 'performance.core-downstream-ms',
    label: 'Core downstream stage time',
    component: 'performance',
    evidence: 'performance',
    unit: 'ms',
    proves: 'The production climate, hydrology, biome, projection, circulation, and metrics stages stay within their measured scaling envelope.',
    doesNotProve: 'Browser rendering time, reference-data loading time, or performance on other hardware.',
    evaluate: ({ reconciliation }) => ({
      value: Object.values(reconciliation.stageTimingsMs).reduce((sum, value) => sum + value, 0),
      details: { topologyCells: reconciliation.consistency.climateCellsRefreshed },
    }),
  },
];

export function spearmanRankCorrelation(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length < 2) return 0;
  return pearson(ranks(left), ranks(right));
}

function zonalWindAgreement(project: WorldProject) {
  const { width, height } = project.primaryWorld.mapModel.resolution;
  const wind = project.primaryWorld.layers.windX;
  let supported = 0;
  let total = 0;
  for (let y = 0; y < height; y += 1) {
    const latitude = latitudeDegrees(y, height);
    const absolute = Math.abs(latitude);
    const expected = absolute >= 5 && absolute <= 30 ? -1 : absolute >= 35 && absolute <= 60 ? 1 : absolute >= 65 && absolute <= 85 ? -1 : 0;
    if (!expected) continue;
    const weight = Math.cos(latitude * Math.PI / 180);
    for (let x = 0; x < width; x += 1) {
      const value = wind[y * width + x];
      total += weight;
      if (Math.sign(value) === expected) supported += weight;
    }
  }
  return { value: supported / Math.max(1, total), sampleCount: width * height };
}

function tropicalConvergenceAgreement(project: WorldProject) {
  const { width, height } = project.primaryWorld.mapModel.resolution;
  const wind = project.primaryWorld.layers.windY;
  let supported = 0;
  let total = 0;
  for (let y = 0; y < height; y += 1) {
    const latitude = latitudeDegrees(y, height);
    if (Math.abs(latitude) < 5 || Math.abs(latitude) > 25) continue;
    // Stored flow vectors use positive Y toward geographic north.
    const expected = latitude > 0 ? -1 : 1;
    for (let x = 0; x < width; x += 1) {
      total += 1;
      if (Math.sign(wind[y * width + x]) === expected) supported += 1;
    }
  }
  return { value: supported / Math.max(1, total), sampleCount: total };
}

function currentLandConfinement(project: WorldProject) {
  const layers = project.primaryWorld.layers;
  let land = 0;
  let confined = 0;
  for (let index = 0; index < layers.water.length; index += 1) {
    if (layers.water[index]) continue;
    land += 1;
    if (Math.hypot(layers.currentX[index], layers.currentY[index]) <= 1e-7) confined += 1;
  }
  return { value: confined / Math.max(1, land), sampleCount: land };
}

function gyreRotationAgreement(
  project: WorldProject,
  circulation: EarthDownstreamOutput['reconciliation']['circulation'],
) {
  const { width } = project.primaryWorld.mapModel.resolution;
  const layers = project.primaryWorld.layers;
  let supported = 0;
  let total = 0;
  for (let cell = 0; cell < circulation.gyreOwner.length; cell += 1) {
    const owner = circulation.gyreOwner[cell];
    if (owner < 0 || !layers.water[cell]) continue;
    const gyre = circulation.packedGyres[owner];
    if (!gyre) continue;
    const x = cell % width;
    const y = Math.floor(cell / width);
    let dx = x - gyre.centerX;
    if (dx > width / 2) dx -= width;
    if (dx < -width / 2) dx += width;
    const nx = dx / Math.max(1, gyre.radiusX);
    const ny = (y - gyre.centerY) / Math.max(1, gyre.radiusY);
    const expectedX = -ny * gyre.rotationSign;
    const expectedY = nx * gyre.rotationSign;
    const magnitude = Math.hypot(expectedX, expectedY);
    if (magnitude < 0.1) continue;
    total += 1;
    if (layers.currentX[cell] * expectedX + layers.currentY[cell] * expectedY > 0) supported += 1;
  }
  return { value: supported / Math.max(1, total), sampleCount: total, details: { gyres: circulation.packedGyres.length } };
}

function wetnessRankCorrelation(project: WorldProject, observations: EarthObservations) {
  const { generated, observed } = aggregateLandPair(
    project.primaryWorld.layers.wetness,
    observations.wetness,
    observations.waterMask,
    observations.resolution,
  );
  return { value: spearmanRankCorrelation(generated, observed), sampleCount: generated.length };
}

function wetDryBalancedAccuracy(project: WorldProject, observations: EarthObservations) {
  const pair = aggregateLandPair(
    project.primaryWorld.layers.wetness,
    observations.wetness,
    observations.waterMask,
    observations.resolution,
  );
  const observedValues = [...pair.observed].sort((left, right) => left - right);
  const generatedValues = [...pair.generated].sort((left, right) => left - right);
  const observedDry = percentile(observedValues, 0.25);
  const observedWet = percentile(observedValues, 0.75);
  const generatedDry = percentile(generatedValues, 0.25);
  const generatedWet = percentile(generatedValues, 0.75);
  let dryCount = 0;
  let dryCorrect = 0;
  let wetCount = 0;
  let wetCorrect = 0;
  for (let index = 0; index < pair.generated.length; index += 1) {
    if (pair.observed[index] <= observedDry) {
      dryCount += 1;
      if (pair.generated[index] <= generatedDry) dryCorrect += 1;
    }
    if (pair.observed[index] >= observedWet) {
      wetCount += 1;
      if (pair.generated[index] >= generatedWet) wetCorrect += 1;
    }
  }
  return {
    value: ((dryCorrect / Math.max(1, dryCount)) + (wetCorrect / Math.max(1, wetCount))) / 2,
    sampleCount: dryCount + wetCount,
    details: { dryAccuracy: dryCorrect / Math.max(1, dryCount), wetAccuracy: wetCorrect / Math.max(1, wetCount) },
  };
}

function amazonSaharaContrast(project: WorldProject, observations: EarthObservations) {
  const generatedAmazon = regionMean(project.primaryWorld.layers.wetness, observations.resolution, -15, 5, -75, -50);
  const generatedSahara = regionMean(project.primaryWorld.layers.wetness, observations.resolution, 15, 30, -15, 35);
  const observedAmazon = regionMean(observations.wetness, observations.resolution, -15, 5, -75, -50, observations.waterMask);
  const observedSahara = regionMean(observations.wetness, observations.resolution, 15, 30, -15, 35, observations.waterMask);
  return {
    value: generatedAmazon - generatedSahara,
    details: {
      generatedAmazon,
      generatedSahara,
      observedContrast: observedAmazon - observedSahara,
    },
  };
}

function orographicWindAlignment(project: WorldProject) {
  const layers = project.primaryWorld.layers;
  const sourceResolution = project.primaryWorld.mapModel.resolution;
  const width = Math.min(128, sourceResolution.width);
  const height = Math.min(64, sourceResolution.height);
  const elevation = aggregateRasterLayer(layers.elevation, sourceResolution, width, height);
  const precipitation = aggregateRasterLayer(layers.climatePrecipitation, sourceResolution, width, height, layers.water);
  const windX = aggregateRasterLayer(layers.windX, sourceResolution, width, height, layers.water);
  const windY = aggregateRasterLayer(layers.windY, sourceResolution, width, height, layers.water);
  const water = aggregateWaterMask(layers.water, sourceResolution, width, height);
  let windward = 0;
  let windwardCount = 0;
  let leeward = 0;
  let leewardCount = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      if (water[cell]) continue;
      const west = y * width + ((x - 1 + width) % width);
      const east = y * width + ((x + 1) % width);
      const north = (y - 1) * width + x;
      const south = (y + 1) * width + x;
      const gradientX = (elevation[east] - elevation[west]) * 0.5;
      const gradientY = (elevation[south] - elevation[north]) * 0.5;
      const slope = Math.hypot(gradientX, gradientY);
      const speed = Math.hypot(windX[cell], windY[cell]);
      if (slope < 0.004 || speed < 0.05) continue;
      const alignment = (gradientX * windX[cell] - gradientY * windY[cell]) / (slope * speed);
      if (alignment >= 0.3) {
        windward += precipitation[cell];
        windwardCount += 1;
      } else if (alignment <= -0.3) {
        leeward += precipitation[cell];
        leewardCount += 1;
      }
    }
  }
  const windwardMean = windward / Math.max(1, windwardCount);
  const leewardMean = leeward / Math.max(1, leewardCount);
  return {
    value: windwardMean - leewardMean,
    sampleCount: windwardCount + leewardCount,
    details: { windwardMean, leewardMean },
  };
}

function biomeMacroF1(project: WorldProject, observations: EarthObservations) {
  const generatedSource = project.primaryWorld.layers.biomes;
  const mountain = biomeToCode('mountain');
  const ocean = biomeToCode('ocean');
  const categories = [
    biomeToCode('ice_cap'),
    biomeToCode('tundra'),
    biomeToCode('desert'),
    biomeToCode('grassland'),
    biomeToCode('forest'),
    biomeToCode('rainforest'),
    biomeToCode('wetland'),
  ];
  const generated: number[] = [];
  const referenceBiomes: number[] = [];
  const analysisWidth = Math.min(128, observations.resolution.width);
  const analysisHeight = Math.min(64, observations.resolution.height);
  const stepX = observations.resolution.width / analysisWidth;
  const stepY = observations.resolution.height / analysisHeight;
  for (let blockY = 0; blockY < analysisHeight; blockY += 1) {
    for (let blockX = 0; blockX < analysisWidth; blockX += 1) {
      const generatedCounts = new Uint32Array(9);
      const referenceCounts = new Uint32Array(9);
      let land = 0;
      for (let offsetY = 0; offsetY < stepY; offsetY += 1) {
        for (let offsetX = 0; offsetX < stepX; offsetX += 1) {
          const x = blockX * stepX + offsetX;
          const y = blockY * stepY + offsetY;
          const index = y * observations.resolution.width + x;
          const reference = observations.biomeCodes[index];
          if (observations.waterMask[index] || reference === mountain || reference === ocean) continue;
          land += 1;
          generatedCounts[generatedSource[index]] += 1;
          referenceCounts[reference] += 1;
        }
      }
      if (land < stepX * stepY * 0.35) continue;
      generated.push(modal(generatedCounts));
      referenceBiomes.push(modal(referenceCounts));
    }
  }
  let totalF1 = 0;
  let represented = 0;
  let samples = 0;
  const classDetails: Record<string, number> = {};
  for (const category of categories) {
    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    for (let index = 0; index < generated.length; index += 1) {
      const reference = referenceBiomes[index];
      samples += category === categories[0] ? 1 : 0;
      if (generated[index] === category && reference === category) truePositive += 1;
      else if (generated[index] === category) falsePositive += 1;
      else if (reference === category) falseNegative += 1;
    }
    if (truePositive + falsePositive + falseNegative === 0) continue;
    const precision = truePositive / Math.max(1, truePositive + falsePositive);
    const recall = truePositive / Math.max(1, truePositive + falseNegative);
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    totalF1 += f1;
    classDetails[`f1Code${category}`] = f1;
    represented += 1;
  }
  return {
    value: totalF1 / Math.max(1, represented),
    sampleCount: samples,
    details: { representedClasses: represented, mountainReferenceExcluded: true, ...classDetails },
  };
}

function finalBiomeConsistency(project: WorldProject) {
  const layers = project.primaryWorld.layers;
  let supported = 0;
  let land = 0;
  for (let index = 0; index < layers.biomes.length; index += 1) {
    if (layers.water[index]) continue;
    land += 1;
    if (layers.biomes[index] === expectedBiomeCode(project, index)) supported += 1;
  }
  return { value: supported / Math.max(1, land), sampleCount: land };
}

function expectedBiomeCode(project: WorldProject, index: number): number {
  const layers = project.primaryWorld.layers;
  if (layers.ice[index]) return biomeToCode('ice_cap');
  if (layers.lakes[index] || (layers.river[index] > 0.5 && layers.wetness[index] > 0.66)) return biomeToCode('wetland');
  if (layers.temperature[index] <= 1.5) return biomeToCode('tundra');
  if (layers.wetness[index] < 0.2) return biomeToCode('desert');
  if (layers.temperature[index] > 20 && layers.wetness[index] > 0.72) return biomeToCode('rainforest');
  if (layers.wetness[index] > 0.5) return biomeToCode('forest');
  return biomeToCode('grassland');
}

function ranks(values: readonly number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((left, right) => left.value - right.value || left.index - right.index);
  const result = new Array<number>(values.length);
  for (let start = 0; start < order.length;) {
    let end = start + 1;
    while (end < order.length && order[end].value === order[start].value) end += 1;
    const rank = (start + end - 1) / 2;
    for (let index = start; index < end; index += 1) result[order[index].index] = rank;
    start = end;
  }
  return result;
}

function pearson(left: readonly number[], right: readonly number[]): number {
  const meanLeft = left.reduce((sum, value) => sum + value, 0) / left.length;
  const meanRight = right.reduce((sum, value) => sum + value, 0) / right.length;
  let covariance = 0;
  let varianceLeft = 0;
  let varianceRight = 0;
  for (let index = 0; index < left.length; index += 1) {
    const deltaLeft = left[index] - meanLeft;
    const deltaRight = right[index] - meanRight;
    covariance += deltaLeft * deltaRight;
    varianceLeft += deltaLeft * deltaLeft;
    varianceRight += deltaRight * deltaRight;
  }
  return covariance / Math.max(Number.EPSILON, Math.sqrt(varianceLeft * varianceRight));
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction)))];
}

function aggregateLandPair(
  generatedLayer: Float32Array,
  observedLayer: Float32Array,
  water: Uint8Array,
  resolution: EarthObservations['resolution'],
): { generated: number[]; observed: number[] } {
  const width = Math.min(128, resolution.width);
  const height = Math.min(64, resolution.height);
  const stepX = resolution.width / width;
  const stepY = resolution.height / height;
  const generated: number[] = [];
  const observed: number[] = [];
  for (let blockY = 0; blockY < height; blockY += 1) {
    for (let blockX = 0; blockX < width; blockX += 1) {
      let generatedTotal = 0;
      let observedTotal = 0;
      let land = 0;
      for (let offsetY = 0; offsetY < stepY; offsetY += 1) {
        for (let offsetX = 0; offsetX < stepX; offsetX += 1) {
          const index = (blockY * stepY + offsetY) * resolution.width + blockX * stepX + offsetX;
          if (water[index]) continue;
          generatedTotal += generatedLayer[index];
          observedTotal += observedLayer[index];
          land += 1;
        }
      }
      if (land < stepX * stepY * 0.35) continue;
      generated.push(generatedTotal / land);
      observed.push(observedTotal / land);
    }
  }
  return { generated, observed };
}

function aggregateRasterLayer(
  layer: Float32Array,
  source: EarthObservations['resolution'],
  width: number,
  height: number,
  water?: Uint8Array,
): Float32Array {
  const output = new Float32Array(width * height);
  const stepX = source.width / width;
  const stepY = source.height / height;
  for (let blockY = 0; blockY < height; blockY += 1) {
    for (let blockX = 0; blockX < width; blockX += 1) {
      let total = 0;
      let count = 0;
      for (let offsetY = 0; offsetY < stepY; offsetY += 1) {
        for (let offsetX = 0; offsetX < stepX; offsetX += 1) {
          const index = (blockY * stepY + offsetY) * source.width + blockX * stepX + offsetX;
          if (water?.[index]) continue;
          total += layer[index];
          count += 1;
        }
      }
      output[blockY * width + blockX] = total / Math.max(1, count);
    }
  }
  return output;
}

function aggregateWaterMask(
  water: Uint8Array,
  source: EarthObservations['resolution'],
  width: number,
  height: number,
): Uint8Array {
  const output = new Uint8Array(width * height);
  const stepX = source.width / width;
  const stepY = source.height / height;
  for (let blockY = 0; blockY < height; blockY += 1) {
    for (let blockX = 0; blockX < width; blockX += 1) {
      let wet = 0;
      for (let offsetY = 0; offsetY < stepY; offsetY += 1) {
        for (let offsetX = 0; offsetX < stepX; offsetX += 1) {
          wet += water[(blockY * stepY + offsetY) * source.width + blockX * stepX + offsetX];
        }
      }
      output[blockY * width + blockX] = Number(wet >= stepX * stepY / 2);
    }
  }
  return output;
}

function modal(counts: Uint32Array): number {
  let code = 0;
  for (let index = 1; index < counts.length; index += 1) if (counts[index] > counts[code]) code = index;
  return code;
}

function regionMean(
  values: Float32Array,
  resolution: EarthObservations['resolution'],
  minimumLatitude: number,
  maximumLatitude: number,
  minimumLongitude: number,
  maximumLongitude: number,
  excludedWater?: Uint8Array,
): number {
  let total = 0;
  let count = 0;
  for (let y = 0; y < resolution.height; y += 1) {
    const latitude = latitudeDegrees(y, resolution.height);
    if (latitude < minimumLatitude || latitude > maximumLatitude) continue;
    for (let x = 0; x < resolution.width; x += 1) {
      const longitude = ((x + 0.5) / resolution.width) * 360 - 180;
      if (longitude < minimumLongitude || longitude > maximumLongitude) continue;
      const index = y * resolution.width + x;
      if (excludedWater?.[index]) continue;
      total += values[index];
      count += 1;
    }
  }
  return total / Math.max(1, count);
}

function latitudeDegrees(y: number, height: number): number {
  return 90 - ((y + 0.5) / height) * 180;
}
