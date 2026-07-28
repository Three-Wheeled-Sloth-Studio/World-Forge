import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import type { GeographicHierarchyMapExtent } from '@world-forge/shared/geographicHierarchy';
import { generateProject } from './index';
import { deriveAdaptiveGeographicScale } from './geographicAdaptiveScale';
import { generateGeographicTileWindow } from './geographicTileWindow';

function testProject(seed: string) {
  return generateProject({
    seed,
    topologyResolution: 8,
    outputResolution: { width: 320, height: 160 },
  });
}

function membershipForBounds(
  latitudes: Float32Array,
  longitudes: Float32Array,
  predicate: (latitude: number, longitude: number) => boolean,
): Uint8Array {
  const membership = new Uint8Array(latitudes.length);
  for (let cell = 0; cell < membership.length; cell += 1) {
    const latitude = latitudes[cell] * 180 / Math.PI;
    const longitude = longitudes[cell] * 180 / Math.PI;
    if (predicate(latitude, longitude)) membership[cell] = 1;
  }
  return membership;
}

describe('geographic tile windows', () => {
  it('produces deterministic world-relative tiles and explicit context roles', () => {
    const project = testProject('tile-window-determinism');
    const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
    const membership = membershipForBounds(
      topology.latitudes,
      topology.longitudes,
      (latitude, longitude) => latitude >= -35 && latitude <= 45 && longitude >= -80 && longitude <= 35,
    );
    const scaleResult = deriveAdaptiveGeographicScale(topology, 24881, membership);
    const first = generateGeographicTileWindow({
      project,
      topology,
      scale: scaleResult.scale,
      extent: scaleResult.extent,
      parentMembership: membership,
    });
    const second = generateGeographicTileWindow({
      project,
      topology,
      scale: scaleResult.scale,
      extent: scaleResult.extent,
      parentMembership: membership,
    });

    expect(first.signature).toBe(second.signature);
    expect(first.tiles).toEqual(second.tiles);
    expect(first.tiles).toHaveLength(scaleResult.extent.columns * scaleResult.extent.rows);
    expect(new Set(first.tiles.map((tile) => tile.id)).size).toBe(first.tiles.length);
    expect(first.tiles.some((tile) => tile.membershipRole === 'parent')).toBe(true);
    expect(first.tiles.some((tile) => tile.membershipRole === 'context')).toBe(true);
    expect(first.tiles.every((tile) => tile.id.includes(scaleResult.scale.id))).toBe(true);
  });

  it('keeps overlapping tile facts stable across adjacent windows', () => {
    const project = testProject('tile-window-overlap');
    const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
    const membership = membershipForBounds(
      topology.latitudes,
      topology.longitudes,
      (latitude, longitude) => latitude >= -45 && latitude <= 55 && longitude >= -115 && longitude <= 55,
    );
    const scaleResult = deriveAdaptiveGeographicScale(topology, 24881, membership);
    const left = generateGeographicTileWindow({
      project,
      topology,
      scale: scaleResult.scale,
      extent: scaleResult.extent,
      parentMembership: membership,
    });
    const shiftedExtent: GeographicHierarchyMapExtent = {
      ...scaleResult.extent,
      qMin: (scaleResult.extent.qMin + 1) % scaleResult.scale.worldColumns,
      qMax: (scaleResult.extent.qMax + 1) % scaleResult.scale.worldColumns,
    };
    const right = generateGeographicTileWindow({
      project,
      topology,
      scale: scaleResult.scale,
      extent: shiftedExtent,
      parentMembership: membership,
    });
    const rightById = new Map(right.tiles.map((tile) => [tile.id, tile]));
    const overlap = left.tiles.filter((tile) => rightById.has(tile.id));

    expect(overlap.length).toBeGreaterThan(0);
    for (const tile of overlap) expect(rightById.get(tile.id)).toEqual(tile);
  });

  it('retains compact world coordinates for a longitude-seam window', () => {
    const project = testProject('tile-window-seam');
    const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
    const membership = membershipForBounds(
      topology.latitudes,
      topology.longitudes,
      (latitude, longitude) => Math.abs(latitude) <= 42 && Math.abs(longitude) >= 150,
    );
    const scaleResult = deriveAdaptiveGeographicScale(topology, 24881, membership);
    const window = generateGeographicTileWindow({
      project,
      topology,
      scale: scaleResult.scale,
      extent: scaleResult.extent,
      parentMembership: membership,
    });

    expect(scaleResult.extent.wrapsLongitude).toBe(true);
    expect(window.dimensions.columns).toBeLessThan(scaleResult.scale.worldColumns / 2);
    expect(window.tiles.some((tile) => tile.q === 0)).toBe(true);
    expect(window.tiles.some((tile) => tile.q >= scaleResult.scale.worldColumns - 2)).toBe(true);
  });
});
