import type {
  GeographicScene,
  GeographicSceneGeographicPoint,
  GeographicScenePoint2,
} from '@world-forge/shared/geographicScene';

export const GEOGRAPHIC_SCENE_MIN_ZOOM = 0.65;
export const GEOGRAPHIC_SCENE_MAX_ZOOM = 20;
export const GEOGRAPHIC_SCENE_MIN_PITCH_DEG = 6;
export const GEOGRAPHIC_SCENE_MAX_PITCH_DEG = 50;
export const GEOGRAPHIC_SCENE_MAX_AZIMUTH_DEG = 30;

export type GeographicSceneCameraState = {
  readonly focus: GeographicScenePoint2;
  readonly zoom: number;
  readonly azimuthDeg: number;
  readonly pitchDeg: number;
};

export type GeographicSceneCameraFootprint = {
  readonly corners: readonly GeographicSceneGeographicPoint[];
};

export type GeographicSceneViewMetrics = {
  readonly span: number;
  readonly halfHeight: number;
  readonly halfWidth: number;
  readonly worldUnitsPerPixelY: number;
};

export function createGeographicSceneCameraState(
  scene: GeographicScene,
): GeographicSceneCameraState {
  return {
    focus: [scene.context.focus[0], scene.context.focus[1]],
    zoom: 1,
    azimuthDeg: 0,
    pitchDeg: 32,
  };
}

export function resetGeographicSceneCameraState(
  scene: GeographicScene,
): GeographicSceneCameraState {
  return createGeographicSceneCameraState(scene);
}

export function geographicSceneViewMetrics(
  scene: GeographicScene,
  aspect: number,
  state: GeographicSceneCameraState,
  viewportHeight = 1,
): GeographicSceneViewMetrics {
  const spanX = scene.extent.max[0] - scene.extent.min[0];
  const spanY = scene.extent.max[1] - scene.extent.min[1];
  const span = Math.max(1, spanX, spanY);
  const halfHeight = (span * 0.58) / clamp(state.zoom, GEOGRAPHIC_SCENE_MIN_ZOOM, GEOGRAPHIC_SCENE_MAX_ZOOM);
  const halfWidth = halfHeight * Math.max(0.01, aspect);
  return {
    span,
    halfHeight,
    halfWidth,
    worldUnitsPerPixelY: (halfHeight * 2) / Math.max(1, viewportHeight),
  };
}

export function panGeographicSceneCameraState(
  scene: GeographicScene,
  state: GeographicSceneCameraState,
  deltaPixelsX: number,
  deltaPixelsY: number,
  viewportHeight: number,
  aspect: number,
): GeographicSceneCameraState {
  const metrics = geographicSceneViewMetrics(scene, aspect, state, viewportHeight);
  const radians = degreesToRadians(state.azimuthDeg);
  const rightX = Math.cos(radians);
  const rightY = Math.sin(radians);
  const upX = -Math.sin(radians);
  const upY = Math.cos(radians);
  const units = metrics.worldUnitsPerPixelY;
  return withGeographicSceneCameraFocus(scene, state, [
    state.focus[0] - deltaPixelsX * units * rightX + deltaPixelsY * units * upX,
    state.focus[1] - deltaPixelsX * units * rightY + deltaPixelsY * units * upY,
  ]);
}

export function zoomGeographicSceneCameraState(
  scene: GeographicScene,
  state: GeographicSceneCameraState,
  scale: number,
): GeographicSceneCameraState {
  const nextZoom = clamp(
    state.zoom * Math.max(0.01, scale),
    GEOGRAPHIC_SCENE_MIN_ZOOM,
    GEOGRAPHIC_SCENE_MAX_ZOOM,
  );
  return withGeographicSceneCameraFocus(scene, { ...state, zoom: nextZoom }, state.focus);
}

export function rotateGeographicSceneCameraState(
  state: GeographicSceneCameraState,
  deltaAzimuthDeg: number,
  deltaPitchDeg = 0,
): GeographicSceneCameraState {
  return {
    ...state,
    azimuthDeg: clamp(
      state.azimuthDeg + deltaAzimuthDeg,
      -GEOGRAPHIC_SCENE_MAX_AZIMUTH_DEG,
      GEOGRAPHIC_SCENE_MAX_AZIMUTH_DEG,
    ),
    pitchDeg: clamp(
      state.pitchDeg + deltaPitchDeg,
      GEOGRAPHIC_SCENE_MIN_PITCH_DEG,
      GEOGRAPHIC_SCENE_MAX_PITCH_DEG,
    ),
  };
}

export function toggleGeographicScenePitch(
  state: GeographicSceneCameraState,
): GeographicSceneCameraState {
  return {
    ...state,
    pitchDeg: state.pitchDeg > 15 ? GEOGRAPHIC_SCENE_MIN_PITCH_DEG : 32,
  };
}

export function withGeographicSceneCameraFocus(
  scene: GeographicScene,
  state: GeographicSceneCameraState,
  focus: GeographicScenePoint2,
): GeographicSceneCameraState {
  const spanX = scene.extent.max[0] - scene.extent.min[0];
  const spanY = scene.extent.max[1] - scene.extent.min[1];
  const marginX = Math.max(1, spanX * 0.35);
  const marginY = Math.max(1, spanY * 0.35);
  return {
    ...state,
    focus: [
      clamp(focus[0], scene.extent.min[0] - marginX, scene.extent.max[0] + marginX),
      clamp(focus[1], scene.extent.min[1] - marginY, scene.extent.max[1] + marginY),
    ],
  };
}

export function geographicSceneCameraPosition(
  scene: GeographicScene,
  state: GeographicSceneCameraState,
): readonly [number, number, number] {
  const spanX = scene.extent.max[0] - scene.extent.min[0];
  const spanY = scene.extent.max[1] - scene.extent.min[1];
  const distance = Math.max(1, Math.max(spanX, spanY) * 1.7);
  const pitch = degreesToRadians(state.pitchDeg);
  const azimuth = degreesToRadians(state.azimuthDeg);
  const horizontal = distance * Math.sin(pitch);
  return [
    state.focus[0] + Math.sin(azimuth) * horizontal,
    state.focus[1] - Math.cos(azimuth) * horizontal,
    distance * Math.cos(pitch),
  ];
}

export function geographicPointForScenePosition(
  scene: GeographicScene,
  point: GeographicScenePoint2,
): GeographicSceneGeographicPoint {
  const spanX = Math.max(Number.EPSILON, scene.extent.max[0] - scene.extent.min[0]);
  const spanY = Math.max(Number.EPSILON, scene.extent.max[1] - scene.extent.min[1]);
  const xRatio = clamp((point[0] - scene.extent.min[0]) / spanX, 0, 1);
  const yRatio = clamp((point[1] - scene.extent.min[1]) / spanY, 0, 1);
  const west = scene.extent.geographicNorthWest[0];
  const east = scene.extent.geographicSouthEast[0];
  const north = scene.extent.geographicNorthWest[1];
  const south = scene.extent.geographicSouthEast[1];
  return [
    normalizeLongitude(west + (east - west) * xRatio),
    north + (south - north) * (1 - yRatio),
  ];
}

function normalizeLongitude(value: number): number {
  let normalized = value;
  while (normalized < -180) normalized += 360;
  while (normalized > 180) normalized -= 360;
  return normalized;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
