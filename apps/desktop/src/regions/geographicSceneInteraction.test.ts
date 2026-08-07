import { describe, expect, it } from 'vitest';

import { buildGeographicSceneFromTileWindow } from '@world-forge/generator-core/geographicSceneBuilder';
import { createRepresentativeGeographicTileWindowFixture } from '@world-forge/generator-core/geographicSceneFixture';
import {
  GEOGRAPHIC_SCENE_MAX_AZIMUTH_DEG,
  GEOGRAPHIC_SCENE_MAX_ZOOM,
  GEOGRAPHIC_SCENE_MIN_PITCH_DEG,
  createGeographicSceneCameraState,
  geographicPointForScenePosition,
  panGeographicSceneCameraState,
  rotateGeographicSceneCameraState,
  toggleGeographicScenePitch,
  zoomGeographicSceneCameraState,
} from './geographicSceneInteraction';

function createScene() {
  return buildGeographicSceneFromTileWindow({
    tileWindow: createRepresentativeGeographicTileWindowFixture(),
    hierarchyNodeId: 'fixture-continent',
    hierarchyLevel: 'macro',
    waterLevel: 0,
  });
}

describe('geographic scene camera model', () => {
  it('starts north-up and supports continuous bounded zoom', () => {
    const scene = createScene();
    let camera = createGeographicSceneCameraState(scene);

    expect(camera.azimuthDeg).toBe(0);
    expect(camera.zoom).toBe(1);
    for (let index = 0; index < 20; index += 1) {
      camera = zoomGeographicSceneCameraState(scene, camera, 1.4);
    }
    expect(camera.zoom).toBe(GEOGRAPHIC_SCENE_MAX_ZOOM);
  });

  it('pans in map-relative axes and keeps focus within a bounded overscroll margin', () => {
    const scene = createScene();
    const initial = createGeographicSceneCameraState(scene);
    const panned = panGeographicSceneCameraState(scene, initial, 50, -25, 600, 16 / 9);

    expect(panned.focus[0]).toBeLessThan(initial.focus[0]);
    expect(panned.focus[1]).toBeLessThan(initial.focus[1]);

    const clamped = panGeographicSceneCameraState(scene, panned, 1_000_000, 1_000_000, 600, 16 / 9);
    const spanX = scene.extent.max[0] - scene.extent.min[0];
    const spanY = scene.extent.max[1] - scene.extent.min[1];
    expect(clamped.focus[0]).toBeGreaterThanOrEqual(scene.extent.min[0] - spanX * 0.35 - 0.001);
    expect(clamped.focus[1]).toBeLessThanOrEqual(scene.extent.max[1] + spanY * 0.35 + 0.001);
  });

  it('limits rotation and toggles between shallow and near-top-down pitch', () => {
    const scene = createScene();
    const initial = createGeographicSceneCameraState(scene);
    const rotated = rotateGeographicSceneCameraState(initial, 500, 500);

    expect(rotated.azimuthDeg).toBe(GEOGRAPHIC_SCENE_MAX_AZIMUTH_DEG);
    expect(rotated.pitchDeg).toBeGreaterThan(initial.pitchDeg);
    expect(toggleGeographicScenePitch(initial).pitchDeg).toBe(GEOGRAPHIC_SCENE_MIN_PITCH_DEG);
  });

  it('maps scene corners back to authoritative geographic bounds', () => {
    const scene = createScene();
    const northWest = geographicPointForScenePosition(scene, [scene.extent.min[0], scene.extent.max[1]]);
    const southEast = geographicPointForScenePosition(scene, [scene.extent.max[0], scene.extent.min[1]]);

    expect(northWest[0]).toBeCloseTo(scene.extent.geographicNorthWest[0], 5);
    expect(northWest[1]).toBeCloseTo(scene.extent.geographicNorthWest[1], 5);
    expect(southEast[0]).toBeCloseTo(scene.extent.geographicSouthEast[0], 5);
    expect(southEast[1]).toBeCloseTo(scene.extent.geographicSouthEast[1], 5);
  });
});
