import { describe, expect, it } from 'vitest';
import type { CubedSphereTopology } from '@world-forge/shared';
import type { GeographicHierarchyPartition } from '@world-forge/shared/geographicHierarchy';
import type { GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import { childIdAtGeographicCanvasPoint } from './useGeographicAtlasController';
import type { GeographicWindowTransform } from './geographicWindowedMap';

function partition(): GeographicHierarchyPartition {
  return {
    children: [
      { id: 'child-zero' },
      { id: 'child-one' },
    ],
    membership: {
      childIndexByTopologyCell: new Uint16Array([0, 0, 0, 0]),
    },
  } as unknown as GeographicHierarchyPartition;
}

function tile(overrides: Partial<GeographicTileWindowTile> = {}): GeographicTileWindowTile {
  return {
    id: 'test:q4:r5',
    q: 4,
    r: 5,
    longitude: 12,
    latitude: -8,
    topologyCell: 3,
    membershipRole: 'parent',
    childIndex: 1,
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
    elevation: 0,
    slope: 0,
    temperatureC: 18,
    wetness: 0.5,
    volcanism: 0,
    water: false,
    ice: false,
    ...overrides,
  };
}

function tileTransform(hit: GeographicTileWindowTile | null): GeographicWindowTransform {
  return {
    width: 800,
    height: 600,
    extent: {} as GeographicWindowTransform['extent'],
    scale: {} as GeographicWindowTransform['scale'],
    canvasPointToGeo: () => ({ latitude: 0, longitude: 0 }),
    geoToCanvasPoint: () => ({ x: 0, y: 0 }),
    tileAtCanvasPoint: () => hit,
  } as GeographicWindowTransform & {
    tileAtCanvasPoint: () => GeographicTileWindowTile | null;
  };
}

describe('geographic atlas selection', () => {
  it('uses the rendered tile child index instead of round-tripping through coarse topology', () => {
    expect(childIdAtGeographicCanvasPoint({
      topology: {} as CubedSphereTopology,
      transform: tileTransform(tile()),
      parentMembership: new Uint8Array([1, 1, 1, 1]),
      partition: partition(),
      x: 700,
      y: 520,
    })).toBe('child-one');
  });

  it('does not fall back to rectangular topology selection outside a rendered tile', () => {
    expect(childIdAtGeographicCanvasPoint({
      topology: {} as CubedSphereTopology,
      transform: tileTransform(null),
      parentMembership: new Uint8Array([1, 1, 1, 1]),
      partition: partition(),
      x: 12,
      y: 12,
    })).toBeNull();
  });

  it('rejects context-only rendered tiles', () => {
    expect(childIdAtGeographicCanvasPoint({
      topology: {} as CubedSphereTopology,
      transform: tileTransform(tile({ membershipRole: 'context' })),
      parentMembership: new Uint8Array([1, 1, 1, 1]),
      partition: partition(),
      x: 400,
      y: 300,
    })).toBeNull();
  });
});
