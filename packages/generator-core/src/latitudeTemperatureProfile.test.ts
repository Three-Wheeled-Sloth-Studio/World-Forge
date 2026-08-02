import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import {
  latitudeTemperatureOffsetC,
  latitudeTemperatureProfileForWorkflow,
  legacyLatitudeTemperatureProfile,
  meanCenteredLatitudeTemperatureProfile,
  summarizePolarClimate
} from './latitudeTemperatureProfile';

describe('latitude temperature profiles', () => {
  it('keeps the promoted latitude offset area-weighted and mean-centered', () => {
    for (const resolution of [16, 32, 64]) {
      const topology = buildCubedSphereTopology(resolution);
      let weighted = 0;
      let totalWeight = 0;
      for (let cell = 0; cell < topology.cellCount; cell += 1) {
        const polarLatitude = Math.abs(topology.latitudes[cell]) / (Math.PI / 2);
        const weight = topology.areaWeights[cell];
        weighted += latitudeTemperatureOffsetC(polarLatitude, meanCenteredLatitudeTemperatureProfile) * weight;
        totalWeight += weight;
      }
      expect(Math.abs(weighted / totalWeight)).toBeLessThan(0.25);
    }
  });

  it('uses the promoted profile for Detailed and Experimental while preserving Legacy', () => {
    expect(latitudeTemperatureProfileForWorkflow('core.performance-foundation')).toEqual(meanCenteredLatitudeTemperatureProfile);
    expect(latitudeTemperatureProfileForWorkflow('core.world-generation-experimental')).toEqual(meanCenteredLatitudeTemperatureProfile);
    expect(latitudeTemperatureProfileForWorkflow('core.live-world')).toEqual(legacyLatitudeTemperatureProfile);
    expect(latitudeTemperatureProfileForWorkflow('core.performance-foundation-derived-control')).toEqual(legacyLatitudeTemperatureProfile);
    expect(latitudeTemperatureOffsetC(0, legacyLatitudeTemperatureProfile)).toBe(14);
    expect(latitudeTemperatureOffsetC(1, legacyLatitudeTemperatureProfile)).toBe(-14);
  });

  it('keeps the promoted poles colder without materially changing the equatorial baseline', () => {
    const legacyEquator = latitudeTemperatureOffsetC(0, legacyLatitudeTemperatureProfile);
    const promotedEquator = latitudeTemperatureOffsetC(0, meanCenteredLatitudeTemperatureProfile);
    const legacyPole = latitudeTemperatureOffsetC(1, legacyLatitudeTemperatureProfile);
    const promotedPole = latitudeTemperatureOffsetC(1, meanCenteredLatitudeTemperatureProfile);
    expect(Math.abs(promotedEquator - legacyEquator)).toBeLessThan(2);
    expect(promotedPole).toBeLessThan(legacyPole - 10);
  });

  it('summarizes polar temperature and ice separately by hemisphere and surface', () => {
    const topology = buildCubedSphereTopology(8);
    const temperature = new Float32Array(topology.cellCount);
    const ice = new Uint8Array(topology.cellCount);
    const water = new Uint8Array(topology.cellCount);
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      const latitude = topology.latitudes[cell];
      temperature[cell] = latitude >= 0 ? -8 : -4;
      if (Math.abs(latitude) / (Math.PI / 2) >= 0.72) ice[cell] = latitude >= 0 ? 1 : cell % 2;
      water[cell] = cell % 3 === 0 ? 1 : 0;
    }
    const summary = summarizePolarClimate(
      temperature,
      ice,
      water,
      topology,
      meanCenteredLatitudeTemperatureProfile
    );
    expect(summary.northHighLatitudeMeanTemperatureC).toBeLessThan(summary.southHighLatitudeMeanTemperatureC);
    expect(summary.northPermanentIceShare).toBeGreaterThan(summary.southPermanentIceShare);
    expect(summary.landIceCells + summary.waterIceCells).toBeGreaterThan(0);
  });
});
