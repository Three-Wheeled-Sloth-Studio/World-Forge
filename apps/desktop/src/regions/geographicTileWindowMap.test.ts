import { describe, expect, it } from 'vitest';
import type { GeographicAdaptiveHexScale, GeographicHierarchyMapExtent } from '@world-forge/shared/geographicHierarchy';
import type { GeographicTileWindow, GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import { worldHexCenter } from '@world-forge/generator-core/geographicAdaptiveScale';
import {
  atlasRiverDisplayWidthFraction,
  createGeographicTileWindowCanvasTransform,
  riverBoundaryRouteVertexIndices,
  visibleGeographicAtlasTileIds,
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

function tile(
  q: number,
  r: number,
  topologyCell: number,
  membershipRole: GeographicTileWindowTile['membershipRole'] = 'parent',
): GeographicTileWindowTile {
  const center = worldHexCenter(q, r, scale.worldColumns, scale.worldRows);
  return {
    id: `${scale.id}:q${q}:r${r}`,
    q,
    r,
    longitude: center.longitude,
    latitude: center.latitude,
    topologyCell,
    membershipRole,
    childIndex: membershipRole === 'parent' ? topologyCell : null,
    plateId: 0,
    biome: 'grassland',
    morphology: 'flat',
    terrainType: 'Grassland',
    features: [],
    featureDetails: [],
    minorRiverEdges: [],
    navigableRiverEdges: [],
    riverMouthEdges: [],
    ridgeEdges: [],
    navigableRiverCenter: false,
    riverSource: false,
    riverTerminus: null,
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

  it('keeps a connected coastal halo instead of rendering the full rectangular context field', () => {
    const haloExtent: GeographicHierarchyMapExtent = {
      ...extent,
      qMin: 1,
      qMax: 5,
      rMin: 0,
      rMax: 4,
      columns: 5,
      rows: 5,
      contextPaddingHexes: 1,
    };
    const tiles: GeographicTileWindowTile[] = [];
    let topologyCell = 0;
    for (let r = haloExtent.rMin; r <= haloExtent.rMax; r += 1) {
      for (let q = haloExtent.qMin; q <= haloExtent.qMax; q += 1) {
        tiles.push(tile(q, r, topologyCell, q === 3 && r === 2 ? 'parent' : 'context'));
        topologyCell += 1;
      }
    }
    const window: GeographicTileWindow = {
      ...tileWindow(),
      extent: haloExtent,
      dimensions: { ...tileWindow().dimensions, columns: 5, rows: 5 },
      tiles,
    };
    const visible = visibleGeographicAtlasTileIds(window);

    expect(visible.size).toBe(7);
    expect(visible.has(`${scale.id}:q3:r2`)).toBe(true);
    expect(visible.has(`${scale.id}:q1:r0`)).toBe(false);
    expect(visible.has(`${scale.id}:q5:r4`)).toBe(false);
  });
});

describe('geographic tile-window river presentation', () => {
  it('routes ordinary channels around the hex perimeter rather than through the center', () => {
    expect(riverBoundaryRouteVertexIndices('ne', 'se', true)).toEqual([1, 2]);
    expect(riverBoundaryRouteVertexIndices('ne', 'sw', true)).toEqual([1, 2, 3]);
    expect(riverBoundaryRouteVertexIndices('ne', 'sw', false)).toEqual([0, 5, 4]);
  });

  it('makes the same river occupy more of a finer hex without filling a subhex channel', () => {
    const regional = atlasRiverDisplayWidthFraction(0.8, 60, true);
    const local = atlasRiverDisplayWidthFraction(0.8, 12, true);
    const detail = atlasRiverDisplayWidthFraction(0.8, 6, true);

    expect(local).toBeGreaterThan(regional);
    expect(detail).toBeGreaterThan(local);
    expect(detail).toBeLessThanOrEqual(0.65);
    expect(atlasRiverDisplayWidthFraction(1, 10, true)).toBe(0.65);
  });

  it('reserves full-width treatment for a channel physically wider than the active hex', () => {
    expect(atlasRiverDisplayWidthFraction(1, 3, true)).toBeLessThan(1);
    expect(atlasRiverDisplayWidthFraction(1, 2, true)).toBe(1);
  });

  it('keeps minor tributaries visually subordinate to major channels without changing hue', () => {
    expect(atlasRiverDisplayWidthFraction(0.65, 12, false)).toBeLessThan(
      atlasRiverDisplayWidthFraction(0.65, 12, true),
    );
  });
});
