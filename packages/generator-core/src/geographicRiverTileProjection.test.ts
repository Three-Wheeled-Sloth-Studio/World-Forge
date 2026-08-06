import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import { deriveAdaptiveGeographicScale } from './geographicAdaptiveScale';
import { generateProject } from './index';
import {
  estimatedRiverWidthMiles,
  geographicPathTileCoordinates,
} from './geographicRiverTileProjection';
import { generateGeographicTileWindow } from './geographicTileWindow';

function testProject(seed: string) {
  return generateProject({
    seed,
    topologyResolution: 8,
    outputResolution: { width: 320, height: 160 },
  });
}

describe('geographic river tile projection', () => {
  it('projects authoritative paths without turning a sampled river field into a tile-wide network', () => {
    const project = testProject('tile-window-authoritative-rivers');
    const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
    const river = project.primaryWorld.rivers.find((entry) => (entry.topologyPath?.length ?? 0) >= 2);
    expect(river).toBeDefined();
    const membership = new Uint8Array(topology.cellCount);
    for (const cell of river?.topologyPath ?? []) {
      membership[cell] = 1;
      for (let offset = 0; offset < 4; offset += 1) {
        const neighbor = topology.neighbors[cell * 4 + offset];
        if (neighbor >= 0) membership[neighbor] = 1;
      }
    }
    const scaleResult = deriveAdaptiveGeographicScale(topology, 24881, membership);
    const projected = generateGeographicTileWindow({
      project,
      topology,
      scale: scaleResult.scale,
      extent: scaleResult.extent,
      parentMembership: membership,
    });
    const projectedEdgeCount = projected.tiles.reduce(
      (total, tile) => total + tile.minorRiverEdges.length + tile.navigableRiverEdges.length,
      0,
    );
    const minorEdgeCount = projected.tiles.reduce((total, tile) => total + tile.minorRiverEdges.length, 0);
    expect(projectedEdgeCount).toBeGreaterThan(0);
    expect(projectedEdgeCount).toBeLessThan(projected.tiles.length * 3);
    expect(minorEdgeCount).toBeGreaterThan(0);
    expect(projected.tiles.some((tile) => tile.riverSource || tile.riverMouthEdges.length > 0)).toBe(true);

    project.primaryWorld.rivers = [];
    project.primaryWorld.topologyLayers.river.fill(1);
    const scalarOnly = generateGeographicTileWindow({
      project,
      topology,
      scale: scaleResult.scale,
      extent: scaleResult.extent,
      parentMembership: membership,
    });
    expect(scalarOnly.tiles.every((tile) => (
      tile.minorRiverEdges.length === 0
      && tile.navigableRiverEdges.length === 0
      && tile.riverMouthEdges.length === 0
      && !tile.riverSource
    ))).toBe(true);
  });

  it('takes the short route across the longitude seam', () => {
    const route = geographicPathTileCoordinates([
      { latitude: 5, longitude: 179 },
      { latitude: 5, longitude: -179 },
    ], { worldColumns: 360, worldRows: 180 });

    expect(route.length).toBeGreaterThan(1);
    expect(route.length).toBeLessThan(8);
    expect(route.some((coordinate) => coordinate.q === 0)).toBe(true);
    expect(route.some((coordinate) => coordinate.q >= 358)).toBe(true);
  });

  it('uses a monotonic bounded physical-width estimate for scale-aware river presentation', () => {
    expect(estimatedRiverWidthMiles(0)).toBeGreaterThan(0);
    expect(estimatedRiverWidthMiles(0.45)).toBeGreaterThan(estimatedRiverWidthMiles(0.2));
    expect(estimatedRiverWidthMiles(0.8)).toBeGreaterThan(estimatedRiverWidthMiles(0.45));
    expect(estimatedRiverWidthMiles(1)).toBeGreaterThan(2.5);
    expect(estimatedRiverWidthMiles(1)).toBeLessThan(3);
  });

  it('does not convert a river into water terrain unless its estimated width exceeds the active hex', () => {
    const project = testProject('tile-window-river-dominance');
    const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
    const membership = new Uint8Array(topology.cellCount).fill(1);
    const scaleResult = deriveAdaptiveGeographicScale(topology, 24881, membership);
    const projected = generateGeographicTileWindow({
      project,
      topology,
      scale: scaleResult.scale,
      extent: scaleResult.extent,
      parentMembership: membership,
    });

    expect(scaleResult.scale.nominalHexWidthMiles).toBeGreaterThan(estimatedRiverWidthMiles(1));
    expect(projected.tiles.every((tile) => !tile.navigableRiverCenter)).toBe(true);
  });
});
