import { describe, expect, it } from 'vitest';
import type { GeographicAdaptiveHexScale, GeographicHierarchyMapExtent } from '@world-forge/shared/geographicHierarchy';
import type { GeographicTileWindow, GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import { worldHexCenter } from '@world-forge/generator-core/geographicAdaptiveScale';
import {
  atlasRiverWidthFraction,
  createGeographicTileWindowCanvasTransform,
  riverBoundaryRouteVertexIndices,
} from './geographicTileWindowMap';

const scale: GeographicAdaptiveHexScale = {
  modelVersion: 'adaptive-world-hex-scale-v1',
  id: 'test-60mi',
  nominalHexWidthMiles: 60,
  verticalSpacingMiles: 51.9615,
  worldColumns: 12,
  worldRows: 6,
  targetViewportColumns: 20,
  targetViewportRows: 20,
  minimumViewportColumns: 10,
  minimumViewportRows: 10,
  maximumViewportColumns: 50,
  maximumViewportRows: 50,
  exactParentHexCount: 4,
  contextualHexCount: 4,
  origin: 'world-equirectangular-pointy-odd-r',
  idFormat: 'test-60mi:q{q}:r{r}',
};

const extent: GeographicHierarchyMapExtent = {
  minLatitude: 15,
  maxLatitude: 75,
  minLongitude: -120,
  maxLongitude: -30,
  wrapsLongitude: false,
  qMin: 2,
  qMax: 3,
  rMin: 1,
  rMax: 2,
  columns: 2,
  rows: 2,
  contextPaddingHexes: 0,
  selectedMembershipFitsMaximum: true,
};

function tile(q: number, r: number, topologyCell: number): GeographicTileWindowTile {
  const center = worldHexCenter(q, r, scale.worldColumns, scale.worldRows);
  return {
    id: `${scale.id}:q${q}:r${r}`,
    q,
    r,
    longitude: center.longitude,
    latitude: center.latitude,
    topologyCell,
    membershipRole: 'parent',
    childIndex: topologyCell,
    plateId: 0,
    biome: 'grassland',
    morphology: 'flat',
    terrainType: 'Grassland',
    features: [],
    featureDetails: [],
    minorRiverEdges: [],
    navigableRiverEdges: [],
    ridgeEdges: [],
    navigableRiverCenter: false,
    riverStrength: 0,
    elevation: 0.2,
    slope: 0,
    temperatureC: 18,
    wetness: 0.5,
    volcanism: 0,
    water: false,
    ice: false,
  };
}

function tileWindow(): GeographicTileWindow {
  return {
    modelVersion: 'geographic-tile-window-v1',
    classifierVersion: 'geographic-tile-classifier-v1',
    sourceProjectId: 'test-project',
    sourceWorldId: 'test-world',
    worldSeed: 'test-seed',
    sourceTopologyKind: 'cubed-sphere',
    sourceTopologyResolution: 8,
    scale,
    extent,
    dimensions: {
      columns: 2,
      rows: 2,
      orientation: 'pointy-top-odd-r',
      wrapsLongitude: false,
    },
    tiles: [
      tile(2, 1, 10),
      tile(3, 1, 11),
      tile(2, 2, 12),
      tile(3, 2, 13),
    ],
    signature: 'test-signature',
  };
}

describe('geographic tile-window canvas transform', () => {
  it('hit-tests the rendered pointy-hex geometry instead of a rectangular geographic approximation', () => {
    const window = tileWindow();
    const transform = createGeographicTileWindowCanvasTransform(window, 840, 560);

    for (const expected of window.tiles) {
      const center = transform.geoToCanvasPoint(expected.latitude, expected.longitude);
      expect(transform.tileAtCanvasPoint(center.x, center.y)?.id).toBe(expected.id);
      expect(transform.tileAtCanvasPoint(center.x, center.y)?.childIndex).toBe(expected.childIndex);
      expect(transform.canvasPointToGeo(center.x, center.y)).toEqual({
        latitude: expected.latitude,
        longitude: expected.longitude,
      });
    }
  });

  it('keeps the odd-row horizontal offset inside the same rendered tile', () => {
    const window = tileWindow();
    const transform = createGeographicTileWindowCanvasTransform(window, 840, 560);
    const oddRowTile = window.tiles.find((entry) => entry.q === 3 && entry.r === 1)!;
    const center = transform.geoToCanvasPoint(oddRowTile.latitude, oddRowTile.longitude);

    expect(transform.tileAtCanvasPoint(center.x + 24, center.y)?.id).toBe(oddRowTile.id);
    expect(transform.tileAtCanvasPoint(center.x - 24, center.y)?.id).toBe(oddRowTile.id);
  });
});

describe('geographic tile-window river presentation', () => {
  it('routes ordinary channels around the hex perimeter rather than through the center', () => {
    expect(riverBoundaryRouteVertexIndices('ne', 'se', true)).toEqual([1, 2]);
    expect(riverBoundaryRouteVertexIndices('ne', 'sw', true)).toEqual([1, 2, 3]);
    expect(riverBoundaryRouteVertexIndices('ne', 'sw', false)).toEqual([0, 5, 4]);
  });

  it('makes the same river occupy more of a finer hex', () => {
    const regional = atlasRiverWidthFraction(0.8, 60, true);
    const local = atlasRiverWidthFraction(0.8, 12, true);
    const detail = atlasRiverWidthFraction(0.8, 6, true);

    expect(local).toBeGreaterThan(regional);
    expect(detail).toBeGreaterThan(local);
    expect(local).toBeLessThan(0.72);
    expect(detail).toBeGreaterThan(0.72);
  });

  it('keeps minor tributaries visually subordinate to major channels', () => {
    expect(atlasRiverWidthFraction(0.65, 12, false)).toBeLessThan(
      atlasRiverWidthFraction(0.65, 12, true),
    );
  });
});
