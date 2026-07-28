import { describe, expect, it } from 'vitest';
import {
  biomeToCode,
  buildCubedSphereTopology,
  type TopologyLayers,
} from '@world-forge/shared';
import { deriveAdaptiveGeographicScale } from './geographicAdaptiveScale';
import { buildGeographicChildPartition, childMembershipMask } from './geographicChildPartition';

describe('geographic child partition', () => {
  it('covers all and only the parent with deterministic children', () => {
    const topology = buildCubedSphereTopology(12);
    const layers = syntheticLayers(topology.latitudes, topology.longitudes);
    const parentMembership = new Uint8Array(topology.cellCount);
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      const latitude = topology.latitudes[cell] * 180 / Math.PI;
      const longitude = topology.longitudes[cell] * 180 / Math.PI;
      if (latitude >= -55 && latitude <= 55 && longitude >= -120 && longitude <= 30) parentMembership[cell] = 1;
    }
    const parentScale = deriveAdaptiveGeographicScale(topology, 24881, parentMembership).scale;
    const options = {
      projectId: 'child-test-project',
      worldSeed: 'child-test-world',
      parentId: 'region-test',
      parentLevel: 'region' as const,
      childLevel: 'subregion' as const,
      parentMembership,
      parentScale,
      planetCircumferenceMiles: 24881,
      targetChildCount: 6,
    };

    const first = buildGeographicChildPartition(topology, layers, options);
    const second = buildGeographicChildPartition(topology, layers, options);

    expect(first.signature).toBe(second.signature);
    expect(first.children.map((child) => child.id)).toEqual(second.children.map((child) => child.id));
    expect(Array.from(first.membership.childIndexByTopologyCell)).toEqual(
      Array.from(second.membership.childIndexByTopologyCell),
    );
    expect(first.children).toHaveLength(6);
    expect(first.children.every((child) => child.parentId === 'region-test')).toBe(true);
    expect(first.children.every((child) => child.exactHexCount >= 0)).toBe(true);

    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      const childIndex = first.membership.childIndexByTopologyCell[cell];
      if (parentMembership[cell] === 1) expect(childIndex).toBeLessThan(first.children.length);
      else expect(childIndex).toBe(0xffff);
    }
  });

  it('retains disconnected island components inside the parent partition', () => {
    const topology = buildCubedSphereTopology(10);
    const layers = syntheticLayers(topology.latitudes, topology.longitudes);
    const parentMembership = new Uint8Array(topology.cellCount);
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      const latitude = topology.latitudes[cell] * 180 / Math.PI;
      const longitude = topology.longitudes[cell] * 180 / Math.PI;
      const westIsland = latitude >= -15 && latitude <= 20 && longitude >= -150 && longitude <= -120;
      const eastIsland = latitude >= 5 && latitude <= 35 && longitude >= 90 && longitude <= 125;
      if (westIsland || eastIsland) parentMembership[cell] = 1;
    }
    const parentScale = deriveAdaptiveGeographicScale(topology, 24881, parentMembership).scale;
    const partition = buildGeographicChildPartition(topology, layers, {
      projectId: 'archipelago-project',
      worldSeed: 'archipelago-world',
      parentId: 'archipelago-region',
      parentLevel: 'region',
      childLevel: 'subregion',
      parentMembership,
      parentScale,
      planetCircumferenceMiles: 24881,
      targetChildCount: 2,
    });

    expect(partition.children.length).toBeGreaterThanOrEqual(2);
    expect(partition.membership.childIndexByTopologyCell.some((value) => value !== 0xffff)).toBe(true);
  });

  it('uses the same deterministic engine through local and detail levels', () => {
    const topology = buildCubedSphereTopology(10);
    const layers = syntheticLayers(topology.latitudes, topology.longitudes);
    const regionMembership = new Uint8Array(topology.cellCount);
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      const latitude = topology.latitudes[cell] * 180 / Math.PI;
      const longitude = topology.longitudes[cell] * 180 / Math.PI;
      if (latitude >= -35 && latitude <= 45 && longitude >= -75 && longitude <= 45) regionMembership[cell] = 1;
    }
    const regionScale = deriveAdaptiveGeographicScale(topology, 24881, regionMembership).scale;
    const subregions = buildGeographicChildPartition(topology, layers, {
      projectId: 'deep-project',
      worldSeed: 'deep-world',
      parentId: 'region-deep',
      parentLevel: 'region',
      childLevel: 'subregion',
      parentMembership: regionMembership,
      parentScale: regionScale,
      planetCircumferenceMiles: 24881,
      targetChildCount: 3,
    });
    const subregionMembership = childMembershipMask(subregions, subregions.children[0].id);
    const locals = buildGeographicChildPartition(topology, layers, {
      projectId: 'deep-project',
      worldSeed: 'deep-world',
      parentId: subregions.children[0].id,
      parentLevel: 'subregion',
      childLevel: 'local',
      parentMembership: subregionMembership,
      parentScale: subregions.scale,
      planetCircumferenceMiles: 24881,
      targetChildCount: 2,
    });
    const localMembership = childMembershipMask(locals, locals.children[0].id);
    const details = buildGeographicChildPartition(topology, layers, {
      projectId: 'deep-project',
      worldSeed: 'deep-world',
      parentId: locals.children[0].id,
      parentLevel: 'local',
      childLevel: 'detail',
      parentMembership: localMembership,
      parentScale: locals.scale,
      planetCircumferenceMiles: 24881,
      targetChildCount: 2,
    });

    expect(subregions.hierarchyLevel).toBe('subregion');
    expect(locals.hierarchyLevel).toBe('local');
    expect(details.hierarchyLevel).toBe('detail');
    expect(locals.children.every((child) => child.parentId === subregions.children[0].id)).toBe(true);
    expect(details.children.every((child) => child.parentId === locals.children[0].id)).toBe(true);
    expect(countAssigned(details.membership.childIndexByTopologyCell)).toBe(countSelected(localMembership));
  });
});

function countAssigned(values: Uint16Array): number {
  let count = 0;
  for (const value of values) if (value !== 0xffff) count += 1;
  return count;
}

function countSelected(values: Uint8Array): number {
  let count = 0;
  for (const value of values) if (value === 1) count += 1;
  return count;
}

function syntheticLayers(latitudes: Float32Array, longitudes: Float32Array): TopologyLayers {
  const cellCount = latitudes.length;
  const layers: TopologyLayers = {
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
  for (let cell = 0; cell < cellCount; cell += 1) {
    const latitude = latitudes[cell] * 180 / Math.PI;
    const longitude = longitudes[cell] * 180 / Math.PI;
    const water = Math.abs(latitude) > 68;
    layers.water[cell] = water ? 1 : 0;
    layers.elevation[cell] = water ? -0.3 : 0.12 + Math.abs(Math.sin(longitude * Math.PI / 180)) * 0.22;
    layers.temperature[cell] = 24 - Math.abs(latitude) * 0.42;
    layers.wetness[cell] = longitude < 0 ? 0.72 : 0.38;
    layers.climateMoisture[cell] = layers.wetness[cell];
    layers.climatePrecipitation[cell] = layers.wetness[cell] * 0.8;
    layers.biomes[cell] = biomeToCode(water ? 'ocean' : longitude < 0 ? 'forest' : 'grassland');
    layers.plates[cell] = longitude < 0 ? 1 : 2;
    layers.river[cell] = !water && Math.abs(longitude + 45) < 5 ? 0.7 : 0;
  }
  return layers;
}
