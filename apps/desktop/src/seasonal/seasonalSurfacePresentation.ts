import type { MapMode } from '@world-forge/renderer';
import type { SeasonalSurfaceModelArtifact, WorldProject } from '@world-forge/shared';
import {
  seasonalSurfaceStateAtSample,
  type SeasonalSurfaceSample,
  type SeasonalSurfaceState
} from '@world-forge/generation-runtime/enrichment/seasonalSurfaceModel';

export type SeasonalSurfaceCoverage = {
  meanSnowFraction: number;
  meanSeaIceFraction: number;
  meanTemperatureDeltaC: number;
};

export function seasonalSurfaceAppliesToMapMode(mapMode: MapMode): boolean {
  return mapMode === 'biomes' || mapMode === 'terrain-only' || mapMode === 'temperature';
}

export function applySeasonalSurfaceToCanvas(
  canvas: HTMLCanvasElement,
  project: WorldProject,
  artifact: SeasonalSurfaceModelArtifact,
  dayOfYear: number
): SeasonalSurfaceCoverage {
  const context = canvas.getContext('2d');
  if (!context || canvas.width <= 0 || canvas.height <= 0) return emptyCoverage();
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const coefficientResolution = artifact.payload.coefficientResolution;
  const worldResolution = project.primaryWorld.mapModel.resolution;
  let snowTotal = 0;
  let seaIceTotal = 0;
  let temperatureDeltaTotal = 0;
  let sampled = 0;

  for (let y = 0; y < canvas.height; y += 1) {
    const v = (y + 0.5) / canvas.height;
    const sourceY = Math.max(0, Math.min(worldResolution.height - 1, Math.floor(v * worldResolution.height)));
    for (let x = 0; x < canvas.width; x += 1) {
      const u = (x + 0.5) / canvas.width;
      const sample = sampleSeasonalCoefficients(artifact, coefficientResolution, u, v);
      const state = seasonalSurfaceStateAtSample(artifact, sample, dayOfYear);
      const sourceX = Math.max(0, Math.min(worldResolution.width - 1, Math.floor(u * worldResolution.width)));
      const water = Boolean(project.primaryWorld.layers.water[sourceY * worldResolution.width + sourceX]);
      const offset = (y * canvas.width + x) * 4;
      const color = seasonalSurfaceOverlayColor(
        [image.data[offset], image.data[offset + 1], image.data[offset + 2]],
        state,
        water
      );
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      if ((x & 7) === 0 && (y & 7) === 0) {
        snowTotal += state.snowFraction;
        seaIceTotal += state.seaIceFraction;
        temperatureDeltaTotal += state.temperatureDeltaC;
        sampled += 1;
      }
    }
  }
  context.putImageData(image, 0, 0);
  const coverage = {
    meanSnowFraction: sampled ? snowTotal / sampled : 0,
    meanSeaIceFraction: sampled ? seaIceTotal / sampled : 0,
    meanTemperatureDeltaC: sampled ? temperatureDeltaTotal / sampled : 0
  };
  canvas.dataset.surfaceSeason = 'seasonal';
  canvas.dataset.seasonalDay = dayOfYear.toFixed(2);
  canvas.dataset.seasonalSnowMean = coverage.meanSnowFraction.toFixed(6);
  canvas.dataset.seasonalSeaIceMean = coverage.meanSeaIceFraction.toFixed(6);
  canvas.dataset.seasonalTemperatureDeltaMean = coverage.meanTemperatureDeltaC.toFixed(6);
  return coverage;
}

export function clearSeasonalSurfaceCanvasMetadata(canvas: HTMLCanvasElement): void {
  canvas.dataset.surfaceSeason = 'annual';
  delete canvas.dataset.seasonalDay;
  delete canvas.dataset.seasonalSnowMean;
  delete canvas.dataset.seasonalSeaIceMean;
  delete canvas.dataset.seasonalTemperatureDeltaMean;
}

export function seasonalSurfaceOverlayColor(
  base: readonly [number, number, number],
  state: SeasonalSurfaceState,
  water: boolean
): [number, number, number] {
  let color: [number, number, number] = [base[0], base[1], base[2]];
  const coolAmount = clamp01(-state.temperatureDeltaC / 14) * 0.12;
  const warmAmount = clamp01(state.temperatureDeltaC / 14) * 0.07;
  if (coolAmount > 0) color = mix(color, [112, 145, 181], coolAmount);
  if (warmAmount > 0) color = mix(color, [207, 169, 103], warmAmount);
  if (water && state.seaIceFraction > 0) {
    color = mix(color, [210, 237, 246], clamp01(state.seaIceFraction * 0.88));
  } else if (!water && state.snowFraction > 0) {
    color = mix(color, [239, 245, 248], clamp01(state.snowFraction * 0.84));
  }
  return color;
}

function sampleSeasonalCoefficients(
  artifact: SeasonalSurfaceModelArtifact,
  resolution: { width: number; height: number },
  u: number,
  v: number
): SeasonalSurfaceSample {
  return {
    baselineTemperatureC: sampleField(artifact.payload.baselineTemperatureC, resolution, u, v),
    temperatureAmplitudeC: sampleField(artifact.payload.temperatureAmplitudeC, resolution, u, v),
    insolationAmplitude: sampleField(artifact.payload.insolationAmplitude, resolution, u, v),
    snowPotential: sampleField(artifact.payload.snowPotential, resolution, u, v),
    seaIcePotential: sampleField(artifact.payload.seaIcePotential, resolution, u, v)
  };
}

function sampleField(field: number[], resolution: { width: number; height: number }, u: number, v: number): number {
  const sourceX = wrapUnit(u) * resolution.width - 0.5;
  const sourceY = clamp01(v) * resolution.height - 0.5;
  const x0 = Math.floor(sourceX);
  const y0 = Math.max(0, Math.min(resolution.height - 1, Math.floor(sourceY)));
  const x1 = x0 + 1;
  const y1 = Math.max(0, Math.min(resolution.height - 1, y0 + 1));
  const tx = sourceX - Math.floor(sourceX);
  const ty = sourceY - Math.floor(sourceY);
  const sample = (x: number, y: number) => field[y * resolution.width + ((x % resolution.width) + resolution.width) % resolution.width] ?? 0;
  const top = sample(x0, y0) + (sample(x1, y0) - sample(x0, y0)) * tx;
  const bottom = sample(x0, y1) + (sample(x1, y1) - sample(x0, y1)) * tx;
  return top + (bottom - top) * ty;
}

function mix(base: readonly [number, number, number], target: readonly [number, number, number], amount: number): [number, number, number] {
  const t = clamp01(amount);
  return [
    clampByte(base[0] + (target[0] - base[0]) * t),
    clampByte(base[1] + (target[1] - base[1]) * t),
    clampByte(base[2] + (target[2] - base[2]) * t)
  ];
}

function emptyCoverage(): SeasonalSurfaceCoverage {
  return { meanSnowFraction: 0, meanSeaIceFraction: 0, meanTemperatureDeltaC: 0 };
}

function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
