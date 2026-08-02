import { clamp, type CubedSphereTopology } from '@world-forge/shared';
import type { GenerationWorkflowId } from './workflows';

export type LatitudeTemperatureProfileId = 'legacy-linear-v1' | 'mean-centered-power-v1';

export type LatitudeTemperatureProfile = {
  id: LatitudeTemperatureProfileId;
  equatorToPoleContrastC: number;
};

export type PolarClimateSummary = {
  latitudeProfileId: LatitudeTemperatureProfileId;
  equatorToPoleContrastC: number;
  meanTemperatureC: number;
  equatorialMeanTemperatureC: number;
  northHighLatitudeMeanTemperatureC: number;
  southHighLatitudeMeanTemperatureC: number;
  northPermanentIceShare: number;
  southPermanentIceShare: number;
  landIceCells: number;
  waterIceCells: number;
};

export const sphericalMeanPolarLatitudePower13 = 0.29171897123199025;

export const legacyLatitudeTemperatureProfile: LatitudeTemperatureProfile = {
  id: 'legacy-linear-v1',
  equatorToPoleContrastC: 28
};

export const meanCenteredLatitudeTemperatureProfile: LatitudeTemperatureProfile = {
  id: 'mean-centered-power-v1',
  equatorToPoleContrastC: 52
};

// Compatibility alias retained for callers and saved diagnostics introduced while the profile was Experimental.
export const experimentalLatitudeTemperatureProfile = meanCenteredLatitudeTemperatureProfile;

export function latitudeTemperatureProfileForWorkflow(
  workflowId: GenerationWorkflowId | undefined
): LatitudeTemperatureProfile {
  return workflowId === 'core.performance-foundation'
    || workflowId === 'core.world-generation-experimental'
    ? meanCenteredLatitudeTemperatureProfile
    : legacyLatitudeTemperatureProfile;
}

export function latitudeTemperatureOffsetC(
  polarLatitude: number,
  profile: LatitudeTemperatureProfile
): number {
  const latitude = clamp(polarLatitude, 0, 1);
  if (profile.id === 'legacy-linear-v1') {
    return (1 - latitude) * profile.equatorToPoleContrastC - profile.equatorToPoleContrastC / 2;
  }
  // Future calibration may derive the contrast or exponent from axial tilt and eccentricity.
  // Version 1 remains fixed so accepted worlds retain deterministic climate provenance.
  return profile.equatorToPoleContrastC * (sphericalMeanPolarLatitudePower13 - Math.pow(latitude, 1.3));
}

export function summarizePolarClimate(
  temperature: Float32Array,
  ice: Uint8Array,
  water: Uint8Array,
  topology: CubedSphereTopology,
  profile: LatitudeTemperatureProfile
): PolarClimateSummary {
  let totalWeight = 0;
  let totalTemperature = 0;
  let equatorialWeight = 0;
  let equatorialTemperature = 0;
  let northWeight = 0;
  let northTemperature = 0;
  let northIceWeight = 0;
  let southWeight = 0;
  let southTemperature = 0;
  let southIceWeight = 0;
  let landIceCells = 0;
  let waterIceCells = 0;

  for (let cell = 0; cell < temperature.length; cell += 1) {
    const weight = topology.areaWeights[cell] || 1;
    const latitude = topology.latitudes[cell];
    const polarLatitude = Math.abs(latitude) / (Math.PI / 2);
    totalWeight += weight;
    totalTemperature += temperature[cell] * weight;

    if (polarLatitude <= 0.2) {
      equatorialWeight += weight;
      equatorialTemperature += temperature[cell] * weight;
    }
    if (polarLatitude >= 0.72) {
      if (latitude >= 0) {
        northWeight += weight;
        northTemperature += temperature[cell] * weight;
        northIceWeight += ice[cell] * weight;
      } else {
        southWeight += weight;
        southTemperature += temperature[cell] * weight;
        southIceWeight += ice[cell] * weight;
      }
    }
    if (ice[cell]) {
      if (water[cell]) waterIceCells += 1;
      else landIceCells += 1;
    }
  }

  return {
    latitudeProfileId: profile.id,
    equatorToPoleContrastC: profile.equatorToPoleContrastC,
    meanTemperatureC: round(totalTemperature / Math.max(totalWeight, 1)),
    equatorialMeanTemperatureC: round(equatorialTemperature / Math.max(equatorialWeight, 1)),
    northHighLatitudeMeanTemperatureC: round(northTemperature / Math.max(northWeight, 1)),
    southHighLatitudeMeanTemperatureC: round(southTemperature / Math.max(southWeight, 1)),
    northPermanentIceShare: round(northIceWeight / Math.max(northWeight, 1), 4),
    southPermanentIceShare: round(southIceWeight / Math.max(southWeight, 1), 4),
    landIceCells,
    waterIceCells
  };
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
