import type { AtmosphericWeatherPresentationArtifact, WeatherPresentationSystem } from '@world-forge/shared';

export type WeatherTextureMode = 'clouds' | 'weather';

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
  if (mode === 'clouds') drawLayeredCloudField(context, canvas, artifact, simulationDays);
  for (const system of artifact.payload.systems) {
    drawWeatherPresentationSystem(context, canvas, artifact.seed, system, mode, simulationDays);
  }
  context.restore();
  normalizeHorizontalTextureSeam(canvas, 3);
}

function drawLayeredCloudField(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  artifact: AtmosphericWeatherPresentationArtifact,
  simulationDays: number
): void {
  const field = document.createElement('canvas');
  field.width = canvas.width;
  field.height = canvas.height;
  const fieldContext = field.getContext('2d');
  if (!fieldContext) return;
  const image = fieldContext.createImageData(field.width, field.height);

  for (let y = 0; y < field.height; y += 1) {
    const v = (y + 0.5) / field.height;
    for (let x = 0; x < field.width; x += 1) {
      const u = (x + 0.5) / field.width;
      const coverage = cloudCoverageSample(artifact, u, v, simulationDays);
      const value = Math.round(Math.pow(coverage, 1.12) * 255);
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
  context.filter = 'blur(0.55px)';
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
  const latitudeDeg = 90 - clamp01(v) * 180;
  const longitudeDeg = wrapUnit(u) * 360 - 180;
  let bandEnvelope = 0;

  for (const band of artifact.payload.cloudBands) {
    const phase = band.phaseRad + degreesToRadians(longitudeDeg * band.waveNumber + band.driftDegPerDay * simulationDays);
    const centerLatitude = band.centerLatitudeDeg + Math.sin(phase) * band.waveAmplitudeDeg;
    const halfWidth = Math.max(2, band.widthDeg * 0.60);
    const normalizedDistance = (latitudeDeg - centerLatitude) / halfWidth;
    const envelope = Math.exp(-0.5 * normalizedDistance * normalizedDistance) * band.density;
    bandEnvelope = Math.max(bandEnvelope, envelope);
  }

  const latitudeRadians = degreesToRadians(latitudeDeg);
  const latitudeFlow = 0.42 + Math.pow(Math.cos(latitudeRadians), 2) * 0.58;
  const eastwardAdvection = simulationDays * (0.0012 + latitudeFlow * 0.0021);
  const macro = fractalCloudNoise(wrapUnit(u + eastwardAdvection), v * 0.94 + simulationDays * 0.00012, `${artifact.seed}:macro`);
  const filament = fractalCloudNoise(wrapUnit(u * 1.85 + eastwardAdvection * 1.7), v * 1.65 - simulationDays * 0.00018, `${artifact.seed}:filament`);
  const cells = fractalCloudNoise(wrapUnit(u * 4.4 - eastwardAdvection * 0.55), v * 3.9 + simulationDays * 0.00031, `${artifact.seed}:cells`);
  const texture = macro * 0.36 + filament * 0.40 + cells * 0.24;
  const threshold = 0.60 - bandEnvelope * 0.17;
  const formed = smoothStep(threshold, 0.83, texture + bandEnvelope * 0.14);
  const breakup = smoothStep(0.40, 0.72, filament * 0.56 + cells * 0.44);
  const rawCoverage = clamp01(formed * (0.20 + breakup * 0.98) * (0.36 + bandEnvelope * 0.90));
  return smoothStep(0.08, 0.70, rawCoverage);
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

function fractalCloudNoise(u: number, v: number, seed: string): number {
  let amplitude = 0.58;
  let frequency = 2.1;
  let total = 0;
  let weight = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    total += smoothValueNoise(u * frequency, v * frequency, `${seed}:cloud:${octave}`) * amplitude;
    weight += amplitude;
    amplitude *= 0.52;
    frequency *= 2.05;
  }
  return weight > 0 ? total / weight : 0;
}

function smoothValueNoise(x: number, y: number, seed: string): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothStep(0, 1, x - x0);
  const fy = smoothStep(0, 1, y - y0);
  const a = seededUnit(seed, x0, y0);
  const b = seededUnit(seed, x0 + 1, y0);
  const c = seededUnit(seed, x0, y0 + 1);
  const d = seededUnit(seed, x0 + 1, y0 + 1);
  return linearInterpolate(linearInterpolate(a, b, fx), linearInterpolate(c, d, fx), fy);
}

function seededUnit(seed: string, x: number, y: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  hash ^= Math.imul(x + 374761393, 668265263);
  hash ^= Math.imul(y + 2246822519, 3266489917);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
  return ((hash ^ (hash >>> 13)) >>> 0) / 4294967295;
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

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

function wrapSignedDegrees(value: number): number {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
