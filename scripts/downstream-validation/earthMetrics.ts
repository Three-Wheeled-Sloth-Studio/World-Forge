import {
  biomeToCode,
  buildCubedSphereTopology,
  type WorldProject,
} from '@world-forge/shared';
import {
  equatorwardCurrentExposure,
  equirectangularTopologyLookup,
  forestWetnessThreshold,
  lakeWetnessSupportForTopology,
  LOWLAND_FLOODPLAIN_MAX_ALTITUDE,
  LOWLAND_FLOODPLAIN_MAX_RELIEF,
  LOWLAND_FLOODPLAIN_MIN_RIVER,
  LOWLAND_FLOODPLAIN_MIN_WETNESS,
} from '@world-forge/generator-core';
import type { ValidationMetricDefinition } from '@world-forge/validation-core';
import type { EarthDownstreamOutput, EarthObservations } from './earthScenario';

type EarthMetric = ValidationMetricDefinition<EarthDownstreamOutput, EarthObservations>;

const allEarthDownstreamMetrics: readonly EarthMetric[] = [
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
    id: 'ocean.western-boundary-intensification',
    label: 'Western-boundary current intensification',
    component: 'ocean',
    evidence: 'structural-invariant',
    unit: 'speed-ratio',
    proves: 'Resolved subtropical gyres carry faster currents on their western side than on their eastern side.',
    doesNotProve: 'Observed Gulf Stream, Kuroshio, Brazil, Agulhas, or East Australian Current routes or transports.',
    threshold: { minimum: 1.15 },
    evaluate: ({ project, reconciliation }) => westernBoundaryIntensification(project, reconciliation.circulation),
  },
  {
    id: 'ocean.equatorial-current-direction-agreement',
    label: 'Equatorial-current direction agreement',
    component: 'ocean',
    evidence: 'structural-invariant',
    unit: 'share',
    proves: 'Open tropical ocean supports broad westward equatorial flow and an eastward north-equatorial countercurrent.',
    doesNotProve: 'Observed basin-specific current routes, seasonal reversal, depth structure, or calibrated transport.',
    threshold: { minimum: 0.65 },
    evaluate: ({ project }) => equatorialCurrentDirectionAgreement(project),
  },
  {
    id: 'ocean.southern-circumpolar-continuity',
    label: 'Southern circumpolar current continuity',
    component: 'ocean',
    evidence: 'structural-invariant',
    unit: 'share',
    proves: 'When the Southern Ocean path is open, mid-high southern latitudes carry predominantly eastward, zonal current around the planet.',
    doesNotProve: 'Observed Antarctic Circumpolar Current fronts, speed, latitude, eddies, or volume transport.',
    threshold: { minimum: 0.75 },
    evaluate: ({ project, reconciliation }) => southernCircumpolarContinuity(project, reconciliation.circulation),
  },
  {
    id: 'ocean.equatorward-current-dry-coast-separation',
    label: 'Equatorward-current dry-coast separation',
    component: 'ocean',
    evidence: 'derived-proxy',
    unit: 'rho',
    proves: 'Whether generated equatorward boundary-current exposure co-locates with broadly drier observed-proxy coasts strongly enough to be useful to hydration.',
    doesNotProve: 'Observed current routes, sea-surface temperature, upwelling intensity, causality, or a calibrated coastal drying amount.',
    evaluate: ({ project }, observations) => coastalCirculationSeparation(project, observations, 'current'),
  },
  {
    id: 'ocean.cool-current-stability-dry-coast-separation',
    label: 'Cool-current stability dry-coast separation',
    component: 'ocean',
    evidence: 'derived-proxy',
    unit: 'rho',
    proves: 'Whether the interaction of generated equatorward boundary currents and generated subsiding air more precisely co-locates with observed-proxy dry coasts.',
    doesNotProve: 'Observed current routes, sea-surface temperature, inversion strength, causality, or a calibrated coastal drying amount.',
    evaluate: ({ project, reconciliation }, observations) => coastalCirculationSeparation(
      project,
      observations,
      'current',
      reconciliation.circulation.pressureSystems.subsidencePotential,
    ),
  },
  {
    id: 'atmosphere.offshore-ekman-dry-coast-separation',
    label: 'Offshore-Ekman dry-coast separation',
    component: 'atmosphere',
    evidence: 'derived-proxy',
    unit: 'rho',
    proves: 'Whether generated coastal wind orientation implies offshore surface transport at coasts that are broadly drier in the observed proxy.',
    doesNotProve: 'Observed winds, actual Ekman transport, sea-surface temperature, nutrient upwelling, causality, or a calibrated drying amount.',
    evaluate: ({ project }, observations) => coastalCirculationSeparation(project, observations, 'ekman'),
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
    id: 'hydration.observed-dry-false-wet-rate',
    label: 'Observed-dry false-wet rate by physical regime',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'share',
    proves: 'Observed-proxy dry extremes that the generator fails to rank as dry can be localized by generated temperature, coast distance, relief, and circulation regime.',
    doesNotProve: 'The causal mechanism of an error, absolute precipitation, seasonality, or local hydrology.',
    evaluate: ({ project, reconciliation }, observations) => hydrationRegimeDiagnostics(
      project,
      observations,
      reconciliation.circulation.pressureSystems,
    ).falseWet,
  },
  {
    id: 'hydration.observed-wet-false-dry-rate',
    label: 'Observed-wet false-dry rate by physical regime',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'share',
    proves: 'Observed-proxy wet extremes that the generator fails to rank as wet can be localized by generated temperature, coast distance, relief, and circulation regime.',
    doesNotProve: 'The causal mechanism of an error, absolute precipitation, seasonality, or local hydrology.',
    evaluate: ({ project, reconciliation }, observations) => hydrationRegimeDiagnostics(
      project,
      observations,
      reconciliation.circulation.pressureSystems,
    ).falseDry,
  },
  {
    id: 'hydration.permanent-ice-wetness-error',
    label: 'Permanent-ice liquid-wetness error',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'wetness-error',
    proves: 'Generated usable liquid wetness on Köppen EF-derived permanent ice remains close to the reference proxy while generated ice coverage is reported separately.',
    doesNotProve: 'Measured polar precipitation, snow water equivalent, seasonal melt, subglacial water, or soil moisture.',
    threshold: { maximum: 0.12 },
    evaluate: ({ project }, observations) => permanentIceWetnessError(project, observations),
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
    id: 'hydration.coastal-interior-contrast',
    label: 'Coastal–interior wetness contrast',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'wetness',
    proves: 'At continental scale, generated coastal land is wetter on average than deep interiors and can be compared with the Köppen-derived contrast.',
    doesNotProve: 'That every coast is wet or that rain-shadowed and cold-current coasts follow the global mean.',
    threshold: { minimum: 0 },
    evaluate: ({ project }, observations) => coastalInteriorContrast(project, observations),
  },
  {
    id: 'hydration.equatorial-subtropical-contrast',
    label: 'Equatorial–subtropical wetness contrast',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'wetness',
    proves: 'Generated equatorial land is wetter on average than the subtropical dry belts.',
    doesNotProve: 'Correct longitude-specific deserts, monsoon seasonality, or local precipitation totals.',
    threshold: { minimum: 0.05 },
    evaluate: ({ project }, observations) => equatorialSubtropicalContrast(project, observations),
  },
  {
    id: 'hydration.equatorial-subtropical-contrast-error',
    label: 'Equatorial–subtropical contrast absolute error',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'wetness-error',
    proves: 'The broad generated latitude contrast remains close to, rather than merely greater than, the Köppen-derived contrast.',
    doesNotProve: 'Correct longitude-specific deserts, monsoon seasonality, or local precipitation totals.',
    threshold: { maximum: 0.08 },
    evaluate: ({ project }, observations) => equatorialSubtropicalContrastError(project, observations),
  },
  {
    id: 'hydration.representative-region-rank-correlation',
    label: 'Representative-region wetness rank correlation',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'rho',
    proves: 'Broad humid, arid, maritime, continental, monsoonal, and cold-region examples are ordered similarly to the Köppen-derived proxy.',
    doesNotProve: 'Pixel-level agreement or independence from the chosen diagnostic regions.',
    threshold: { minimum: 0.45 },
    evaluate: ({ project }, observations) => representativeRegionRank(project, observations),
  },
  {
    id: 'hydration.reference-humid-region-mean',
    label: 'Reference humid-region wetness mean',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'wetness',
    proves: 'Amazon and Congo diagnostic interiors retain substantial generated moisture under continental transport changes.',
    doesNotProve: 'Correct rainfall totals, evapotranspiration, seasonality, or boundaries in either region.',
    evaluate: ({ project }, observations) => referenceRegionGroupMean(project, observations, ['amazon', 'congo']),
  },
  {
    id: 'hydration.reference-dry-region-mean',
    label: 'Reference dry-region wetness mean',
    component: 'hydration',
    evidence: 'derived-proxy',
    unit: 'wetness',
    proves: 'Sahara, Arabia, and interior Australia provide an explicit regression guard against indiscriminate land-moisture amplification.',
    doesNotProve: 'Correct desert boundaries, local oases, seasonal rainfall, or absolute soil moisture.',
    evaluate: ({ project }, observations) => referenceRegionGroupMean(project, observations, ['sahara', 'arabia', 'australiaInterior']),
  },
  {
    id: 'wetlands.glwd-native-prevalence-error',
    label: 'GLWD native wetland prevalence error',
    component: 'hydration',
    evidence: 'observed',
    unit: 'share-error',
    proves: 'Generated topology wetland prevalence is compared with GLWD v2 fractional inland aquatic/wetland coverage on comparable non-ocean, non-rice-dominant cells.',
    doesNotProve: 'Exact wetland boundaries, seasonal inundation, wetland type, or agreement where rice paddies dominate.',
    evaluate: ({ project, hydrologyTrace }, observations) => wetlandValidationProfile(project, observations, hydrologyTrace).prevalenceError,
  },
  {
    id: 'wetlands.glwd-high-coverage-recall',
    label: 'GLWD high-coverage wetland recall',
    component: 'hydration',
    evidence: 'observed',
    unit: 'share',
    proves: 'Generated topology wetlands recover cells where GLWD v2 reports at least 50 percent inland aquatic/wetland coverage.',
    doesNotProve: 'Precision, wetland subtype, hydrological mechanism, or transient inundation timing.',
    evaluate: ({ project, hydrologyTrace }, observations) => wetlandValidationProfile(project, observations, hydrologyTrace).highCoverageRecall,
  },
  {
    id: 'wetlands.glwd-fraction-separation',
    label: 'GLWD wetland-fraction separation',
    component: 'hydration',
    evidence: 'observed',
    unit: 'percentage-points',
    proves: 'Cells assigned the generated wetland biome carry higher observed GLWD fractional coverage than other comparable land cells.',
    doesNotProve: 'Calibrated wetland probability, causal hydrology, wetland subtype, or exact spatial boundaries.',
    evaluate: ({ project, hydrologyTrace }, observations) => wetlandValidationProfile(project, observations, hydrologyTrace).fractionSeparation,
  },
  {
    id: 'biomes.koppen-macro-f1',
    label: 'Köppen-derived biome macro-F1',
    component: 'biomes',
    evidence: 'derived-proxy',
    unit: 'F1',
    proves: 'Generated broad ecological classes overlap the compact Köppen-derived reference categories.',
    doesNotProve: 'Species ecology, biome boundaries at native resolution, or independent validation of the Köppen mapping.',
    evaluate: ({ project, reconciliation }, observations) => biomeMacroF1(
      project,
      observations,
      reconciliation.circulation.pressureSystems,
    ),
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

export const earthWetlandMetrics = allEarthDownstreamMetrics.filter((metric) => metric.id.startsWith('wetlands.'));
export const earthDownstreamMetrics = allEarthDownstreamMetrics.filter((metric) => !metric.id.startsWith('wetlands.'));

type WetlandValidationProfile = {
  prevalenceError: { value: number; details: Record<string, number> };
  highCoverageRecall: { value: number; details: Record<string, number> };
  fractionSeparation: { value: number; details: Record<string, number> };
};

export type WetlandHydrologyAttribution =
  | 'standingWater'
  | 'riverineFloodplain'
  | 'strongRiver'
  | 'cohesionOrResidual'
  | 'notWetland';

export type WetlandHydrologyEvidence = {
  generatedWetland: boolean;
  lake: boolean;
  wetness: number;
  river: number;
  altitude: number;
  localRelief: number;
  lakeWetnessSupport: number;
};

export function attributeWetlandHydrology(evidence: WetlandHydrologyEvidence): WetlandHydrologyAttribution {
  if (!evidence.generatedWetland) return 'notWetland';
  if (evidence.lake && evidence.wetness >= evidence.lakeWetnessSupport) return 'standingWater';
  if (evidence.altitude >= 0
    && evidence.altitude < LOWLAND_FLOODPLAIN_MAX_ALTITUDE
    && evidence.localRelief < LOWLAND_FLOODPLAIN_MAX_RELIEF
    && evidence.river > LOWLAND_FLOODPLAIN_MIN_RIVER
    && evidence.wetness > LOWLAND_FLOODPLAIN_MIN_WETNESS) return 'riverineFloodplain';
  if (evidence.river > 0.5 && evidence.wetness > 0.66) return 'strongRiver';
  return 'cohesionOrResidual';
}

export type WetlandWaterTableEvidence = WetlandHydrologyEvidence & {
  temperatureC: number;
  neighborhoodRiver: number;
  neighborhoodLake: boolean;
};

export function wetlandWaterTableCandidates(evidence: WetlandWaterTableEvidence): {
  drainageMargin: boolean;
  coldPeatland: boolean;
} {
  if (evidence.generatedWetland || evidence.lake || evidence.altitude < 0 || evidence.altitude >= 0.05) {
    return { drainageMargin: false, coldPeatland: false };
  }
  const flatSaturated = evidence.wetness > 0.55 && evidence.localRelief < LOWLAND_FLOODPLAIN_MAX_RELIEF;
  return {
    drainageMargin: flatSaturated
      && (evidence.neighborhoodLake || evidence.neighborhoodRiver > LOWLAND_FLOODPLAIN_MIN_RIVER),
    coldPeatland: evidence.river <= LOWLAND_FLOODPLAIN_MIN_RIVER
      && evidence.wetness > 0.55
      && evidence.localRelief < 0.02
      && evidence.temperatureC >= -5
      && evidence.temperatureC < 12,
  };
}

const WETLAND_ATTRIBUTION_REGIONS = [
  { id: 'amazonLowlands', minLatitude: -20, maxLatitude: 5, minLongitude: -80, maxLongitude: -45 },
  { id: 'congoLowlands', minLatitude: -12, maxLatitude: 5, minLongitude: 10, maxLongitude: 32 },
  { id: 'hudsonBayLowlands', minLatitude: 45, maxLatitude: 60, minLongitude: -100, maxLongitude: -75 },
  { id: 'westSiberianLowlands', minLatitude: 50, maxLatitude: 70, minLongitude: 55, maxLongitude: 90 },
  { id: 'sudd', minLatitude: 5, maxLatitude: 12, minLongitude: 25, maxLongitude: 35 },
  { id: 'gangesBrahmaputra', minLatitude: 20, maxLatitude: 28, minLongitude: 85, maxLongitude: 93 },
] as const;

type WetlandAttributionAccumulator = {
  highCoverage: number;
  recovered: number;
  standingWater: number;
  riverineFloodplain: number;
  strongRiver: number;
  cohesionOrResidual: number;
  saturatedNonRiverMiss: number;
};

type WetlandCandidateAccumulator = {
  cells: number;
  highCoverage: number;
  observedPercent: number;
};

function createWetlandCandidateAccumulator(): WetlandCandidateAccumulator {
  return { cells: 0, highCoverage: 0, observedPercent: 0 };
}

function summarizeWetlandCandidateTail(
  counts: Uint32Array,
  highCoverage: Uint32Array,
  observedPercent: Float64Array,
  tailShare: number,
): WetlandCandidateAccumulator {
  const target = counts.reduce((sum, count) => sum + count, 0) * tailShare;
  const result = createWetlandCandidateAccumulator();
  for (let bin = counts.length - 1; bin >= 0 && result.cells < target; bin -= 1) {
    result.cells += counts[bin];
    result.highCoverage += highCoverage[bin];
    result.observedPercent += observedPercent[bin];
  }
  return result;
}

function summarizeWetlandCandidateTarget(
  counts: Uint32Array,
  highCoverage: Uint32Array,
  observedPercent: Float64Array,
  targetCells: number,
): WetlandCandidateAccumulator {
  const result = createWetlandCandidateAccumulator();
  for (let bin = counts.length - 1; bin >= 0 && result.cells < targetCells; bin -= 1) {
    result.cells += counts[bin];
    result.highCoverage += highCoverage[bin];
    result.observedPercent += observedPercent[bin];
  }
  return result;
}

function createWetlandAttributionAccumulator(): WetlandAttributionAccumulator {
  return {
    highCoverage: 0,
    recovered: 0,
    standingWater: 0,
    riverineFloodplain: 0,
    strongRiver: 0,
    cohesionOrResidual: 0,
    saturatedNonRiverMiss: 0,
  };
}

const wetlandProfileCache = new WeakMap<WorldProject, WeakMap<EarthObservations, WetlandValidationProfile>>();

function wetlandValidationProfile(
  project: WorldProject,
  observations: EarthObservations,
  hydrologyTrace?: EarthDownstreamOutput['hydrologyTrace'],
): WetlandValidationProfile {
  const cached = wetlandProfileCache.get(project)?.get(observations);
  if (cached) return cached;
  const observedPercent = observations.wetlandPercent;
  const observedClass = observations.wetlandDominantClass;
  if (!observedPercent || !observedClass) {
    const unavailable = { value: 0, details: { available: 0 } };
    return { prevalenceError: unavailable, highCoverageRecall: unavailable, fractionSeparation: unavailable };
  }
  const world = project.primaryWorld;
  const topology = buildCubedSphereTopology(world.topology.resolution);
  const wetlandCode = biomeToCode('wetland');
  let comparable = 0;
  let generatedWetland = 0;
  let observedFractionTotal = 0;
  let observedHighCoverage = 0;
  let observedHighCoverageRecovered = 0;
  let generatedObservedTotal = 0;
  let otherObservedTotal = 0;
  let otherCount = 0;
  const groupCounts = new Uint32Array(4);
  const groupWetness = new Float64Array(4);
  const groupRiver = new Float64Array(4);
  const groupLake = new Float64Array(4);
  const groupRelief = new Float64Array(4);
  const groupAltitude = new Float64Array(4);
  const groupLowlandFloodplainSupport = new Float64Array(4);
  const groupTemperature = new Float64Array(4);
  const groupObservedPercent = new Float64Array(4);
  const groupLogAccumulation = new Float64Array(4);
  const groupTopographicWetness = new Float64Array(4);
  const attributionTotals = createWetlandAttributionAccumulator();
  const attributionObservedPercent = {
    standingWater: 0,
    riverineFloodplain: 0,
    strongRiver: 0,
    cohesionOrResidual: 0,
  };
  const attributionGeneratedCount = {
    standingWater: 0,
    riverineFloodplain: 0,
    strongRiver: 0,
    cohesionOrResidual: 0,
  };
  const regionAttribution = Object.fromEntries(
    WETLAND_ATTRIBUTION_REGIONS.map((region) => [region.id, createWetlandAttributionAccumulator()]),
  ) as Record<(typeof WETLAND_ATTRIBUTION_REGIONS)[number]['id'], WetlandAttributionAccumulator>;
  const lakeWetnessSupport = lakeWetnessSupportForTopology(topology.resolution);
  let saturatedNonRiverCandidateCells = 0;
  let saturatedNonRiverCandidateHighCoverage = 0;
  let saturatedNonRiverCandidateObservedPercent = 0;
  const waterTableCandidates = {
    drainageMargin: createWetlandCandidateAccumulator(),
    coldPeatland: createWetlandCandidateAccumulator(),
    combined: createWetlandCandidateAccumulator(),
  };
  const catchmentCandidates = {
    twi5: createWetlandCandidateAccumulator(),
    twi6: createWetlandCandidateAccumulator(),
    twi7: createWetlandCandidateAccumulator(),
  };
  const catchmentHistogramCounts = new Uint32Array(256);
  const catchmentHistogramHighCoverage = new Uint32Array(256);
  const catchmentHistogramObservedPercent = new Float64Array(256);
  const jointBudgetHistogramCounts = new Uint32Array(4096);
  const jointBudgetHistogramHighCoverage = new Uint32Array(4096);
  const jointBudgetHistogramObservedPercent = new Float64Array(4096);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (world.topologyLayers.water[cell]) continue;
    const x = Math.min(
      observations.resolution.width - 1,
      Math.max(0, Math.floor(((topology.longitudes[cell] + Math.PI) / (Math.PI * 2)) * observations.resolution.width)),
    );
    const y = Math.min(
      observations.resolution.height - 1,
      Math.max(0, Math.floor(((Math.PI / 2 - topology.latitudes[cell]) / Math.PI) * observations.resolution.height)),
    );
    const reference = y * observations.resolution.width + x;
    const percent = observedPercent[reference];
    const dominantClass = observedClass[reference];
    if (percent === 255 || dominantClass === 255 || dominantClass === 33) continue;
    const generated = world.topologyLayers.biomes[cell] === wetlandCode;
    const observed = percent >= 50;
    const group = (observed ? 2 : 0) + (generated ? 1 : 0);
    let localRelief = 0;
    let neighborhoodRiver = world.topologyLayers.river[cell];
    let neighborhoodLake = Boolean(world.topologyLayers.lakes[cell]);
    for (let direction = 0; direction < 4; direction += 1) {
      const neighbor = topology.neighbors[cell * 4 + direction];
      if (neighbor < 0) continue;
      localRelief = Math.max(localRelief, Math.abs(
        world.topologyLayers.elevation[neighbor] - world.topologyLayers.elevation[cell],
      ));
      neighborhoodRiver = Math.max(neighborhoodRiver, world.topologyLayers.river[neighbor]);
      neighborhoodLake ||= Boolean(world.topologyLayers.lakes[neighbor]);
      for (let secondDirection = 0; secondDirection < 4; secondDirection += 1) {
        const secondNeighbor = topology.neighbors[neighbor * 4 + secondDirection];
        if (secondNeighbor < 0) continue;
        neighborhoodRiver = Math.max(neighborhoodRiver, world.topologyLayers.river[secondNeighbor]);
        neighborhoodLake ||= Boolean(world.topologyLayers.lakes[secondNeighbor]);
      }
    }
    groupCounts[group] += 1;
    groupWetness[group] += world.topologyLayers.wetness[cell];
    groupRiver[group] += world.topologyLayers.river[cell];
    groupLake[group] += world.topologyLayers.lakes[cell] ? 1 : 0;
    groupRelief[group] += localRelief;
    const altitude = Math.max(0, world.topologyLayers.elevation[cell] - world.seaLevel);
    groupAltitude[group] += altitude;
    if (altitude < LOWLAND_FLOODPLAIN_MAX_ALTITUDE
      && localRelief < LOWLAND_FLOODPLAIN_MAX_RELIEF
      && world.topologyLayers.river[cell] > LOWLAND_FLOODPLAIN_MIN_RIVER
      && world.topologyLayers.wetness[cell] > LOWLAND_FLOODPLAIN_MIN_WETNESS) {
      groupLowlandFloodplainSupport[group] += 1;
    }
    groupTemperature[group] += world.topologyLayers.temperature[cell];
    groupObservedPercent[group] += percent;
    const logAccumulation = Math.log1p(hydrologyTrace?.accumulation[cell] ?? 0);
    const topographicWetness = logAccumulation - Math.log(localRelief + 0.002);
    groupLogAccumulation[group] += logAccumulation;
    groupTopographicWetness[group] += topographicWetness;
    if (hydrologyTrace
      && altitude < 0.05
      && world.topologyLayers.wetness[cell] > 0.5) {
      const retentionScore = topographicWetness
        + (world.topologyLayers.lakes[cell] ? 1 : 0)
        + Math.min(0.5, world.topologyLayers.river[cell] * 0.5);
      const jointBin = Math.max(0, Math.min(
        jointBudgetHistogramCounts.length - 1,
        Math.floor(((retentionScore + 4) / 18) * jointBudgetHistogramCounts.length),
      ));
      jointBudgetHistogramCounts[jointBin] += 1;
      jointBudgetHistogramObservedPercent[jointBin] += percent;
      if (observed) jointBudgetHistogramHighCoverage[jointBin] += 1;
    }
    const attribution = attributeWetlandHydrology({
      generatedWetland: generated,
      lake: Boolean(world.topologyLayers.lakes[cell]),
      wetness: world.topologyLayers.wetness[cell],
      river: world.topologyLayers.river[cell],
      altitude: world.topologyLayers.elevation[cell] - world.seaLevel,
      localRelief,
      lakeWetnessSupport,
    });
    const saturatedNonRiverCandidate = !generated
      && !world.topologyLayers.lakes[cell]
      && world.topologyLayers.river[cell] <= LOWLAND_FLOODPLAIN_MIN_RIVER
      && world.topologyLayers.wetness[cell] > 0.66
      && localRelief < LOWLAND_FLOODPLAIN_MAX_RELIEF;
    const saturatedNonRiverMiss = observed && saturatedNonRiverCandidate;
    if (saturatedNonRiverCandidate) {
      saturatedNonRiverCandidateCells += 1;
      saturatedNonRiverCandidateObservedPercent += percent;
      if (observed) saturatedNonRiverCandidateHighCoverage += 1;
    }
    const waterTable = wetlandWaterTableCandidates({
      generatedWetland: generated,
      lake: Boolean(world.topologyLayers.lakes[cell]),
      wetness: world.topologyLayers.wetness[cell],
      river: world.topologyLayers.river[cell],
      altitude: world.topologyLayers.elevation[cell] - world.seaLevel,
      localRelief,
      lakeWetnessSupport,
      temperatureC: world.topologyLayers.temperature[cell],
      neighborhoodRiver,
      neighborhoodLake,
    });
    for (const id of ['drainageMargin', 'coldPeatland'] as const) {
      if (!waterTable[id]) continue;
      waterTableCandidates[id].cells += 1;
      waterTableCandidates[id].observedPercent += percent;
      if (observed) waterTableCandidates[id].highCoverage += 1;
    }
    if (waterTable.drainageMargin || waterTable.coldPeatland) {
      waterTableCandidates.combined.cells += 1;
      waterTableCandidates.combined.observedPercent += percent;
      if (observed) waterTableCandidates.combined.highCoverage += 1;
    }
    if (!generated
      && altitude < 0.05
      && world.topologyLayers.wetness[cell] > 0.5
      && hydrologyTrace) {
      const histogramBin = Math.max(0, Math.min(
        catchmentHistogramCounts.length - 1,
        Math.floor(((topographicWetness + 4) / 16) * catchmentHistogramCounts.length),
      ));
      catchmentHistogramCounts[histogramBin] += 1;
      catchmentHistogramObservedPercent[histogramBin] += percent;
      if (observed) catchmentHistogramHighCoverage[histogramBin] += 1;
      for (const [id, threshold] of [['twi5', 5], ['twi6', 6], ['twi7', 7]] as const) {
        if (topographicWetness < threshold) continue;
        catchmentCandidates[id].cells += 1;
        catchmentCandidates[id].observedPercent += percent;
        if (observed) catchmentCandidates[id].highCoverage += 1;
      }
    }
    if (observed) {
      attributionTotals.highCoverage += 1;
      if (generated) {
        attributionTotals.recovered += 1;
        attributionTotals[attribution as Exclude<WetlandHydrologyAttribution, 'notWetland'>] += 1;
      } else if (saturatedNonRiverMiss) attributionTotals.saturatedNonRiverMiss += 1;
      const latitude = topology.latitudes[cell] * 180 / Math.PI;
      const longitude = topology.longitudes[cell] * 180 / Math.PI;
      for (const region of WETLAND_ATTRIBUTION_REGIONS) {
        if (latitude < region.minLatitude || latitude > region.maxLatitude
          || longitude < region.minLongitude || longitude > region.maxLongitude) continue;
        const regionTotals = regionAttribution[region.id];
        regionTotals.highCoverage += 1;
        if (generated) {
          regionTotals.recovered += 1;
          regionTotals[attribution as Exclude<WetlandHydrologyAttribution, 'notWetland'>] += 1;
        } else if (saturatedNonRiverMiss) regionTotals.saturatedNonRiverMiss += 1;
      }
    }
    if (generated && attribution !== 'notWetland') {
      attributionObservedPercent[attribution] += percent;
      attributionGeneratedCount[attribution] += 1;
    }
    comparable += 1;
    observedFractionTotal += percent / 100;
    if (generated) {
      generatedWetland += 1;
      generatedObservedTotal += percent;
    } else {
      otherCount += 1;
      otherObservedTotal += percent;
    }
    if (percent >= 50) {
      observedHighCoverage += 1;
      if (generated) observedHighCoverageRecovered += 1;
    }
  }
  const generatedShare = generatedWetland / Math.max(1, comparable);
  const observedShare = observedFractionTotal / Math.max(1, comparable);
  const catchmentPercentileCandidates = {
    top10Percent: summarizeWetlandCandidateTail(
      catchmentHistogramCounts,
      catchmentHistogramHighCoverage,
      catchmentHistogramObservedPercent,
      0.1,
    ),
    top5Percent: summarizeWetlandCandidateTail(
      catchmentHistogramCounts,
      catchmentHistogramHighCoverage,
      catchmentHistogramObservedPercent,
      0.05,
    ),
    top1Percent: summarizeWetlandCandidateTail(
      catchmentHistogramCounts,
      catchmentHistogramHighCoverage,
      catchmentHistogramObservedPercent,
      0.01,
    ),
  };
  const strongRiverReplacement = summarizeWetlandCandidateTarget(
    catchmentHistogramCounts,
    catchmentHistogramHighCoverage,
    catchmentHistogramObservedPercent,
    attributionGeneratedCount.strongRiver,
  );
  const jointBudgetCandidate = summarizeWetlandCandidateTarget(
    jointBudgetHistogramCounts,
    jointBudgetHistogramHighCoverage,
    jointBudgetHistogramObservedPercent,
    generatedWetland,
  );
  const details = {
    available: 1,
    comparableTopologyCells: comparable,
    generatedWetlandCells: generatedWetland,
    observedHighCoverageCells: observedHighCoverage,
    generatedWetlandShare: generatedShare,
    observedFractionalShare: observedShare,
    ...Object.fromEntries(
      (['standingWater', 'riverineFloodplain', 'strongRiver', 'cohesionOrResidual'] as const).flatMap((branch) => {
        const count = attributionTotals[branch];
        return [
          [`attribution${capitalizeMetricId(branch)}GeneratedCells`, attributionGeneratedCount[branch]],
          [`attribution${capitalizeMetricId(branch)}HighCoverageRecovered`, count],
          [`attribution${capitalizeMetricId(branch)}GeneratedMeanObservedPercent`, attributionObservedPercent[branch] / Math.max(1, attributionGeneratedCount[branch])],
        ];
      }),
    ),
    catchmentStrongRiverReplacementCandidateCells: strongRiverReplacement.cells,
    catchmentStrongRiverReplacementHighCoverageShare:
      strongRiverReplacement.highCoverage / Math.max(1, strongRiverReplacement.cells),
    catchmentStrongRiverReplacementMeanObservedPercent:
      strongRiverReplacement.observedPercent / Math.max(1, strongRiverReplacement.cells),
    catchmentStrongRiverReplacementRecallDelta:
      (strongRiverReplacement.highCoverage - attributionTotals.strongRiver) / Math.max(1, observedHighCoverage),
    catchmentJointBudgetCandidateCells: jointBudgetCandidate.cells,
    catchmentJointBudgetHighCoverageRecall:
      jointBudgetCandidate.highCoverage / Math.max(1, observedHighCoverage),
    catchmentJointBudgetRecallDelta:
      (jointBudgetCandidate.highCoverage - observedHighCoverageRecovered) / Math.max(1, observedHighCoverage),
    catchmentJointBudgetMeanObservedPercent:
      jointBudgetCandidate.observedPercent / Math.max(1, jointBudgetCandidate.cells),
    attributionSaturatedNonRiverHighCoverageMisses: attributionTotals.saturatedNonRiverMiss,
    attributionSaturatedNonRiverHighCoverageMissShare:
      attributionTotals.saturatedNonRiverMiss / Math.max(1, attributionTotals.highCoverage - attributionTotals.recovered),
    attributionSaturatedNonRiverCandidateCells: saturatedNonRiverCandidateCells,
    attributionSaturatedNonRiverCandidateHighCoverageShare:
      saturatedNonRiverCandidateHighCoverage / Math.max(1, saturatedNonRiverCandidateCells),
    attributionSaturatedNonRiverCandidateMeanObservedPercent:
      saturatedNonRiverCandidateObservedPercent / Math.max(1, saturatedNonRiverCandidateCells),
    ...Object.fromEntries(
      (['drainageMargin', 'coldPeatland', 'combined'] as const).flatMap((id) => {
        const candidate = waterTableCandidates[id];
        return [
          [`waterTable${capitalizeMetricId(id)}CandidateCells`, candidate.cells],
          [`waterTable${capitalizeMetricId(id)}HighCoverageShare`, candidate.highCoverage / Math.max(1, candidate.cells)],
          [`waterTable${capitalizeMetricId(id)}MeanObservedPercent`, candidate.observedPercent / Math.max(1, candidate.cells)],
        ];
      }),
    ),
    hydrologyTraceAvailable: hydrologyTrace ? 1 : 0,
    ...Object.fromEntries(
      (['twi5', 'twi6', 'twi7'] as const).flatMap((id) => {
        const candidate = catchmentCandidates[id];
        return [
          [`catchment${capitalizeMetricId(id)}CandidateCells`, candidate.cells],
          [`catchment${capitalizeMetricId(id)}HighCoverageShare`, candidate.highCoverage / Math.max(1, candidate.cells)],
          [`catchment${capitalizeMetricId(id)}MeanObservedPercent`, candidate.observedPercent / Math.max(1, candidate.cells)],
        ];
      }),
    ),
    ...Object.fromEntries(
      (['top10Percent', 'top5Percent', 'top1Percent'] as const).flatMap((id) => {
        const candidate = catchmentPercentileCandidates[id];
        return [
          [`catchment${capitalizeMetricId(id)}CandidateCells`, candidate.cells],
          [`catchment${capitalizeMetricId(id)}HighCoverageShare`, candidate.highCoverage / Math.max(1, candidate.cells)],
          [`catchment${capitalizeMetricId(id)}MeanObservedPercent`, candidate.observedPercent / Math.max(1, candidate.cells)],
        ];
      }),
    ),
    ...Object.fromEntries(
      WETLAND_ATTRIBUTION_REGIONS.flatMap((region) => {
        const totals = regionAttribution[region.id];
        return [
          [`region${capitalizeMetricId(region.id)}HighCoverageCells`, totals.highCoverage],
          [`region${capitalizeMetricId(region.id)}Recall`, totals.recovered / Math.max(1, totals.highCoverage)],
          [`region${capitalizeMetricId(region.id)}StandingWaterRecovered`, totals.standingWater],
          [`region${capitalizeMetricId(region.id)}RiverineFloodplainRecovered`, totals.riverineFloodplain],
          [`region${capitalizeMetricId(region.id)}StrongRiverRecovered`, totals.strongRiver],
          [`region${capitalizeMetricId(region.id)}CohesionOrResidualRecovered`, totals.cohesionOrResidual],
          [`region${capitalizeMetricId(region.id)}SaturatedNonRiverMisses`, totals.saturatedNonRiverMiss],
        ];
      }),
    ),
    ...Object.fromEntries(
      ['referenceLowGeneratedOther', 'referenceLowGeneratedWetland', 'referenceHighGeneratedOther', 'referenceHighGeneratedWetland']
        .flatMap((label, group) => {
          const count = Math.max(1, groupCounts[group]);
          return [
            [`${label}Count`, groupCounts[group]],
            [`${label}MeanWetness`, groupWetness[group] / count],
            [`${label}MeanRiver`, groupRiver[group] / count],
            [`${label}LakeShare`, groupLake[group] / count],
            [`${label}MeanRelief`, groupRelief[group] / count],
            [`${label}MeanAltitudeAboveSeaLevel`, groupAltitude[group] / count],
            [`${label}LowlandFloodplainSupportShare`, groupLowlandFloodplainSupport[group] / count],
            [`${label}MeanTemperatureC`, groupTemperature[group] / count],
            [`${label}MeanObservedPercent`, groupObservedPercent[group] / count],
            [`${label}MeanLogAccumulation`, groupLogAccumulation[group] / count],
            [`${label}MeanTopographicWetness`, groupTopographicWetness[group] / count],
          ];
        }),
    ),
  };
  const profile: WetlandValidationProfile = {
    prevalenceError: { value: Math.abs(generatedShare - observedShare), details },
    highCoverageRecall: {
      value: observedHighCoverageRecovered / Math.max(1, observedHighCoverage),
      details: { ...details, observedHighCoverageRecovered },
    },
    fractionSeparation: {
      value: generatedObservedTotal / Math.max(1, generatedWetland) - otherObservedTotal / Math.max(1, otherCount),
      details,
    },
  };
  let observationCache = wetlandProfileCache.get(project);
  if (!observationCache) {
    observationCache = new WeakMap<EarthObservations, WetlandValidationProfile>();
    wetlandProfileCache.set(project, observationCache);
  }
  observationCache.set(observations, profile);
  return profile;
}

export function spearmanRankCorrelation(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length < 2) return 0;
  return pearson(ranks(left), ranks(right));
}

export function offshoreEkmanExposure(
  windX: number,
  windY: number,
  offshoreX: number,
  offshoreY: number,
  latitudeDegreesValue: number,
): number {
  const windSpeed = Math.hypot(windX, windY);
  const offshoreMagnitude = Math.hypot(offshoreX, offshoreY);
  if (windSpeed < 1e-7 || offshoreMagnitude < 1e-7 || Math.abs(latitudeDegreesValue) < 5) return 0;
  const hemisphere = latitudeDegreesValue >= 0 ? 1 : -1;
  const ekmanX = -windY * hemisphere;
  const ekmanY = windX * hemisphere;
  const alignment = (
    ekmanX * offshoreX + ekmanY * offshoreY
  ) / (windSpeed * offshoreMagnitude);
  return Math.max(0, alignment) * Math.min(1, windSpeed / 0.35);
}


export type HydrationRegimeSample = {
  generatedWetness: number;
  observedWetness: number;
  temperatureC: number;
  coastDistance: number;
  relief: number;
  absoluteLatitude: number;
  precipitation?: number;
  atmosphericMoisture?: number;
  recyclableSource?: number;
  hydrationLoss?: number;
  subsidence?: number;
  convergence?: number;
  currentExposure?: number;
  coolCurrentStability?: number;
  offshoreEkman?: number;
  oceanWestExposure?: number;
};

type HydrationErrorProfile = {
  value: number;
  sampleCount: number;
  details: Record<string, number>;
};

export function hydrationRegimeErrorProfiles(samples: readonly HydrationRegimeSample[]): {
  falseWet: HydrationErrorProfile;
  falseDry: HydrationErrorProfile;
} {
  const observed = samples.map((sample) => sample.observedWetness).sort((left, right) => left - right);
  const generated = samples.map((sample) => sample.generatedWetness).sort((left, right) => left - right);
  const relief = samples.map((sample) => sample.relief).sort((left, right) => left - right);
  const thresholds = {
    observedDry: percentile(observed, 0.25),
    observedWet: percentile(observed, 0.75),
    generatedDry: percentile(generated, 0.25),
    generatedWet: percentile(generated, 0.75),
    lowRelief: percentile(relief, 1 / 3),
    highRelief: percentile(relief, 2 / 3),
  };
  const regimes: readonly [string, (sample: HydrationRegimeSample) => boolean][] = [
    ['temperatureCold', (sample) => sample.temperatureC <= 5],
    ['temperatureTemperate', (sample) => sample.temperatureC > 5 && sample.temperatureC <= 20],
    ['temperatureHot', (sample) => sample.temperatureC > 20],
    ['coastCoastal', (sample) => sample.coastDistance <= 1],
    ['coastTransitional', (sample) => sample.coastDistance >= 2 && sample.coastDistance <= 3],
    ['coastDeepInterior', (sample) => sample.coastDistance >= 4],
    ['reliefLow', (sample) => sample.relief <= thresholds.lowRelief],
    ['reliefModerate', (sample) => sample.relief > thresholds.lowRelief && sample.relief < thresholds.highRelief],
    ['reliefHigh', (sample) => sample.relief >= thresholds.highRelief],
    ['circulationEquatorial', (sample) => sample.absoluteLatitude < 15],
    ['circulationSubsiding', (sample) => sample.absoluteLatitude >= 15 && sample.absoluteLatitude < 35],
    ['circulationMidlatitude', (sample) => sample.absoluteLatitude >= 35 && sample.absoluteLatitude < 60],
    ['circulationPolar', (sample) => sample.absoluteLatitude >= 60],
    ['coldCoastal', (sample) => sample.temperatureC <= 5 && sample.coastDistance <= 1],
    ['coldDeepInterior', (sample) => sample.temperatureC <= 5 && sample.coastDistance >= 4],
    ['temperateCoastal', (sample) => sample.temperatureC > 5 && sample.temperatureC <= 20 && sample.coastDistance <= 1],
    ['temperateDeepInterior', (sample) => sample.temperatureC > 5 && sample.temperatureC <= 20 && sample.coastDistance >= 4],
    ['hotCoastal', (sample) => sample.temperatureC > 20 && sample.coastDistance <= 1],
    ['hotDeepInterior', (sample) => sample.temperatureC > 20 && sample.coastDistance >= 4],
    ['subsidingCoastal', (sample) => sample.absoluteLatitude >= 15 && sample.absoluteLatitude < 35 && sample.coastDistance <= 1],
    ['subsidingDeepInterior', (sample) => sample.absoluteLatitude >= 15 && sample.absoluteLatitude < 35 && sample.coastDistance >= 4],
    ['midlatitudeCoastal', (sample) => sample.absoluteLatitude >= 35 && sample.absoluteLatitude < 60 && sample.coastDistance <= 1],
    ['midlatitudeDeepInterior', (sample) => sample.absoluteLatitude >= 35 && sample.absoluteLatitude < 60 && sample.coastDistance >= 4],
    ['polarCoastal', (sample) => sample.absoluteLatitude >= 60 && sample.coastDistance <= 1],
    ['polarDeepInterior', (sample) => sample.absoluteLatitude >= 60 && sample.coastDistance >= 4],
  ];
  const falseWet = buildHydrationErrorProfile(
    samples,
    (sample) => sample.observedWetness <= thresholds.observedDry,
    (sample) => sample.generatedWetness > thresholds.generatedDry,
    regimes,
    {
      observedThreshold: thresholds.observedDry,
      generatedThreshold: thresholds.generatedDry,
    },
  );
  addTemperateCoastalMechanismDetails(falseWet, samples, thresholds.observedDry, thresholds.generatedDry);
  const falseDry = buildHydrationErrorProfile(
    samples,
    (sample) => sample.observedWetness >= thresholds.observedWet,
    (sample) => sample.generatedWetness < thresholds.generatedWet,
    regimes,
    {
      observedThreshold: thresholds.observedWet,
      generatedThreshold: thresholds.generatedWet,
    },
  );
  addDeepInteriorMechanismDetails(falseDry, samples, thresholds.observedWet, thresholds.generatedWet);
  return {
    falseWet,
    falseDry,
  };
}

function addTemperateCoastalMechanismDetails(
  profile: HydrationErrorProfile,
  samples: readonly HydrationRegimeSample[],
  observedDryThreshold: number,
  generatedDryThreshold: number,
): void {
  const temperateDryCoasts = samples.filter((sample) => (
    sample.temperatureC > 5
      && sample.temperatureC <= 20
      && sample.coastDistance <= 1
      && sample.observedWetness <= observedDryThreshold
  ));
  const failed = temperateDryCoasts.filter((sample) => sample.generatedWetness > generatedDryThreshold);
  const successful = temperateDryCoasts.filter((sample) => sample.generatedWetness <= generatedDryThreshold);
  profile.details.temperateDryCoastFailures = failed.length;
  profile.details.temperateDryCoastSuccesses = successful.length;
  const fields: readonly [string, keyof HydrationRegimeSample][] = [
    ['Precipitation', 'precipitation'],
    ['AtmosphericMoisture', 'atmosphericMoisture'],
    ['HydrationLoss', 'hydrationLoss'],
    ['Subsidence', 'subsidence'],
    ['Convergence', 'convergence'],
    ['Relief', 'relief'],
    ['CurrentExposure', 'currentExposure'],
    ['CoolCurrentStability', 'coolCurrentStability'],
    ['OffshoreEkman', 'offshoreEkman'],
    ['OceanWestExposure', 'oceanWestExposure'],
  ];
  for (const [label, field] of fields) {
    profile.details[`temperateDryCoastFailed${label}Mean`] = sampleFieldMean(failed, field);
    profile.details[`temperateDryCoastSuccessful${label}Mean`] = sampleFieldMean(successful, field);
  }
}

function addDeepInteriorMechanismDetails(
  profile: HydrationErrorProfile,
  samples: readonly HydrationRegimeSample[],
  observedWetThreshold: number,
  generatedWetThreshold: number,
): void {
  const deepWet = samples.filter((sample) => (
    sample.coastDistance >= 4 && sample.observedWetness >= observedWetThreshold
  ));
  const failed = deepWet.filter((sample) => sample.generatedWetness < generatedWetThreshold);
  const successful = deepWet.filter((sample) => sample.generatedWetness >= generatedWetThreshold);
  profile.details.deepInteriorWetFailures = failed.length;
  profile.details.deepInteriorWetSuccesses = successful.length;
  const fields: readonly [string, keyof HydrationRegimeSample][] = [
    ['Precipitation', 'precipitation'],
    ['AtmosphericMoisture', 'atmosphericMoisture'],
    ['RecyclableSource', 'recyclableSource'],
    ['HydrationLoss', 'hydrationLoss'],
    ['Subsidence', 'subsidence'],
    ['Convergence', 'convergence'],
    ['Relief', 'relief'],
  ];
  for (const [label, field] of fields) {
    profile.details[`deepInteriorFailed${label}Mean`] = sampleFieldMean(failed, field);
    profile.details[`deepInteriorSuccessful${label}Mean`] = sampleFieldMean(successful, field);
  }
}

function sampleFieldMean(
  samples: readonly HydrationRegimeSample[],
  field: keyof HydrationRegimeSample,
): number {
  let total = 0;
  let count = 0;
  for (const sample of samples) {
    const value = sample[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    total += value;
    count += 1;
  }
  return total / Math.max(1, count);
}

function buildHydrationErrorProfile(
  samples: readonly HydrationRegimeSample[],
  observedExtreme: (sample: HydrationRegimeSample) => boolean,
  misclassified: (sample: HydrationRegimeSample) => boolean,
  regimes: readonly [string, (sample: HydrationRegimeSample) => boolean][],
  thresholds: { observedThreshold: number; generatedThreshold: number },
): HydrationErrorProfile {
  const extremeSamples = samples.filter(observedExtreme);
  const errors = extremeSamples.filter(misclassified).length;
  const overallRate = errors / Math.max(1, extremeSamples.length);
  const details: Record<string, number> = {
    observedThreshold: thresholds.observedThreshold,
    generatedThreshold: thresholds.generatedThreshold,
    errorCells: errors,
  };
  for (const [id, matches] of regimes) {
    const regimeSamples = extremeSamples.filter(matches);
    const regimeErrors = regimeSamples.filter(misclassified).length;
    const rate = regimeErrors / Math.max(1, regimeSamples.length);
    details[`${id}Samples`] = regimeSamples.length;
    details[`${id}Rate`] = rate;
    details[`${id}Lift`] = regimeSamples.length ? rate - overallRate : 0;
  }
  return { value: overallRate, sampleCount: extremeSamples.length, details };
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

function westernBoundaryIntensification(
  project: WorldProject,
  circulation: EarthDownstreamOutput['reconciliation']['circulation'],
) {
  const { width } = project.primaryWorld.mapModel.resolution;
  const layers = project.primaryWorld.layers;
  let westernSpeed = 0;
  let westernSamples = 0;
  let easternSpeed = 0;
  let easternSamples = 0;
  for (let cell = 0; cell < circulation.gyreOwner.length; cell += 1) {
    const owner = circulation.gyreOwner[cell];
    if (owner < 0 || !layers.water[cell]) continue;
    const gyre = circulation.packedGyres[owner];
    if (!gyre || gyre.kind !== 'subtropical') continue;
    const x = cell % width;
    const y = Math.floor(cell / width);
    let dx = x - gyre.centerX;
    if (dx > width / 2) dx -= width;
    if (dx < -width / 2) dx += width;
    const nx = dx / Math.max(1, gyre.radiusX);
    const ny = (y - gyre.centerY) / Math.max(1, gyre.radiusY);
    if (Math.abs(ny) > 0.8) continue;
    const speed = Math.hypot(layers.currentX[cell], layers.currentY[cell]);
    if (nx <= -0.55) {
      westernSpeed += speed;
      westernSamples += 1;
    } else if (nx >= 0.55) {
      easternSpeed += speed;
      easternSamples += 1;
    }
  }
  const westernMean = westernSpeed / Math.max(1, westernSamples);
  const easternMean = easternSpeed / Math.max(1, easternSamples);
  return {
    value: westernMean / Math.max(1e-6, easternMean),
    sampleCount: westernSamples + easternSamples,
    details: { westernMean, easternMean, westernSamples, easternSamples },
  };
}

function equatorialCurrentDirectionAgreement(project: WorldProject) {
  const { width, height } = project.primaryWorld.mapModel.resolution;
  const layers = project.primaryWorld.layers;
  let westwardSupported = 0;
  let westwardSamples = 0;
  let counterSupported = 0;
  let counterSamples = 0;
  for (let y = 0; y < height; y += 1) {
    const latitude = latitudeDegrees(y, height);
    const westwardBand = latitude >= -2.5 && latitude <= 2.5;
    const counterCurrentBand = latitude >= 3 && latitude <= 7;
    if (!westwardBand && !counterCurrentBand) continue;
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      if (!layers.water[cell]) continue;
      if (westwardBand) {
        westwardSamples += 1;
        if (layers.currentX[cell] < 0) westwardSupported += 1;
      }
      if (counterCurrentBand) {
        counterSamples += 1;
        if (layers.currentX[cell] > 0) counterSupported += 1;
      }
    }
  }
  const westwardShare = westwardSupported / Math.max(1, westwardSamples);
  const counterCurrentShare = counterSupported / Math.max(1, counterSamples);
  return {
    value: (westwardShare + counterCurrentShare) * 0.5,
    sampleCount: westwardSamples + counterSamples,
    details: { westwardShare, counterCurrentShare, westwardSamples, counterSamples },
  };
}

function southernCircumpolarContinuity(
  project: WorldProject,
  circulation: EarthDownstreamOutput['reconciliation']['circulation'],
) {
  const { width, height } = project.primaryWorld.mapModel.resolution;
  const layers = project.primaryWorld.layers;
  if (!circulation.pressureSystems.openSouthernCircumpolarPath) {
    return { value: 1, sampleCount: 0, details: { openPath: false, eastwardShare: 1, longitudeCoverage: 1 } };
  }
  let supported = 0;
  let samples = 0;
  const supportedColumns = new Uint8Array(width);
  const oceanColumns = new Uint8Array(width);
  for (let y = 0; y < height; y += 1) {
    const latitude = latitudeDegrees(y, height);
    if (latitude < -72 || latitude > -50) continue;
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      if (!layers.water[cell]) continue;
      oceanColumns[x] = 1;
      samples += 1;
      const speed = Math.hypot(layers.currentX[cell], layers.currentY[cell]);
      const eastwardZonal = layers.currentX[cell] > 0
        && speed > 1e-6
        && layers.currentX[cell] / speed >= 0.6;
      if (eastwardZonal) {
        supported += 1;
        supportedColumns[x] = 1;
      }
    }
  }
  const eastwardShare = supported / Math.max(1, samples);
  let oceanColumnCount = 0;
  let supportedColumnCount = 0;
  for (let x = 0; x < width; x += 1) {
    oceanColumnCount += oceanColumns[x];
    supportedColumnCount += supportedColumns[x];
  }
  const longitudeCoverage = supportedColumnCount / Math.max(1, oceanColumnCount);
  return {
    value: (eastwardShare + longitudeCoverage) * 0.5,
    sampleCount: samples,
    details: { openPath: true, eastwardShare, longitudeCoverage, oceanColumnCount },
  };
}

function coastalCirculationSeparation(
  project: WorldProject,
  observations: EarthObservations,
  mode: 'current' | 'ekman',
  stability?: Float32Array,
) {
  const source = observations.resolution;
  const width = Math.min(128, source.width);
  const height = Math.min(64, source.height);
  const layers = project.primaryWorld.layers;
  const water = aggregateWaterMask(observations.waterMask, source, width, height);
  const coastDistance = distanceFromWater(water, width, height);
  const observed = aggregateRasterLayer(observations.wetness, source, width, height, observations.waterMask);
  const generated = aggregateRasterLayer(layers.wetness, source, width, height, observations.waterMask);
  const vectorX = aggregateOceanRasterLayer(
    mode === 'current' ? layers.currentX : layers.windX,
    source,
    width,
    height,
    observations.waterMask,
  );
  const vectorY = aggregateOceanRasterLayer(
    mode === 'current' ? layers.currentY : layers.windY,
    source,
    width,
    height,
    observations.waterMask,
  );
  const allObservedLand: number[] = [];
  const samples: Array<{ score: number; observed: number; generated: number }> = [];
  for (let y = 0; y < height; y += 1) {
    const latitude = latitudeDegrees(y, height);
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      if (water[cell]) continue;
      allObservedLand.push(observed[cell]);
      if (coastDistance[cell] !== 1) continue;
      let scoreTotal = 0;
      let marineNeighbors = 0;
      const neighbors = [
        { x: (x - 1 + width) % width, y, dx: -1, dy: 0 },
        { x: (x + 1) % width, y, dx: 1, dy: 0 },
        { x, y: y - 1, dx: 0, dy: -1 },
        { x, y: y + 1, dx: 0, dy: 1 },
      ];
      for (const neighbor of neighbors) {
        if (neighbor.y < 0 || neighbor.y >= height) continue;
        const neighborCell = neighbor.y * width + neighbor.x;
        if (!water[neighborCell]) continue;
        scoreTotal += mode === 'current'
          ? equatorwardCurrentExposure(vectorX[neighborCell], vectorY[neighborCell], latitude)
          : offshoreEkmanExposure(
            vectorX[neighborCell],
            vectorY[neighborCell],
            neighbor.dx,
            neighbor.dy,
            latitude,
          );
        marineNeighbors += 1;
      }
      if (!marineNeighbors) continue;
      const circulationScore = scoreTotal / marineNeighbors;
      const stabilityWeight = stability
        ? 0.2 + stability[cell] * 0.8
        : 1;
      samples.push({
        score: circulationScore * stabilityWeight,
        observed: observed[cell],
        generated: generated[cell],
      });
    }
  }

  const ordered = [...samples].sort((left, right) => left.score - right.score);
  const groupSize = Math.max(1, Math.floor(ordered.length / 3));
  const low = ordered.slice(0, groupSize);
  const high = ordered.slice(-groupSize);
  const dryThreshold = percentile(allObservedLand.sort((left, right) => left - right), 0.25);
  const meanOf = (group: typeof samples, field: 'score' | 'observed' | 'generated') => (
    group.reduce((sum, sample) => sum + sample[field], 0) / Math.max(1, group.length)
  );
  const dryShare = (group: typeof samples) => (
    group.filter((sample) => sample.observed <= dryThreshold).length / Math.max(1, group.length)
  );
  return {
    value: spearmanRankCorrelation(
      samples.map((sample) => sample.score),
      samples.map((sample) => -sample.observed),
    ),
    sampleCount: samples.length,
    details: {
      lowScoreMean: meanOf(low, 'score'),
      highScoreMean: meanOf(high, 'score'),
      observedWetnessDelta: meanOf(low, 'observed') - meanOf(high, 'observed'),
      generatedWetnessDelta: meanOf(low, 'generated') - meanOf(high, 'generated'),
      lowObservedDryShare: dryShare(low),
      highObservedDryShare: dryShare(high),
      dryThreshold,
    },
  };
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

function hydrationRegimeDiagnostics(
  project: WorldProject,
  observations: EarthObservations,
  pressureSystems?: EarthDownstreamOutput['reconciliation']['circulation']['pressureSystems'],
) {
  const source = observations.resolution;
  const width = Math.min(128, source.width);
  const height = Math.min(64, source.height);
  const generatedWetness = aggregateRasterLayer(project.primaryWorld.layers.wetness, source, width, height, observations.waterMask);
  const precipitation = aggregateRasterLayer(project.primaryWorld.layers.climatePrecipitation, source, width, height, observations.waterMask);
  const atmosphericMoisture = aggregateRasterLayer(project.primaryWorld.layers.climateMoisture, source, width, height, observations.waterMask);
  const observedWetness = aggregateRasterLayer(observations.wetness, source, width, height, observations.waterMask);
  const temperature = aggregateRasterLayer(project.primaryWorld.layers.temperature, source, width, height, observations.waterMask);
  const elevation = aggregateRasterLayer(project.primaryWorld.layers.elevation, source, width, height, observations.waterMask);
  const water = aggregateWaterMask(observations.waterMask, source, width, height);
  const coastDistance = distanceFromWater(water, width, height);
  const relief = localRelief(elevation, water, width, height);
  const currentX = aggregateOceanRasterLayer(project.primaryWorld.layers.currentX, source, width, height, observations.waterMask);
  const currentY = aggregateOceanRasterLayer(project.primaryWorld.layers.currentY, source, width, height, observations.waterMask);
  const windX = aggregateOceanRasterLayer(project.primaryWorld.layers.windX, source, width, height, observations.waterMask);
  const windY = aggregateOceanRasterLayer(project.primaryWorld.layers.windY, source, width, height, observations.waterMask);
  const samples: HydrationRegimeSample[] = [];
  for (let y = 0; y < height; y += 1) {
    const absoluteLatitude = Math.abs(latitudeDegrees(y, height));
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (water[index]) continue;
      const humidSurface = normalizeMetricValue(precipitation[index], 0.28, 0.7);
      const warmth = normalizeMetricValue(temperature[index], 5, 30);
      const recyclableSource = precipitation[index]
        * humidSurface * humidSurface
        * (0.35 + warmth * 0.65);
      const assembledHydration = precipitation[index] * 0.78 + atmosphericMoisture[index] * 0.22;
      const coastalSignals = coastalMechanismSignals(
        x,
        y,
        width,
        height,
        water,
        currentX,
        currentY,
        windX,
        windY,
        latitudeDegrees(y, height),
      );
      const subsidence = pressureSystems?.subsidencePotential[index];
      samples.push({
        generatedWetness: generatedWetness[index],
        observedWetness: observedWetness[index],
        temperatureC: temperature[index],
        coastDistance: coastDistance[index],
        relief: relief[index],
        absoluteLatitude,
        precipitation: precipitation[index],
        atmosphericMoisture: atmosphericMoisture[index],
        recyclableSource,
        hydrationLoss: Math.max(0, assembledHydration - generatedWetness[index]),
        subsidence,
        convergence: pressureSystems?.convergencePotential[index],
        currentExposure: coastalSignals.currentExposure,
        coolCurrentStability: coastalSignals.currentExposure * (0.2 + (subsidence ?? 0) * 0.8),
        offshoreEkman: coastalSignals.offshoreEkman,
        oceanWestExposure: coastalSignals.oceanWestExposure,
      });
    }
  }
  return hydrationRegimeErrorProfiles(samples);
}

function coastalMechanismSignals(
  x: number,
  y: number,
  width: number,
  height: number,
  water: Uint8Array,
  currentX: Float32Array,
  currentY: Float32Array,
  windX: Float32Array,
  windY: Float32Array,
  latitude: number,
): { currentExposure: number; offshoreEkman: number; oceanWestExposure: number } {
  let currentExposure = 0;
  let offshoreEkman = 0;
  let marineNeighbors = 0;
  let oceanWestNeighbors = 0;
  const neighbors = [
    { x: (x - 1 + width) % width, y, dx: -1, dy: 0 },
    { x: (x + 1) % width, y, dx: 1, dy: 0 },
    { x, y: y - 1, dx: 0, dy: -1 },
    { x, y: y + 1, dx: 0, dy: 1 },
  ];
  for (const neighbor of neighbors) {
    if (neighbor.y < 0 || neighbor.y >= height) continue;
    const neighborCell = neighbor.y * width + neighbor.x;
    if (!water[neighborCell]) continue;
    if (neighbor.dx < 0) oceanWestNeighbors += 1;
    currentExposure += equatorwardCurrentExposure(currentX[neighborCell], currentY[neighborCell], latitude);
    offshoreEkman += offshoreEkmanExposure(
      windX[neighborCell],
      windY[neighborCell],
      neighbor.dx,
      neighbor.dy,
      latitude,
    );
    marineNeighbors += 1;
  }
  return {
    currentExposure: currentExposure / Math.max(1, marineNeighbors),
    offshoreEkman: offshoreEkman / Math.max(1, marineNeighbors),
    oceanWestExposure: oceanWestNeighbors / Math.max(1, marineNeighbors),
  };
}

function normalizeMetricValue(value: number, minimum: number, maximum: number): number {
  return Math.max(0, Math.min(1, (value - minimum) / Math.max(1e-9, maximum - minimum)));
}

function permanentIceWetnessError(
  project: WorldProject,
  observations: EarthObservations,
) {
  const source = observations.resolution;
  const width = Math.min(128, source.width);
  const height = Math.min(64, source.height);
  const layers = project.primaryWorld.layers;
  const generated = aggregateRasterLayer(layers.wetness, source, width, height, observations.waterMask);
  const observed = aggregateRasterLayer(observations.wetness, source, width, height, observations.waterMask);
  const water = aggregateWaterMask(observations.waterMask, source, width, height);
  const referenceIce = aggregateWaterMask(observations.iceMask, source, width, height);
  const generatedIce = aggregateWaterMask(layers.ice, source, width, height);
  let generatedTotal = 0;
  let observedTotal = 0;
  let generatedIceCount = 0;
  let samples = 0;
  for (let index = 0; index < water.length; index += 1) {
    if (water[index] || !referenceIce[index]) continue;
    generatedTotal += generated[index];
    observedTotal += observed[index];
    generatedIceCount += generatedIce[index];
    samples += 1;
  }
  const generatedMean = generatedTotal / Math.max(1, samples);
  const observedMean = observedTotal / Math.max(1, samples);
  return {
    value: Math.abs(generatedMean - observedMean),
    sampleCount: samples,
    details: {
      generatedMean,
      observedMean,
      generatedIceAgreement: generatedIceCount / Math.max(1, samples),
    },
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

function coastalInteriorContrast(project: WorldProject, observations: EarthObservations) {
  const source = observations.resolution;
  const width = Math.min(128, source.width);
  const height = Math.min(64, source.height);
  const generated = aggregateRasterLayer(project.primaryWorld.layers.wetness, source, width, height, observations.waterMask);
  const observed = aggregateRasterLayer(observations.wetness, source, width, height, observations.waterMask);
  const water = aggregateWaterMask(observations.waterMask, source, width, height);
  const distance = distanceFromWater(water, width, height);
  let generatedCoast = 0;
  let observedCoast = 0;
  let coastCount = 0;
  let generatedInterior = 0;
  let observedInterior = 0;
  let interiorCount = 0;
  for (let index = 0; index < water.length; index += 1) {
    if (water[index]) continue;
    if (distance[index] <= 1) {
      generatedCoast += generated[index];
      observedCoast += observed[index];
      coastCount += 1;
    } else if (distance[index] >= 4) {
      generatedInterior += generated[index];
      observedInterior += observed[index];
      interiorCount += 1;
    }
  }
  const generatedCoastMean = generatedCoast / Math.max(1, coastCount);
  const generatedInteriorMean = generatedInterior / Math.max(1, interiorCount);
  const observedCoastMean = observedCoast / Math.max(1, coastCount);
  const observedInteriorMean = observedInterior / Math.max(1, interiorCount);
  return {
    value: generatedCoastMean - generatedInteriorMean,
    sampleCount: coastCount + interiorCount,
    details: {
      observedContrast: observedCoastMean - observedInteriorMean,
      generatedCoastMean,
      generatedInteriorMean,
      coastCells: coastCount,
      interiorCells: interiorCount,
    },
  };
}

function equatorialSubtropicalContrast(project: WorldProject, observations: EarthObservations) {
  const generated = project.primaryWorld.layers.wetness;
  const equatorialGenerated = latitudeBandLandMean(generated, observations, 0, 10);
  const subtropicalGenerated = latitudeBandLandMean(generated, observations, 20, 35);
  const equatorialObserved = latitudeBandLandMean(observations.wetness, observations, 0, 10);
  const subtropicalObserved = latitudeBandLandMean(observations.wetness, observations, 20, 35);
  return {
    value: equatorialGenerated - subtropicalGenerated,
    details: {
      observedContrast: equatorialObserved - subtropicalObserved,
      generatedEquatorialMean: equatorialGenerated,
      generatedSubtropicalMean: subtropicalGenerated,
    },
  };
}

function equatorialSubtropicalContrastError(project: WorldProject, observations: EarthObservations) {
  const contrast = equatorialSubtropicalContrast(project, observations);
  const observedContrast = contrast.details.observedContrast;
  return {
    value: Math.abs(contrast.value - observedContrast),
    details: {
      generatedContrast: contrast.value,
      observedContrast,
    },
  };
}

const representativeRegions = [
  ['amazon', -15, 5, -75, -50],
  ['congo', -10, 5, 15, 30],
  ['sahara', 15, 30, -15, 35],
  ['arabia', 15, 30, 35, 60],
  ['maritimeEurope', 45, 58, -10, 10],
  ['centralAsia', 35, 50, 55, 85],
  ['india', 8, 25, 70, 90],
  ['southeastAsia', -10, 20, 95, 125],
  ['australiaInterior', -30, -18, 120, 140],
  ['siberia', 55, 70, 60, 120],
] as const;

function representativeRegionRank(project: WorldProject, observations: EarthObservations) {
  const generated: number[] = [];
  const observed: number[] = [];
  const details: Record<string, number> = {};
  for (const [id, minLat, maxLat, minLon, maxLon] of representativeRegions) {
    const generatedMean = regionMean(
      project.primaryWorld.layers.wetness,
      observations.resolution,
      minLat,
      maxLat,
      minLon,
      maxLon,
      observations.waterMask,
    );
    const observedMean = regionMean(
      observations.wetness,
      observations.resolution,
      minLat,
      maxLat,
      minLon,
      maxLon,
      observations.waterMask,
    );
    generated.push(generatedMean);
    observed.push(observedMean);
    details[`${id}Generated`] = generatedMean;
    details[`${id}Observed`] = observedMean;
  }
  return {
    value: spearmanRankCorrelation(generated, observed),
    sampleCount: representativeRegions.length,
    details,
  };
}

function referenceRegionGroupMean(
  project: WorldProject,
  observations: EarthObservations,
  regionIds: readonly (typeof representativeRegions[number][0])[],
) {
  let generatedTotal = 0;
  let observedTotal = 0;
  const details: Record<string, number> = {};
  for (const [id, minLat, maxLat, minLon, maxLon] of representativeRegions) {
    if (!regionIds.includes(id)) continue;
    const generated = regionMean(
      project.primaryWorld.layers.wetness,
      observations.resolution,
      minLat,
      maxLat,
      minLon,
      maxLon,
      observations.waterMask,
    );
    const observed = regionMean(
      observations.wetness,
      observations.resolution,
      minLat,
      maxLat,
      minLon,
      maxLon,
      observations.waterMask,
    );
    generatedTotal += generated;
    observedTotal += observed;
    details[`${id}Generated`] = generated;
    details[`${id}Observed`] = observed;
  }
  return {
    value: generatedTotal / Math.max(1, regionIds.length),
    sampleCount: regionIds.length,
    details: {
      ...details,
      observedMean: observedTotal / Math.max(1, regionIds.length),
    },
  };
}

const nativeBiomeSignalIds = [
  'Temperature',
  'GeneratedWetness',
  'ReferenceWetness',
  'WetnessError',
  'Precipitation',
  'Moisture',
  'River',
  'LakeShare',
  'ForestThreshold',
  'ForestWetnessMargin',
  'Subsidence',
  'Convergence',
  'SeasonalDryingExcess',
  'AbsoluteLatitude',
] as const;

type NativeBiomeConfusionAccumulator = {
  counts: Uint32Array;
  signalTotals: Float64Array;
};

export function createNativeBiomeConfusionAccumulator(): NativeBiomeConfusionAccumulator {
  return {
    counts: new Uint32Array(9 * 9),
    signalTotals: new Float64Array(9 * 9 * nativeBiomeSignalIds.length),
  };
}

export function recordNativeBiomeConfusion(
  accumulator: NativeBiomeConfusionAccumulator,
  referenceCode: number,
  generatedCode: number,
  temperature: number,
  generatedWetness: number,
  referenceWetness: number,
  precipitation: number,
  moisture: number,
  river: number,
  lakeShare: number,
  subsidence: number,
  convergence: number,
  seasonalDryingExcess: number,
  absoluteLatitude: number,
): void {
  if (referenceCode < 0 || referenceCode >= 9 || generatedCode < 0 || generatedCode >= 9) return;
  const branch = referenceCode * 9 + generatedCode;
  accumulator.counts[branch] += 1;
  const offset = branch * nativeBiomeSignalIds.length;
  accumulator.signalTotals[offset] += temperature;
  accumulator.signalTotals[offset + 1] += generatedWetness;
  accumulator.signalTotals[offset + 2] += referenceWetness;
  accumulator.signalTotals[offset + 3] += generatedWetness - referenceWetness;
  accumulator.signalTotals[offset + 4] += precipitation;
  accumulator.signalTotals[offset + 5] += moisture;
  accumulator.signalTotals[offset + 6] += river;
  accumulator.signalTotals[offset + 7] += lakeShare;
  const forestThreshold = forestWetnessThreshold(temperature);
  accumulator.signalTotals[offset + 8] += forestThreshold;
  accumulator.signalTotals[offset + 9] += generatedWetness - forestThreshold;
  accumulator.signalTotals[offset + 10] += subsidence;
  accumulator.signalTotals[offset + 11] += convergence;
  accumulator.signalTotals[offset + 12] += seasonalDryingExcess;
  accumulator.signalTotals[offset + 13] += absoluteLatitude;
}

export function summarizeNativeBiomeConfusion(
  accumulator: NativeBiomeConfusionAccumulator,
): Record<string, number> {
  const details: Record<string, number> = {};
  for (let referenceCode = 1; referenceCode < 9; referenceCode += 1) {
    for (let generatedCode = 1; generatedCode < 9; generatedCode += 1) {
      const branch = referenceCode * 9 + generatedCode;
      const count = accumulator.counts[branch];
      const prefix = `nativeReference${referenceCode}Generated${generatedCode}`;
      details[`${prefix}Samples`] = count;
      const offset = branch * nativeBiomeSignalIds.length;
      for (let signal = 0; signal < nativeBiomeSignalIds.length; signal += 1) {
        details[`${prefix}Mean${nativeBiomeSignalIds[signal]}`] = accumulator.signalTotals[offset + signal]
          / Math.max(1, count);
      }
    }
  }
  return details;
}

function biomeMacroF1(
  project: WorldProject,
  observations: EarthObservations,
  pressureSystems: EarthDownstreamOutput['reconciliation']['circulation']['pressureSystems'],
) {
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
  ];
  const diagnosticCategories = [...categories, biomeToCode('wetland')];
  const generated: number[] = [];
  const referenceBiomes: number[] = [];
  const seasonalStrengths = [0.1, 0.2, 0.3, 0.4] as const;
  const forestTemperatureContrastStrengths = [0.03, 0.06, 0.09] as const;
  const nativeReclassificationControl: number[] = [];
  const nativeConfusion = createNativeBiomeConfusionAccumulator();
  const nativeSeasonalCounterfactuals = new Map<number, number[]>(
    seasonalStrengths.map((strength) => [strength, []]),
  );
  const nativeSeasonalForestCounterfactuals = new Map<number, number[]>(
    seasonalStrengths.map((strength) => [strength, []]),
  );
  const nativeForestTemperatureCounterfactuals = new Map<number, number[]>(
    forestTemperatureContrastStrengths.map((strength) => [strength, []]),
  );
  const nativeFinalWindCoastalCounterfactual: number[] = [];
  const nativeFinalWindShadowCounterfactual: number[] = [];
  const ecologicalSignals: Array<Record<string, number>> = [];
  const sampleCoordinates: Array<{ latitude: number; longitude: number }> = [];
  const analysisWidth = Math.min(128, observations.resolution.width);
  const analysisHeight = Math.min(64, observations.resolution.height);
  const analysisWater = aggregateWaterMask(observations.waterMask, observations.resolution, analysisWidth, analysisHeight);
  const analysisCoastDistance = distanceFromWater(analysisWater, analysisWidth, analysisHeight);
  const analysisElevation = aggregateRasterLayer(
    project.primaryWorld.layers.elevation,
    observations.resolution,
    analysisWidth,
    analysisHeight,
    observations.waterMask,
  );
  const analysisRelief = localRelief(analysisElevation, analysisWater, analysisWidth, analysisHeight);
  const analysisWindX = aggregateRasterLayer(project.primaryWorld.layers.windX, observations.resolution, analysisWidth, analysisHeight, observations.waterMask);
  const analysisWindY = aggregateRasterLayer(project.primaryWorld.layers.windY, observations.resolution, analysisWidth, analysisHeight, observations.waterMask);
  const finalWindRainShadow = upwindBarrierPotential(
    analysisElevation,
    analysisWater,
    analysisWindX,
    analysisWindY,
    analysisWidth,
    analysisHeight,
  );
  const finalWindCoastalExposure = coastalExposurePotential(
    analysisCoastDistance,
    analysisWater,
    analysisWindX,
    analysisWindY,
    analysisWidth,
    analysisHeight,
  );
  const signalLayers = {
    temperature: aggregateRasterLayer(project.primaryWorld.layers.temperature, observations.resolution, analysisWidth, analysisHeight, observations.waterMask),
    wetness: aggregateRasterLayer(project.primaryWorld.layers.wetness, observations.resolution, analysisWidth, analysisHeight, observations.waterMask),
    precipitation: aggregateRasterLayer(project.primaryWorld.layers.climatePrecipitation, observations.resolution, analysisWidth, analysisHeight, observations.waterMask),
    moisture: aggregateRasterLayer(project.primaryWorld.layers.climateMoisture, observations.resolution, analysisWidth, analysisHeight, observations.waterMask),
    river: aggregateRasterLayer(project.primaryWorld.layers.river, observations.resolution, analysisWidth, analysisHeight, observations.waterMask),
    lakes: aggregateRasterLayer(project.primaryWorld.layers.lakes, observations.resolution, analysisWidth, analysisHeight, observations.waterMask),
  };
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
      const analysisCell = blockY * analysisWidth + blockX;
      const latitude = Math.abs(latitudeDegrees(blockY, analysisHeight)) * Math.PI / 180;
      const continentality = Math.min(1, analysisCoastDistance[analysisCell] / 6);
      const thermalSeasonality = Math.sin(project.selectedValues.axialTiltDeg * Math.PI / 180)
        * Math.sin(latitude)
        * (0.35 + continentality * 0.65);
      const subsidence = pressureSystems.subsidencePotential[analysisCell] ?? 0;
      const convergence = pressureSystems.convergencePotential[analysisCell] ?? 0;
      const coastalProximity = Math.max(0, 1 - analysisCoastDistance[analysisCell] / 4);
      const longitude = ((blockX + 0.5) / analysisWidth) * Math.PI * 2 - Math.PI;
      const signedLatitudeDegrees = latitudeDegrees(blockY, analysisHeight);
      const signedLatitude = signedLatitudeDegrees * Math.PI / 180;
      const pressureAttribution = climatologicalPressureAttribution(
        pressureSystems.centers,
        longitude,
        signedLatitude,
        signalLayers.temperature[analysisCell],
        project.primaryWorld.averageTemperatureC,
      );
      const seasonalBalance = twoSeasonWaterBalanceSignals(
        signalLayers.temperature[analysisCell],
        signalLayers.precipitation[analysisCell],
        thermalSeasonality,
        convergence,
        project.selectedValues.aridity,
      );
      const seasonalPressure = seasonalPressureSignals(
        pressureAttribution.centerPressure - pressureAttribution.equatorialCenterPressure,
        pressureAttribution.equatorialCenterPressure,
        signedLatitudeDegrees,
        thermalSeasonality * 30,
        project.selectedValues.axialTiltDeg,
      );
      const finalWindCoastalDryingPotential = (1 - finalWindCoastalExposure[analysisCell])
        * subsidence
        * (1 - convergence)
        * coastalProximity;
      ecologicalSignals.push({
        temperature: signalLayers.temperature[analysisCell],
        wetness: signalLayers.wetness[analysisCell],
        precipitation: signalLayers.precipitation[analysisCell],
        moisture: signalLayers.moisture[analysisCell],
        relief: analysisRelief[analysisCell],
        finalWindRainShadow: finalWindRainShadow[analysisCell],
        finalWindCoastalExposure: finalWindCoastalExposure[analysisCell],
        finalWindCoastalDryingPotential,
        river: signalLayers.river[analysisCell],
        lakeShare: signalLayers.lakes[analysisCell],
        coastDistance: analysisCoastDistance[analysisCell],
        coastalProximity,
        continentality,
        continentalDryingPotential: Math.pow(continentality, 1.5)
          * (1 - convergence)
          * (1 - subsidence),
        subsidence,
        convergence,
        thermalSeasonality,
        drySeasonStress: thermalSeasonality
          * (0.3 + subsidence * 0.7)
          * (1 - convergence * 0.7),
        ...seasonalBalance,
        ...seasonalPressure,
        seasonalDryingExcess: Math.max(0, seasonalPressure.seasonalDryingPotential - subsidence),
        ...pressureAttribution,
      });
      const nativeCountsByStrength = new Map<number, Uint32Array>(
        seasonalStrengths.map((strength) => [strength, new Uint32Array(9)]),
      );
      const nativeSeasonalForestCountsByStrength = new Map<number, Uint32Array>(
        seasonalStrengths.map((strength) => [strength, new Uint32Array(9)]),
      );
      const nativeForestCountsByStrength = new Map<number, Uint32Array>(
        forestTemperatureContrastStrengths.map((strength) => [strength, new Uint32Array(9)]),
      );
      const nativeControlCounts = new Uint32Array(9);
      const nativeFinalWindCoastalCounts = new Uint32Array(9);
      const nativeFinalWindShadowCounts = new Uint32Array(9);
      const seasonalDryingExcess = Math.max(0, seasonalPressure.seasonalDryingPotential - subsidence);
      for (let offsetY = 0; offsetY < stepY; offsetY += 1) {
        for (let offsetX = 0; offsetX < stepX; offsetX += 1) {
          const x = blockX * stepX + offsetX;
          const y = blockY * stepY + offsetY;
          const index = y * observations.resolution.width + x;
          const reference = observations.biomeCodes[index];
          if (observations.waterMask[index] || reference === mountain || reference === ocean) continue;
          const nativeSignals = { temperature: project.primaryWorld.layers.temperature[index] };
          const nativeWetness = project.primaryWorld.layers.wetness[index];
          recordNativeBiomeConfusion(
            nativeConfusion,
            reference,
            generatedSource[index],
            nativeSignals.temperature,
            nativeWetness,
            observations.wetness[index],
            project.primaryWorld.layers.climatePrecipitation[index],
            project.primaryWorld.layers.climateMoisture[index],
            project.primaryWorld.layers.river[index],
            project.primaryWorld.layers.lakes[index],
            subsidence,
            convergence,
            seasonalDryingExcess,
            Math.abs(signedLatitudeDegrees),
          );
          nativeControlCounts[reclassifyDiagnosticBiome(generatedSource[index], nativeSignals, nativeWetness)] += 1;
          nativeFinalWindCoastalCounts[reclassifyDiagnosticBiome(
            generatedSource[index],
            nativeSignals,
            nativeWetness - finalWindCoastalDryingPotential * 0.4,
          )] += 1;
          nativeFinalWindShadowCounts[reclassifyDiagnosticBiome(
            generatedSource[index],
            nativeSignals,
            nativeWetness - finalWindRainShadow[analysisCell] * 0.2,
          )] += 1;
          for (const strength of seasonalStrengths) {
            const counts = nativeCountsByStrength.get(strength)!;
            counts[reclassifyDiagnosticBiome(
              generatedSource[index],
              nativeSignals,
              nativeWetness - seasonalDryingExcess * strength,
            )] += 1;
            const forestCounts = nativeSeasonalForestCountsByStrength.get(strength)!;
            forestCounts[reclassifyDiagnosticBiome(
              generatedSource[index],
              nativeSignals,
              nativeWetness,
              seasonalForestThresholdAdjustment(seasonalDryingExcess, strength),
            )] += 1;
          }
          for (const strength of forestTemperatureContrastStrengths) {
            const counts = nativeForestCountsByStrength.get(strength)!;
            counts[reclassifyDiagnosticBiome(
              generatedSource[index],
              nativeSignals,
              nativeWetness,
              forestTemperatureThresholdAdjustment(nativeSignals.temperature, strength),
            )] += 1;
          }
        }
      }
      nativeReclassificationControl.push(modal(nativeControlCounts));
      nativeFinalWindCoastalCounterfactual.push(modal(nativeFinalWindCoastalCounts));
      nativeFinalWindShadowCounterfactual.push(modal(nativeFinalWindShadowCounts));
      for (const strength of seasonalStrengths) {
        nativeSeasonalCounterfactuals.get(strength)!.push(modal(nativeCountsByStrength.get(strength)!));
        nativeSeasonalForestCounterfactuals.get(strength)!.push(
          modal(nativeSeasonalForestCountsByStrength.get(strength)!),
        );
      }
      for (const strength of forestTemperatureContrastStrengths) {
        nativeForestTemperatureCounterfactuals.get(strength)!.push(modal(nativeForestCountsByStrength.get(strength)!));
      }
      sampleCoordinates.push({
        latitude: signedLatitudeDegrees,
        longitude: longitude * 180 / Math.PI,
      });
    }
  }
  let totalF1 = 0;
  let represented = 0;
  let samples = 0;
  const classDetails: Record<string, number> = {};
  Object.assign(classDetails, summarizeNativeBiomeConfusion(nativeConfusion));
  for (const referenceCategory of diagnosticCategories) {
    classDetails[`referenceCode${referenceCategory}Samples`] = referenceBiomes.filter(
      (code) => code === referenceCategory,
    ).length;
    classDetails[`generatedCode${referenceCategory}Samples`] = generated.filter(
      (code) => code === referenceCategory,
    ).length;
    for (const generatedCategory of diagnosticCategories) {
      classDetails[`confusionReference${referenceCategory}Generated${generatedCategory}`] = generated.reduce(
        (count, code, index) => count + (referenceBiomes[index] === referenceCategory && code === generatedCategory ? 1 : 0),
        0,
      );
    }
    const referenceIndexes = referenceBiomes
      .map((code, index) => code === referenceCategory ? index : -1)
      .filter((index) => index >= 0);
    for (const signal of Object.keys(ecologicalSignals[0] ?? {})) {
      classDetails[`referenceCode${referenceCategory}Mean${capitalizeMetricId(signal)}`] = referenceIndexes.reduce(
        (total, index) => total + ecologicalSignals[index][signal],
        0,
      ) / Math.max(1, referenceIndexes.length);
    }
  }
  const desertCode = biomeToCode('desert');
  for (const generatedCategory of diagnosticCategories) {
    const branchIndexes = referenceBiomes
      .map((code, index) => code === desertCode && generated[index] === generatedCategory ? index : -1)
      .filter((index) => index >= 0);
    classDetails[`desertGeneratedCode${generatedCategory}Samples`] = branchIndexes.length;
    for (const signal of Object.keys(ecologicalSignals[0] ?? {})) {
      classDetails[`desertGeneratedCode${generatedCategory}Mean${capitalizeMetricId(signal)}`] = branchIndexes.reduce(
        (total, index) => total + ecologicalSignals[index][signal],
        0,
      ) / Math.max(1, branchIndexes.length);
    }
  }
  for (const [regionId, minimumLatitude, maximumLatitude, minimumLongitude, maximumLongitude]
    of desertDiagnosticRegions) {
    for (const generatedCategory of diagnosticCategories) {
      const regionBranchIndexes = referenceBiomes
        .map((referenceCode, index) => {
          const coordinate = sampleCoordinates[index];
          const inRegion = coordinate.latitude >= minimumLatitude
            && coordinate.latitude <= maximumLatitude
            && coordinate.longitude >= minimumLongitude
            && coordinate.longitude <= maximumLongitude;
          return referenceCode === desertCode && generated[index] === generatedCategory && inRegion ? index : -1;
        })
        .filter((index) => index >= 0);
      classDetails[`desertRegion${regionId}GeneratedCode${generatedCategory}Samples`] = regionBranchIndexes.length;
      for (const signal of desertRegionDiagnosticSignals) {
        classDetails[`desertRegion${regionId}GeneratedCode${generatedCategory}Mean${capitalizeMetricId(signal)}`]
          = regionBranchIndexes.reduce(
            (total, index) => total + ecologicalSignals[index][signal],
            0,
          ) / Math.max(1, regionBranchIndexes.length);
      }
    }
  }
  const finalWindCoastalCounterfactual = generated.map((code, index) => reclassifyDiagnosticBiome(
    code,
    ecologicalSignals[index],
    ecologicalSignals[index].wetness - ecologicalSignals[index].finalWindCoastalDryingPotential * 0.4,
  ));
  const finalWindShadowCounterfactual = generated.map((code, index) => reclassifyDiagnosticBiome(
    code,
    ecologicalSignals[index],
    ecologicalSignals[index].wetness - ecologicalSignals[index].finalWindRainShadow * 0.2,
  ));
  const reclassificationControl = generated.map((code, index) => reclassifyDiagnosticBiome(
    code,
    ecologicalSignals[index],
    ecologicalSignals[index].wetness,
  ));
  classDetails.counterfactualReclassificationControlMacroF1 = diagnosticMacroF1(
    reclassificationControl,
    referenceBiomes,
    categories,
  );
  classDetails.counterfactualNativeReclassificationControlMacroF1 = diagnosticMacroF1(
    nativeReclassificationControl,
    referenceBiomes,
    categories,
  );
  for (const [detailId, value] of Object.entries(diagnosticClassificationDetails(
    reclassificationControl,
    referenceBiomes,
    categories,
  ))) {
    classDetails[`counterfactualReclassificationControl${detailId}`] = value;
  }
  for (const [regionId, minimumLatitude, maximumLatitude, minimumLongitude, maximumLongitude]
    of desertDiagnosticRegions) {
    classDetails[`counterfactualReclassificationControlRegion${regionId}DesertTruePositive`] = referenceBiomes.reduce(
      (count, referenceCode, index) => {
        const coordinate = sampleCoordinates[index];
        const inRegion = coordinate.latitude >= minimumLatitude
          && coordinate.latitude <= maximumLatitude
          && coordinate.longitude >= minimumLongitude
          && coordinate.longitude <= maximumLongitude;
        return count + (referenceCode === desertCode && reclassificationControl[index] === desertCode && inRegion ? 1 : 0);
      },
      0,
    );
  }
  classDetails.counterfactualFinalWindCoastalMacroF1 = diagnosticMacroF1(
    finalWindCoastalCounterfactual,
    referenceBiomes,
    categories,
  );
  classDetails.counterfactualFinalWindShadowMacroF1 = diagnosticMacroF1(
    finalWindShadowCounterfactual,
    referenceBiomes,
    categories,
  );
  classDetails.counterfactualNativeFinalWindCoastalMacroF1 = diagnosticMacroF1(
    nativeFinalWindCoastalCounterfactual,
    referenceBiomes,
    categories,
  );
  classDetails.counterfactualNativeFinalWindShadowMacroF1 = diagnosticMacroF1(
    nativeFinalWindShadowCounterfactual,
    referenceBiomes,
    categories,
  );
  for (const strength of [0.1, 0.15, 0.2, 0.25, 0.3, 0.4]) {
    const continentalDryingCounterfactual = generated.map((code, index) => reclassifyDiagnosticBiome(
      code,
      ecologicalSignals[index],
      ecologicalSignals[index].wetness - ecologicalSignals[index].continentalDryingPotential * strength,
    ));
    classDetails[`counterfactualContinentalDrying${Math.round(strength * 100)}MacroF1`] = diagnosticMacroF1(
      continentalDryingCounterfactual,
      referenceBiomes,
      categories,
    );
  }
  for (const strength of [0.5, 1, 1.5, 2]) {
    const seasonalBalanceCounterfactual = generated.map((code, index) => reclassifyDiagnosticBiome(
      code,
      ecologicalSignals[index],
      ecologicalSignals[index].wetness - ecologicalSignals[index].seasonalIncrementalEvaporativeLoss * strength,
    ));
    classDetails[`counterfactualSeasonalWaterBalance${Math.round(strength * 100)}MacroF1`] = diagnosticMacroF1(
      seasonalBalanceCounterfactual,
      referenceBiomes,
      categories,
    );
  }
  for (const strength of seasonalStrengths) {
    const seasonalCirculationCounterfactual = generated.map((code, index) => reclassifyDiagnosticBiome(
      code,
      ecologicalSignals[index],
      ecologicalSignals[index].wetness - ecologicalSignals[index].seasonalDryingExcess * strength,
    ));
    classDetails[`counterfactualSeasonalCirculation${Math.round(strength * 100)}MacroF1`] = diagnosticMacroF1(
      seasonalCirculationCounterfactual,
      referenceBiomes,
      categories,
    );
    classDetails[`counterfactualNativeSeasonalCirculation${Math.round(strength * 100)}MacroF1`] = diagnosticMacroF1(
      nativeSeasonalCounterfactuals.get(strength)!,
      referenceBiomes,
      categories,
    );
    classDetails[`counterfactualNativeSeasonalForestThreshold${Math.round(strength * 100)}MacroF1`] = diagnosticMacroF1(
      nativeSeasonalForestCounterfactuals.get(strength)!,
      referenceBiomes,
      categories,
    );
    for (const [detailId, value] of Object.entries(diagnosticClassificationDetails(
      nativeSeasonalForestCounterfactuals.get(strength)!,
      referenceBiomes,
      categories,
    ))) {
      classDetails[`counterfactualNativeSeasonalForestThreshold${Math.round(strength * 100)}${detailId}`] = value;
    }
    const seasonalDetails = diagnosticClassificationDetails(
      seasonalCirculationCounterfactual,
      referenceBiomes,
      categories,
    );
    for (const [detailId, value] of Object.entries(seasonalDetails)) {
      classDetails[`counterfactualSeasonalCirculation${Math.round(strength * 100)}${detailId}`] = value;
    }
    for (const [regionId, minimumLatitude, maximumLatitude, minimumLongitude, maximumLongitude]
      of desertDiagnosticRegions) {
      classDetails[`counterfactualSeasonalCirculation${Math.round(strength * 100)}Region${regionId}DesertTruePositive`]
        = referenceBiomes.reduce((count, referenceCode, index) => {
          const coordinate = sampleCoordinates[index];
          const inRegion = coordinate.latitude >= minimumLatitude
            && coordinate.latitude <= maximumLatitude
            && coordinate.longitude >= minimumLongitude
            && coordinate.longitude <= maximumLongitude;
          return count + (
            referenceCode === desertCode
              && seasonalCirculationCounterfactual[index] === desertCode
              && inRegion
              ? 1
              : 0
          );
        }, 0);
    }
  }
  for (const strength of forestTemperatureContrastStrengths) {
    const coarseCounterfactual = generated.map((code, index) => reclassifyDiagnosticBiome(
      code,
      ecologicalSignals[index],
      ecologicalSignals[index].wetness,
      forestTemperatureThresholdAdjustment(ecologicalSignals[index].temperature, strength),
    ));
    const id = Math.round(strength * 100);
    classDetails[`counterfactualForestTemperatureContrast${id}MacroF1`] = diagnosticMacroF1(
      coarseCounterfactual,
      referenceBiomes,
      categories,
    );
    classDetails[`counterfactualNativeForestTemperatureContrast${id}MacroF1`] = diagnosticMacroF1(
      nativeForestTemperatureCounterfactuals.get(strength)!,
      referenceBiomes,
      categories,
    );
  }
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
    details: {
      representedClasses: represented,
      mountainReferenceExcluded: true,
      wetlandReferenceExcluded: true,
      ...classDetails,
    },
  };
}

const desertDiagnosticRegions = [
  ['Sahara', 15, 35, -20, 40],
  ['Arabia', 12, 32, 35, 60],
  ['CentralAsia', 30, 50, 45, 90],
  ['Australia', -35, -15, 115, 145],
  ['SouthwestNorthAmerica', 20, 40, -125, -95],
  ['Atacama', -32, -15, -80, -65],
  ['NamibKalahari', -32, -15, 10, 30],
  ['Patagonia', -50, -35, -75, -60],
  ['HornOfAfrica', 0, 15, 35, 55],
] as const;

const desertRegionDiagnosticSignals = [
  'wetness',
  'precipitation',
  'coastDistance',
  'continentality',
  'continentalDryingPotential',
  'relief',
  'finalWindRainShadow',
  'finalWindCoastalExposure',
  'finalWindCoastalDryingPotential',
  'subsidence',
  'convergence',
  'latitudePressure',
  'centerPressure',
  'seasonalTemperatureAmplitudeC',
  'seasonalPrecipitationSwing',
  'seasonalIncrementalEvaporativeLoss',
  'seasonalDryHalfWaterBalance',
  'seasonalPressureRange',
  'seasonalMaximumSubsidence',
  'seasonalMinimumConvergence',
  'seasonalDryingPotential',
  'seasonalDryingExcess',
] as const;

function seasonalPressureSignals(
  nonEquatorialCenterPressure: number,
  equatorialCenterPressure: number,
  latitudeDegreesValue: number,
  temperatureAmplitudeC: number,
  axialTiltDeg: number,
): Record<string, number> {
  const hemisphere = latitudeDegreesValue >= 0 ? 1 : -1;
  const migration = Math.min(18, axialTiltDeg * 0.65);
  const localSummerDeclination = hemisphere * migration;
  const localWinterDeclination = -localSummerDeclination;
  const summerPressure = seasonalPressurePotential(
    latitudeDegreesValue,
    localSummerDeclination,
    nonEquatorialCenterPressure,
    equatorialCenterPressure,
    -temperatureAmplitudeC,
  );
  const winterPressure = seasonalPressurePotential(
    latitudeDegreesValue,
    localWinterDeclination,
    nonEquatorialCenterPressure,
    equatorialCenterPressure,
    temperatureAmplitudeC,
  );
  const summerSubsidence = Math.max(0, Math.min(1, (summerPressure + 0.08) / 0.9));
  const winterSubsidence = Math.max(0, Math.min(1, (winterPressure + 0.08) / 0.9));
  const summerConvergence = Math.max(0, Math.min(1, (-summerPressure + 0.02) / 0.85));
  const winterConvergence = Math.max(0, Math.min(1, (-winterPressure + 0.02) / 0.85));
  const maximumSubsidence = Math.max(summerSubsidence, winterSubsidence);
  const minimumConvergence = Math.min(summerConvergence, winterConvergence);
  return {
    seasonalSummerPressure: summerPressure,
    seasonalWinterPressure: winterPressure,
    seasonalPressureRange: Math.abs(summerPressure - winterPressure),
    seasonalMaximumSubsidence: maximumSubsidence,
    seasonalMinimumSubsidence: Math.min(summerSubsidence, winterSubsidence),
    seasonalMaximumConvergence: Math.max(summerConvergence, winterConvergence),
    seasonalMinimumConvergence: minimumConvergence,
    seasonalDryingPotential: maximumSubsidence * (1 - minimumConvergence),
  };
}

function seasonalPressurePotential(
  latitudeDegreesValue: number,
  solarDeclinationDegrees: number,
  nonEquatorialCenterPressure: number,
  equatorialCenterPressure: number,
  thermalTemperatureAnomalyC: number,
): number {
  const shiftedSubtropical = solarDeclinationDegrees * 0.2;
  const shiftedSubpolar = solarDeclinationDegrees * 0.1;
  const latitudePressure = -0.72 * metricGaussian(latitudeDegreesValue, solarDeclinationDegrees, 8)
    + 0.66 * (
      metricGaussian(latitudeDegreesValue, 30 + shiftedSubtropical, 10)
      + metricGaussian(latitudeDegreesValue, -30 + shiftedSubtropical, 10)
    )
    - 0.46 * (
      metricGaussian(latitudeDegreesValue, 58 + shiftedSubpolar, 11)
      + metricGaussian(latitudeDegreesValue, -58 + shiftedSubpolar, 11)
    )
    + 0.3 * (
      metricGaussian(latitudeDegreesValue, 86, 12)
      + metricGaussian(latitudeDegreesValue, -86, 12)
    );
  const thermalPressure = thermalTemperatureAnomalyC / 30
    * metricGaussian(Math.abs(latitudeDegreesValue), 42, 24)
    * 0.12;
  const annualEquatorialInfluence = metricGaussian(latitudeDegreesValue, 0, 8);
  const seasonalEquatorialInfluence = metricGaussian(latitudeDegreesValue, solarDeclinationDegrees, 8);
  const equatorialMigrationScale = Math.min(
    1.5,
    seasonalEquatorialInfluence / Math.max(0.05, annualEquatorialInfluence),
  );
  return Math.max(-1, Math.min(1,
    latitudePressure
      + nonEquatorialCenterPressure
      + equatorialCenterPressure * equatorialMigrationScale
      + thermalPressure,
  ));
}

function twoSeasonWaterBalanceSignals(
  temperatureC: number,
  precipitation: number,
  thermalSeasonality: number,
  convergence: number,
  aridity: number,
): Record<string, number> {
  const temperatureAmplitudeC = thermalSeasonality * 30;
  const precipitationSwing = Math.min(
    0.2,
    thermalSeasonality * 0.25 + convergence * (0.03 + thermalSeasonality * 0.12),
  );
  const summerTemperatureC = temperatureC + temperatureAmplitudeC;
  const winterTemperatureC = temperatureC - temperatureAmplitudeC;
  const summerPrecipitation = Math.min(1, precipitation + precipitationSwing);
  const winterPrecipitation = Math.max(0, precipitation - precipitationSwing);
  const annualLoss = diagnosticPotentialEvaporativeLoss(temperatureC, precipitation, aridity);
  const summerLoss = diagnosticPotentialEvaporativeLoss(summerTemperatureC, summerPrecipitation, aridity);
  const winterLoss = diagnosticPotentialEvaporativeLoss(winterTemperatureC, winterPrecipitation, aridity);
  return {
    seasonalTemperatureAmplitudeC: temperatureAmplitudeC,
    seasonalPrecipitationSwing: precipitationSwing,
    seasonalIncrementalEvaporativeLoss: Math.max(0, (summerLoss + winterLoss) * 0.5 - annualLoss),
    seasonalDryHalfWaterBalance: Math.min(
      summerPrecipitation - summerLoss,
      winterPrecipitation - winterLoss,
    ),
  };
}

function diagnosticPotentialEvaporativeLoss(
  temperatureC: number,
  precipitation: number,
  aridity: number,
): number {
  const thermalDemand = Math.max(0, Math.min(1, (temperatureC - 8) / 26));
  const precipitationDeficit = 1 - Math.max(0, Math.min(1, precipitation));
  const deficitSquared = precipitationDeficit * precipitationDeficit;
  const deficitFourth = deficitSquared * deficitSquared;
  const deficitSeventh = deficitFourth * deficitSquared * precipitationDeficit;
  return Math.max(0, Math.min(0.45,
    thermalDemand * deficitSeventh * Math.max(0, Math.min(1, aridity)) * 4.5,
  ));
}

function reclassifyDiagnosticBiome(
  currentCode: number,
  signals: Record<string, number>,
  adjustedWetness: number,
  forestThresholdAdjustment = 0,
): number {
  const reclassifiable = currentCode === biomeToCode('desert')
    || currentCode === biomeToCode('grassland')
    || currentCode === biomeToCode('forest')
    || currentCode === biomeToCode('rainforest');
  if (!reclassifiable) return currentCode;
  if (adjustedWetness < 0.2) return biomeToCode('desert');
  if (signals.temperature > 20 && adjustedWetness > 0.72) return biomeToCode('rainforest');
  if (adjustedWetness > forestWetnessThreshold(signals.temperature) + forestThresholdAdjustment) return biomeToCode('forest');
  return biomeToCode('grassland');
}

function forestTemperatureThresholdAdjustment(temperatureC: number, strength: number): number {
  return Math.max(-strength, Math.min(strength, (temperatureC - 11) / 9 * strength));
}

export function seasonalForestThresholdAdjustment(seasonalDryingExcess: number, strength: number): number {
  return Math.min(0.12, Math.max(0, seasonalDryingExcess) * Math.max(0, strength));
}

function diagnosticMacroF1(
  generated: number[],
  reference: number[],
  categories: number[],
): number {
  let total = 0;
  let represented = 0;
  for (const category of categories) {
    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    for (let index = 0; index < generated.length; index += 1) {
      if (generated[index] === category && reference[index] === category) truePositive += 1;
      else if (generated[index] === category) falsePositive += 1;
      else if (reference[index] === category) falseNegative += 1;
    }
    if (truePositive + falsePositive + falseNegative === 0) continue;
    const precision = truePositive / Math.max(1, truePositive + falsePositive);
    const recall = truePositive / Math.max(1, truePositive + falseNegative);
    total += precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    represented += 1;
  }
  return total / Math.max(1, represented);
}

function diagnosticClassificationDetails(
  generated: number[],
  reference: number[],
  categories: number[],
): Record<string, number> {
  const details: Record<string, number> = {};
  for (const category of categories) {
    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    for (let index = 0; index < generated.length; index += 1) {
      if (generated[index] === category && reference[index] === category) truePositive += 1;
      else if (generated[index] === category) falsePositive += 1;
      else if (reference[index] === category) falseNegative += 1;
    }
    const precision = truePositive / Math.max(1, truePositive + falsePositive);
    const recall = truePositive / Math.max(1, truePositive + falseNegative);
    details[`F1Code${category}`] = precision + recall > 0
      ? 2 * precision * recall / (precision + recall)
      : 0;
    details[`TruePositiveCode${category}`] = truePositive;
    details[`FalsePositiveCode${category}`] = falsePositive;
  }
  return details;
}

function upwindBarrierPotential(
  elevation: Float32Array,
  water: Uint8Array,
  windX: Float32Array,
  windY: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const result = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      if (water[cell]) continue;
      const speed = Math.hypot(windX[cell], windY[cell]);
      if (speed < 0.01) continue;
      const directionX = windX[cell] / speed;
      const directionY = windY[cell] / speed;
      let barrier = 0;
      for (let step = 1; step <= 8; step += 1) {
        const sampleX = Math.round(x - directionX * step);
        const sampleY = Math.round(y + directionY * step);
        if (sampleY < 0 || sampleY >= height) break;
        const sample = sampleY * width + ((sampleX % width) + width) % width;
        if (water[sample]) break;
        barrier = Math.max(
          barrier,
          Math.max(0, elevation[sample] - elevation[cell]) * (1 - step / 9),
        );
      }
      result[cell] = Math.min(1, barrier * 2.5);
    }
  }
  return result;
}

function coastalExposurePotential(
  coastDistance: Float32Array,
  water: Uint8Array,
  windX: Float32Array,
  windY: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const result = new Float32Array(width * height);
  result.fill(1);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      if (water[cell] || coastDistance[cell] > 3) continue;
      const west = y * width + ((x - 1 + width) % width);
      const east = y * width + ((x + 1) % width);
      const north = (y - 1) * width + x;
      const south = (y + 1) * width + x;
      const oceanGradientX = (coastDistance[west] - coastDistance[east]) * 0.5;
      const oceanGradientY = (coastDistance[south] - coastDistance[north]) * 0.5;
      const windMagnitude = Math.hypot(windX[cell], windY[cell]);
      const gradientMagnitude = Math.hypot(oceanGradientX, oceanGradientY);
      if (windMagnitude < 0.0001 || gradientMagnitude < 0.0001) continue;
      const alignment = Math.max(-1, Math.min(1,
        (windX[cell] * oceanGradientX + windY[cell] * oceanGradientY)
          / (windMagnitude * gradientMagnitude),
      ));
      result[cell] = Math.max(0.5, Math.min(1,
        0.85 + Math.max(0, -alignment) * 0.15 - Math.max(0, alignment) * 0.35,
      ));
    }
  }
  return result;
}

function capitalizeMetricId(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function climatologicalPressureAttribution(
  centers: EarthDownstreamOutput['reconciliation']['circulation']['pressureSystems']['centers'],
  longitude: number,
  latitude: number,
  temperatureC: number,
  averageTemperatureC: number,
): Record<string, number> {
  const absoluteLatitude = Math.abs(latitude * 180 / Math.PI);
  const latitudePressure = -0.72 * metricGaussian(absoluteLatitude, 0, 11)
    + 0.66 * metricGaussian(absoluteLatitude, 30, 10)
    - 0.46 * metricGaussian(absoluteLatitude, 58, 11)
    + 0.3 * metricGaussian(absoluteLatitude, 86, 12);
  const broadenedLatitudePressure = -0.72 * metricGaussian(absoluteLatitude, 0, 11)
    + 0.66 * metricGaussian(absoluteLatitude, 30, 12)
    - 0.46 * metricGaussian(absoluteLatitude, 58, 11)
    + 0.3 * metricGaussian(absoluteLatitude, 86, 12);
  const contributions: Record<string, number> = {
    absoluteLatitude,
    latitudePressure,
    broadenedLatitudePressure,
    latitudePressureGain12: broadenedLatitudePressure - latitudePressure,
    subtropicalCenterPressure: 0,
    subpolarCenterPressure: 0,
    equatorialCenterPressure: 0,
    polarCenterPressure: 0,
    continentalCenterPressure: 0,
  };
  let centerPressure = 0;
  for (const center of centers) {
    const dx = metricWrappedDelta(longitude, center.longitudeRadians, Math.PI * 2)
      / Math.max(0.01, center.radiusLongitudeRadians);
    const dy = (latitude - center.latitudeRadians) / Math.max(0.01, center.radiusLatitudeRadians);
    const contribution = (center.kind === 'high' ? 1 : -1)
      * center.strength
      * Math.exp(-0.5 * (dx * dx + dy * dy));
    centerPressure += contribution;
    const key = center.regime === 'subtropical'
      ? 'subtropicalCenterPressure'
      : center.regime === 'subpolar'
        ? 'subpolarCenterPressure'
        : center.regime === 'equatorial-trough'
          ? 'equatorialCenterPressure'
          : center.regime === 'polar'
            ? 'polarCenterPressure'
            : 'continentalCenterPressure';
    contributions[key] += contribution;
  }
  const thermalAnomaly = Math.max(-1, Math.min(1, (temperatureC - averageTemperatureC) / 30));
  const thermalPressure = -thermalAnomaly * metricGaussian(absoluteLatitude, 42, 24) * 0.12;
  return {
    ...contributions,
    centerPressure,
    thermalPressure,
    reconstructedPressure: Math.max(-1, Math.min(1, latitudePressure + centerPressure + thermalPressure)),
  };
}

function metricGaussian(value: number, center: number, spread: number): number {
  return Math.exp(-((value - center) ** 2) / (2 * spread * spread));
}

function metricWrappedDelta(value: number, center: number, period: number): number {
  let delta = value - center;
  if (delta > period / 2) delta -= period;
  if (delta < -period / 2) delta += period;
  return delta;
}

function finalBiomeConsistency(project: WorldProject) {
  const layers = project.primaryWorld.layers;
  const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
  const topologyLookup = equirectangularTopologyLookup(
    topology,
    project.primaryWorld.mapModel.resolution.width,
    project.primaryWorld.mapModel.resolution.height,
  );
  const lakeWetnessSupport = lakeWetnessSupportForTopology(topology.resolution);
  const wetlandCode = biomeToCode('wetland');
  let supported = 0;
  let land = 0;
  for (let index = 0; index < layers.biomes.length; index += 1) {
    if (layers.water[index]) continue;
    land += 1;
    const topologyCell = topologyLookup[index];
    const topologyWetland = project.primaryWorld.topologyLayers.biomes[topologyCell] === wetlandCode;
    if (layers.biomes[index] === expectedBiomeCode(
      project,
      index,
      topologyWetland,
      lakeWetnessSupport,
    )) supported += 1;
  }
  return { value: supported / Math.max(1, land), sampleCount: land };
}

function expectedBiomeCode(
  project: WorldProject,
  index: number,
  topologyWetland = false,
  lakeWetnessSupport = 0,
): number {
  const layers = project.primaryWorld.layers;
  if (layers.ice[index]) return biomeToCode('ice_cap');
  const supportedLake = Boolean(layers.lakes[index]) && topologyWetland && layers.wetness[index] >= lakeWetnessSupport;
  const lowlandFloodplain = topologyWetland
    && layers.elevation[index] >= project.primaryWorld.seaLevel
    && layers.elevation[index] < project.primaryWorld.seaLevel + LOWLAND_FLOODPLAIN_MAX_ALTITUDE
    && layers.river[index] > LOWLAND_FLOODPLAIN_MIN_RIVER
    && layers.wetness[index] > LOWLAND_FLOODPLAIN_MIN_WETNESS;
  if (supportedLake || lowlandFloodplain || (layers.river[index] > 0.5 && layers.wetness[index] > 0.66)) return biomeToCode('wetland');
  if (layers.temperature[index] <= 1.5) return biomeToCode('tundra');
  if (layers.wetness[index] < 0.2) return biomeToCode('desert');
  if (layers.temperature[index] > 20 && layers.wetness[index] > 0.72) return biomeToCode('rainforest');
  if (layers.wetness[index] > forestWetnessThreshold(layers.temperature[index])) return biomeToCode('forest');
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

function aggregateOceanRasterLayer(
  layer: Float32Array,
  source: EarthObservations['resolution'],
  width: number,
  height: number,
  water: Uint8Array,
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
          if (!water[index]) continue;
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

function distanceFromWater(water: Uint8Array, width: number, height: number): Int16Array {
  const distance = new Int16Array(water.length);
  distance.fill(32_767);
  const queue = new Int32Array(water.length);
  let head = 0;
  let tail = 0;
  for (let index = 0; index < water.length; index += 1) {
    if (!water[index]) continue;
    distance[index] = 0;
    queue[tail++] = index;
  }
  while (head < tail) {
    const cell = queue[head++];
    const x = cell % width;
    const y = Math.floor(cell / width);
    const nextDistance = distance[cell] + 1;
    const neighbors = [
      y * width + ((x - 1 + width) % width),
      y * width + ((x + 1) % width),
      y > 0 ? (y - 1) * width + x : -1,
      y + 1 < height ? (y + 1) * width + x : -1,
    ];
    for (const neighbor of neighbors) {
      if (neighbor < 0 || distance[neighbor] <= nextDistance) continue;
      distance[neighbor] = nextDistance;
      queue[tail++] = neighbor;
    }
  }
  return distance;
}

function localRelief(
  elevation: Float32Array,
  water: Uint8Array,
  width: number,
  height: number,
): Float32Array {
  const relief = new Float32Array(elevation.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      if (water[cell]) continue;
      let maximumDifference = 0;
      const neighbors = [
        y * width + ((x - 1 + width) % width),
        y * width + ((x + 1) % width),
        y > 0 ? (y - 1) * width + x : -1,
        y + 1 < height ? (y + 1) * width + x : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || water[neighbor]) continue;
        maximumDifference = Math.max(maximumDifference, Math.abs(elevation[neighbor] - elevation[cell]));
      }
      relief[cell] = maximumDifference;
    }
  }
  return relief;
}

function latitudeBandLandMean(
  values: Float32Array,
  observations: EarthObservations,
  minimumAbsoluteLatitude: number,
  maximumAbsoluteLatitude: number,
): number {
  let total = 0;
  let count = 0;
  const { width, height } = observations.resolution;
  for (let y = 0; y < height; y += 1) {
    const absoluteLatitude = Math.abs(latitudeDegrees(y, height));
    if (absoluteLatitude < minimumAbsoluteLatitude || absoluteLatitude > maximumAbsoluteLatitude) continue;
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (observations.waterMask[index]) continue;
      total += values[index];
      count += 1;
    }
  }
  return total / Math.max(1, count);
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
