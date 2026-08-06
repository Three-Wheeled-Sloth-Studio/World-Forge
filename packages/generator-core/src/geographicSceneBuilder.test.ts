import { describe, expect, it, vi } from 'vitest';

import { validateGeographicScenePatchSeams } from '@world-forge/shared/geographicScene';
import { buildGeographicSceneFromTileWindow } from './geographicSceneBuilder';
import { createRepresentativeGeographicTileWindowFixture } from './geographicSceneFixture';

describe('geographic scene representative fixture', () => {
  it('builds deterministic seam-sharing terrain and separate water', () => {
    const tileWindow = createRepresentativeGeographicTileWindowFixture();
    const first = buildGeographicSceneFromTileWindow({
      tileWindow,
      hierarchyNodeId: 'fixture-continent',
      hierarchyLevel: 'macro',
      waterLevel: 0,
    });
    const second = buildGeographicSceneFromTileWindow({
      tileWindow,
      hierarchyNodeId: 'fixture-continent',
      hierarchyLevel: 'macro',
      waterLevel: 0,
    });

    expect(first.signature).toBe(second.signature);
    expect(first.terrainPatches).toHaveLength(4);
    expect(validateGeographicScenePatchSeams(first.terrainPatches)).toEqual([]);
    expect(first.waterSurfaces).toHaveLength(1);
    expect(first.waterSurfaces[0].triangleIndices.length).toBeGreaterThan(0);
    expect(first.rivers).toEqual([]);
    expect(first.boundaries).toEqual([]);
    expect(first.labels).toEqual([]);
    expect(first.hexOverlay.cells).toEqual([]);
  });

  it('preserves shared seam samples and useful relief', () => {
    const scene = buildGeographicSceneFromTileWindow({
      tileWindow: createRepresentativeGeographicTileWindowFixture(),
      hierarchyNodeId: 'fixture-continent',
      hierarchyLevel: 'macro',
      waterLevel: 0,
    });
    const elevations = scene.terrainPatches.flatMap((patch) =>
      patch.vertices.map((vertex) => vertex.position[2]),
    );
    const sharedSampleCounts = new Map<string, number>();
    for (const patch of scene.terrainPatches) {
      for (const vertex of patch.vertices) {
        sharedSampleCounts.set(
          vertex.sourceSampleId,
          (sharedSampleCounts.get(vertex.sourceSampleId) ?? 0) + 1,
        );
      }
    }

    expect(Math.min(...elevations)).toBeLessThan(0);
    expect(Math.max(...elevations)).toBeGreaterThan(5);
    expect([...sharedSampleCounts.values()].some((count) => count > 1)).toBe(true);
    expect(
      scene.waterSurfaces[0].vertices.every((vertex) => vertex.position[2] === 0),
    ).toBe(true);
  });

  it('reports progress and supports explicit cancellation', () => {
    const onProgress = vi.fn();
    buildGeographicSceneFromTileWindow({
      tileWindow: createRepresentativeGeographicTileWindowFixture(),
      hierarchyNodeId: 'fixture-continent',
      hierarchyLevel: 'macro',
      waterLevel: 0,
      options: { onProgress },
    });

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'finalize', ratio: 1 }),
    );
    try {
      buildGeographicSceneFromTileWindow({
        tileWindow: createRepresentativeGeographicTileWindowFixture(),
        hierarchyNodeId: 'fixture-continent',
        hierarchyLevel: 'macro',
        waterLevel: 0,
        options: { signal: { aborted: true, reason: 'superseded' } },
      });
      throw new Error('Expected geographic scene build cancellation.');
    } catch (reason) {
      expect(reason).toMatchObject({ name: 'AbortError', reason: 'superseded' });
    }
  });

  it('rejects incomplete tile windows instead of falling back', () => {
    const tileWindow = createRepresentativeGeographicTileWindowFixture();
    tileWindow.tiles.pop();

    expect(() =>
      buildGeographicSceneFromTileWindow({
        tileWindow,
        hierarchyNodeId: 'fixture-continent',
        hierarchyLevel: 'macro',
        waterLevel: 0,
      }),
    ).toThrow(/expected 63 tiles/i);
  });
});
