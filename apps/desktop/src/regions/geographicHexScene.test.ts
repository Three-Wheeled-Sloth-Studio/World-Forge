import { describe, expect, it } from 'vitest';
import { buildGeographicSceneFromTileWindow } from '@world-forge/generator-core/geographicSceneBuilder';
import { createRepresentativeGeographicTileWindowFixture } from '@world-forge/generator-core/geographicSceneFixture';
import {
  buildGeographicHexSceneBufferData,
  createGeographicHexSceneThreeObject,
} from './geographicHexScene';

function createFixture() {
  const source = createRepresentativeGeographicTileWindowFixture();
  const tileWindow = {
    ...source,
    tiles: source.tiles.map((tile) => ({
      ...tile,
      childIndex: tile.membershipRole === 'parent' ? (tile.q < 4 ? 0 : 1) : null,
    })),
  };
  const scene = buildGeographicSceneFromTileWindow({
    tileWindow,
    hierarchyNodeId: 'fixture-continent',
    hierarchyLevel: 'macro',
    waterLevel: 0,
  });
  return { scene, tileWindow };
}

describe('stepped geographic hex scene', () => {
  it('builds faceted tile tops, elevation walls, grid lines, and hierarchy boundaries', () => {
    const { scene, tileWindow } = createFixture();
    const data = buildGeographicHexSceneBufferData(scene, tileWindow, 'natural', {
      showHexes: true,
      selectedChildIndex: 1,
    });

    expect(data.positions.length).toBeGreaterThan(tileWindow.tiles.length * 7 * 3);
    expect(data.indices.length).toBeGreaterThan(tileWindow.tiles.length * 6 * 3);
    expect(data.sourceSampleIds).toHaveLength(data.positions.length / 3);
    expect(data.geographicPoints).toHaveLength(data.positions.length / 3);
    expect(data.hexLinePositions.length).toBeGreaterThan(0);
    expect(data.childBoundaryPositions.length).toBeGreaterThan(0);
    expect(data.selectedBoundaryPositions.length).toBeGreaterThan(0);
    expect(data.parentBoundaryPositions.length).toBeGreaterThan(0);
  });

  it('creates a single pickable terrain mesh with separate overlay layers', () => {
    const { scene, tileWindow } = createFixture();
    const object = createGeographicHexSceneThreeObject(scene, tileWindow, 'natural', {
      showHexes: true,
      selectedChildIndex: null,
    });

    expect(object.getObjectByName('hex-terrain')).toBeTruthy();
    expect(object.getObjectByName('hex-grid')).toBeTruthy();
    expect(object.getObjectByName('child-boundaries')).toBeTruthy();
    expect(object.getObjectByName('parent-boundary')).toBeTruthy();
  });

  it('keeps geometry identical between natural and elevation presentations', () => {
    const { scene, tileWindow } = createFixture();
    const natural = buildGeographicHexSceneBufferData(scene, tileWindow, 'natural', {
      showHexes: true,
      selectedChildIndex: null,
    });
    const elevation = buildGeographicHexSceneBufferData(scene, tileWindow, 'elevation', {
      showHexes: true,
      selectedChildIndex: null,
    });

    expect([...natural.positions]).toEqual([...elevation.positions]);
    expect([...natural.indices]).toEqual([...elevation.indices]);
    expect([...natural.colors]).not.toEqual([...elevation.colors]);
  });
});
