import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import { deriveAdaptiveGeographicScale } from './geographicAdaptiveScale';
import { generateProject } from './index';
import { geographicPathTileCoordinates } from './geographicRiverTileProjection';
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
    expect(projectedEdgeCount).toBeGreaterThan(0);

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
      tile.minorRiverEdges.length === 0 && tile.navigableRiverEdges.length === 0
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
});
