import type { AtmosphericWeatherPresentationArtifact, WeatherPresentationSystem } from '@world-forge/shared';

export type WeatherTextureMode = 'clouds' | 'weather';

type SphericalVector = { x: number; y: number; z: number };
type TangentFrame = {
  direction: SphericalVector;
  east: SphericalVector;
  north: SphericalVector;
  longitudeRad: number;
  latitudeRad: number;
};
type WindSample = {
  tangent: SphericalVector;
  zonal: number;
  meridional: number;
  speed: number;
};
type NoiseSeedConfig = {
  hash: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
};

const STREAMER_OFFSETS = [-0.55, -0.3666667, -0.1833333, 0, 0.1833333, 0.3666667, 0.55] as const;
const STREAMER_WEIGHTS = [0.031, 0.11, 0.22, 0.278, 0.22, 0.11, 0.031] as const;
const STREAMER_ROTATIONS = STREAMER_OFFSETS.map((radians) => ({ cos: Math.cos(radians), sin: Math.sin(radians) }));
const seedHashCache = new Map<string, number>();
const noiseSeedCache = new Map<string, NoiseSeedConfig>();

export function createWeatherPresentationTexture(
  artifact: AtmosphericWeatherPresentationArtifact | null,
  mode: WeatherTextureMode,
  simulationDays: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = artifact?.payload.textureResolution.width ?? 512;
  canvas.height = artifact?.payload.textureResolution.height ?? 256;
  renderWeatherPresentationTexture(canvas, artifact, mode, simulationDays);
  return canvas;
}

export function renderWeatherPresentationTexture(
  canvas: HTMLCanvasElement,
  artifact: AtmosphericWeatherPresentationArtifact | null,
  mode: WeatherTextureMode,
  simulationDays: number
): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.save();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (!artifact) {
    context.restore();
    return;
  }

  context.globalCompositeOperation = 'lighter';
  if (mode === 'clouds') drawWindOrientedCloudField(context, canvas, artifact, simulationDays);
  for (const system of artifact.payload.systems) {
    drawWeatherPresentationSystem(context, canvas, artifact.seed, system, mode, simulationDays);
  }
  context.restore();
}

function drawWindOrientedCloudField(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  artifact: AtmosphericWeatherPresentationArtifact,
  simulationDays: number
): void {
  const field = document.createElement('canvas');
  // Evaluate a bounded presentation raster, then let the soft cloud material
  // upscale it. The artifact texture size and save/export contract remain unchanged.
  field.width = Math.min(canvas.width, 256);
  field.height = Math.min(canvas.height, 128);
  const fieldContext = field.getContext('2d');
  if (!fieldContext) return;
  const image = fieldContext.createImageData(field.width, field.height);

  for (let y = 0; y < field.height; y += 1) {
    const v = (y + 0.5) / field.height;
    for (let x = 0; x < field.width; x += 1) {
      const u = (x + 0.5) / field.width;
      const coverage = cloudCoverageSample(artifact, u, v, simulationDays);
      const value = Math.round(Math.pow(coverage, 1.08) * 255);
      const index = (y * field.width + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  fieldContext.putImageData(image, 0, 0);

  context.save();
  context.imageSmoothingEnabled = true;
  context.filter = 'blur(0.72px)';
  context.globalAlpha = 1;
  context.drawImage(field, 0, 0, canvas.width, canvas.height);
  context.restore();
}

export function cloudCoverageSample(
  artifact: Pick<AtmosphericWeatherPresentationArtifact, 'seed' | 'payload'>,
  u: number,
  v: number,
  simulationDays: number
): number {
  const frame = sphericalFrameFromUv(u, v);
  const wind = sampleWindField(artifact, u, v, frame);
  const travelRadians = -simulationDays * (0.006 + Math.min(1.5, wind.speed) * 0.025);
  const advectedDirection = rotateDirectionAlongTangent(frame.direction, wind.tangent, travelRadians);
  const advectedFrame = sphericalFrameFromDirection(advectedDirection);
  const advectedWindTangent = projectOntoTangent(wind.tangent, advectedDirection, advectedFrame.east);

  const bandEnvelope = cloudBandEnvelope(artifact, advectedFrame);
  const broadSource = sphericalValueNoise(advectedDirection, 1.7, `${artifact.seed}:cloud-source`);
  const streamer = windOrientedStreamerAtDirection(
    advectedDirection,
    advectedWindTangent,
    `${artifact.seed}:streamer`
  );
  const cells = sphericalValueNoise(advectedDirection, 9.2, `${artifact.seed}:cells`);
  const edgeBreakup = sphericalValueNoise(advectedDirection, 22, `${artifact.seed}:edge-breakup`);

  const source = clamp01(bandEnvelope * 0.82 + broadSource * 0.48 - 0.18);
  const formed = smoothStep(0.48 - source * 0.17, 0.72, streamer * 0.74 + cells * 0.26);
  const breakup = smoothStep(0.39, 0.68, cells * 0.62 + edgeBreakup * 0.38);
  const rawCoverage = clamp01(formed * (0.16 + breakup * 0.98) * (0.28 + source * 1.22));
  return smoothStep(0.04, 0.62, rawCoverage);
}

export function windOrientedStreamerSample(
  artifact: Pick<AtmosphericWeatherPresentationArtifact, 'seed' | 'payload'>,
  u: number,
  v: number,
  simulationDays = 0
): number {
  const frame = sphericalFrameFromUv(u, v);
  const wind = sampleWindField(artifact, u, v, frame);
  const travelRadians = -simulationDays * (0.006 + Math.min(1.5, wind.speed) * 0.025);
  const advectedDirection = rotateDirectionAlongTangent(frame.direction, wind.tangent, travelRadians);
  const advectedFrame = sphericalFrameFromDirection(advectedDirection);
  const tangent = projectOntoTangent(wind.tangent, advectedDirection, advectedFrame.east);
  return windOrientedStreamerAtDirection(advectedDirection, tangent, `${artifact.seed}:streamer`);
}

function cloudBandEnvelope(
  artifact: Pick<AtmosphericWeatherPresentationArtifact, 'payload'>,
  frame: TangentFrame
): number {
  const latitudeDeg = radiansToDegrees(frame.latitudeRad);
  let envelope = 0;
  for (const band of artifact.payload.cloudBands) {
    const periodicWaveNumber = Math.max(1, Math.round(Math.abs(band.waveNumber)));
    const centerLatitude = band.centerLatitudeDeg
      + Math.sin(band.phaseRad + frame.longitudeRad * periodicWaveNumber) * band.waveAmplitudeDeg;
    const halfWidth = Math.max(2, band.widthDeg * 0.62);
    const normalizedDistance = (latitudeDeg - centerLatitude) / halfWidth;
    envelope = Math.max(envelope, Math.exp(-0.5 * normalizedDistance * normalizedDistance) * band.density);
  }
  return envelope;
}

function sampleWindField(
  artifact: Pick<AtmosphericWeatherPresentationArtifact, 'payload'>,
  u: number,
  v: number,
  frame: TangentFrame
): WindSample {
  const field = artifact.payload.windField;
  let zonal: number;
  let meridional: number;

  if (field && field.resolution.width > 0 && field.resolution.height > 0
    && field.zonal.length === field.resolution.width * field.resolution.height
    && field.meridional.length === field.resolution.width * field.resolution.height) {
    zonal = bilinearPeriodicSample(field.zonal, field.resolution.width, field.resolution.height, u, v);
    meridional = bilinearPeriodicSample(field.meridional, field.resolution.width, field.resolution.height, u, v);
  } else {
    zonal = artifact.payload.advection.zonalMeanDegPerDay / 18;
    meridional = artifact.payload.advection.meridionalMeanDegPerDay / 5;
  }

  const tangentVector = addVectors(scaleVector(frame.east, zonal), scaleVector(frame.north, meridional));
  const speed = vectorLength(tangentVector);
  return {
    tangent: speed > 0.000001 ? scaleVector(tangentVector, 1 / speed) : frame.east,
    zonal,
    meridional,
    speed
  };
}

function bilinearPeriodicSample(
  values: readonly number[],
  width: number,
  height: number,
  u: number,
  v: number
): number {
  const x = wrapUnit(u) * width;
  const xBase = Math.floor(x);
  const x0 = wrapIndex(xBase, width);
  const x1 = wrapIndex(xBase + 1, width);
  const tx = x - xBase;
  const y = clamp01(v) * Math.max(0, height - 1);
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const ty = y - y0;
  const a = finite(values[y0 * width + x0]);
  const b = finite(values[y0 * width + x1]);
  const c = finite(values[y1 * width + x0]);
  const d = finite(values[y1 * width + x1]);
  return linearInterpolate(linearInterpolate(a, b, tx), linearInterpolate(c, d, tx), ty);
}

function windOrientedStreamerAtDirection(
  direction: SphericalVector,
  tangent: SphericalVector,
  seed: string
): number {
  let total = 0;
  let weight = 0;
  for (let index = 0; index < STREAMER_ROTATIONS.length; index += 1) {
    const rotation = STREAMER_ROTATIONS[index];
    const sampleDirection = normalizeVector(addVectors(
      scaleVector(direction, rotation.cos),
      scaleVector(tangent, rotation.sin)
    ));
    const sampleWeight = STREAMER_WEIGHTS[index];
    total += sphericalValueNoise(sampleDirection, 4.4, seed) * sampleWeight;
    weight += sampleWeight;
  }
  return weight > 0 ? total / weight : 0;
}

function sphericalValueNoise(direction: SphericalVector, frequency: number, seed: string): number {
  const config = noiseSeedConfig(seed);
  return smoothValueNoise3(
    direction.x * frequency + config.offsetX,
    direction.y * frequency + config.offsetY,
    direction.z * frequency + config.offsetZ,
    config.hash
  );
}

function noiseSeedConfig(seed: string): NoiseSeedConfig {
  const cached = noiseSeedCache.get(seed);
  if (cached) return cached;
  const hash = hashSeed(seed);
  const config = {
    hash,
    offsetX: seededUnit3(hash, 17, 31, 47) * 19.3,
    offsetY: seededUnit3(hash, 59, 71, 89) * 23.7,
    offsetZ: seededUnit3(hash, 101, 127, 149) * 17.9
  };
  noiseSeedCache.set(seed, config);
  return config;
}

function smoothValueNoise3(x: number, y: number, z: number, seedHash: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = smoothStep(0, 1, x - x0);
  const fy = smoothStep(0, 1, y - y0);
  const fz = smoothStep(0, 1, z - z0);

  const c000 = seededUnit3(seedHash, x0, y0, z0);
  const c100 = seededUnit3(seedHash, x0 + 1, y0, z0);
  const c010 = seededUnit3(seedHash, x0, y0 + 1, z0);
  const c110 = seededUnit3(seedHash, x0 + 1, y0 + 1, z0);
  const c001 = seededUnit3(seedHash, x0, y0, z0 + 1);
  const c101 = seededUnit3(seedHash, x0 + 1, y0, z0 + 1);
  const c011 = seededUnit3(seedHash, x0, y0 + 1, z0 + 1);
  const c111 = seededUnit3(seedHash, x0 + 1, y0 + 1, z0 + 1);

  const x00 = linearInterpolate(c000, c100, fx);
  const x10 = linearInterpolate(c010, c110, fx);
  const x01 = linearInterpolate(c001, c101, fx);
  const x11 = linearInterpolate(c011, c111, fx);
  return linearInterpolate(
    linearInterpolate(x00, x10, fy),
    linearInterpolate(x01, x11, fy),
    fz
  );
}

function sphericalFrameFromUv(u: number, v: number): TangentFrame {
  const longitudeRad = wrapUnit(u) * Math.PI * 2 - Math.PI;
  const latitudeRad = Math.PI / 2 - clamp01(v) * Math.PI;
  const cosLatitude = Math.cos(latitudeRad);
  return {
    direction: normalizeVector({
      x: cosLatitude * Math.cos(longitudeRad),
      y: Math.sin(latitudeRad),
      z: cosLatitude * Math.sin(longitudeRad)
    }),
    east: normalizeVector({ x: -Math.sin(longitudeRad), y: 0, z: Math.cos(longitudeRad) }),
    north: normalizeVector({
      x: -Math.sin(latitudeRad) * Math.cos(longitudeRad),
      y: cosLatitude,
      z: -Math.sin(latitudeRad) * Math.sin(longitudeRad)
    }),
    longitudeRad,
    latitudeRad
  };
}

function sphericalFrameFromDirection(direction: SphericalVector): TangentFrame {
  const normalized = normalizeVector(direction);
  const longitudeRad = Math.atan2(normalized.z, normalized.x);
  const latitudeRad = Math.asin(Math.max(-1, Math.min(1, normalized.y)));
  const cosLatitude = Math.cos(latitudeRad);
  const fallbackEast = Math.abs(cosLatitude) < 0.000001 ? { x: 1, y: 0, z: 0 } : undefined;
  return {
    direction: normalized,
    east: fallbackEast ?? normalizeVector({ x: -Math.sin(longitudeRad), y: 0, z: Math.cos(longitudeRad) }),
    north: normalizeVector({
      x: -Math.sin(latitudeRad) * Math.cos(longitudeRad),
      y: cosLatitude,
      z: -Math.sin(latitudeRad) * Math.sin(longitudeRad)
    }),
    longitudeRad,
    latitudeRad
  };
}

function rotateDirectionAlongTangent(
  direction: SphericalVector,
  tangent: SphericalVector,
  radians: number
): SphericalVector {
  if (Math.abs(radians) < 0.00000001) return direction;
  const normalizedDirection = normalizeVector(direction);
  const normalizedTangent = projectOntoTangent(tangent, normalizedDirection, orthogonalTangent(normalizedDirection));
  return normalizeVector(addVectors(
    scaleVector(normalizedDirection, Math.cos(radians)),
    scaleVector(normalizedTangent, Math.sin(radians))
  ));
}

function orthogonalTangent(direction: SphericalVector): SphericalVector {
  const reference = Math.abs(direction.y) < 0.92
    ? { x: 0, y: 1, z: 0 }
    : { x: 1, y: 0, z: 0 };
  return normalizeVector(crossVectors(reference, direction));
}

function projectOntoTangent(
  vector: SphericalVector,
  surfaceDirection: SphericalVector,
  fallback: SphericalVector
): SphericalVector {
  const projected = addVectors(vector, scaleVector(surfaceDirection, -dotVectors(vector, surfaceDirection)));
  const length = vectorLength(projected);
  return length > 0.000001 ? scaleVector(projected, 1 / length) : fallback;
}

function drawWeatherPresentationSystem(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  seed: string,
  system: WeatherPresentationSystem,
  mode: WeatherTextureMode,
  simulationDays: number
): void {
  const longitudeDeg = wrapSignedDegrees(system.longitudeDeg + system.driftEastDegPerDay * simulationDays);
  const latitudeDeg = Math.max(-88, Math.min(88, system.latitudeDeg + Math.sin(system.phaseRad + simulationDays * 0.08) * system.driftNorthDegPerDay));
  const x = (longitudeDeg + 180) / 360 * canvas.width;
  const y = (90 - latitudeDeg) / 180 * canvas.height;
  const radius = Math.max(3, system.radiusDeg / 360 * canvas.width);
  const density = clamp01(system.density);
  const rotation = system.phaseRad + system.spinRadiansPerDay * simulationDays;
  const puffCount = system.kind === 'cyclone' ? 34 : system.kind === 'front' ? 28 : 22;

  for (const offset of [-canvas.width, 0, canvas.width]) {
    const cx = x + offset;
    context.save();
    context.filter = mode === 'weather' ? 'blur(0.65px)' : 'blur(0.9px)';
    for (let index = 0; index < puffCount; index += 1) {
      const t = puffCount <= 1 ? 0 : index / (puffCount - 1);
      const angleNoise = (seededUnit(`${seed}:${system.id}:angle`, index, 0) - 0.5) * 0.9;
      const radialNoise = seededUnit(`${seed}:${system.id}:radius`, index, 1);
      const sizeNoise = seededUnit(`${seed}:${system.id}:size`, index, 2);
      let px: number;
      let py: number;

      if (system.kind === 'front') {
        const along = (t - 0.5) * radius * 1.9;
        const curve = Math.sin(t * Math.PI * 2 + rotation) * radius * 0.22;
        px = cx + Math.cos(rotation) * along - Math.sin(rotation) * curve;
        py = y + (Math.sin(rotation) * along + Math.cos(rotation) * curve) * 0.58;
      } else {
        const turns = system.kind === 'cyclone' ? 2.55 : 1.15;
        const angle = rotation + t * Math.PI * 2 * turns + angleNoise;
        const distance = radius * (0.08 + Math.pow(t, 0.72) * 0.86) * (0.82 + radialNoise * 0.25);
        px = cx + Math.cos(angle) * distance;
        py = y + Math.sin(angle) * distance * 0.62;
      }

      const puffRadius = radius * (0.07 + sizeNoise * (mode === 'weather' ? 0.17 : 0.22));
      const strength = clamp01((0.34 + density * 0.72) * (0.72 + radialNoise * 0.36));
      drawSoftPuff(context, px, py, puffRadius, strength, system.kind === 'front' ? 1.75 : 1);
    }
    context.restore();
  }
}

function drawSoftPuff(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength: number,
  stretchX: number
): void {
  context.save();
  context.translate(x, y);
  context.scale(stretchX, 1);
  const gradient = context.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius);
  const core = Math.round(150 + clamp01(strength) * 105);
  gradient.addColorStop(0, `rgba(${core}, ${core}, ${core}, ${0.45 + strength * 0.45})`);
  gradient.addColorStop(0.48, `rgba(${Math.round(core * 0.82)}, ${Math.round(core * 0.82)}, ${Math.round(core * 0.82)}, ${0.22 + strength * 0.34})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

// Projected surface and debug textures still use this helper. The Cycle 2.2 cloud
// field is intrinsically spherical and never calls it.
export function normalizeHorizontalTextureSeam(canvas: HTMLCanvasElement, columns = 2): void {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || canvas.width < 2 || canvas.height < 1) return;
  const width = canvas.width;
  const height = canvas.height;
  const seamColumns = Math.max(1, Math.min(columns, Math.floor(width / 2)));
  const image = context.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y += 1) {
    for (let offset = 0; offset < seamColumns; offset += 1) {
      const left = (y * width + offset) * 4;
      const right = (y * width + (width - 1 - offset)) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const value = Math.round((image.data[left + channel] + image.data[right + channel]) / 2);
        image.data[left + channel] = value;
        image.data[right + channel] = value;
      }
    }
  }
  context.putImageData(image, 0, 0);
}

function hashSeed(seed: string): number {
  const cached = seedHashCache.get(seed);
  if (cached !== undefined) return cached;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  const normalized = hash >>> 0;
  seedHashCache.set(seed, normalized);
  return normalized;
}

function seededUnit3(seedHash: number, x: number, y: number, z: number): number {
  let hash = seedHash;
  hash ^= Math.imul(x + 374761393, 668265263);
  hash ^= Math.imul(y + 2246822519, 3266489917);
  hash ^= Math.imul(z + 3266489917, 374761393);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
  return ((hash ^ (hash >>> 13)) >>> 0) / 4294967295;
}

function seededUnit(seed: string, x: number, y: number): number {
  return seededUnit3(hashSeed(seed), x, y, x ^ y);
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  const span = edge1 - edge0;
  if (Math.abs(span) < 0.000001) return value >= edge1 ? 1 : 0;
  const t = clamp01((value - edge0) / span);
  return t * t * (3 - 2 * t);
}

function linearInterpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function dotVectors(a: SphericalVector, b: SphericalVector): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function crossVectors(a: SphericalVector, b: SphericalVector): SphericalVector {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function addVectors(a: SphericalVector, b: SphericalVector): SphericalVector {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleVector(vector: SphericalVector, scale: number): SphericalVector {
  return { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale };
}

function vectorLength(vector: SphericalVector): number {
  return Math.sqrt(dotVectors(vector, vector));
}

function normalizeVector(vector: SphericalVector): SphericalVector {
  const length = vectorLength(vector);
  return length > 0.000001 ? scaleVector(vector, 1 / length) : { x: 1, y: 0, z: 0 };
}

function radiansToDegrees(value: number): number {
  return value * 180 / Math.PI;
}

function wrapIndex(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

function wrapSignedDegrees(value: number): number {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function finite(value: number | undefined, fallback = 0): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
