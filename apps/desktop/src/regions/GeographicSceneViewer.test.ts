import { describe, expect, it } from 'vitest';

import { buildGeographicSceneFromTileWindow } from '@world-forge/generator-core/geographicSceneBuilder';
import { createRepresentativeGeographicTileWindowFixture } from '@world-forge/generator-core/geographicSceneFixture';
import {
  buildGeographicSceneTerrainBufferData,
  createGeographicSceneThreeObject,
  disposeGeographicSceneThreeObject,
} from './GeographicSceneViewer';

function createScene() {
  return buildGeographicSceneFromTileWindow({
    tileWindow: createRepresentativeGeographicTileWindowFixture(),
    hierarchyNodeId: 'fixture-continent',
    hierarchyLevel: 'macro',
    waterLevel: 0,
  });
}

describe('geographic scene Three.js adapter', () => {
  it('uses identical terrain geometry for Natural and Elevation views', () => {
    const scene = createScene();
    const natural = buildGeographicSceneTerrainBufferData(scene, 'natural');
    const elevation = buildGeographicSceneTerrainBufferData(scene, 'elevation');

    expect(natural.map((patch) => patch.patchId)).toEqual(
      elevation.map((patch) => patch.patchId),
    );
    for (let index = 0; index < natural.length; index += 1) {
      expect([...natural[index].positions]).toEqual([...elevation[index].positions]);
      expect([...natural[index].indices]).toEqual([...elevation[index].indices]);
    }
    expect(natural.some((patch, index) =>
      [...patch.colors].some((value, colorIndex) => value !== elevation[index].colors[colorIndex]),
    )).toBe(true);
  });

  it('creates terrain patches and a separate water object', () => {
    const scene = createScene();
    const object = createGeographicSceneThreeObject(scene, 'natural');

    expect(object.children.filter((child) => child.name.startsWith('terrain-'))).toHaveLength(4);
    expect(object.children.some((child) => child.name === 'water-surface')).toBe(true);

    disposeGeographicSceneThreeObject(object);
  });
});
