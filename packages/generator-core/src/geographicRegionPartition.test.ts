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

describe('geographic macro-region decomposition', () => {
  it('creates deterministic, connected, geography-aware broad regions', () => {
    const topology = buildCubedSphereTopology(10);
    const layers = syntheticGeography(topology.latitudes, topology.longitudes);
    const overlay = buildFlatWorldHexOverlay(1);

    const first = buildGeographicMacroRegions(topology, layers, overlay, {
      seed: 'macro-region-test',
      targetRegionCount: 10,
      maximumCandidateCells: 600,
    });
    const second = buildGeographicMacroRegions(topology, layers, overlay, {
      seed: 'macro-region-test',
      targetRegionCount: 10,
      maximumCandidateCells: 600,
    });
    const evaluation = evaluateGeographicRegionSet(topology, layers, first);

    expect(first.modelVersion).toBe('world-regions-v2');
    expect(first.scheme).toBe('geographic-graph-partition');
    expect(first.scaleBudget.targetDisplayLevelId).toBe('world-60mi');
    expect(first.overviewSectors).toHaveLength(4);
    expect(first.regions).toHaveLength(10);
    expect(first.membership.regionIndexByTopologyCell).toHaveLength(topology.cellCount);
    expect(first.signature).toBe(second.signature);
    expect(Array.from(first.membership.regionIndexByTopologyCell)).toEqual(
      Array.from(second.membership.regionIndexByTopologyCell),
    );
    expect(evaluation.validMembership).toBe(true);
    expect(evaluation.disconnectedRegionCount).toBe(0);
    expect(evaluation.assignedCellCount).toBe(topology.cellCount);
    expect(first.regions.every((region) => region.neighborRegionIds.length > 0)).toBe(true);
    expect(first.regions.some((region) => region.boundaryRationale.some((reason) => reason.kind === 'coastline'))).toBe(true);
    expect(first.regions.every((region) => region.hexCoverage[0]?.levelId === 'world-60mi')).toBe(true);
    expect(first.regions.every((region) => (
      first.membership.regionIndexByTopologyCell[region.labelPoint.topologyCellId] === region.index
    ))).toBe(true);
  });

  it('changes the version-scoped region signature when the deterministic seed changes', () => {
    const topology = buildCubedSphereTopology(8);
    const layers = syntheticGeography(topology.latitudes, topology.longitudes);
    const overlay = buildFlatWorldHexOverlay(1);

    const first = buildGeographicMacroRegions(topology, layers, overlay, {
      seed: 'macro-region-a',
      targetRegionCount: 8,
    });
    const second = buildGeographicMacroRegions(topology, layers, overlay, {
      seed: 'macro-region-b',
      targetRegionCount: 8,
    });

    expect(first.signature).not.toBe(second.signature);
  });
});

function syntheticGeography(latitudes: Float32Array, longitudes: Float32Array): TopologyLayers {
  const cellCount = latitudes.length;
  const elevation = new Float32Array(cellCount);
  const plates = new Uint16Array(cellCount);
  const water = new Uint8Array(cellCount);
  const temperature = new Float32Array(cellCount);
  const wetness = new Float32Array(cellCount);
  const climateMoisture = new Float32Array(cellCount);
  const climatePrecipitation = new Float32Array(cellCount);
  const climateWetnessDelta = new Float32Array(cellCount);
  const biomes = new Uint8Array(cellCount);
  const ice = new Uint8Array(cellCount);
  const river = new Float32Array(cellCount);
  const lakes = new Uint8Array(cellCount);
  const volcanism = new Float32Array(cellCount);

  for (let cell = 0; cell < cellCount; cell += 1) {
    const latitude = latitudes[cell] * 180 / Math.PI;
    const longitude = longitudes[cell] * 180 / Math.PI;
    const oceanBand = Math.abs(longitude) < 26 || Math.abs(longitude) > 154;
    const polarWater = Math.abs(latitude) > 72;
    const isWater = oceanBand || polarWater;
    const mountainBarrier = !isWater && Math.abs(longitude - 82) < 10;
    const biome: Biome = isWater
      ? 'ocean'
      : mountainBarrier
        ? 'mountain'
        : longitude < 0
          ? 'forest'
          : 'grassland';

    water[cell] = isWater ? 1 : 0;
    elevation[cell] = isWater ? -0.3 : mountainBarrier ? 0.72 : 0.18 + Math.cos(latitude * Math.PI / 180) * 0.08;
    plates[cell] = longitude < 0 ? 1 : 2;
    temperature[cell] = 24 - Math.abs(latitude) * 0.45;
    wetness[cell] = isWater ? 0.9 : longitude < 0 ? 0.72 : 0.38;
    climateMoisture[cell] = wetness[cell];
    climatePrecipitation[cell] = wetness[cell] * 0.8;
    biomes[cell] = biomeToCode(biome);
    river[cell] = !isWater && Math.abs(longitude + 78) < 4 ? 0.8 : 0;
    lakes[cell] = !isWater && Math.abs(latitude) < 8 && Math.abs(longitude - 112) < 6 ? 1 : 0;
  }

  return {
    elevation,
    plates,
    water,
    temperature,
    wetness,
    climateMoisture,
    climatePrecipitation,
    climateWetnessDelta,
    biomes,
    ice,
    river,
    lakes,
    volcanism,
  };
}
