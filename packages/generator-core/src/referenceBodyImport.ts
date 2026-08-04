import {
  biomeNames,
  biomeToCode,
  buildCubedSphereTopology,
  classifyBiomeFromRules,
  type Biome,
  type MapLayers,
  type PrimaryWorld,
  type Resolution,
  type TopologyLayers,
} from '@world-forge/shared';

export const REFERENCE_BODY_RASTER_SCHEMA = 'world-forge-reference-body-raster-v1' as const;

export type ReferenceLayerOrigin = 'imported' | 'derived' | 'generated';

export type ReferenceBodyPhysicalFacts = {
  radiusKm: number;
  massEarth: number;
  axialTiltDeg: number;
  orbitalEccentricity: number;
  averageTemperatureC: number;
  seaLevelMeters?: number;
  tideInfluence?: number;
};

export type ReferenceBodyRasterV1 = {
  schema: typeof REFERENCE_BODY_RASTER_SCHEMA;
  bodyId: string;
  name: string;
  resolution: Resolution;
  elevationMeters: Float32Array;
  waterMask?: Uint8Array;
  temperatureC?: Float32Array;
  wetness?: Float32Array;
  iceMask?: Uint8Array;
  biomeCodes?: Uint8Array;
  physical: ReferenceBodyPhysicalFacts;
  topologyResolution?: number;
  layerOrigins?: Partial<Record<keyof MapLayers, ReferenceLayerOrigin>>;
};

export type ReferenceBodyImportMetadataV1 = {
  schema: 'world-forge-reference-body-import-v1';
  sourceResolution: Resolution;
  elevationMetersRange: { min: number; max: number };
  layerOrigins: Record<keyof MapLayers, ReferenceLayerOrigin>;
};

export type ImportedPrimaryWorld = PrimaryWorld & {
  referenceImport: ReferenceBodyImportMetadataV1;
};

export function importReferenceBodyRaster(input: ReferenceBodyRasterV1): ImportedPrimaryWorld {
  validateInput(input);
  const cellCount = input.resolution.width * input.resolution.height;
  const seaLevelMeters = input.physical.seaLevelMeters ?? 0;
  const elevationRange = numericRange(input.elevationMeters);
  const elevationScale = Math.max(1, Math.abs(elevationRange.min - seaLevelMeters), Math.abs(elevationRange.max - seaLevelMeters));
  const elevation = Float32Array.from(input.elevationMeters, (value) => (value - seaLevelMeters) / elevationScale);
  const water = input.waterMask
    ? Uint8Array.from(input.waterMask, binaryValue)
    : Uint8Array.from(input.elevationMeters, (value) => value <= seaLevelMeters ? 1 : 0);
  const temperature = input.temperatureC
    ? Float32Array.from(input.temperatureC)
    : deriveTemperature(input.resolution, input.physical.averageTemperatureC, elevation, water);
  const ice = input.iceMask
    ? Uint8Array.from(input.iceMask, binaryValue)
    : Uint8Array.from(temperature, (value, index) => value <= -4 && (water[index] === 1 || Math.abs(latitudeForRow(Math.floor(index / input.resolution.width), input.resolution.height)) > 1.05) ? 1 : 0);
  const wetness = input.wetness
    ? Float32Array.from(input.wetness, unitValue)
    : deriveWetness(water, temperature, elevation);
  const biomes = input.biomeCodes
    ? Uint8Array.from(input.biomeCodes, (value) => clampBiomeCode(value))
    : classifyBiomes(input.resolution, elevation, water, temperature, wetness, ice);
  const zeroFloat = () => new Float32Array(cellCount);
  const layers: MapLayers = {
    elevation,
    water,
    plates: new Uint16Array(cellCount),
    temperature,
    wetness,
    climateMoisture: Float32Array.from(wetness),
    climatePrecipitation: Float32Array.from(wetness, (value) => value * 0.8),
    climateWetnessDelta: zeroFloat(),
    biomes,
    ice,
    river: zeroFloat(),
    lakes: new Uint8Array(cellCount),
    windX: zeroFloat(),
    windY: zeroFloat(),
    currentX: zeroFloat(),
    currentY: zeroFloat(),
  };

  const topologyResolution = Math.max(8, Math.round(input.topologyResolution ?? topologyResolutionForRaster(input.resolution)));
  const topology = buildCubedSphereTopology(topologyResolution);
  const topologyLayers = projectToTopology(layers, input.resolution, topology.latitudes, topology.longitudes);
  const oceanPercentage = percentageOf(water, 1);
  const averageTemperatureC = mean(temperature);
  const aridity = mean(Float32Array.from(wetness, (value) => 1 - value));
  const layerOrigins = resolveLayerOrigins(input);

  return {
    id: input.bodyId,
    name: input.name,
    sizeClass: input.physical.radiusKm / 6371.0088,
    massClass: input.physical.massEarth,
    oceanPercentage,
    seaLevel: 0,
    axialTiltDeg: input.physical.axialTiltDeg,
    orbitalEccentricity: input.physical.orbitalEccentricity,
    averageTemperatureC,
    aridity,
    tideInfluence: input.physical.tideInfluence ?? 0,
    mapModel: {
      resolution: { ...input.resolution },
      projection: 'equirectangular',
      wrapMode: 'east-west',
    },
    topology: {
      kind: topology.kind,
      resolution: topology.resolution,
      cellCount: topology.cellCount,
    },
    topologyLayers,
    plates: [],
    rivers: [],
    layers,
    referenceImport: {
      schema: 'world-forge-reference-body-import-v1',
      sourceResolution: { ...input.resolution },
      elevationMetersRange: elevationRange,
      layerOrigins,
    },
  };
}

function projectToTopology(
  layers: MapLayers,
  resolution: Resolution,
  latitudes: Float32Array,
  longitudes: Float32Array,
): TopologyLayers {
  const count = latitudes.length;
  const topology: TopologyLayers = {
    elevation: new Float32Array(count),
    plates: new Uint16Array(count),
    water: new Uint8Array(count),
    temperature: new Float32Array(count),
    wetness: new Float32Array(count),
    climateMoisture: new Float32Array(count),
    climatePrecipitation: new Float32Array(count),
    climateWetnessDelta: new Float32Array(count),
    biomes: new Uint8Array(count),
    ice: new Uint8Array(count),
    river: new Float32Array(count),
    lakes: new Uint8Array(count),
    volcanism: new Float32Array(count),
  };
  for (let cell = 0; cell < count; cell += 1) {
    const sourceIndex = rasterIndexForLonLat(longitudes[cell], latitudes[cell], resolution);
    topology.elevation[cell] = layers.elevation[sourceIndex];
    topology.plates[cell] = layers.plates[sourceIndex];
    topology.water[cell] = layers.water[sourceIndex];
    topology.temperature[cell] = layers.temperature[sourceIndex];
    topology.wetness[cell] = layers.wetness[sourceIndex];
    topology.climateMoisture[cell] = layers.climateMoisture[sourceIndex];
    topology.climatePrecipitation[cell] = layers.climatePrecipitation[sourceIndex];
    topology.climateWetnessDelta[cell] = layers.climateWetnessDelta[sourceIndex];
    topology.biomes[cell] = layers.biomes[sourceIndex];
    topology.ice[cell] = layers.ice[sourceIndex];
    topology.river[cell] = layers.river[sourceIndex];
    topology.lakes[cell] = layers.lakes[sourceIndex];
  }
  return topology;
}

function deriveTemperature(
  resolution: Resolution,
  meanTemperatureC: number,
  elevation: Float32Array,
  water: Uint8Array,
): Float32Array {
  const output = new Float32Array(elevation.length);
  for (let index = 0; index < output.length; index += 1) {
    const row = Math.floor(index / resolution.width);
    const latitude = latitudeForRow(row, resolution.height);
    const latitudeCooling = Math.pow(Math.abs(latitude) / (Math.PI / 2), 1.35) * 42;
    const elevationCooling = Math.max(0, elevation[index]) * 28;
    output[index] = meanTemperatureC + 15 - latitudeCooling - elevationCooling + (water[index] ? 2 : 0);
  }
  const correction = meanTemperatureC - mean(output);
  for (let index = 0; index < output.length; index += 1) output[index] += correction;
  return output;
}

function deriveWetness(water: Uint8Array, temperature: Float32Array, elevation: Float32Array): Float32Array {
  return Float32Array.from(water, (isWater, index) => {
    if (isWater) return 1;
    const thermal = 1 - Math.min(1, Math.abs(temperature[index] - 14) / 55);
    const highlandDrying = Math.max(0, elevation[index]) * 0.25;
    return unitValue(0.28 + thermal * 0.28 - highlandDrying);
  });
}

function classifyBiomes(
  resolution: Resolution,
  elevation: Float32Array,
  water: Uint8Array,
  temperature: Float32Array,
  wetness: Float32Array,
  ice: Uint8Array,
): Uint8Array {
  const output = new Uint8Array(elevation.length);
  for (let index = 0; index < output.length; index += 1) {
    const row = Math.floor(index / resolution.width);
    const latitude = latitudeForRow(row, resolution.height);
    output[index] = biomeToCode(classifyBiomeFromRules({
      water: water[index] === 1,
      ice: ice[index] === 1,
      temperatureC: temperature[index],
      elevationAboveSeaLevel: Math.max(0, elevation[index]),
      lake: false,
      river: 0,
      wetness: wetness[index],
      polarLatitude: Math.abs(latitude) / (Math.PI / 2),
    }));
  }
  return output;
}

function resolveLayerOrigins(input: ReferenceBodyRasterV1): Record<keyof MapLayers, ReferenceLayerOrigin> {
  const imported = new Set<keyof MapLayers>(['elevation']);
  if (input.waterMask) imported.add('water');
  if (input.temperatureC) imported.add('temperature');
  if (input.wetness) imported.add('wetness');
  if (input.iceMask) imported.add('ice');
  if (input.biomeCodes) imported.add('biomes');
  const result = {} as Record<keyof MapLayers, ReferenceLayerOrigin>;
  for (const layer of Object.keys(emptyLayerOrigins()) as Array<keyof MapLayers>) {
    result[layer] = input.layerOrigins?.[layer] ?? (imported.has(layer) ? 'imported' : 'derived');
  }
  return result;
}

function emptyLayerOrigins(): Record<keyof MapLayers, ReferenceLayerOrigin> {
  return {
    elevation: 'derived', water: 'derived', plates: 'derived', temperature: 'derived', wetness: 'derived',
    climateMoisture: 'derived', climatePrecipitation: 'derived', climateWetnessDelta: 'derived', biomes: 'derived',
    ice: 'derived', river: 'derived', lakes: 'derived', windX: 'derived', windY: 'derived', currentX: 'derived', currentY: 'derived',
  };
}

function rasterIndexForLonLat(longitude: number, latitude: number, resolution: Resolution): number {
  const x = Math.min(resolution.width - 1, Math.max(0, Math.floor(((longitude + Math.PI) / (Math.PI * 2)) * resolution.width)));
  const y = Math.min(resolution.height - 1, Math.max(0, Math.floor((0.5 - latitude / Math.PI) * resolution.height)));
  return y * resolution.width + x;
}

function latitudeForRow(row: number, height: number): number {
  return Math.PI / 2 - ((row + 0.5) / height) * Math.PI;
}

function topologyResolutionForRaster(resolution: Resolution): number {
  return Math.max(8, Math.min(256, Math.round(Math.sqrt(resolution.width * resolution.height / 6))));
}

function validateInput(input: ReferenceBodyRasterV1): void {
  if (input.schema !== REFERENCE_BODY_RASTER_SCHEMA) throw new Error('Unsupported reference-body raster schema.');
  if (!input.bodyId.trim() || !input.name.trim()) throw new Error('Reference body identity is required.');
  const expected = input.resolution.width * input.resolution.height;
  if (!Number.isInteger(input.resolution.width) || !Number.isInteger(input.resolution.height) || expected <= 0) {
    throw new Error('Reference body resolution must be positive integers.');
  }
  validateLength('elevationMeters', input.elevationMeters, expected);
  validateLength('waterMask', input.waterMask, expected);
  validateLength('temperatureC', input.temperatureC, expected);
  validateLength('wetness', input.wetness, expected);
  validateLength('iceMask', input.iceMask, expected);
  validateLength('biomeCodes', input.biomeCodes, expected);
  if (!Number.isFinite(input.physical.radiusKm) || input.physical.radiusKm <= 0) throw new Error('Reference body radius must be positive.');
  if (!Number.isFinite(input.physical.massEarth) || input.physical.massEarth <= 0) throw new Error('Reference body mass must be positive.');
}

function validateLength(label: string, values: ArrayLike<number> | undefined, expected: number): void {
  if (values && values.length !== expected) throw new Error(`${label} must contain ${expected} cells.`);
}

function numericRange(values: ArrayLike<number>): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < values.length; index += 1) {
    const value = Number(values[index]);
    if (!Number.isFinite(value)) throw new Error('Reference raster contains a non-finite value.');
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function percentageOf(values: Uint8Array, target: number): number {
  let count = 0;
  for (const value of values) if (value === target) count += 1;
  return count / Math.max(1, values.length) * 100;
}

function mean(values: ArrayLike<number>): number {
  let total = 0;
  for (let index = 0; index < values.length; index += 1) total += Number(values[index]);
  return total / Math.max(1, values.length);
}

function binaryValue(value: number): number {
  return value ? 1 : 0;
}

function unitValue(value: number): number {
  return Math.max(0, Math.min(1, Number(value)));
}

function clampBiomeCode(value: number): number {
  return Math.max(0, Math.min(biomeNames.length - 1, Math.round(value)));
}
