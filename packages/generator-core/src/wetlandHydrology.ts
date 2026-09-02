import { clamp } from '@world-forge/shared';

export type WetlandHydrologyModel = 'legacy' | 'lowland-floodplain-v1' | 'catchment-budget-v1';

export const LOWLAND_FLOODPLAIN_MAX_ALTITUDE = 0.02;
export const LOWLAND_FLOODPLAIN_MIN_RIVER = 0.2;
export const LOWLAND_FLOODPLAIN_MIN_WETNESS = 0.55;
export const LOWLAND_FLOODPLAIN_MAX_RELIEF = 0.035;
export const LOWLAND_FLOODPLAIN_COHESION_SUPPORT = 0.82;

export function lakeWetnessSupportForTopology(topologyResolution: number): number {
  return clamp(0.35 - Math.log2(topologyResolution / 256) * 0.175, 0, 0.5);
}

export function catchmentIncumbentShareForTopology(topologyResolution: number): number {
  return clamp(0.5 + Math.max(0, Math.log2(256 / topologyResolution)) * 0.1875, 0.5, 0.875);
}
