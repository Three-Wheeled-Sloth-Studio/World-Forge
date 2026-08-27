import { clamp } from '@world-forge/shared';

/**
 * Warmer forests require more sustained surface moisture than cool forests.
 * The bounded contrast preserves boreal forest at lower annual wetness while
 * requiring warm forests to offset greater evaporative demand. It reduces
 * warm grassland overclassification without adding a seasonal simulation pass.
 */
export function forestWetnessThreshold(temperatureC: number): number {
  const baseThreshold = 0.5 + clamp((temperatureC - 8) / 12, 0, 1) * 0.1;
  const temperatureContrast = clamp((temperatureC - 11) / 9, -1, 1) * 0.06;
  return baseThreshold + temperatureContrast;
}
