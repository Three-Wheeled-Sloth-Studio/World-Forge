import { describe, expect, it } from 'vitest';
import {
  biomeToCode,
  buildCubedSphereTopology,
  type Biome,
  type TopologyLayers,
} from '@world-forge/shared';
import { buildFlatWorldHexOverlay } from './worldHexOverlay';
import { evaluateGeographicRegionSet } from './geographicRegionEvaluation';
import { buildGeographicMacroRegions } from './geographicRegionPartition';
import { repairGeographicRegionSlivers } from './geographicRegionRepair';

describe('geographic region sliver repair', () => {
  it('remains deterministic when the only land feature is retained as the display parent', () => {
    const topology = buildCubedSphereTopology(6);
    const layers = tinyIslandLayers(topology.cellCount);
    const overlay = buildFlatWorldHexOverlay(0.1);
    const initial = buildGeographicMacroRegions(topology, layers, overlay, {
      seed: 'tiny-island-repair',
      targetRegionCount: 32,
      maximumCandidateCells: topology.cellCount,
    });
    const repaired = repairGeographicRegionSlivers(topology, layers, overlay, initial);
    const repeated = repairGeographicRegionSlivers(topology, layers, overlay, initial);
    const evaluation = evaluateGeographicRegionSet(topology, layers, repaired);

    expect(initial.surfaceDomains.some((domain) => (
      domain.kind !== 'open-ocean' && domain.displayRegionEligible
    ))).toBe(true);
    expect(repaired.regions.length).toBeLessThanOrEqual(initial.regions.length);
    expect(repaired.signature).toBe(repeated.signature);
    expect(Array.from(repaired.membership.regionIndexByTopologyCell)).toEqual(
      Array.from(repeated.membership.regionIndexByTopologyCell),
    );
    expect(evaluation.validMembership).toBe(true);
    expect(evaluation.disconnectedRegionCount).toBe(0);
  });

  it('retains a wrap-aware region for geography that crosses the longitude seam', () => {
    const topology = buildCubedSphereTopology(10);
    const layers = seamLandmassLayers(topology.latitudes, topology.longitudes);
    const overlay = buildFlatWorldHexOverlay(1);
    const initial = buildGeographicMacroRegions(topology, layers, overlay, {
      seed: 'seam-landmass',
      targetRegionCount: 4,
      maximumCandidateCells: topology.cellCount,
    });
    const repaired = repairGeographicRegionSlivers(topology, layers, overlay, initial);

    expect(repaired.regions.some((region) => region.bounds.wrapsLongitude)).toBe(true);
    expect(repaired.regions.some((region) => (
      region.bounds.wrapsLongitude
      && region.landAreaShare > 0.5
    ))).toBe(true);
  });
});

function tinyIslandLayers(cellCount: number): TopologyLayers {
  const layers = emptyLayers(cellCount);
  layers.water.fill(1);
  layers.biomes.fill(biomeToCode('ocean'));
  layers.elevation.fill(-0.35);
  layers.wetness.fill(0.9);
  layers.temperature.fill(12);

  const islandCell = Math.floor(cellCount / 3);
  layers.water[islandCell] = 0;
  layers.biomes[islandCell] = biomeToCode('grassland');
  layers.elevation[islandCell] = 0.2;
  layers.wetness[islandCell] = 0.45;
  return layers;
}

function seamLandmassLayers(latitudes: Float32Array, longitudes: Float32Array): TopologyLayers {
  const layers = emptyLayers(latitudes.length);
  for (let cell = 0; cell < latitudes.length; cell += 1) {
    const latitude = latitudes[cell] * 180 / Math.PI;
    const longitude = longitudes[cell] * 180 / Math.PI;
    const land = Math.abs(longitude) >= 135 && Math.abs(latitude) <= 58;
    const biome: Biome = land ? 'forest' : 'ocean';
    layers.water[cell] = land ? 0 : 1;
    layers.elevation[cell] = land ? 0.24 : -0.32;
    layers.temperature[cell] = 22 - Math.abs(latitude) * 0.35;
    layers.wetness[cell] = land ? 0.62 : 0.9;
    layers.climateMoisture[cell] = layers.wetness[cell];
    layers.climatePrecipitation[cell] = layers.wetness[cell] * 0.8;
    layers.biomes[cell] = biomeToCode(biome);
  }
  return layers;
}

function emptyLayers(cellCount: number): TopologyLayers {
  return {
    elevation: new Float32Array(cellCount),
    plates: new Uint16Array(cellCount),
    water: new Uint8Array(cellCount),
    temperature: new Float32Array(cellCount),
    wetness: new Float32Array(cellCount),
    climateMoisture: new Float32Array(cellCount),
    climatePrecipitation: new Float32Array(cellCount),
    climateWetnessDelta: new Float32Array(cellCount),
    biomes: new Uint8Array(cellCount),
    ice: new Uint8Array(cellCount),
    river: new Float32Array(cellCount),
    lakes: new Uint8Array(cellCount),
    volcanism: new Float32Array(cellCount),
  };
}
