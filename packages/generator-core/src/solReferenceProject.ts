import {
  biomeNames,
  codeToBiome,
  createDefaultConfig,
  type Moon,
  type PrimaryWorld,
  type SelectedValues,
  type SolarSystem,
  type SystemBody,
  type WorldMetrics,
} from '@world-forge/shared';
import {
  WORLD_BODY_DETAIL_SCHEMA,
  worldBodyDetailCapabilities,
  type AtmosphericPresentationDetailV1,
  type CatalogBodyDetailV1,
  type GeographicSurfaceDetailV1,
  type PopulationDetailV1,
  type WorldBodyDetailV1,
} from '@world-forge/shared/worldBodyDetails';
import {
  WORLD_BODY_CATALOG_SCHEMA,
  type MultiBodyWorldProject,
  type WorldBodyCatalogV1,
  type WorldBodyRecordV1,
} from '@world-forge/shared/worldBodies';

export const SOL_REFERENCE_PROJECT_ID = 'project-sol-reference';
export const SOL_REFERENCE_SEED = 'sol-reference-v1';

const EARTH_RADIUS_KM = 6371.0088;
const EARTH_MASS_KG = 5.9722e24;
const PLANET_ORBITAL_ORDERS = [1, 2, 3, 4, 6, 7, 8, 9] as const;

export function createSolReferenceProject(
  earth: PrimaryWorld,
  options: { appVersion?: string; sourceCommit?: string; createdAt?: string } = {},
): MultiBodyWorldProject {
  const createdAt = options.createdAt ?? '2026-08-04T00:00:00.000Z';
  const selectedValues = earthSelectedValues(earth);
  const config = {
    ...createDefaultConfig(SOL_REFERENCE_SEED, earth.mapModel.resolution),
    topologyResolution: earth.topology.resolution,
    selectedValues,
  };
  return {
    projectId: SOL_REFERENCE_PROJECT_ID,
    projectName: 'Sol System',
    createdAt,
    updatedAt: createdAt,
    appVersion: options.appVersion ?? 'reference-etl-v1',
    sourceCommit: options.sourceCommit,
    generatorVersion: 'reference-import-v1',
    seed: SOL_REFERENCE_SEED,
    config,
    selectedValues,
    solarSystem: solSystemScaffold(),
    primaryWorld: earth,
    bodyCatalog: solBodyCatalog(earth),
    metrics: metricsForSurface(earth),
    diagnostics: {
      totalMs: 0,
      phases: [{ name: 'reference-data-import', ms: 0 }],
    },
    exports: {
      packageExtension: '.wforge',
      supportedFormats: ['png', 'svg', 'json', 'wforge'],
    },
  };
}

function solSystemScaffold(): SolarSystem {
  const planets = planetDefinitions.map((definition, index) => systemBody(definition, PLANET_ORBITAL_ORDERS[index]));
  return {
    star: {
      id: 'sol',
      type: 'G2 V main sequence',
      massClass: 'solar',
      luminosityClass: 'V',
      ageGy: 4.6,
      colorTemperatureClass: 'yellow',
    },
    ageGy: 4.6,
    bodies: [
      ...planets.slice(0, 4),
      beltBody('main-asteroid-belt', 5, 2.77, false),
      ...planets.slice(4),
      beltBody('kuiper-belt', 10, 43, false),
    ],
    primaryWorldId: 'earth',
    visibleBodiesFromPrimary: ['mercury', 'venus', 'mars', 'jupiter', 'saturn'],
    generatedNotes: [
      'Reference-system scaffold. Physical and orbital facts are carried by bodyCatalog.',
      'Body detail tiers keep catalog, presentation, reference-surface, geographic, irregular-mesh, and population payloads distinct.',
      'Only bodies with compatible imported or derived detail expose Map and Explorer capabilities.',
      'Atmospheric presentation profiles remain Globe-disabled until the dedicated body-detail renderer is wired.',
    ],
  };
}

function solBodyCatalog(earth: PrimaryWorld): WorldBodyCatalogV1 {
  const bodies: WorldBodyRecordV1[] = [];
  for (const definition of planetDefinitions) {
    const surface = definition.id === 'earth' ? earth : undefined;
    const detail = planetDetail(definition, Boolean(surface));
    bodies.push({
      bodyId: definition.id,
      name: definition.name,
      bodyType: definition.bodyType,
      capabilities: solCapabilitiesForDetail(detail),
      dataOrigin: 'imported',
      physical: {
        meanRadiusKm: definition.radiusKm,
        massKg: definition.massKg,
        axialTiltDeg: definition.axialTiltDeg,
        rotationPeriodHours: definition.rotationPeriodHours,
      },
      orbit: {
        semiMajorAxisKm: definition.semiMajorAxisKm,
        periodDays: definition.periodDays,
        eccentricity: definition.eccentricity,
        direction: 'prograde',
      },
      detail,
      surface,
    });
    for (const moonDefinition of definition.moons) bodies.push(moonRecord(definition.id, moonDefinition));
  }
  bodies.push(
    beltRecord('main-asteroid-belt', 'Main Asteroid Belt', 414_000_000, 1680, mainBeltDetail()),
    beltRecord('kuiper-belt', 'Kuiper Belt', 6_432_000_000, 102_000, kuiperBeltDetail()),
  );
  return {
    schema: WORLD_BODY_CATALOG_SCHEMA,
    primaryBodyId: 'earth',
    activeBodyId: 'earth',
    bodies,
  };
}

function planetDetail(definition: PlanetDefinition, hasGeographicSurface: boolean): WorldBodyDetailV1 {
  if (hasGeographicSurface) return geographicDetail('imported');
  if (definition.bodyType === 'gas-giant' || definition.bodyType === 'ice-giant') {
    return giantPresentationDetail(definition.id);
  }
  return catalogDetail({ kind: 'sphere' }, 'imported');
}

function solCapabilitiesForDetail(detail: WorldBodyDetailV1): WorldBodyRecordV1['capabilities'] {
  const capabilities = worldBodyDetailCapabilities(detail);
  if (detail.kind === 'atmospheric-presentation') return { ...capabilities, globe: false };
  return capabilities;
}

function giantPresentationDetail(bodyId: string): AtmosphericPresentationDetailV1 {
  const profile = giantPresentationProfiles[bodyId];
  if (!profile) throw new Error(`Missing atmospheric presentation profile for ${bodyId}.`);
  return {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'atmospheric-presentation',
    tier: 'presentation',
    origin: 'derived',
    shape: {
      kind: 'oblate-spheroid',
      equatorialRadiusKm: profile.equatorialRadiusKm,
      polarRadiusKm: profile.polarRadiusKm,
    },
    atmosphere: {
      paletteHex: [...profile.paletteHex],
      bandCount: profile.bandCount,
      bandContrast: profile.bandContrast,
      hazeStrength: profile.hazeStrength,
      differentialRotationFraction: profile.differentialRotationFraction,
    },
    rings: profile.rings,
  };
}

function catalogDetail(shape: CatalogBodyDetailV1['shape'], origin: CatalogBodyDetailV1['origin']): CatalogBodyDetailV1 {
  return {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'catalog',
    tier: 'catalog',
    origin,
    shape,
  };
}

function geographicDetail(origin: GeographicSurfaceDetailV1['origin']): GeographicSurfaceDetailV1 {
  return {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'geographic-surface',
    tier: 'geographic',
    origin,
    shape: { kind: 'sphere' },
    surfaceContract: 'PrimaryWorld',
  };
}

function mainBeltDetail(): PopulationDetailV1 {
  return populationDetail({
    innerRadiusKm: 329_000_000,
    outerRadiusKm: 478_000_000,
    verticalSpreadKm: 45_000_000,
    inclinationMeanDeg: 8,
    eccentricityMean: 0.15,
    relativeDensity: 1,
  }, 'sol-main-belt-v1', 2400);
}

function kuiperBeltDetail(): PopulationDetailV1 {
  return populationDetail({
    innerRadiusKm: 4_500_000_000,
    outerRadiusKm: 7_500_000_000,
    verticalSpreadKm: 1_200_000_000,
    inclinationMeanDeg: 12,
    eccentricityMean: 0.2,
    relativeDensity: 0.55,
  }, 'sol-kuiper-belt-v1', 1800);
}

function populationDetail(
  distribution: PopulationDetailV1['distribution'],
  realizationSeed: string,
  maxPreviewParticles: number,
): PopulationDetailV1 {
  return {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'population',
    tier: 'presentation',
    origin: 'derived',
    distribution,
    realizationSeed,
    maxPreviewParticles,
  };
}

function metricsForSurface(world: PrimaryWorld): WorldMetrics {
  const biomeCounts = Object.fromEntries(biomeNames.map((biome) => [biome, 0])) as WorldMetrics['biomeCounts'];
  let iceCells = 0;
  let lakeCells = 0;
  for (let index = 0; index < world.layers.biomes.length; index += 1) {
    biomeCounts[codeToBiome(world.layers.biomes[index])] += 1;
    if (world.layers.ice[index]) iceCells += 1;
    if (world.layers.lakes[index]) lakeCells += 1;
  }
  const cells = Math.max(1, world.layers.water.length);
  return {
    oceanPercentage: world.oceanPercentage,
    landPercentage: 100 - world.oceanPercentage,
    icePercentage: iceCells / cells * 100,
    riverCount: world.rivers.length,
    lakeCellCount: lakeCells,
    biomeCounts,
    validation: {
      oceanWithinTolerance: true,
      riverPathsValid: world.rivers.every((river) => river.path.length > 1),
    },
  };
}

function earthSelectedValues(earth: PrimaryWorld): SelectedValues {
  return {
    systemAgeGy: 4.6,
    oceanPercentage: earth.oceanPercentage,
    averageTemperatureC: earth.averageTemperatureC,
    aridity: earth.aridity,
    seaLevel: earth.seaLevel,
    axialTiltDeg: earth.axialTiltDeg,
    orbitalEccentricity: earth.orbitalEccentricity,
    sizeClass: earth.sizeClass,
    moonCount: 1,
    impactFrequency: 1,
    plateCount: earth.plates.length,
    riverDensity: earth.rivers.length / Math.max(1, earth.mapModel.resolution.width * earth.mapModel.resolution.height) * 1000,
    continentCount: 7,
    continentScale: 0.55,
    islandDensity: 0.4,
    oceanTolerancePercentagePoints: 0,
  };
}

type PlanetDefinition = {
  id: string;
  name: string;
  bodyType: SystemBody['bodyType'];
  radiusKm: number;
  massKg: number;
  semiMajorAxisKm: number;
  periodDays: number;
  eccentricity: number;
  axialTiltDeg: number;
  rotationPeriodHours: number;
  moons: ReferenceMoon[];
};

type ReferenceMoon = {
  id: string;
  name: string;
  radiusKm: number;
  semiMajorAxisKm: number;
  periodDays: number;
  irregular?: boolean;
  direction?: 'prograde' | 'retrograde';
};

type GiantPresentationProfile = {
  equatorialRadiusKm: number;
  polarRadiusKm: number;
  paletteHex: readonly string[];
  bandCount: number;
  bandContrast: number;
  hazeStrength: number;
  differentialRotationFraction: number;
  rings?: AtmosphericPresentationDetailV1['rings'];
};

const giantPresentationProfiles: Record<string, GiantPresentationProfile> = {
  jupiter: {
    equatorialRadiusKm: 71_492,
    polarRadiusKm: 66_854,
    paletteHex: ['#e7d2b4', '#ba865d', '#f2e2c8', '#9b5f3e', '#d8b58e'],
    bandCount: 12,
    bandContrast: 0.55,
    hazeStrength: 0.18,
    differentialRotationFraction: 0.08,
  },
  saturn: {
    equatorialRadiusKm: 60_268,
    polarRadiusKm: 54_364,
    paletteHex: ['#ead9ad', '#c9ad73', '#f3e6c2', '#b89a63'],
    bandCount: 10,
    bandContrast: 0.28,
    hazeStrength: 0.24,
    differentialRotationFraction: 0.06,
    rings: { innerRadiusRatio: 1.24, outerRadiusRatio: 2.27, opacity: 0.72, tiltDeg: 26.7 },
  },
  uranus: {
    equatorialRadiusKm: 25_559,
    polarRadiusKm: 24_973,
    paletteHex: ['#b8e2e4', '#8fcbd0', '#d0eef0'],
    bandCount: 5,
    bandContrast: 0.12,
    hazeStrength: 0.42,
    differentialRotationFraction: 0.04,
    rings: { innerRadiusRatio: 1.64, outerRadiusRatio: 2, opacity: 0.18, tiltDeg: 97.8 },
  },
  neptune: {
    equatorialRadiusKm: 24_764,
    polarRadiusKm: 24_341,
    paletteHex: ['#4d77bd', '#3159a4', '#7199d2', '#d8e4f2'],
    bandCount: 7,
    bandContrast: 0.32,
    hazeStrength: 0.3,
    differentialRotationFraction: 0.09,
    rings: { innerRadiusRatio: 1.7, outerRadiusRatio: 2.55, opacity: 0.1, tiltDeg: 28.3 },
  },
};

const planetDefinitions: PlanetDefinition[] = [
  planet('mercury', 'Mercury', 'rocky', 2439.4, 3.30103e23, 57_909_227, 87.969, 0.2056, 0.034, 1407.6),
  planet('venus', 'Venus', 'rocky', 6051.8, 4.86731e24, 108_209_475, 224.701, 0.0068, 177.36, -5832.5),
  planet('earth', 'Earth', 'rocky', 6371.0088, EARTH_MASS_KG, 149_598_262, 365.256, 0.0167, 23.439, 23.934, [
    moon('luna', 'Luna', 1737.4, 384_400, 27.322),
  ]),
  planet('mars', 'Mars', 'rocky', 3389.5, 6.41691e23, 227_943_824, 686.98, 0.0934, 25.19, 24.623, [
    moon('phobos', 'Phobos', 11.08, 9_375, 0.3187, true),
    moon('deimos', 'Deimos', 6.2, 23_463, 1.2624, true),
  ]),
  planet('jupiter', 'Jupiter', 'gas-giant', 69_911, 1.898125e27, 778_340_821, 4332.59, 0.0489, 3.13, 9.925, [
    moon('io', 'Io', 1821.6, 421_800, 1.7691),
    moon('europa', 'Europa', 1560.8, 671_100, 3.5512),
    moon('ganymede', 'Ganymede', 2634.1, 1_070_400, 7.1546),
    moon('callisto', 'Callisto', 2410.3, 1_882_700, 16.689),
  ]),
  planet('saturn', 'Saturn', 'gas-giant', 58_232, 5.68317e26, 1_426_666_422, 10_759.22, 0.0565, 26.73, 10.7, [
    moon('enceladus', 'Enceladus', 252.1, 238_000, 1.3702),
    moon('titan', 'Titan', 2574.7, 1_221_870, 15.945),
  ]),
  planet('uranus', 'Uranus', 'ice-giant', 25_362, 8.68099e25, 2_870_658_186, 30_688.5, 0.0463, 97.77, -17.24, [
    moon('titania', 'Titania', 788.9, 435_910, 8.706),
    moon('oberon', 'Oberon', 761.4, 583_520, 13.463),
  ]),
  planet('neptune', 'Neptune', 'ice-giant', 24_622, 1.024092e26, 4_498_396_441, 60_182, 0.0095, 28.32, 16.11, [
    moon('triton', 'Triton', 1353.4, 354_760, 5.877, false, 'retrograde'),
  ]),
];

function planet(
  id: string,
  name: string,
  bodyType: SystemBody['bodyType'],
  radiusKm: number,
  massKg: number,
  semiMajorAxisKm: number,
  periodDays: number,
  eccentricity: number,
  axialTiltDeg: number,
  rotationPeriodHours: number,
  moons: ReferenceMoon[] = [],
): PlanetDefinition {
  return { id, name, bodyType, radiusKm, massKg, semiMajorAxisKm, periodDays, eccentricity, axialTiltDeg, rotationPeriodHours, moons };
}

function moon(
  id: string,
  name: string,
  radiusKm: number,
  semiMajorAxisKm: number,
  periodDays: number,
  irregular = false,
  direction: 'prograde' | 'retrograde' = 'prograde',
): ReferenceMoon {
  return { id, name, radiusKm, semiMajorAxisKm, periodDays, irregular, direction };
}

function systemBody(definition: PlanetDefinition, orbitalOrder: number): SystemBody {
  return {
    id: definition.id,
    bodyType: definition.bodyType,
    orbitalOrder,
    orbitalDistanceClass: definition.semiMajorAxisKm / 149_597_870.7,
    eccentricity: definition.eccentricity,
    sizeClass: definition.radiusKm / EARTH_RADIUS_KM,
    massClass: definition.massKg / EARTH_MASS_KG,
    visibleFromPrimary: definition.id !== 'uranus' && definition.id !== 'neptune',
    isPrimaryWorld: definition.id === 'earth',
    moons: definition.moons.map(systemMoon),
  };
}

function systemMoon(definition: ReferenceMoon): Moon {
  return {
    id: definition.id,
    name: definition.name,
    sizeClass: definition.radiusKm / EARTH_RADIUS_KM,
    orbitalDistanceClass: definition.semiMajorAxisKm / EARTH_RADIUS_KM,
    tideInfluence: definition.id === 'luna' ? 1 : 0,
  };
}

function beltBody(id: string, orbitalOrder: number, distanceAu: number, visibleFromPrimary: boolean): SystemBody {
  return {
    id,
    bodyType: 'belt',
    orbitalOrder,
    orbitalDistanceClass: distanceAu,
    eccentricity: 0,
    sizeClass: 0.1,
    massClass: 0.0001,
    visibleFromPrimary,
    isPrimaryWorld: false,
    moons: [],
  };
}

function moonRecord(parentBodyId: string, definition: ReferenceMoon): WorldBodyRecordV1 {
  const detail = catalogDetail(
    definition.irregular ? { kind: 'irregular-mesh' } : { kind: 'sphere' },
    'imported',
  );
  return {
    bodyId: definition.id,
    name: definition.name,
    bodyType: 'moon',
    parentBodyId,
    capabilities: worldBodyDetailCapabilities(detail),
    dataOrigin: 'imported',
    physical: { meanRadiusKm: definition.radiusKm },
    orbit: {
      semiMajorAxisKm: definition.semiMajorAxisKm,
      periodDays: definition.periodDays,
      direction: definition.direction ?? 'prograde',
    },
    detail,
  };
}

function beltRecord(
  bodyId: string,
  name: string,
  semiMajorAxisKm: number,
  periodDays: number,
  detail: PopulationDetailV1,
): WorldBodyRecordV1 {
  return {
    bodyId,
    name,
    bodyType: 'belt',
    capabilities: worldBodyDetailCapabilities(detail),
    dataOrigin: 'imported',
    orbit: { semiMajorAxisKm, periodDays, direction: 'prograde' },
    detail,
  };
}
