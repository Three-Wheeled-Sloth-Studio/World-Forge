import { clamp } from '@world-forge/shared';

/**
 * Warmer forests require more sustained surface moisture than cool forests.
 * The bounded ramp preserves boreal forest while reducing warm grassland and
 * dryland overclassification without adding a seasonal simulation pass.
 */
export function forestWetnessThreshold(temperatureC: number): number {
  return 0.5 + clamp((temperatureC - 8) / 12, 0, 1) * 0.1;
}
