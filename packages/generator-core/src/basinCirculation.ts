import { biomeToCode, clamp, type WorldProject } from '@world-forge/shared';
import {
  buildClimatologicalPressureModel,
  sampleClimatologicalCoastDistance,
  sampleClimatologicalField,
  sampleClimatologicalInlandDistance,
  sampleClimatologicalPressure,
  type ClimatologicalPressureCenter,
  type ClimatologicalPressureModel,
  type OceanCirculationSector
} from './climatologicalPressure';
import { traceGenerationPerformance } from './generationPerformanceTrace';
import { forestWetnessThreshold } from './biomeClimate';
import {
  lakeWetnessSupportForTopology,
  LOWLAND_FLOODPLAIN_MAX_ALTITUDE,
  LOWLAND_FLOODPLAIN_MIN_RIVER,
  LOWLAND_FLOODPLAIN_MIN_WETNESS,
  type WetlandHydrologyModel,
} from './wetlandHydrology';

const BIOME_CODE = {
  ocean: biomeToCode('ocean'),
  iceCap: biomeToCode('ice_cap'),
  tundra: biomeToCode('tundra'),
  desert: biomeToCode('desert'),
  grassland: biomeToCode('grassland'),
  forest: biomeToCode('forest'),
  rainforest: biomeToCode('rainforest'),
  mountain: biomeToCode('mountain'),
  wetland: biomeToCode('wetland')
} as const;

export type PackedGyreDiagnostic = {
  id: number;
  basinId: number;
  kind: 'subtropical' | 'subpolar';
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  rotationSign: number;
  territorySize: number;
  strength: number;
};

export type ClimatologicalPressureDiagnostics = {
  modelVersion: 'climatological-pressure-v1';
  resolution: { width: number; height: number };
  centers: ClimatologicalPressureCenter[];
  pressurePotential: Float32Array;
  subsidencePotential: Float32Array;
  convergencePotential: Float32Array;
  stormTrackPotential: Float32Array;
  prevailingWindX: Float32Array;
  prevailingWindY: Float32Array;
  openSouthernCircumpolarPath: boolean;
  openNorthernCircumpolarPath: boolean;
  precipitationAdjustedCells: number;
  meanPrecipitationAdjustment: number;
  orographicAdjustedCells: number;
  meanOrographicAdjustment: number;
  coolCurrentAdjustedCells: number;
  meanCoolCurrentDrying: number;
};

export type BasinCirculationDiagnostics = {
  modelVersion: 'basin-circulation-v10';
  marineBasinCount: number;
  largestBasinShare: number;
  coherentGyreCount: number;
  gyreCandidateCount: number;
  coastalAlignmentScore: number;
  stagnantOceanShare: number;
  meanCurrentSpeed: number;
  windTerrainDeflectionIndex: number;
  stagnantWindShare: number;
  packedGyres: PackedGyreDiagnostic[];
  gyreOwner: Int16Array;
  pressureSystems: ClimatologicalPressureDiagnostics;
};

type LargeScaleGyre = Omit<PackedGyreDiagnostic, 'id' | 'territorySize'> & {
  sector: OceanCirculationSector;
  territorySize: number;
};

function indexOf(x: number, y: number, width: number): number {
  return y * width + ((x % width) + width) % width;
}

function wrappedDeltaX(x: number, centerX: number, width: number): number {
  let delta = x - centerX;
  if (delta > width / 2) delta -= width;
  if (delta < -width / 2) delta += width;
  return delta;
}

function longitudeForX(x: number, width: number): number {
  return ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
}

function latitudeForY(y: number, height: number): number {
  return Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
}

function normalizeTo(x: number, y: number, speed: number): { x: number; y: number } {
  const magnitude = Math.hypot(x, y);
  if (magnitude < 1e-7) return { x: 0, y: 0 };
  return { x: x / magnitude * speed, y: y / magnitude * speed };
}

export function equatorwardCurrentExposure(
  currentX: number,
  currentY: number,
  latitudeDegreesValue: number,
): number {
  const speed = Math.hypot(currentX, currentY);
  if (speed < 1e-7 || Math.abs(latitudeDegreesValue) < 5) return 0;
  const hemisphere = latitudeDegreesValue >= 0 ? 1 : -1;
  const equatorwardAlignment = currentY * hemisphere / speed;
  return Math.max(0, equatorwardAlignment) * Math.min(1, speed / 0.35);
}

export function coldHydrationAvailability(wetness: number, temperatureC: number): number {
  const frozenFraction = clamp((5 - temperatureC) / 25, 0, 1);
  return clamp(wetness * (1 - frozenFraction * 0.75), 0, 1);
}

export function continentalConvergenceRecycling(
  inlandDistance: number,
  convergence: number,
  subsidence: number,
): number {
  const continentality = clamp((inlandDistance - 2) / 6, 0, 1);
  return Math.min(
    0.13,
    continentality * clamp(convergence, 0, 1) * (1 - clamp(subsidence, 0, 1)) * 0.21,
  );
}

function scalarGradient(values: Float32Array, x: number, y: number, width: number, height: number): { x: number; y: number } {
  const west = values[indexOf(x - 1, y, width)];
  const east = values[indexOf(x + 1, y, width)];
  const north = values[indexOf(x, Math.max(0, y - 1), width)];
  const south = values[indexOf(x, Math.min(height - 1, y + 1), width)];
  return { x: (east - west) * 0.5, y: (south - north) * 0.5 };
}

function gyreForSector(
  sector: OceanCirculationSector,
  width: number,
  height: number,
  referenceWidth: number
): LargeScaleGyre | null {
  const spanPixels = sector.spanColumns / referenceWidth * width;
  const minimumSpan = sector.regime === 'subtropical' ? width * 0.075 : width * 0.12;
  if (spanPixels < minimumSpan) return null;
  const centerX = ((sector.centerX + 0.5) / referenceWidth) * width - 0.5;
  const centerY = ((Math.PI / 2 - sector.latitudeRadians) / Math.PI) * height - 0.5;
  const radiusX = clamp(spanPixels * (sector.regime === 'subtropical' ? 0.42 : 0.36), width * 0.045, width * 0.22);
  const radiusY = height * (sector.regime === 'subtropical' ? 0.14 : 0.09);
  return {
    basinId: sector.id,
    kind: sector.regime,
    centerX,
    centerY,
    radiusX,
    radiusY,
    rotationSign: sector.regime === 'subtropical' ? sector.hemisphere : -sector.hemisphere,
    territorySize: 0,
    strength: sector.regime === 'subtropical' ? 1 : 0.55,
    sector
  };
}

function buildLargeScaleGyres(
  model: ClimatologicalPressureModel,
  width: number,
  height: number
): LargeScaleGyre[] {
  return model.sectors
    .map((sector) => gyreForSector(sector, width, height, model.resolution.width))
    .filter((gyre): gyre is LargeScaleGyre => Boolean(gyre))
    .sort((left, right) => left.kind.localeCompare(right.kind) || right.radiusX - left.radiusX || left.basinId - right.basinId)
    .slice(0, 10);
}

function classifyAdjustedBiome(
  project: WorldProject,
  index: number,
  topologyWetland: boolean,
  wetlandHydrologyModel: WetlandHydrologyModel,
  lakeWetnessSupport: number,
): number {
  const world = project.primaryWorld;
  const layers = world.layers;
  if (layers.water[index]) return BIOME_CODE.ocean;
  if (layers.ice[index]) return BIOME_CODE.iceCap;
  const legacyRiverWetland = layers.river[index] > 0.5 && layers.wetness[index] > 0.66;
  const supportedLake = wetlandHydrologyModel === 'legacy'
    ? Boolean(layers.lakes[index])
    : topologyWetland && Boolean(layers.lakes[index]) && layers.wetness[index] >= lakeWetnessSupport;
  const topologySupportedFloodplain = wetlandHydrologyModel === 'lowland-floodplain-v1'
    && topologyWetland
    && layers.elevation[index] >= world.seaLevel
    && layers.elevation[index] < world.seaLevel + LOWLAND_FLOODPLAIN_MAX_ALTITUDE
    && layers.river[index] > LOWLAND_FLOODPLAIN_MIN_RIVER
    && layers.wetness[index] > LOWLAND_FLOODPLAIN_MIN_WETNESS;
  if (supportedLake || legacyRiverWetland || topologySupportedFloodplain) return BIOME_CODE.wetland;
  if (layers.biomes[index] === BIOME_CODE.mountain) return BIOME_CODE.mountain;
  if (layers.temperature[index] <= 1.5) return BIOME_CODE.tundra;
  if (layers.wetness[index] < 0.2) return BIOME_CODE.desert;
  if (layers.temperature[index] > 20 && layers.wetness[index] > 0.72) return BIOME_CODE.rainforest;
  if (layers.wetness[index] > forestWetnessThreshold(layers.temperature[index])) return BIOME_CODE.forest;
  return BIOME_CODE.grassland;
}

function applyPressureSystems(
  project: WorldProject,
  model: ClimatologicalPressureModel,
  coolCurrentPotential: Float32Array,
  wetlandHydrologyModel: WetlandHydrologyModel,
): {
  windTerrainDeflectionIndex: number;
  stagnantWindShare: number;
  precipitationAdjustedCells: number;
  meanPrecipitationAdjustment: number;
  orographicAdjustedCells: number;
  meanOrographicAdjustment: number;
  coolCurrentAdjustedCells: number;
  meanCoolCurrentDrying: number;
} {
  const world = project.primaryWorld;
  const layers = world.layers;
  const { width, height } = world.mapModel.resolution;
  let deflectionTotal = 0;
  let stagnantWind = 0;
  let adjustedCells = 0;
  let adjustmentTotal = 0;
  let orographicAdjustedCells = 0;
  let orographicAdjustmentTotal = 0;
  let coolCurrentAdjustedCells = 0;
  let coolCurrentDryingTotal = 0;
  const lakeWetnessSupport = lakeWetnessSupportForTopology(world.topology.resolution);

  for (let y = 0; y < height; y += 1) {
    const latitude = latitudeForY(y, height);
    for (let x = 0; x < width; x += 1) {
      const cell = indexOf(x, y, width);
      const longitude = longitudeForX(x, width);
      const pressure = sampleClimatologicalPressure(model, longitude, latitude);
      const terrain = scalarGradient(layers.elevation, x, y, width, height);
      const slope = Math.hypot(terrain.x, terrain.y);
      const deflection = clamp(slope * 4.5, 0, 0.34);
      const tangentX = -terrain.y;
      const tangentY = terrain.x;
      const tangentSign = pressure.windX * tangentX + pressure.windY * tangentY < 0 ? -1 : 1;
      const lowBasin = !layers.water[cell] && slope < 0.006 && layers.elevation[cell] < world.seaLevel + 0.08;
      const windSpeed = clamp((0.22 + pressure.stormTrack * 0.2 + pressure.convergence * 0.08) * (lowBasin ? 0.58 : 1), 0.1, 0.62);
      const wind = normalizeTo(
        pressure.windX * (1 - deflection) + tangentX * tangentSign * deflection,
        pressure.windY * (1 - deflection) + tangentY * tangentSign * deflection,
        windSpeed
      );
      layers.windX[cell] = wind.x;
      layers.windY[cell] = wind.y;
      deflectionTotal += deflection;
      if (windSpeed < 0.16) stagnantWind += 1;

      if (layers.water[cell]) continue;
      const previousPrecipitation = layers.climatePrecipitation[cell];
      const previousWetness = layers.wetness[cell];
      const topologyWetland = layers.biomes[cell] === BIOME_CODE.wetland;
      const windSlopeAlignment = slope > 1e-7
        ? clamp((terrain.x * wind.x - terrain.y * wind.y) / Math.max(1e-7, slope * windSpeed), -1, 1)
        : 0;
      const terrainStrength = clamp(slope * 20, 0, 1);
      const orographicAdjustment = terrainStrength * (
        windSlopeAlignment >= 0 ? windSlopeAlignment * 0.15 : windSlopeAlignment * 0.1
      );
      const coolCurrentExposure = sampleClimatologicalField(
        model,
        coolCurrentPotential,
        longitude,
        latitude,
      );
      const coolCurrentDrying = Math.sqrt(clamp(coolCurrentExposure, 0, 1))
        * (0.025 + pressure.subsidence * 0.075)
        * (1 - pressure.convergence * 0.65);
      const convergenceRecycling = continentalConvergenceRecycling(
        sampleClimatologicalInlandDistance(model, longitude, latitude),
        pressure.convergence,
        pressure.subsidence,
      );
      const circulationAdjustment = pressure.convergence * 0.13
        + pressure.stormTrack * 0.1
        - pressure.subsidence * 0.15
        + orographicAdjustment
        + convergenceRecycling;
      const nextPrecipitation = clamp(
        previousPrecipitation + circulationAdjustment - coolCurrentDrying * 0.4,
        0,
        1,
      );
      const nextMoisture = clamp(
        layers.climateMoisture[cell] + circulationAdjustment * 0.55 - coolCurrentDrying * 0.7,
        0,
        1,
      );
      const circulationWetness = clamp(
        previousWetness + circulationAdjustment * 0.62 - coolCurrentDrying,
        0,
        1,
      );
      const nextWetness = layers.ice[cell]
        ? coldHydrationAvailability(circulationWetness, layers.temperature[cell])
        : circulationWetness;
      layers.climatePrecipitation[cell] = nextPrecipitation;
      layers.climateMoisture[cell] = nextMoisture;
      layers.wetness[cell] = nextWetness;
      layers.climateWetnessDelta[cell] += nextWetness - previousWetness;
      layers.biomes[cell] = classifyAdjustedBiome(
        project,
        cell,
        topologyWetland,
        wetlandHydrologyModel,
        lakeWetnessSupport,
      );
      adjustedCells += 1;
      adjustmentTotal += nextPrecipitation - previousPrecipitation;
      if (Math.abs(orographicAdjustment) > 1e-6) {
        orographicAdjustedCells += 1;
        orographicAdjustmentTotal += orographicAdjustment;
      }
      if (coolCurrentDrying > 1e-6) {
        coolCurrentAdjustedCells += 1;
        coolCurrentDryingTotal += coolCurrentDrying;
      }
    }
  }

  return {
    windTerrainDeflectionIndex: deflectionTotal / Math.max(1, width * height),
    stagnantWindShare: stagnantWind / Math.max(1, width * height),
    precipitationAdjustedCells: adjustedCells,
    meanPrecipitationAdjustment: adjustmentTotal / Math.max(1, adjustedCells),
    orographicAdjustedCells,
    meanOrographicAdjustment: orographicAdjustmentTotal / Math.max(1, orographicAdjustedCells),
    coolCurrentAdjustedCells,
    meanCoolCurrentDrying: coolCurrentDryingTotal / Math.max(1, coolCurrentAdjustedCells),
  };
}

function evaluateCurrentField(
  project: WorldProject,
  model: ClimatologicalPressureModel,
  gyres: LargeScaleGyre[]
): {
  owner: Int16Array;
  coastalAlignmentScore: number;
  stagnantOceanShare: number;
  meanCurrentSpeed: number;
  coolCurrentPotential: Float32Array;
} {
  const world = project.primaryWorld;
  const layers = world.layers;
  const { width, height } = world.mapModel.resolution;
  const owner = new Int16Array(width * height);
  owner.fill(-1);
  const currentX = new Float32Array(width * height);
  const currentY = new Float32Array(width * height);
  let marineCells = 0;
  let coastalCells = 0;
  let coastalAligned = 0;
  const referenceWidth = model.resolution.width;
  const referenceHeight = model.resolution.height;
  const referenceCurrentX = new Float32Array(referenceWidth * referenceHeight);
  const referenceCurrentY = new Float32Array(referenceWidth * referenceHeight);
  const referenceCurrentCount = new Uint32Array(referenceWidth * referenceHeight);

  for (let y = 0; y < height; y += 1) {
    const latitude = latitudeForY(y, height);
    const absLatitude = Math.abs(latitude);
    const hemisphere = latitude >= 0 ? 1 : -1;
    for (let x = 0; x < width; x += 1) {
      const cell = indexOf(x, y, width);
      if (!layers.water[cell]) continue;
      marineCells += 1;
      const longitude = longitudeForX(x, width);
      const pressure = sampleClimatologicalPressure(model, longitude, latitude);
      let cx = -Math.exp(-(absLatitude * absLatitude) / 0.035) * 0.42;
      let cy = pressure.windY * 0.035;
      let structuralStrength = Math.exp(-(absLatitude * absLatitude) / 0.035) * 0.42;
      const counterCurrent = Math.exp(-((latitude - 0.075) ** 2) / 0.0035) * 0.64;
      cx += counterCurrent;
      structuralStrength = Math.max(structuralStrength, counterCurrent);
      const circumpolar = Math.exp(-((absLatitude - 1.12) ** 2) / 0.022);
      const circumpolarOpen = hemisphere > 0 ? model.openNorthernCircumpolarPath : model.openSouthernCircumpolarPath;
      if (circumpolarOpen) {
        cx += circumpolar * 0.5;
        structuralStrength = Math.max(structuralStrength, circumpolar * 0.72);
      }

      let bestGyre = -1;
      let bestInfluence = 0;
      let bestNx = 0;
      let bestNy = 0;
      for (let gyreId = 0; gyreId < gyres.length; gyreId += 1) {
        const gyre = gyres[gyreId];
        if (Math.sign(gyre.sector.latitudeRadians) !== hemisphere) continue;
        const nx = wrappedDeltaX(x, gyre.centerX, width) / Math.max(1, gyre.radiusX);
        const ny = (y - gyre.centerY) / Math.max(1, gyre.radiusY);
        const radius = Math.hypot(nx, ny);
        if (radius > 1.28) continue;
        const ring = Math.exp(-((radius - 0.72) ** 2) / 0.13) * gyre.strength;
        if (ring <= bestInfluence) continue;
        bestGyre = gyreId;
        bestInfluence = ring;
        bestNx = nx;
        bestNy = ny;
      }

      if (bestGyre >= 0) {
        const gyre = gyres[bestGyre];
        const tangentX = -bestNy / Math.max(0.001, gyre.radiusY / gyre.radiusX);
        const tangentY = bestNx / Math.max(0.001, gyre.radiusX / gyre.radiusY);
        const westernBoundary = bestNx < -0.55 ? clamp((-bestNx - 0.55) / 0.55, 0, 1) : 0;
        const boundaryBoost = 1 + westernBoundary * (gyre.kind === 'subtropical' ? 1.1 : 0.45);
        cx += tangentX * gyre.rotationSign * bestInfluence * boundaryBoost;
        cy += tangentY * gyre.rotationSign * bestInfluence * boundaryBoost;
        structuralStrength = Math.max(structuralStrength, bestInfluence * boundaryBoost);
        owner[cell] = bestGyre;
        gyre.territorySize += 1;
      } else {
        cx += pressure.windX * 0.12;
        cy += pressure.windY * 0.08;
      }

      if (pressure.coastDistance < 2.5) {
        coastalCells += 1;
        const longitudeStep = Math.PI * 2 / model.resolution.width;
        const latitudeStep = Math.PI / model.resolution.height;
        const west = sampleClimatologicalCoastDistance(model, longitude - longitudeStep, latitude);
        const east = sampleClimatologicalCoastDistance(model, longitude + longitudeStep, latitude);
        const north = sampleClimatologicalCoastDistance(model, longitude, latitude + latitudeStep);
        const south = sampleClimatologicalCoastDistance(model, longitude, latitude - latitudeStep);
        const gradientX = (east - west) * 0.5;
        const gradientY = (south - north) * 0.5;
        const magnitude = Math.hypot(gradientX, gradientY);
        if (magnitude > 1e-6) {
          const nx = gradientX / magnitude;
          const ny = gradientY / magnitude;
          const landward = Math.max(0, -(cx * nx + cy * ny));
          cx += nx * landward * 1.8;
          cy += ny * landward * 1.8;
          const tx = -ny;
          const ty = nx;
          const sign = cx * tx + cy * ty < 0 ? -1 : 1;
          cx += tx * sign * 0.22;
          cy += ty * sign * 0.22;
          const alignedMagnitude = Math.hypot(cx, cy);
          if (alignedMagnitude > 0 && Math.abs((cx / alignedMagnitude) * tx + (cy / alignedMagnitude) * ty) > 0.62) coastalAligned += 1;
        }
      }

      const speed = clamp(0.045 + structuralStrength * 0.48, 0.035, 0.64);
      const current = normalizeTo(cx, cy, speed);
      currentX[cell] = current.x;
      currentY[cell] = current.y;
    }
  }

  const smoothedX = new Float32Array(currentX);
  const smoothedY = new Float32Array(currentY);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = indexOf(x, y, width);
      if (!layers.water[cell]) continue;
      let sx = currentX[cell] * 6;
      let sy = currentY[cell] * 6;
      let weight = 6;
      const neighbors = [
        indexOf(x - 1, y, width),
        indexOf(x + 1, y, width),
        y > 0 ? indexOf(x, y - 1, width) : -1,
        y + 1 < height ? indexOf(x, y + 1, width) : -1
      ];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || !layers.water[neighbor]) continue;
        sx += currentX[neighbor];
        sy += currentY[neighbor];
        weight += 1;
      }
      smoothedX[cell] = sx / weight;
      smoothedY[cell] = sy / weight;
    }
  }

  let speedTotal = 0;
  let stagnantOcean = 0;
  for (let cell = 0; cell < owner.length; cell += 1) {
    if (!layers.water[cell]) {
      layers.currentX[cell] = 0;
      layers.currentY[cell] = 0;
      continue;
    }
    layers.currentX[cell] = smoothedX[cell];
    layers.currentY[cell] = smoothedY[cell];
    const x = cell % width;
    const y = Math.floor(cell / width);
    const referenceX = Math.min(referenceWidth - 1, Math.floor(x / width * referenceWidth));
    const referenceY = Math.min(referenceHeight - 1, Math.floor(y / height * referenceHeight));
    const referenceCell = referenceY * referenceWidth + referenceX;
    referenceCurrentX[referenceCell] += smoothedX[cell];
    referenceCurrentY[referenceCell] += smoothedY[cell];
    referenceCurrentCount[referenceCell] += 1;
    const speed = Math.hypot(smoothedX[cell], smoothedY[cell]);
    speedTotal += speed;
    if (speed < 0.1) stagnantOcean += 1;
  }

  for (let cell = 0; cell < referenceCurrentCount.length; cell += 1) {
    const count = referenceCurrentCount[cell];
    if (!count) continue;
    referenceCurrentX[cell] /= count;
    referenceCurrentY[cell] /= count;
  }
  const coolCurrentPotential = new Float32Array(referenceCurrentCount.length);
  for (let y = 0; y < referenceHeight; y += 1) {
    const latitudeDegreesValue = latitudeForY(y, referenceHeight) * 180 / Math.PI;
    for (let x = 0; x < referenceWidth; x += 1) {
      const cell = indexOf(x, y, referenceWidth);
      if (model.water[cell]) continue;
      const neighbors = [
        indexOf(x - 1, y, referenceWidth),
        indexOf(x + 1, y, referenceWidth),
        y > 0 ? indexOf(x, y - 1, referenceWidth) : -1,
        y + 1 < referenceHeight ? indexOf(x, y + 1, referenceWidth) : -1,
      ];
      let exposure = 0;
      let marineNeighbors = 0;
      for (const neighbor of neighbors) {
        if (neighbor < 0 || !model.water[neighbor]) continue;
        exposure += equatorwardCurrentExposure(
          referenceCurrentX[neighbor],
          referenceCurrentY[neighbor],
          latitudeDegreesValue,
        );
        marineNeighbors += 1;
      }
      coolCurrentPotential[cell] = exposure / Math.max(1, marineNeighbors);
    }
  }

  return {
    owner,
    coastalAlignmentScore: coastalAligned / Math.max(1, coastalCells),
    stagnantOceanShare: stagnantOcean / Math.max(1, marineCells),
    meanCurrentSpeed: speedTotal / Math.max(1, marineCells),
    coolCurrentPotential,
  };
}

export function applyBasinAwareCirculation(
  project: WorldProject,
  pressureModel = buildClimatologicalPressureModel(project),
  options: { wetlandHydrologyModel?: WetlandHydrologyModel } = {},
): BasinCirculationDiagnostics {
  const world = project.primaryWorld;
  const { width, height } = world.mapModel.resolution;
  const gyres = traceGenerationPerformance(
    'basin-circulation.build-large-scale-gyres',
    {
      topologyCells: world.topology.cellCount,
      activeCells: pressureModel.sectors.length,
      fullTopologyPasses: 0,
      allocatedBufferBytes: 0
    },
    () => buildLargeScaleGyres(pressureModel, width, height)
  );
  const currentResult = traceGenerationPerformance(
    'basin-circulation.evaluate-large-scale-field',
    {
      topologyCells: world.topology.cellCount,
      activeCells: world.layers.water.length,
      fullTopologyPasses: 2,
      allocatedBufferBytes: world.layers.water.length * (Float32Array.BYTES_PER_ELEMENT * 4 + Int16Array.BYTES_PER_ELEMENT)
    },
    () => evaluateCurrentField(project, pressureModel, gyres)
  );
  // Currents depend on the fixed pressure model, not on the final pressure
  // adjustment. Evaluating them first lets the same circulation solve provide
  // a bounded coastal-stability signal without another full-resolution pass.
  const pressureResult = traceGenerationPerformance(
    'climatological-pressure.apply-fields',
    {
      topologyCells: world.topology.cellCount,
      activeCells: world.layers.elevation.length,
      fullTopologyPasses: 1,
      allocatedBufferBytes: 0
    },
    () => applyPressureSystems(
      project,
      pressureModel,
      currentResult.coolCurrentPotential,
      options.wetlandHydrologyModel ?? 'lowland-floodplain-v1',
    )
  );
  const subtropicalSectors = pressureModel.sectors.filter((sector) => sector.regime === 'subtropical');
  const totalSectorSpan = subtropicalSectors.reduce((sum, sector) => sum + sector.spanColumns, 0);
  const largestBasinShare = subtropicalSectors.length
    ? Math.max(...subtropicalSectors.map((sector) => sector.spanColumns)) / Math.max(1, totalSectorSpan)
    : 0;
  const pressureSystems: ClimatologicalPressureDiagnostics = {
    modelVersion: pressureModel.modelVersion,
    resolution: pressureModel.resolution,
    centers: pressureModel.centers,
    pressurePotential: pressureModel.pressurePotential,
    subsidencePotential: pressureModel.subsidencePotential,
    convergencePotential: pressureModel.convergencePotential,
    stormTrackPotential: pressureModel.stormTrackPotential,
    prevailingWindX: pressureModel.prevailingWindX,
    prevailingWindY: pressureModel.prevailingWindY,
    openSouthernCircumpolarPath: pressureModel.openSouthernCircumpolarPath,
    openNorthernCircumpolarPath: pressureModel.openNorthernCircumpolarPath,
    precipitationAdjustedCells: pressureResult.precipitationAdjustedCells,
    meanPrecipitationAdjustment: pressureResult.meanPrecipitationAdjustment,
    orographicAdjustedCells: pressureResult.orographicAdjustedCells,
    meanOrographicAdjustment: pressureResult.meanOrographicAdjustment,
    coolCurrentAdjustedCells: pressureResult.coolCurrentAdjustedCells,
    meanCoolCurrentDrying: pressureResult.meanCoolCurrentDrying,
  };
  const diagnostics: BasinCirculationDiagnostics = {
    modelVersion: 'basin-circulation-v10',
    marineBasinCount: subtropicalSectors.length,
    largestBasinShare,
    coherentGyreCount: gyres.filter((gyre) => gyre.kind === 'subtropical' && gyre.territorySize >= width * height * 0.01).length,
    gyreCandidateCount: gyres.length,
    coastalAlignmentScore: currentResult.coastalAlignmentScore,
    stagnantOceanShare: currentResult.stagnantOceanShare,
    meanCurrentSpeed: currentResult.meanCurrentSpeed,
    windTerrainDeflectionIndex: pressureResult.windTerrainDeflectionIndex,
    stagnantWindShare: pressureResult.stagnantWindShare,
    packedGyres: gyres.map(({ sector: _sector, ...gyre }, id) => ({ id, ...gyre })),
    gyreOwner: currentResult.owner,
    pressureSystems
  };
  const climate = world.climate as (typeof world.climate & {
    basinCirculation?: BasinCirculationDiagnostics;
    pressureSystems?: ClimatologicalPressureDiagnostics;
  }) | undefined;
  if (climate) {
    climate.basinCirculation = diagnostics;
    climate.pressureSystems = pressureSystems;
    climate.notes = [
      ...climate.notes.filter((note) => !note.startsWith('Basin-aware circulation') && !note.startsWith('Climatological pressure')),
      `Climatological pressure v1 resolved ${pressureModel.centers.length} durable center(s) on a fixed ${pressureModel.resolution.width}x${pressureModel.resolution.height} reference grid.`,
      `Basin-aware circulation v10 generated ${gyres.filter((gyre) => gyre.kind === 'subtropical').length} basin-scale subtropical gyre(s), ${gyres.filter((gyre) => gyre.kind === 'subpolar').length} subpolar gyre(s), and an explicit north-equatorial countercurrent without iterative raster packing.`
    ];
  }
  return diagnostics;
}
