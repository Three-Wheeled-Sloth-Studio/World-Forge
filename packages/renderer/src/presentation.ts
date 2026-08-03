import type { PrimaryWorld, WorldProject } from '@world-forge/shared';
import {
  cleanGameMapTheme,
  renderWorldToCanvas as renderDetailedWorldToCanvas
} from './index';
import type { MapTheme, RenderOptions } from './index';

export * from './index';
export { renderDetailedWorldToCanvas };

export type FlowPresentationMode = 'sparse' | 'detailed';
export type FlowRenderOptions = RenderOptions & {
  flowPresentation?: FlowPresentationMode;
};

export type SparseFlowPoint = {
  x: number;
  y: number;
};

export type SparseFlowPath = {
  id: string;
  kind: 'wind' | 'current';
  points: SparseFlowPoint[];
  averageSpeed: number;
  colorClass: 'warm' | 'cold' | 'neutral';
};

type FlowKind = SparseFlowPath['kind'];
type FlowSeed = { id: string; x: number; y: number; priority: number };
type FlowVector = { x: number; y: number; speed: number; valid: boolean };
type PressureCenter = {
  id: string;
  regime: string;
  longitudeRadians: number;
  latitudeRadians: number;
  radiusLongitudeRadians: number;
  radiusLatitudeRadians: number;
  strength: number;
};
type GyreDiagnostic = {
  id: number;
  kind: 'subtropical' | 'subpolar';
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  strength: number;
  territorySize: number;
};
type FlowDiagnostics = {
  pressureSystems?: {
    centers?: PressureCenter[];
    openSouthernCircumpolarPath?: boolean;
    openNorthernCircumpolarPath?: boolean;
  };
  basinCirculation?: {
    packedGyres?: GyreDiagnostic[];
    pressureSystems?: FlowDiagnostics['pressureSystems'];
  };
};

const TWO_PI = Math.PI * 2;

export function renderWorldToCanvas(
  canvas: HTMLCanvasElement,
  project: WorldProject,
  theme: MapTheme = cleanGameMapTheme,
  visible: FlowRenderOptions = { rivers: true, plates: false, heightmap: false }
): void {
  const mode = visible.mode ?? (visible.heightmap ? 'elevation' : 'biomes');
  if ((mode !== 'wind' && mode !== 'current') || visible.flowPresentation === 'detailed') {
    renderDetailedWorldToCanvas(canvas, project, theme, visible);
    return;
  }
  renderSparseFlowCanvas(canvas, project.primaryWorld, mode, visible.targetResolution);
}

export function buildSparseFlowPaths(
  world: PrimaryWorld,
  kind: FlowKind,
  targetWidth = world.mapModel.resolution.width,
  targetHeight = world.mapModel.resolution.height
): SparseFlowPath[] {
  const seeds = kind === 'wind' ? buildWindSeeds(world) : buildCurrentSeeds(world);
  const accepted: SparseFlowPath[] = [];
  const occupancy = new Uint8Array(64 * 32);
  const maxPaths = kind === 'wind' ? 28 : 20;
  const minimumLength = Math.min(targetWidth, targetHeight) * (kind === 'wind' ? 0.34 : 0.24);

  for (const seed of seeds.sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))) {
    if (accepted.length >= maxPaths) break;
    const path = traceFlowPath(world, kind, seed);
    if (path.points.length < 10) continue;
    const screenLength = pathLength(path.points, targetWidth / world.mapModel.resolution.width, targetHeight / world.mapModel.resolution.height);
    if (screenLength < minimumLength) continue;
    const cells = occupancyCells(path.points, world.mapModel.resolution.width, world.mapModel.resolution.height);
    const overlap = cells.reduce((count, cell) => count + (occupancy[cell] ? 1 : 0), 0) / Math.max(1, cells.length);
    if (overlap > (kind === 'wind' ? 0.42 : 0.36)) continue;
    for (const cell of cells) occupancy[cell] = 1;
    accepted.push(path);
  }

  return accepted;
}

function renderSparseFlowCanvas(
  canvas: HTMLCanvasElement,
  world: PrimaryWorld,
  kind: FlowKind,
  targetResolution?: { width: number; height: number }
): void {
  const source = world.mapModel.resolution;
  const width = targetResolution?.width ?? source.width;
  const height = targetResolution?.height ?? source.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to acquire canvas context');
  const image = ctx.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y + 0.5) / height * source.height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x + 0.5) / width * source.width));
      const index = sourceY * source.width + sourceX;
      const color = kind === 'wind'
        ? windBackgroundColor(world, index, sourceY)
        : currentBackgroundColor(world, index, sourceY);
      const offset = (y * width + x) * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const paths = buildSparseFlowPaths(world, kind, width, height);
  drawSparseFlowPaths(ctx, world, paths, width, height);
}

function buildWindSeeds(world: PrimaryWorld): FlowSeed[] {
  const { width, height } = world.mapModel.resolution;
  const diagnostics = climateDiagnostics(world);
  const pressure = diagnostics.pressureSystems ?? diagnostics.basinCirculation?.pressureSystems;
  const seeds: FlowSeed[] = [];

  for (const center of [...(pressure?.centers ?? [])]
    .sort((left, right) => right.strength - left.strength || left.id.localeCompare(right.id))
    .slice(0, 12)) {
    if (!['equatorial-trough', 'subtropical', 'subpolar'].includes(center.regime)) continue;
    const centerX = longitudeToX(center.longitudeRadians, width);
    const centerY = latitudeToY(center.latitudeRadians, height);
    const offsetX = Math.max(width * 0.018, center.radiusLongitudeRadians / TWO_PI * width * 0.58);
    seeds.push({ id: `pressure-${center.id}-west`, x: centerX - offsetX, y: centerY, priority: 120 + center.strength * 10 });
    seeds.push({ id: `pressure-${center.id}-east`, x: centerX + offsetX, y: centerY, priority: 119 + center.strength * 10 });
  }

  const latitudeBands = [-64, -44, -23, -8, 8, 23, 44, 64];
  const longitudeFractions = [0.08, 0.41, 0.74];
  for (const latitudeDeg of latitudeBands) {
    for (let index = 0; index < longitudeFractions.length; index += 1) {
      seeds.push({
        id: `band-${latitudeDeg}-${index}`,
        x: longitudeFractions[index] * width,
        y: latitudeToY(latitudeDeg * Math.PI / 180, height),
        priority: 60 - Math.abs(latitudeDeg) * 0.1
      });
    }
  }
  return dedupeSeeds(seeds, width, height);
}

function buildCurrentSeeds(world: PrimaryWorld): FlowSeed[] {
  const { width, height } = world.mapModel.resolution;
  const diagnostics = climateDiagnostics(world);
  const circulation = diagnostics.basinCirculation;
  const pressure = diagnostics.pressureSystems ?? circulation?.pressureSystems;
  const seeds: FlowSeed[] = [];

  for (const gyre of [...(circulation?.packedGyres ?? [])]
    .sort((left, right) => right.territorySize - left.territorySize || right.strength - left.strength || left.id - right.id)
    .slice(0, 10)) {
    const ring = gyre.kind === 'subtropical' ? 0.72 : 0.66;
    seeds.push({
      id: `gyre-${gyre.id}-east`,
      x: gyre.centerX + gyre.radiusX * ring,
      y: gyre.centerY,
      priority: gyre.kind === 'subtropical' ? 150 : 125
    });
    if (gyre.radiusX > width * 0.11) {
      seeds.push({
        id: `gyre-${gyre.id}-north`,
        x: gyre.centerX,
        y: gyre.centerY - gyre.radiusY * ring,
        priority: gyre.kind === 'subtropical' ? 145 : 120
      });
    }
  }

  for (const latitudeDeg of [-6, 4]) {
    for (let index = 0; index < 6; index += 1) {
      seeds.push({
        id: `equatorial-${latitudeDeg}-${index}`,
        x: (index + 0.45) / 6 * width,
        y: latitudeToY(latitudeDeg * Math.PI / 180, height),
        priority: 105 - Math.abs(latitudeDeg)
      });
    }
  }

  if (pressure?.openSouthernCircumpolarPath) {
    seeds.push({ id: 'circumpolar-south', x: width * 0.18, y: latitudeToY(-65 * Math.PI / 180, height), priority: 130 });
  }
  if (pressure?.openNorthernCircumpolarPath) {
    seeds.push({ id: 'circumpolar-north', x: width * 0.18, y: latitudeToY(65 * Math.PI / 180, height), priority: 130 });
  }

  return dedupeSeeds(seeds, width, height).filter((seed) => isWater(world, seed.x, seed.y));
}

function traceFlowPath(world: PrimaryWorld, kind: FlowKind, seed: FlowSeed): SparseFlowPath {
  const backward = traceDirection(world, kind, seed, -1);
  const forward = traceDirection(world, kind, seed, 1);
  const points = [...backward.slice(1).reverse(), ...forward];
  let speedTotal = 0;
  let speedCount = 0;
  for (const point of points) {
    const vector = sampleVector(world, kind, point.x, point.y);
    if (!vector.valid) continue;
    speedTotal += vector.speed;
    speedCount += 1;
  }
  const midpoint = points[Math.floor(points.length / 2)] ?? { x: seed.x, y: seed.y };
  const midpointVector = sampleVector(world, kind, midpoint.x, midpoint.y);
  return {
    id: seed.id,
    kind,
    points,
    averageSpeed: speedTotal / Math.max(1, speedCount),
    colorClass: classifyFlowColor(world, kind, midpoint, midpointVector)
  };
}

function traceDirection(world: PrimaryWorld, kind: FlowKind, seed: FlowSeed, direction: -1 | 1): SparseFlowPoint[] {
  const { width, height } = world.mapModel.resolution;
  const step = Math.max(2, Math.min(width, height) / (kind === 'wind' ? 118 : 126));
  const maxTravel = width * (kind === 'wind' ? 1.45 : 2.15);
  const maxSteps = kind === 'wind' ? 230 : 290;
  const minimumSpeed = kind === 'wind' ? 0.055 : 0.032;
  const points: SparseFlowPoint[] = [{ x: seed.x, y: seed.y }];
  let x = seed.x;
  let y = seed.y;
  let travel = 0;

  for (let index = 0; index < maxSteps && travel < maxTravel; index += 1) {
    const vector = sampleVector(world, kind, x, y);
    if (!vector.valid || vector.speed < minimumSpeed) break;
    const dx = vector.x / vector.speed * step * direction;
    const dy = -vector.y / vector.speed * step * direction;
    const nextX = x + dx;
    const nextY = y + dy;
    if (nextY < 1 || nextY >= height - 1) break;
    if (kind === 'current' && !isWater(world, nextX, nextY)) break;
    travel += Math.hypot(dx, dy);
    x = nextX;
    y = nextY;
    points.push({ x, y });

    if (points.length > 18) {
      const seedDistance = Math.hypot(wrappedDelta(x, seed.x, width), y - seed.y);
      if (seedDistance < step * 1.35 && travel > step * 14) break;
      const older = points[points.length - 14];
      if (Math.hypot(wrappedDelta(x, older.x, width), y - older.y) < step * 0.7) break;
    }
  }
  return points;
}

function sampleVector(world: PrimaryWorld, kind: FlowKind, x: number, y: number): FlowVector {
  const { width, height } = world.mapModel.resolution;
  const wrappedX = modulo(x, width);
  const clampedY = clamp(y, 0, height - 1);
  const x0 = Math.floor(wrappedX);
  const x1 = (x0 + 1) % width;
  const y0 = Math.floor(clampedY);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = wrappedX - x0;
  const ty = clampedY - y0;
  const xLayer = kind === 'wind' ? world.layers.windX : world.layers.currentX;
  const yLayer = kind === 'wind' ? world.layers.windY : world.layers.currentY;
  const sample = (layer: Float32Array): number => {
    const top = lerp(layer[y0 * width + x0], layer[y0 * width + x1], tx);
    const bottom = lerp(layer[y1 * width + x0], layer[y1 * width + x1], tx);
    return lerp(top, bottom, ty);
  };
  const vx = sample(xLayer);
  const vy = sample(yLayer);
  const speed = Math.hypot(vx, vy);
  return {
    x: vx,
    y: vy,
    speed,
    valid: kind === 'wind' || isWater(world, wrappedX, clampedY)
  };
}

function drawSparseFlowPaths(
  ctx: CanvasRenderingContext2D,
  world: PrimaryWorld,
  paths: SparseFlowPath[],
  targetWidth: number,
  targetHeight: number
): void {
  const source = world.mapModel.resolution;
  const scaleX = targetWidth / source.width;
  const scaleY = targetHeight / source.height;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const path of paths) {
    const segments = splitWrappedPath(path.points, source.width, scaleX, scaleY, targetWidth);
    const width = path.kind === 'current'
      ? clamp(2.7 + path.averageSpeed * 5.2, 3, 6.2)
      : clamp(1.45 + path.averageSpeed * 2.4, 1.6, 3.1);
    const color = pathColor(path);
    const halo = path.kind === 'current' ? 'rgba(1, 25, 43, 0.58)' : 'rgba(48, 42, 24, 0.48)';
    for (const segment of segments) {
      if (segment.length < 3) continue;
      strokeSmoothPath(ctx, segment, halo, width * 2.25);
      strokeSmoothPath(ctx, segment, color, width);
      drawPathArrowheads(ctx, segment, path, width, halo, color);
    }
  }
  ctx.restore();
}

function splitWrappedPath(
  points: SparseFlowPoint[],
  sourceWidth: number,
  scaleX: number,
  scaleY: number,
  targetWidth: number
): Array<Array<{ x: number; y: number }>> {
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];
  for (const point of points) {
    const projected = { x: modulo(point.x, sourceWidth) * scaleX, y: point.y * scaleY };
    const previous = current[current.length - 1];
    if (previous && Math.abs(projected.x - previous.x) > targetWidth * 0.5) {
      if (current.length > 1) segments.push(current);
      current = [projected];
    } else {
      current.push(projected);
    }
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

function strokeSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  strokeStyle: string,
  lineWidth: number
): void {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) * 0.5, (current.y + next.y) * 0.5);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function drawPathArrowheads(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  path: SparseFlowPath,
  lineWidth: number,
  halo: string,
  color: string
): void {
  const fractions = points.length > 34 ? [0.42, 0.78] : [0.64];
  for (const fraction of fractions) {
    const index = clamp(Math.round((points.length - 1) * fraction), 1, points.length - 1);
    const previous = points[index - 1];
    const point = points[index];
    const angle = Math.atan2(point.y - previous.y, point.x - previous.x);
    const size = Math.max(path.kind === 'current' ? 7 : 5, lineWidth * (path.kind === 'current' ? 2.2 : 2.05));
    drawArrowhead(ctx, point.x, point.y, angle, size, halo, color, lineWidth);
  }
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  halo: string,
  color: string,
  lineWidth: number
): void {
  const points = [
    { x, y },
    { x: x - Math.cos(angle - 0.48) * size, y: y - Math.sin(angle - 0.48) * size },
    { x: x - Math.cos(angle + 0.48) * size, y: y - Math.sin(angle + 0.48) * size }
  ];
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.lineTo(points[2].x, points[2].y);
  ctx.closePath();
  ctx.strokeStyle = halo;
  ctx.lineWidth = lineWidth * 1.4;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
}

function windBackgroundColor(world: PrimaryWorld, index: number, sourceY: number): [number, number, number] {
  const water = world.layers.water[index] === 1;
  const speed = clamp(Math.hypot(world.layers.windX[index], world.layers.windY[index]) / 0.62, 0, 1);
  const temperature = clamp((world.layers.temperature[index] + 18) / 52, 0, 1);
  const base: [number, number, number] = water ? [31, 82, 111] : [103, 119, 88];
  const thermal = mixRgb([74, 111, 137], [164, 139, 82], temperature);
  const lat = Math.abs(Math.PI / 2 - ((sourceY + 0.5) / world.mapModel.resolution.height) * Math.PI) / (Math.PI / 2);
  return mixRgb(mixRgb(base, thermal, 0.28), [206, 213, 184], speed * (0.1 + (1 - lat) * 0.04));
}

function currentBackgroundColor(world: PrimaryWorld, index: number, sourceY: number): [number, number, number] {
  if (world.layers.water[index] !== 1) return [91, 116, 76];
  const vx = world.layers.currentX[index];
  const vy = world.layers.currentY[index];
  const speed = clamp(Math.hypot(vx, vy) / 0.64, 0, 1);
  const latitude = Math.PI / 2 - ((sourceY + 0.5) / world.mapModel.resolution.height) * Math.PI;
  const poleward = latitude >= 0 ? vy : -vy;
  const thermal = clamp((poleward + 0.28) / 0.56, 0, 1);
  const base = mixRgb([10, 47, 83], [38, 111, 143], speed * 0.72);
  return mixRgb(base, mixRgb([32, 94, 164], [190, 91, 58], thermal), 0.18);
}

function classifyFlowColor(world: PrimaryWorld, kind: FlowKind, point: SparseFlowPoint, vector: FlowVector): SparseFlowPath['colorClass'] {
  const { width, height } = world.mapModel.resolution;
  const y = clamp(Math.round(point.y), 0, height - 1);
  const x = Math.floor(modulo(point.x, width));
  if (kind === 'wind') {
    const temperature = world.layers.temperature[y * width + x] ?? 0;
    if (temperature > 20) return 'warm';
    if (temperature < 3) return 'cold';
    return 'neutral';
  }
  const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
  const poleward = latitude >= 0 ? vector.y : -vector.y;
  if (poleward > 0.055) return 'warm';
  if (poleward < -0.055) return 'cold';
  return 'neutral';
}

function pathColor(path: SparseFlowPath): string {
  if (path.kind === 'current') {
    if (path.colorClass === 'warm') return 'rgba(255, 105, 61, 0.95)';
    if (path.colorClass === 'cold') return 'rgba(76, 174, 255, 0.95)';
    return 'rgba(204, 246, 250, 0.92)';
  }
  if (path.colorClass === 'warm') return 'rgba(255, 208, 112, 0.9)';
  if (path.colorClass === 'cold') return 'rgba(157, 217, 255, 0.9)';
  return 'rgba(255, 246, 198, 0.88)';
}

function climateDiagnostics(world: PrimaryWorld): FlowDiagnostics {
  return (world.climate ?? {}) as FlowDiagnostics;
}

function isWater(world: PrimaryWorld, x: number, y: number): boolean {
  const { width, height } = world.mapModel.resolution;
  const sx = Math.floor(modulo(x, width));
  const sy = clamp(Math.round(y), 0, height - 1);
  return world.layers.water[sy * width + sx] === 1;
}

function occupancyCells(points: SparseFlowPoint[], width: number, height: number): number[] {
  const cells = new Set<number>();
  for (let index = 0; index < points.length; index += 2) {
    const point = points[index];
    const x = clamp(Math.floor(modulo(point.x, width) / width * 64), 0, 63);
    const y = clamp(Math.floor(point.y / height * 32), 0, 31);
    cells.add(y * 64 + x);
  }
  return [...cells];
}

function dedupeSeeds(seeds: FlowSeed[], width: number, height: number): FlowSeed[] {
  const accepted: FlowSeed[] = [];
  for (const seed of seeds.sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))) {
    const normalized = { ...seed, x: modulo(seed.x, width), y: clamp(seed.y, 1, height - 2) };
    const duplicate = accepted.some((candidate) =>
      Math.hypot(wrappedDelta(candidate.x, normalized.x, width), candidate.y - normalized.y) < Math.min(width, height) * 0.035
    );
    if (!duplicate) accepted.push(normalized);
  }
  return accepted;
}

function pathLength(points: SparseFlowPoint[], scaleX: number, scaleY: number): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot((points[index].x - points[index - 1].x) * scaleX, (points[index].y - points[index - 1].y) * scaleY);
  }
  return total;
}

function longitudeToX(longitude: number, width: number): number {
  return modulo((longitude + Math.PI) / TWO_PI * width, width);
}

function latitudeToY(latitude: number, height: number): number {
  return (Math.PI / 2 - latitude) / Math.PI * height;
}

function wrappedDelta(value: number, center: number, period: number): number {
  let delta = value - center;
  if (delta > period / 2) delta -= period;
  if (delta < -period / 2) delta += period;
  return delta;
}

function modulo(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function lerp(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

function mixRgb(left: [number, number, number], right: [number, number, number], amount: number): [number, number, number] {
  const t = clamp(amount, 0, 1);
  return [
    Math.round(lerp(left[0], right[0], t)),
    Math.round(lerp(left[1], right[1], t)),
    Math.round(lerp(left[2], right[2], t))
  ];
}
