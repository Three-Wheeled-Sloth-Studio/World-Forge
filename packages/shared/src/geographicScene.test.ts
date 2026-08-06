import { describe, expect, it, vi } from 'vitest';

import {
  GEOGRAPHIC_SCENE_MODEL_VERSION,
  GeographicSceneBuildCancelledError,
  type GeographicSceneDraft,
  type GeographicSceneTerrainPatch,
  createGeographicSceneSeamKey,
  createGeographicSceneSignature,
  finalizeGeographicScene,
  reportGeographicSceneBuildProgress,
  throwIfGeographicSceneBuildCancelled,
  validateGeographicScenePatchSeams,
} from './geographicScene';

function createPatch(
  id: string,
  seams: GeographicSceneTerrainPatch['seams'],
): GeographicSceneTerrainPatch {
  return {
    id,
    levelOfDetail: 0,
    bounds: {
      min: [0, 0],
      max: [1, 1],
      geographicNorthWest: [-1, 1],
      geographicSouthEast: [1, -1],
    },
    vertices: [],
    triangleIndices: [],
    seams,
    sourceTileIds: [],
  };
}

function createSceneDraft(): GeographicSceneDraft {
  return {
    modelVersion: GEOGRAPHIC_SCENE_MODEL_VERSION,
    source: {
      worldId: 'world-1',
      seed: 'seed-1',
      hierarchyNodeId: 'region-1',
      hierarchyLevel: 'region',
      tileWindowId: 'window-1',
      tileWindowSignature: 'tile-window-v1:abc',
      replayVersion: 'world-forge-v1',
    },
    projection: {
      kind: 'local-tangent-plane',
      origin: [10, 20],
      metersPerUnit: 1,
      wrapsAntimeridian: false,
    },
    extent: {
      min: [0, 0],
      max: [100, 100],
      geographicNorthWest: [9, 21],
      geographicSouthEast: [11, 19],
    },
    materials: [],
    terrainPatches: [],
    waterSurfaces: [],
    rivers: [],
    boundaries: [],
    hexOverlay: {
      scaleId: null,
      semanticScale: null,
      cells: [],
    },
    labels: [],
    selection: {
      selectedFeatureId: null,
      selectedFeatureType: null,
      highlightedFeatureIds: [],
    },
    context: {
      parentHierarchyNodeId: null,
      siblingHierarchyNodeIds: [],
      neighboringPatchIds: [],
      focus: [50, 50, 0],
      recommendedCameraDistance: 150,
      reliefExaggeration: 1,
    },
    diagnostics: {
      terrainPatchCount: 0,
      terrainVertexCount: 0,
      terrainTriangleCount: 0,
      waterSurfaceCount: 0,
      riverCount: 0,
      boundaryCount: 0,
      hexCellCount: 0,
      labelCount: 0,
      unresolvedRiverIds: [],
      warnings: [],
    },
  };
}

describe('geographic scene signatures', () => {
  it('is stable across object key insertion order', () => {
    const first = createGeographicSceneSignature({
      beta: { second: 2, first: 1 },
      alpha: ['a', 'b'],
    });
    const second = createGeographicSceneSignature({
      alpha: ['a', 'b'],
      beta: { first: 1, second: 2 },
    });

    expect(first).toBe(second);
  });

  it('ignores an existing root signature but reacts to scene changes', () => {
    const draft = createSceneDraft();
    const scene = finalizeGeographicScene(draft);
    const copiedSignature = createGeographicSceneSignature({
      ...scene,
      signature: 'stale-signature',
    });
    const changedSignature = createGeographicSceneSignature({
      ...draft,
      context: {
        ...draft.context,
        reliefExaggeration: 1.5,
      },
    });

    expect(copiedSignature).toBe(scene.signature);
    expect(changedSignature).not.toBe(scene.signature);
  });
});

describe('geographic scene patch seams', () => {
  it('creates the same seam key from either side', () => {
    expect(createGeographicSceneSeamKey('a', 'east', 'b', 'west')).toBe(
      createGeographicSceneSeamKey('b', 'west', 'a', 'east'),
    );
  });

  it('accepts reciprocal shared-sample seams', () => {
    const patches = [
      createPatch('a', [
        {
          edge: 'east',
          neighborPatchId: 'b',
          neighborEdge: 'west',
          sampleIds: ['s1', 's2', 's3'],
          orientation: 'same-order',
          stitchMode: 'shared-samples',
        },
      ]),
      createPatch('b', [
        {
          edge: 'west',
          neighborPatchId: 'a',
          neighborEdge: 'east',
          sampleIds: ['s1', 's2', 's3'],
          orientation: 'same-order',
          stitchMode: 'shared-samples',
        },
      ]),
    ];

    expect(validateGeographicScenePatchSeams(patches)).toEqual([]);
  });

  it('supports reverse-order reciprocal samples', () => {
    const patches = [
      createPatch('a', [
        {
          edge: 'east',
          neighborPatchId: 'b',
          neighborEdge: 'west',
          sampleIds: ['s1', 's2', 's3'],
          orientation: 'reverse-order',
          stitchMode: 'shared-samples',
        },
      ]),
      createPatch('b', [
        {
          edge: 'west',
          neighborPatchId: 'a',
          neighborEdge: 'east',
          sampleIds: ['s3', 's2', 's1'],
          orientation: 'reverse-order',
          stitchMode: 'shared-samples',
        },
      ]),
    ];

    expect(validateGeographicScenePatchSeams(patches)).toEqual([]);
  });

  it('reports missing reciprocal seams and sample mismatches deterministically', () => {
    const patches = [
      createPatch('a', [
        {
          edge: 'east',
          neighborPatchId: 'b',
          neighborEdge: 'west',
          sampleIds: ['a1', 'a2'],
          orientation: 'same-order',
          stitchMode: 'shared-samples',
        },
        {
          edge: 'north',
          neighborPatchId: 'c',
          neighborEdge: 'south',
          sampleIds: ['n1'],
          orientation: 'same-order',
          stitchMode: 'shared-samples',
        },
      ]),
      createPatch('b', [
        {
          edge: 'west',
          neighborPatchId: 'a',
          neighborEdge: 'east',
          sampleIds: ['b1', 'b2'],
          orientation: 'same-order',
          stitchMode: 'shared-samples',
        },
      ]),
      createPatch('c', []),
    ];

    expect(validateGeographicScenePatchSeams(patches).map((issue) => issue.code)).toEqual([
      'sample-mismatch',
      'missing-reciprocal-seam',
    ]);
  });
});

describe('geographic scene build controls', () => {
  it('throws an AbortError-compatible cancellation error', () => {
    expect(() =>
      throwIfGeographicSceneBuildCancelled({ aborted: true, reason: 'superseded' }),
    ).toThrow(GeographicSceneBuildCancelledError);

    try {
      throwIfGeographicSceneBuildCancelled({ aborted: true, reason: 'superseded' });
    } catch (error) {
      expect(error).toMatchObject({ name: 'AbortError', reason: 'superseded' });
    }
  });

  it('normalizes progress before reporting it', () => {
    const onProgress = vi.fn();

    reportGeographicSceneBuildProgress({ onProgress }, 'terrain', 12, 10, 'meshing');

    expect(onProgress).toHaveBeenCalledWith({
      phase: 'terrain',
      completed: 10,
      total: 10,
      ratio: 1,
      message: 'meshing',
    });
  });
});
