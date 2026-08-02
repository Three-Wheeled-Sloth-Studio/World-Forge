import { clamp, type WorldProject } from '@world-forge/shared';
import { traceGenerationPerformance } from './generationPerformanceTrace';

export type PressureCenterKind = 'high' | 'low';
export type PressureCenterRegime =
  | 'equatorial-trough'
  | 'subtropical'
  | 'subpolar'
  | 'polar'
  | 'continental-thermal';

export type ClimatologicalPressureCenter = {
  id: string;
  kind: PressureCenterKind;
  regime: PressureCenterRegime;
  longitudeRadians: number;
  latitudeRadians: number;
  radiusLongitudeRadians: number;
  radiusLatitudeRadians: number;
  strength: number;
  sectorId?: number;
};

export type OceanCirculationSector = {
  id: number;
  hemisphere: -1 | 1;
  regime: 'subtropical' | 'subpolar';
  centerX: number;
  spanColumns: number;
  latitudeRadians: number;
  westernX: number;
  easternX: number;
};

export type ClimatologicalPressureModel = {
  modelVersion: 'climatological-pressure-v1';
  resolution: { width: number; height: number };
  centers: ClimatologicalPressureCenter[];
  sectors: OceanCirculationSector[];
  pressurePotential: Float32Array;
  subsidencePotential: Float32Array;
  convergencePotential: Float32Array;
  stormTrackPotential: Float32Array;
  prevailingWindX: Float32Array;
  prevailingWindY: Float32Array;
  coastDistance: Float32Array;
  water: Uint8Array;
  openSouthernCircumpolarPath: boolean;
  openNorthernCircumpolarPath: boolean;
};

export type PressureSample = {
  pressure: number;
  subsidence: number;
  convergence: number;
  stormTrack: number;
  windX: number;
  windY: number;
  coastDistance: number;
};

type ReferenceSurface = {
  width: number;
  height: number;
  water: Uint8Array;
  temperature: Float32Array;
  elevation: Float32Array;
};

const REFERENCE_WIDTH = 128;
const REFERENCE_HEIGHT = 64;

function indexOf(x: number, y: number, width: number): number {
  return y * width + ((x % width) + width) % width;
}

function wrappedDelta(value: number, center: number, period: number): number {
  let delta = value - center;
  if (delta > period / 2) delta -= period;
  if (delta < -period / 2) delta += period;
  return delta;
}

function gaussian(value: number, center: number, sigma: number): number {
  const normalized = (value - center) / Math.max(1e-6, sigma);
  return Math.exp(-0.5 * normalized * normalized);
}

function normalizeVector(x: number, y: number): { x: number; y: number } {
  const magnitude = Math.hypot(x, y);
  if (magnitude < 1e-7) return { x: 0, y: 0 };
  return { x: x / magnitude, y: y / magnitude };
}

function sampleSourceIndex(
  x: number,
  y: number,
  targetWidth: number,
  targetHeight: number,
  sourceWidth: number,
  sourceHeight: number
): number {
  const sourceX = Math.min(sourceWidth - 1, Math.max(0, Math.floor(((x + 0.5) / targetWidth) * sourceWidth)));
  const sourceY = Math.min(sourceHeight - 1, Math.max(0, Math.floor(((y + 0.5) / targetHeight) * sourceHeight)));
  return sourceY * sourceWidth + sourceX;
}

function buildReferenceSurface(project: WorldProject): ReferenceSurface {
  const world = project.primaryWorld;
  const source = world.layers;
  const sourceWidth = world.mapModel.resolution.width;
  const sourceHeight = world.mapModel.resolution.height;
  const water = new Uint8Array(REFERENCE_WIDTH * REFERENCE_HEIGHT);
  const temperature = new Float32Array(water.length);
  const elevation = new Float32Array(water.length);
  for (let y = 0; y < REFERENCE_HEIGHT; y += 1) {
    for (let x = 0; x < REFERENCE_WIDTH; x += 1) {
      const target = y * REFERENCE_WIDTH + x;
      const sourceIndex = sampleSourceIndex(x, y, REFERENCE_WIDTH, REFERENCE_HEIGHT, sourceWidth, sourceHeight);
      water[target] = source.water[sourceIndex];
      temperature[target] = source.temperature[sourceIndex];
      elevation[target] = source.elevation[sourceIndex];
    }
  }
  return { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT, water, temperature, elevation };
}

function latitudeForRow(y: number, height: number): number {
  return Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
}

function rowForLatitude(latitudeRadians: number, height: number): number {
  return clamp(Math.floor(((Math.PI / 2 - latitudeRadians) / Math.PI) * height), 0, height - 1);
}

function circularRuns(open: Uint8Array): Array<{ start: number; length: number; center: number }> {
  const width = open.length;
  let closedStart = -1;
  for (let x = 0; x < width; x += 1) {
    if (!open[x]) {
      closedStart = x;
      break;
    }
  }
  if (closedStart < 0) return [{ start: 0, length: width, center: (width - 1) / 2 }];
  const runs: Array<{ start: number; length: number; center: number }> = [];
  let runStart = -1;
  let runLength = 0;
  for (let step = 1; step <= width; step += 1) {
    const x = (closedStart + step) % width;
    if (open[x]) {
      if (runStart < 0) runStart = x;
      runLength += 1;
    } else if (runStart >= 0) {
      runs.push({
        start: runStart,
        length: runLength,
        center: (runStart + (runLength - 1) / 2) % width
      });
      runStart = -1;
      runLength = 0;
    }
  }
  if (runStart >= 0) {
    runs.push({
      start: runStart,
      length: runLength,
      center: (runStart + (runLength - 1) / 2) % width
    });
  }
  return runs;
}

function oceanSectorsAtLatitude(
  surface: ReferenceSurface,
  latitudeRadians: number,
  regime: OceanCirculationSector['regime'],
  hemisphere: -1 | 1,
  firstId: number
): OceanCirculationSector[] {
  const { width, height, water } = surface;
  const centerRow = rowForLatitude(latitudeRadians, height);
  const rowRadius = regime === 'subtropical' ? 3 : 2;
  const open = new Uint8Array(width);
  for (let x = 0; x < width; x += 1) {
    let wet = 0;
    let samples = 0;
    for (let offset = -rowRadius; offset <= rowRadius; offset += 1) {
      const y = centerRow + offset;
      if (y < 0 || y >= height) continue;
      wet += water[indexOf(x, y, width)] ? 1 : 0;
      samples += 1;
    }
    open[x] = wet / Math.max(1, samples) >= (regime === 'subtropical' ? 0.58 : 0.7) ? 1 : 0;
  }
  const minimumSpan = regime === 'subtropical' ? Math.ceil(width * 0.08) : Math.ceil(width * 0.11);
  return circularRuns(open)
    .filter((run) => run.length >= minimumSpan)
    .sort((left, right) => right.length - left.length || left.start - right.start)
    .slice(0, regime === 'subtropical' ? 3 : 2)
    .map((run, index) => ({
      id: firstId + index,
      hemisphere,
      regime,
      centerX: run.center,
      spanColumns: run.length,
      latitudeRadians,
      westernX: run.start,
      easternX: (run.start + run.length - 1) % width
    }));
}

function centerLongitudeRadians(centerX: number, width: number): number {
  return ((centerX + 0.5) / width) * Math.PI * 2 - Math.PI;
}

function buildSectors(surface: ReferenceSurface): OceanCirculationSector[] {
  const sectors: OceanCirculationSector[] = [];
  const add = (latitudeDegrees: number, regime: OceanCirculationSector['regime'], hemisphere: -1 | 1) => {
    const next = oceanSectorsAtLatitude(
      surface,
      latitudeDegrees * Math.PI / 180,
      regime,
      hemisphere,
      sectors.length
    );
    sectors.push(...next);
  };
  add(30, 'subtropical', 1);
  add(-30, 'subtropical', -1);
  add(57, 'subpolar', 1);
  add(-57, 'subpolar', -1);
  return sectors;
}

function buildCenters(surface: ReferenceSurface, sectors: OceanCirculationSector[]): ClimatologicalPressureCenter[] {
  const centers: ClimatologicalPressureCenter[] = [];
  for (const sector of sectors) {
    const longitude = centerLongitudeRadians(sector.centerX, surface.width);
    const longitudeRadius = clamp((sector.spanColumns / surface.width) * Math.PI * 0.85, 0.24, 1.5);
    if (sector.regime === 'subtropical') {
      centers.push({
        id: `subtropical-high-${sector.id}`,
        kind: 'high',
        regime: 'subtropical',
        longitudeRadians: longitude,
        latitudeRadians: sector.latitudeRadians,
        radiusLongitudeRadians: longitudeRadius,
        radiusLatitudeRadians: 13 * Math.PI / 180,
        strength: 0.34,
        sectorId: sector.id
      });
    } else {
      centers.push({
        id: `subpolar-low-${sector.id}`,
        kind: 'low',
        regime: 'subpolar',
        longitudeRadians: longitude,
        latitudeRadians: sector.latitudeRadians,
        radiusLongitudeRadians: longitudeRadius,
        radiusLatitudeRadians: 12 * Math.PI / 180,
        strength: 0.24,
        sectorId: sector.id
      });
    }
  }
  const equatorialSectors = oceanSectorsAtLatitude(surface, 0, 'subtropical', 1, 10_000).slice(0, 4);
  for (const sector of equatorialSectors) {
    centers.push({
      id: `equatorial-trough-${sector.id}`,
      kind: 'low',
      regime: 'equatorial-trough',
      longitudeRadians: centerLongitudeRadians(sector.centerX, surface.width),
      latitudeRadians: 0,
      radiusLongitudeRadians: clamp((sector.spanColumns / surface.width) * Math.PI, 0.32, 1.8),
      radiusLatitudeRadians: 10 * Math.PI / 180,
      strength: 0.18,
      sectorId: sector.id
    });
  }
  centers.push(
    {
      id: 'polar-high-north',
      kind: 'high',
      regime: 'polar',
      longitudeRadians: 0,
      latitudeRadians: 84 * Math.PI / 180,
      radiusLongitudeRadians: Math.PI,
      radiusLatitudeRadians: 15 * Math.PI / 180,
      strength: 0.16
    },
    {
      id: 'polar-high-south',
      kind: 'high',
      regime: 'polar',
      longitudeRadians: 0,
      latitudeRadians: -84 * Math.PI / 180,
      radiusLongitudeRadians: Math.PI,
      radiusLatitudeRadians: 15 * Math.PI / 180,
      strength: 0.16
    }
  );
  return centers;
}

function centerInfluence(center: ClimatologicalPressureCenter, longitude: number, latitude: number): number {
  const dx = wrappedDelta(longitude, center.longitudeRadians, Math.PI * 2) / Math.max(0.01, center.radiusLongitudeRadians);
  const dy = (latitude - center.latitudeRadians) / Math.max(0.01, center.radiusLatitudeRadians);
  return Math.exp(-0.5 * (dx * dx + dy * dy));
}

function buildCoastDistance(surface: ReferenceSurface): Float32Array {
  const { width, height, water } = surface;
  const distance = new Float32Array(width * height);
  distance.fill(width + height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = indexOf(x, y, width);
      if (!water[cell]) {
        distance[cell] = 0;
        queue[tail++] = cell;
      }
    }
  }
  while (head < tail) {
    const cell = queue[head++];
    const x = cell % width;
    const y = Math.floor(cell / width);
    const next = distance[cell] + 1;
    const neighbors = [
      indexOf(x - 1, y, width),
      indexOf(x + 1, y, width),
      y > 0 ? indexOf(x, y - 1, width) : -1,
      y + 1 < height ? indexOf(x, y + 1, width) : -1
    ];
    for (const neighbor of neighbors) {
      if (neighbor < 0 || distance[neighbor] <= next) continue;
      distance[neighbor] = next;
      queue[tail++] = neighbor;
    }
  }
  return distance;
}

function isCircumpolarOpen(surface: ReferenceSurface, latitudeDegrees: number): boolean {
  const row = rowForLatitude(latitudeDegrees * Math.PI / 180, surface.height);
  let openColumns = 0;
  for (let x = 0; x < surface.width; x += 1) {
    let wet = 0;
    let samples = 0;
    for (let offset = -1; offset <= 1; offset += 1) {
      const y = row + offset;
      if (y < 0 || y >= surface.height) continue;
      wet += surface.water[indexOf(x, y, surface.width)] ? 1 : 0;
      samples += 1;
    }
    if (wet / Math.max(1, samples) >= 2 / 3) openColumns += 1;
  }
  return openColumns / surface.width >= 0.84;
}

function buildFields(
  project: WorldProject,
  surface: ReferenceSurface,
  centers: ClimatologicalPressureCenter[]
): Omit<ClimatologicalPressureModel, 'modelVersion' | 'resolution' | 'centers' | 'sectors' | 'water' | 'openSouthernCircumpolarPath' | 'openNorthernCircumpolarPath' | 'coastDistance'> {
  const { width, height, water, temperature } = surface;
  const pressurePotential = new Float32Array(width * height);
  const subsidencePotential = new Float32Array(width * height);
  const convergencePotential = new Float32Array(width * height);
  const stormTrackPotential = new Float32Array(width * height);
  const prevailingWindX = new Float32Array(width * height);
  const prevailingWindY = new Float32Array(width * height);
  const averageTemperatureC = project.primaryWorld.averageTemperatureC;

  for (let y = 0; y < height; y += 1) {
    const latitude = latitudeForRow(y, height);
    const absLatitude = Math.abs(latitude * 180 / Math.PI);
    for (let x = 0; x < width; x += 1) {
      const cell = indexOf(x, y, width);
      const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
      let pressure =
        -0.72 * gaussian(absLatitude, 0, 11) +
        0.66 * gaussian(absLatitude, 30, 10) -
        0.46 * gaussian(absLatitude, 58, 11) +
        0.3 * gaussian(absLatitude, 86, 12);
      for (const center of centers) pressure += (center.kind === 'high' ? 1 : -1) * center.strength * centerInfluence(center, longitude, latitude);
      const thermalAnomaly = clamp((temperature[cell] - averageTemperatureC) / 30, -1, 1);
      if (!water[cell]) pressure -= thermalAnomaly * gaussian(absLatitude, 42, 24) * 0.12;
      else pressure += gaussian(absLatitude, 30, 13) * 0.04;
      pressurePotential[cell] = clamp(pressure, -1, 1);
    }
  }

  for (let y = 0; y < height; y += 1) {
    const latitude = latitudeForRow(y, height);
    const absLatitude = Math.abs(latitude * 180 / Math.PI);
    const hemisphere = latitude >= 0 ? 1 : -1;
    for (let x = 0; x < width; x += 1) {
      const cell = indexOf(x, y, width);
      const pressure = pressurePotential[cell];
      subsidencePotential[cell] = clamp((pressure + 0.08) / 0.9, 0, 1);
      convergencePotential[cell] = clamp((-pressure + 0.02) / 0.85, 0, 1);
      stormTrackPotential[cell] = clamp(gaussian(absLatitude, 54, 12) * (0.52 + convergencePotential[cell] * 0.48), 0, 1);
      const gradientX = (pressurePotential[indexOf(x + 1, y, width)] - pressurePotential[indexOf(x - 1, y, width)]) * 0.5;
      const gradientY = (pressurePotential[indexOf(x, Math.min(height - 1, y + 1), width)] - pressurePotential[indexOf(x, Math.max(0, y - 1), width)]) * 0.5;
      const baseZonal = absLatitude < 26 ? -1 : absLatitude < 63 ? 1 : -0.62;
      const baseMeridional = absLatitude < 26 ? -hemisphere * 0.24 : absLatitude < 63 ? hemisphere * 0.1 : -hemisphere * 0.08;
      const wind = normalizeVector(
        baseZonal * 0.78 - gradientX * 0.32 - gradientY * hemisphere * 1.4,
        baseMeridional * 0.78 - gradientY * 0.32 + gradientX * hemisphere * 1.4
      );
      prevailingWindX[cell] = wind.x;
      prevailingWindY[cell] = wind.y;
    }
  }
  return { pressurePotential, subsidencePotential, convergencePotential, stormTrackPotential, prevailingWindX, prevailingWindY };
}

export function buildClimatologicalPressureModel(project: WorldProject): ClimatologicalPressureModel {
  return traceGenerationPerformance(
    'climatological-pressure.build-reference-model',
    {
      topologyCells: project.primaryWorld.topology.cellCount,
      activeCells: REFERENCE_WIDTH * REFERENCE_HEIGHT,
      fullTopologyPasses: 0,
      allocatedBufferBytes: REFERENCE_WIDTH * REFERENCE_HEIGHT * (Float32Array.BYTES_PER_ELEMENT * 7 + 1)
    },
    () => {
      const surface = buildReferenceSurface(project);
      const sectors = buildSectors(surface);
      const centers = buildCenters(surface, sectors);
      const fields = buildFields(project, surface, centers);
      return {
        modelVersion: 'climatological-pressure-v1',
        resolution: { width: surface.width, height: surface.height },
        centers,
        sectors,
        water: surface.water,
        coastDistance: buildCoastDistance(surface),
        openSouthernCircumpolarPath: isCircumpolarOpen(surface, -64),
        openNorthernCircumpolarPath: isCircumpolarOpen(surface, 64),
        ...fields
      };
    }
  );
}

function sampleBilinear(layer: Float32Array, width: number, height: number, longitude: number, latitude: number): number {
  const u = ((longitude + Math.PI) / (Math.PI * 2)) * width - 0.5;
  const v = ((Math.PI / 2 - latitude) / Math.PI) * height - 0.5;
  const x0 = Math.floor(u);
  const y0 = clamp(Math.floor(v), 0, height - 1);
  const x1 = x0 + 1;
  const y1 = clamp(y0 + 1, 0, height - 1);
  const tx = u - Math.floor(u);
  const ty = v - Math.floor(v);
  const a = layer[indexOf(x0, y0, width)] * (1 - tx) + layer[indexOf(x1, y0, width)] * tx;
  const b = layer[indexOf(x0, y1, width)] * (1 - tx) + layer[indexOf(x1, y1, width)] * tx;
  return a * (1 - ty) + b * ty;
}

export function sampleClimatologicalPressure(model: ClimatologicalPressureModel, longitude: number, latitude: number): PressureSample {
  const { width, height } = model.resolution;
  return {
    pressure: sampleBilinear(model.pressurePotential, width, height, longitude, latitude),
    subsidence: sampleBilinear(model.subsidencePotential, width, height, longitude, latitude),
    convergence: sampleBilinear(model.convergencePotential, width, height, longitude, latitude),
    stormTrack: sampleBilinear(model.stormTrackPotential, width, height, longitude, latitude),
    windX: sampleBilinear(model.prevailingWindX, width, height, longitude, latitude),
    windY: sampleBilinear(model.prevailingWindY, width, height, longitude, latitude),
    coastDistance: sampleBilinear(model.coastDistance, width, height, longitude, latitude)
  };
}

export function sampleClimatologicalCoastDistance(model: ClimatologicalPressureModel, longitude: number, latitude: number): number {
  return sampleBilinear(model.coastDistance, model.resolution.width, model.resolution.height, longitude, latitude);
}
