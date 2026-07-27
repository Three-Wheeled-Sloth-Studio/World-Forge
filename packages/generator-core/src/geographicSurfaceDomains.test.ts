import { describe, expect, it } from 'vitest';
import {
  biomeToCode,
  buildCubedSphereTopology,
  type CubedSphereTopology,
  type TopologyLayers,
} from '@world-forge/shared';
import { buildGeographicMacroRegions } from './geographicRegionPartition';
import { deriveGeographicRegionScaleBudget } from './geographicRegionBudget';
import { buildGeographicSurfaceDomains } from './geographicSurfaceDomains';
import { repairGeographicRegionSlivers } from './geographicRegionRepair';
import { buildFlatWorldHexOverlay } from './worldHexOverlay';

describe('geographic surface domains', () => {
  it('preserves a small isolated landmass identity without forcing a display region', () => {
    const topology = buildCubedSphereTopology(20);
    const layers = twoLandmassLayers(topology);
    const overlay = buildFlatWorldHexOverlay(1);
    const candidate = buildGeographicMacroRegions(topology, layers, overlay, {
      seed: 'isolated-landmass-parent',
      targetRegionCount: 12,
      maximumCandidateCells: topology.cellCount,
    });
    const landDomains = candidate.surfaceDomains.filter((domain) => domain.kind === 'landmass');
    const smallest = [...landDomains].sort((left, right) => left.areaShare - right.areaShare)[0];
    const childRegions = candidate.regions.filter((region) => region.parentDomainId === smallest.id);
    const smallestDomainCells = Array.from(candidate.surfaceDomainIndexByTopologyCell)
      .map((domainIndex, cell) => ({ domainIndex, cell }))
      .filter(({ domainIndex }) => domainIndex === smallest.index)
      .map(({ cell }) => cell);
    const openOcean = candidate.surfaceDomains.find((domain) => domain.kind === 'open-ocean');

    expect(landDomains.length).toBeGreaterThanOrEqual(2);
    expect(smallest.displayRegionEligible).toBe(false);
    expect(smallest.targetRegionCount).toBe(0);
    expect(childRegions).toHaveLength(0);
    expect(smallestDomainCells.length).toBeGreaterThan(0);
    expect(smallestDomainCells.every((cell) => (
      candidate.regionDomainIndexByTopologyCell[cell] === openOcean?.index
    ))).toBe(true);
  });

  it('represents territorial water without exceeding the twelve-nautical-mile cap', () => {
    const topology = buildCubedSphereTopology(64);
    const layers = equatorialContinentLayers(topology);
    const overlay = buildFlatWorldHexOverlay(0.1);
    const surface = buildGeographicSurfaceDomains(
      topology,
      layers,
      overlay,
      deriveGeographicRegionScaleBudget(overlay, 8),
    );
    const land = surface.domains.find((domain) => domain.kind === 'landmass');

    expect(land).toBeDefined();
    expect(land?.requestedTerritorialWaterMiles).toBeCloseTo(13.81, 2);
    expect(land?.representedTerritorialWaterMiles).toBeGreaterThan(0);
    expect(land?.representedTerritorialWaterMiles).toBeLessThanOrEqual(13.81);
    expect(land?.waterAreaShare).toBeGreaterThan(0);
  });

  it('never repairs a sliver into a different surface parent', () => {
    const topology = buildCubedSphereTopology(16);
    const layers = twoLandmassLayers(topology);
    const overlay = buildFlatWorldHexOverlay(1);
    const initial = buildGeographicMacroRegions(topology, layers, overlay, {
      seed: 'parent-bounded-repair',
      targetRegionCount: 32,
      maximumCandidateCells: topology.cellCount,
    });
    const parentByRegionId = new Map(initial.regions.map((region) => [region.id, region.parentDomainId]));
    const repaired = repairGeographicRegionSlivers(topology, layers, overlay, initial);

    for (const merge of repaired.repair?.merges ?? []) {
      expect(parentByRegionId.get(merge.removedRegionId)).toBe(parentByRegionId.get(merge.retainedRegionId));
    }
  });
});

function twoLandmassLayers(topology: CubedSphereTopology): TopologyLayers {
  return geographyLayers(topology, (latitude, longitude) => (
    (Math.abs(latitude) < 42 && longitude > 45 && longitude < 135)
      || (Math.abs(latitude + 12) < 3 && Math.abs(longitude + 95) < 3)
  ));
}

function equatorialContinentLayers(topology: CubedSphereTopology): TopologyLayers {
  return geographyLayers(topology, (latitude, longitude) => (
    Math.abs(latitude) < 28 && Math.abs(longitude) < 44
  ));
}

function geographyLayers(
  topology: CubedSphereTopology,
  isLand: (latitude: number, longitude: number) => boolean,
): TopologyLayers {
  const layers = emptyLayers(topology.cellCount);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const latitude = topology.latitudes[cell] * 180 / Math.PI;
    const longitude = topology.longitudes[cell] * 180 / Math.PI;
    const land = isLand(latitude, longitude);
    layers.water[cell] = land ? 0 : 1;
    layers.elevation[cell] = land ? 0.3 : -0.35;
    layers.temperature[cell] = 22 - Math.abs(latitude) * 0.3;
    layers.wetness[cell] = land ? 0.55 : 0.9;
    layers.climateMoisture[cell] = layers.wetness[cell];
    layers.climatePrecipitation[cell] = layers.wetness[cell] * 0.8;
    layers.biomes[cell] = biomeToCode(land ? 'grassland' : 'ocean');
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
