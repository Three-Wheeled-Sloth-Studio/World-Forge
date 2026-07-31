import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MapMode, MapTheme, PointInspectionRecord, RenderMode, renderWorldToCanvas } from '@world-forge/renderer';
import type { AtmosphericWeatherPresentationArtifact, OrbitalPresentationBody, SystemOrbitalContextArtifact, WeatherPresentationSystem, WorldProject } from '@world-forge/shared';
import type { SystemSimulationClock } from '../simulation/systemSimulationClock';
import { SystemSimulationControls } from './SystemSimulationControls';
import {
  deterministicStarDirections,
  displayRadiusForMoon,
  displayRadiusForVisibleBody,
  displaySizeForBody,
  orbitalPositionAtDays,
  relativeOrbitalPositionAtDays
} from './orbitalPresentation';
import { createWeatherPresentationTexture, normalizeHorizontalTextureSeam, renderWeatherPresentationTexture } from './weatherPresentationTexture';
import './globeSimulation.css';

export type GlobeDebugMode = 'final' | 'albedo' | 'lit' | 'water-mask' | 'sea-level' | 'coast-mask' | 'ocean-shell' | 'neutral-mesh' | 'topology-face' | 'uv-grid' | 'shade' | 'gyres';
export type GlobeFocusTarget = { x: number; y: number; width: number; height: number; latitude: number; longitude: number };

type GlobeScaleConfig = {
  seaLevelRadius: number;
  deepOceanFloorRadius: number;
  shallowSeabedRadius: number;
  oceanShellRadius: number;
  coastalLowlandRadius: number;
  typicalLandRadiusMin: number;
  typicalLandRadiusMax: number;
  highlandRadiusMin: number;
  highlandRadiusMax: number;
  exceptionalMountainRadiusCap: number;
  cloudShellRadius: number;
  atmosphereShellRadius: number;
};

const defaultGlobeScale: GlobeScaleConfig = {
  seaLevelRadius: 1,
  deepOceanFloorRadius: 0.986,
  shallowSeabedRadius: 0.996,
  oceanShellRadius: 1.002,
  coastalLowlandRadius: 1.003,
  typicalLandRadiusMin: 1.004,
  typicalLandRadiusMax: 1.012,
  highlandRadiusMin: 1.012,
  highlandRadiusMax: 1.014,
  exceptionalMountainRadiusCap: 1.018,
  cloudShellRadius: 1.04,
  atmosphereShellRadius: 1.085
};
export function GlobeViewer({
  project,
  orbitalContext,
  weatherPresentation,
  simulationClock,
  mapMode,
  renderMode,
  mapTheme,
  showRivers,
  showPlates,
  showGlobeShells,
  showClouds,
  showWeather,
  globeDebugMode,
  diagnosticMode,
  inspectionRecord,
  focusTarget,
  zoom,
  onZoom,
  onInspect
}: {
  project: WorldProject;
  orbitalContext: SystemOrbitalContextArtifact | null;
  weatherPresentation: AtmosphericWeatherPresentationArtifact | null;
  simulationClock: SystemSimulationClock;
  mapMode: MapMode;
  renderMode: RenderMode;
  mapTheme: MapTheme;
  showRivers: boolean;
  showPlates: boolean;
  showGlobeShells: boolean;
  showClouds: boolean;
  showWeather: boolean;
  globeDebugMode: GlobeDebugMode;
  diagnosticMode: boolean;
  inspectionRecord: PointInspectionRecord | null;
  focusTarget: GlobeFocusTarget | null;
  zoom: number;
  onZoom: (event: WheelEvent) => void;
  onInspect: (x: number, y: number, screen: { x: number; y: number }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cameraOrbitRef = useRef<CameraOrbit>({ yaw: 0.55, pitch: 0 });
  const globeMeshRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const markerRef = useRef<THREE.Group | null>(null);
  const focusMarkerRef = useRef<THREE.Group | null>(null);
  const diagnosticModeRef = useRef(diagnosticMode);
  const freezeSpinRef = useRef((diagnosticMode && Boolean(inspectionRecord)) || Boolean(focusTarget));

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);
    camera.updateProjectionMatrix();
  }, [zoom]);

  useEffect(() => {
    diagnosticModeRef.current = diagnosticMode;
    freezeSpinRef.current = (diagnosticMode && Boolean(inspectionRecord)) || Boolean(focusTarget);
    const globe = globeMeshRef.current;
    const camera = cameraRef.current;
    if (!globe || !camera) return;
    if (markerRef.current) {
      globe.remove(markerRef.current);
      disposeGlobeMarker(markerRef.current);
      markerRef.current = null;
    }
    if (diagnosticMode && inspectionRecord) {
      const marker = createGlobeInspectionMarker(inspectionRecord);
      globe.add(marker);
      markerRef.current = marker;
      orientCameraToGlobeDirection(camera, globe, directionFromInspection(inspectionRecord), globeCameraDistance(zoom), cameraOrbitRef.current);
    }
  }, [diagnosticMode, focusTarget, inspectionRecord, zoom]);

  useEffect(() => {
    const globe = globeMeshRef.current;
    const camera = cameraRef.current;
    if (!globe || !camera) return;
    if (focusMarkerRef.current) {
      globe.remove(focusMarkerRef.current);
      disposeGlobeMarker(focusMarkerRef.current);
      focusMarkerRef.current = null;
    }
    if (!focusTarget) return;
    const u = (focusTarget.x + 0.5) / Math.max(1, focusTarget.width);
    const v = 1 - (focusTarget.y + 0.5) / Math.max(1, focusTarget.height);
    const direction = directionFromGlobeUv(u, v);
    const marker = createGlobeTargetMarker(direction);
    globe.add(marker);
    focusMarkerRef.current = marker;
    orientCameraToGlobeDirection(camera, globe, direction, globeCameraDistance(zoom), cameraOrbitRef.current);
  }, [focusTarget, zoom]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = Boolean(orbitalContext);
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(orbitalContext ? 0x02050a : 0x000000, orbitalContext ? 1 : 0);
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);
    cameraRef.current = camera;

    const axialTiltGroup = new THREE.Group();
    const planetSpinGroup = new THREE.Group();
    scene.add(axialTiltGroup);
    axialTiltGroup.add(planetSpinGroup);

    const texture = new THREE.CanvasTexture(createGlobeTexture(project, mapMode, renderMode, mapTheme, showRivers, showPlates, globeDebugMode));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const scale = defaultGlobeScale;
    const geometry = createGlobeGeometry(project, scale);
    const material = createGlobeMaterial(texture, globeDebugMode);
    const primaryPresentation = orbitalContext?.payload.bodies.find((body) => body.id === orbitalContext.payload.primaryBodyId) ?? null;
    axialTiltGroup.rotation.z = THREE.MathUtils.degToRad(primaryPresentation?.axialTiltDeg ?? project.selectedValues.axialTiltDeg ?? 0);
    const globe = new THREE.Mesh(geometry, material);
    globe.castShadow = true;
    globe.receiveShadow = true;
    planetSpinGroup.add(globe);
    globeMeshRef.current = globe;

    if (diagnosticModeRef.current && inspectionRecord) {
      const marker = createGlobeInspectionMarker(inspectionRecord);
      globe.add(marker);
      markerRef.current = marker;
      orientCameraToGlobeDirection(camera, globe, directionFromInspection(inspectionRecord), globeCameraDistance(zoom), cameraOrbitRef.current);
    }
    if (focusTarget) {
      const u = (focusTarget.x + 0.5) / Math.max(1, focusTarget.width);
      const v = 1 - (focusTarget.y + 0.5) / Math.max(1, focusTarget.height);
      const direction = directionFromGlobeUv(u, v);
      const marker = createGlobeTargetMarker(direction);
      globe.add(marker);
      focusMarkerRef.current = marker;
      orientCameraToGlobeDirection(camera, globe, direction, globeCameraDistance(zoom), cameraOrbitRef.current);
    }

    const ocean = new THREE.Mesh(
      new THREE.SphereGeometry(scale.oceanShellRadius, 160, 80),
      new THREE.MeshPhysicalMaterial({
        color: 0x2f7fa6,
        transparent: true,
        opacity: 0.34,
        roughness: 0.62,
        metalness: 0,
        transmission: 0,
        depthWrite: false,
        depthTest: true
      })
    );
    ocean.visible = showGlobeShells && (globeDebugMode === 'final' || globeDebugMode === 'ocean-shell');
    planetSpinGroup.add(ocean);

    const initialWeatherDay = simulationClock.currentDays(performance.now());
    const cloudCanvas = createWeatherPresentationTexture(weatherPresentation, 'clouds', initialWeatherDay);
    const cloudAlpha = new THREE.CanvasTexture(cloudCanvas);
    cloudAlpha.wrapS = THREE.RepeatWrapping;
    cloudAlpha.wrapT = THREE.ClampToEdgeWrapping;
    cloudAlpha.minFilter = THREE.LinearFilter;
    cloudAlpha.magFilter = THREE.LinearFilter;
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(scale.cloudShellRadius, 128, 64),
      new THREE.MeshLambertMaterial({
        color: 0xffffff,
        alphaMap: cloudAlpha,
        transparent: true,
        opacity: 0.82,
        alphaTest: 0.045,
        depthWrite: false,
        depthTest: true
      })
    );
    clouds.castShadow = false;
    clouds.receiveShadow = true;
    clouds.visible = Boolean(weatherPresentation && showClouds);
    planetSpinGroup.add(clouds);

    const weatherCanvas = createWeatherPresentationTexture(weatherPresentation, 'weather', initialWeatherDay);
    const weatherAlpha = new THREE.CanvasTexture(weatherCanvas);
    weatherAlpha.wrapS = THREE.RepeatWrapping;
    weatherAlpha.wrapT = THREE.ClampToEdgeWrapping;
    weatherAlpha.minFilter = THREE.LinearFilter;
    weatherAlpha.magFilter = THREE.LinearFilter;
    const weatherSystems = new THREE.Mesh(
      new THREE.SphereGeometry(scale.cloudShellRadius + 0.002, 128, 64),
      new THREE.MeshLambertMaterial({
        color: 0xe8f1f5,
        alphaMap: weatherAlpha,
        transparent: true,
        opacity: 0.76,
        alphaTest: 0.016,
        depthWrite: false,
        depthTest: true
      })
    );
    weatherSystems.castShadow = false;
    weatherSystems.visible = Boolean(weatherPresentation && showWeather);
    planetSpinGroup.add(weatherSystems);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(scale.atmosphereShellRadius, 96, 48),
      createAtmosphereMaterial()
    );
    atmosphere.visible = showGlobeShells && globeDebugMode === 'final';
    planetSpinGroup.add(atmosphere);

    scene.add(new THREE.AmbientLight(0x9fb5bd, orbitalContext ? 0.28 : 0.46));
    const fallbackSun = orbitalContext ? null : new THREE.DirectionalLight(0xfff1d0, 3.05);
    if (fallbackSun) {
      fallbackSun.position.set(-4.2, 1.35, 0.55);
      scene.add(fallbackSun);
    }
    const orbitalPresentation = orbitalContext ? createOrbitalPresentationScene(scene, orbitalContext) : null;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const drag = { active: false, x: 0, y: 0, startX: 0, startY: 0, resumePlaying: false };
    let fallbackSpin = 0;
    const onPointerDown = (event: PointerEvent) => {
      drag.resumePlaying = simulationClock.getSnapshot().playing;
      simulationClock.setPlaying(false);
      host.dataset.clockGrabState = 'held';
      drag.active = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag.active) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      updateCameraOrbitFromDrag(cameraOrbitRef.current, dx, dy);
      applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);
    };
    const onPointerUp = (event: PointerEvent) => {
      const movement = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      drag.active = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      host.dataset.clockGrabState = 'released';
      if (drag.resumePlaying) simulationClock.setPlaying(true);
      if (diagnosticModeRef.current && movement <= 4) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObject(globe, false)[0];
        if (hit) {
          const world = project.primaryWorld;
          const uvPoint = hit.uv
            ? mapPointFromGlobeUv(hit.uv, world.mapModel.resolution.width, world.mapModel.resolution.height)
            : mapPointFromGlobeLocalDirection(globe.worldToLocal(hit.point.clone()).normalize(), world.mapModel.resolution.width, world.mapModel.resolution.height);
          const mapX = uvPoint.x;
          const mapY = uvPoint.y;
          onInspect(mapX, mapY, { x: Math.round(event.clientX), y: Math.round(event.clientY) });
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('wheel', onZoom, { passive: false });

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let frame = 0;
    let disposed = false;
    let lastWeatherTextureDay = Number.NaN;
    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const simulationDays = simulationClock.currentDays(performance.now());

      if (primaryPresentation) {
        const rotationPeriodDays = Math.max(0.08, Math.abs(primaryPresentation.rotationPeriodHours) / 24);
        planetSpinGroup.rotation.y = simulationDays * Math.PI * 2 / rotationPeriodDays;
      } else if (!drag.active && !freezeSpinRef.current) {
        fallbackSpin += 0.0017;
        planetSpinGroup.rotation.y = fallbackSpin;
      } else {
        planetSpinGroup.rotation.y = fallbackSpin;
      }
      host.dataset.simulationDays = simulationDays.toFixed(6);
      host.dataset.planetSpinRadians = planetSpinGroup.rotation.y.toFixed(6);
      host.dataset.cameraOrbitYaw = cameraOrbitRef.current.yaw.toFixed(6);
      host.dataset.cameraOrbitPitch = cameraOrbitRef.current.pitch.toFixed(6);
      host.dataset.observerControl = 'camera-orbit';
      if (weatherPresentation && (!Number.isFinite(lastWeatherTextureDay) || Math.abs(simulationDays - lastWeatherTextureDay) >= 0.04)) {
        renderWeatherPresentationTexture(cloudCanvas, weatherPresentation, 'clouds', simulationDays);
        renderWeatherPresentationTexture(weatherCanvas, weatherPresentation, 'weather', simulationDays);
        cloudAlpha.needsUpdate = true;
        weatherAlpha.needsUpdate = true;
        lastWeatherTextureDay = simulationDays;
        host.dataset.weatherTextureDay = simulationDays.toFixed(6);
      }
      if (orbitalPresentation && orbitalContext) {
        updateOrbitalPresentationScene(orbitalPresentation, orbitalContext, simulationDays);
        const firstMoon = orbitalPresentation.moons[0]?.group.position;
        host.dataset.shadowLightVector = orbitalPresentation.sun.position.toArray().map((value) => value.toFixed(5)).join(',');
        host.dataset.primaryMoonPosition = firstMoon ? firstMoon.toArray().map((value) => value.toFixed(5)).join(',') : 'none';
        host.dataset.moonShadowAlignment = firstMoon
          ? firstMoon.clone().normalize().dot(orbitalPresentation.sun.position.clone().normalize()).toFixed(6)
          : 'none';
      }
      host.dataset.cameraDistance = camera.position.length().toFixed(6);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onZoom);
      if (markerRef.current) {
        globe.remove(markerRef.current);
        disposeGlobeMarker(markerRef.current);
        markerRef.current = null;
      }
      if (focusMarkerRef.current) {
        globe.remove(focusMarkerRef.current);
        disposeGlobeMarker(focusMarkerRef.current);
        focusMarkerRef.current = null;
      }
      globeMeshRef.current = null;
      cameraRef.current = null;
      geometry.dispose();
      material.dispose();
      texture.dispose();
      cloudAlpha.dispose();
      weatherAlpha.dispose();
      ocean.geometry.dispose();
      (ocean.material as THREE.Material).dispose();
      clouds.geometry.dispose();
      (clouds.material as THREE.Material).dispose();
      weatherSystems.geometry.dispose();
      (weatherSystems.material as THREE.Material).dispose();
      atmosphere.geometry.dispose();
      (atmosphere.material as THREE.Material).dispose();
      if (orbitalPresentation) disposeOrbitalPresentationScene(orbitalPresentation);
      renderer.dispose();
      host.replaceChildren();
    };
  }, [focusTarget, globeDebugMode, inspectionRecord, mapMode, mapTheme, onInspect, onZoom, orbitalContext, project, renderMode, showClouds, showGlobeShells, showPlates, showRivers, showWeather, simulationClock, weatherPresentation]);

  const moonCount = orbitalContext?.payload.bodies.filter((body) => body.kind === 'moon' && body.parentBodyId === orbitalContext.payload.primaryBodyId).length ?? 0;
  const visibleBodyCount = orbitalContext?.payload.bodies.filter((body) => body.kind !== 'moon' && body.id !== orbitalContext.payload.primaryBodyId && (body.visibleFromPrimary || orbitalContext.payload.visibleBodyIds.includes(body.id))).length ?? 0;
  const axialTilt = orbitalContext?.payload.bodies.find((body) => body.id === orbitalContext.payload.primaryBodyId)?.axialTiltDeg ?? project.selectedValues.axialTiltDeg;

  return (
    <div
      className={`globe-viewer ${diagnosticMode ? 'diagnostic-active' : ''}`}
      aria-label={`Generated globe for ${project.projectName}`}
      data-orbital-context={orbitalContext ? 'ready' : 'pending'}
      data-orbital-star-count={orbitalContext ? '1' : '0'}
      data-orbital-moon-count={moonCount}
      data-orbital-visible-body-count={visibleBodyCount}
      data-orbital-axial-tilt={Number.isFinite(axialTilt) ? axialTilt.toFixed(3) : '0.000'}
      data-system-star-light={orbitalContext ? 'coupled' : 'fallback'}
      data-frame-reference={orbitalContext ? 'fixed-world-camera-orbit' : 'camera-orbit'}
      data-moon-shadow-mode={orbitalContext ? 'pcf-soft-tracked' : 'disabled'}
      data-moon-shadow-caster-count={moonCount}
      data-cloud-shadow-mode="disabled-until-soft-shadow"
      data-cloud-renderer="sparse-layered-noise-v3"
      data-cloud-coverage-profile="clear-sky-gaps"
      data-weather-shell-offset="0.002"
      data-minimum-globe-zoom="35"
      data-weather-presentation={weatherPresentation ? 'ready' : 'pending'}
      data-weather-authority={weatherPresentation?.weatherAuthority ?? 'none'}
      data-weather-band-count={weatherPresentation?.payload.cloudBands.length ?? 0}
      data-weather-system-count={weatherPresentation?.payload.systems.length ?? 0}
      data-cloud-layer={weatherPresentation && showClouds ? 'visible' : 'hidden'}
      data-weather-layer={weatherPresentation && showWeather ? 'visible' : 'hidden'}
    >
      <div ref={hostRef} className="globe-render-surface" />
      {orbitalContext && <SystemSimulationControls clock={simulationClock} artifact={orbitalContext} />}
    </div>
  );
}

function createGlobeTargetMarker(direction: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xe84a45, depthTest: false, depthWrite: false, transparent: true, opacity: 0.98 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.004, 10, 40), material);
  ring.position.copy(direction.clone().multiplyScalar(1.072));
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  ring.renderOrder = 12;
  group.add(ring);
  return group;
}

function createGlobeInspectionMarker(record: PointInspectionRecord): THREE.Group {
  const group = new THREE.Group();
  const direction = directionFromInspection(record);
  const tangent = new THREE.Vector3(-direction.z, 0, direction.x);
  if (tangent.lengthSq() < 0.001) {
    tangent.set(1, 0, 0);
  }
  tangent.normalize();

  const red = new THREE.MeshBasicMaterial({
    color: 0xe84a45,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    opacity: 0.96
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0045, 8, 36), red);
  ring.position.copy(direction.clone().multiplyScalar(1.07));
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  ring.renderOrder = 10;
  group.add(ring);

  const arrowDirection = direction.clone().multiplyScalar(1.07).sub(direction.clone().multiplyScalar(1.13).add(tangent.clone().multiplyScalar(0.11))).normalize();
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.065, 18), red.clone());
  arrow.position.copy(direction.clone().multiplyScalar(1.13).add(tangent.clone().multiplyScalar(0.11)));
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arrowDirection);
  arrow.renderOrder = 10;
  group.add(arrow);

  return group;
}

function directionFromInspection(record: PointInspectionRecord): THREE.Vector3 {
  const u = (record.equirectangular.x + 0.5) / Math.max(1, record.equirectangular.width);
  const v = 1 - (record.equirectangular.y + 0.5) / Math.max(1, record.equirectangular.height);
  return directionFromGlobeUv(u, v);
}

type CameraOrbit = { yaw: number; pitch: number };

function applyCameraOrbit(camera: THREE.PerspectiveCamera, distance: number, orbit: CameraOrbit): void {
  const cosPitch = Math.cos(orbit.pitch);
  camera.position.set(
    Math.sin(orbit.yaw) * cosPitch * distance,
    Math.sin(orbit.pitch) * distance,
    Math.cos(orbit.yaw) * cosPitch * distance
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
}

function updateCameraOrbitFromDrag(orbit: CameraOrbit, deltaX: number, deltaY: number): void {
  orbit.yaw -= deltaX * 0.006;
  orbit.pitch = clampCameraOrbitPitch(orbit.pitch + deltaY * 0.004);
}

function orientCameraToGlobeDirection(
  camera: THREE.PerspectiveCamera,
  globe: THREE.Object3D,
  localDirection: THREE.Vector3,
  distance: number,
  orbit: CameraOrbit
): void {
  globe.updateWorldMatrix(true, false);
  const worldDirection = localDirection.clone().transformDirection(globe.matrixWorld).normalize();
  orbit.yaw = Math.atan2(worldDirection.x, worldDirection.z);
  orbit.pitch = clampCameraOrbitPitch(Math.asin(Math.max(-1, Math.min(1, worldDirection.y))));
  applyCameraOrbit(camera, distance, orbit);
}

function globeCameraDistance(zoom: number): number {
  const clamped = Math.max(0.35, Math.min(4, Number.isFinite(zoom) ? zoom : 1));
  return 3.15 / Math.sqrt(clamped);
}

function directionFromGlobeUv(u: number, v: number): THREE.Vector3 {
  const phi = wrapUnit(u) * Math.PI * 2;
  const theta = (1 - clamp01(v)) * Math.PI;
  const sinTheta = Math.sin(theta);
  return new THREE.Vector3(
    -Math.cos(phi) * sinTheta,
    Math.cos(theta),
    Math.sin(phi) * sinTheta
  ).normalize();
}

function mapPointFromGlobeUv(uv: THREE.Vector2, width: number, height: number): { x: number; y: number } {
  return {
    x: wrapUnit(uv.x) * width,
    y: clamp01(1 - uv.y) * height
  };
}

function mapPointFromGlobeLocalDirection(direction: THREE.Vector3, width: number, height: number): { x: number; y: number } {
  const theta = Math.acos(Math.max(-1, Math.min(1, direction.y)));
  const phi = Math.atan2(direction.z, -direction.x);
  return {
    x: wrapUnit(phi / (Math.PI * 2)) * width,
    y: clamp01(theta / Math.PI) * height
  };
}

function disposeGlobeMarker(marker: THREE.Group) {
  marker.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

function createGlobeMaterial(texture: THREE.Texture, globeDebugMode: GlobeDebugMode): THREE.Material {
  if (globeDebugMode === 'final' || globeDebugMode === 'lit') {
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.86,
      metalness: 0.02
    });
  }
  if (globeDebugMode === 'neutral-mesh') {
    return new THREE.MeshBasicMaterial({ color: 0x9a9a92 });
  }
  if (globeDebugMode === 'ocean-shell') {
    return new THREE.MeshBasicMaterial({ color: 0x26383a });
  }
  return new THREE.MeshBasicMaterial({ map: texture });
}

function createAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x86cde6) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.4);
        gl_FragColor = vec4(color, rim * 0.28);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide
  });
}

function createGlobeTexture(project: WorldProject, mapMode: MapMode, renderMode: RenderMode, mapTheme: MapTheme, showRivers: boolean, showPlates: boolean, globeDebugMode: GlobeDebugMode): HTMLCanvasElement {
  if (globeDebugMode === 'gyres') {
    return createGyreDebugTexture(project);
  }
  if (globeDebugMode === 'coast-mask') {
    return createCoastMaskTexture(project);
  }
  if (globeDebugMode === 'uv-grid') {
    return createUvGridTexture();
  }

  const canvas = document.createElement('canvas');
  const mode = globeDebugMode === 'water-mask'
    ? 'water-depth'
    : globeDebugMode === 'sea-level'
      ? 'sea-level'
      : globeDebugMode === 'shade'
        ? 'slope'
    : globeDebugMode === 'topology-face'
      ? 'topology-face'
      : mapMode;
  const includeOverlays = globeDebugMode === 'final';
  renderWorldToCanvas(canvas, project, mapTheme, {
    rivers: includeOverlays && showRivers && mapMode !== 'elevation' && mapMode !== 'heightmap',
    plates: includeOverlays && showPlates,
    heightmap: mode === 'elevation',
    coastlineTreatment: 'toned',
    renderMode,
    mode,
    targetResolution: { width: 2048, height: 1024 }
  });
  normalizeHorizontalTextureSeam(canvas, 1);
  return canvas;
}

function createGyreDebugTexture(project: WorldProject): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const world = project.primaryWorld;
  const width = world.mapModel.resolution.width;
  const height = world.mapModel.resolution.height;
  const circulation = (world.climate as typeof world.climate & { basinCirculation?: { packedGyres?: Array<{ id: number; centerX: number; centerY: number; radiusX: number; radiusY: number; territorySize: number; rotationSign: number }>; gyreOwner?: Int16Array } } | undefined)?.basinCirculation;
  const gyres = circulation?.packedGyres ?? [];
  const owner = circulation?.gyreOwner;
  const palette = ['#f2c14e', '#5bc0eb', '#9bc53d', '#e55934', '#fa7921', '#b084cc', '#52b788', '#ef476f', '#06d6a0', '#ffd166', '#118ab2', '#c77dff', '#80ed99', '#ff9f1c'];
  const image = context.createImageData(canvas.width, canvas.height);
  for (let py = 0; py < canvas.height; py += 1) {
    const sy = Math.min(height - 1, Math.floor((py / canvas.height) * height));
    for (let px = 0; px < canvas.width; px += 1) {
      const sx = Math.min(width - 1, Math.floor((px / canvas.width) * width));
      const source = sy * width + sx;
      const target = (py * canvas.width + px) * 4;
      if (!world.layers.water[source]) {
        image.data[target] = 38; image.data[target + 1] = 43; image.data[target + 2] = 34; image.data[target + 3] = 255;
        continue;
      }
      const gyreId = owner?.[source] ?? -1;
      if (gyreId < 0) {
        image.data[target] = 25; image.data[target + 1] = 55; image.data[target + 2] = 72; image.data[target + 3] = 255;
        continue;
      }
      const color = new THREE.Color(palette[gyreId % palette.length]);
      image.data[target] = Math.round(color.r * 255 * 0.72);
      image.data[target + 1] = Math.round(color.g * 255 * 0.72);
      image.data[target + 2] = Math.round(color.b * 255 * 0.72);
      image.data[target + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  context.save();
  context.lineWidth = 3;
  context.font = 'bold 22px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const gyre of gyres) {
    const cx = ((gyre.centerX + 0.5) / Math.max(1, width)) * canvas.width;
    const cy = ((gyre.centerY + 0.5) / Math.max(1, height)) * canvas.height;
    const rx = (gyre.radiusX / Math.max(1, width)) * canvas.width;
    const ry = (gyre.radiusY / Math.max(1, height)) * canvas.height;
    const color = palette[gyre.id % palette.length];
    for (const offset of [-canvas.width, 0, canvas.width]) {
      context.strokeStyle = color;
      context.setLineDash([10, 7]);
      context.beginPath();
      context.ellipse(cx + offset, cy, rx, ry, 0, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.beginPath();
      context.moveTo(cx + offset - 10, cy); context.lineTo(cx + offset + 10, cy);
      context.moveTo(cx + offset, cy - 10); context.lineTo(cx + offset, cy + 10);
      context.stroke();
      context.fillStyle = '#ffffff';
      context.strokeStyle = '#111820';
      context.lineWidth = 5;
      const label = `G${gyre.id + 1} ${gyre.rotationSign > 0 ? 'CW' : 'CCW'} ${gyre.territorySize}`;
      context.strokeText(label, cx + offset, cy - 18);
      context.fillText(label, cx + offset, cy - 18);
      context.lineWidth = 3;
    }
  }
  context.restore();
  normalizeHorizontalTextureSeam(canvas, 1);
  return canvas;
}

function createUvGridTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.fillStyle = '#202424';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#f0d777';
  context.lineWidth = 2;
  for (let x = 0; x <= canvas.width; x += 128) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 128) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.strokeStyle = '#e84a45';
  context.lineWidth = 5;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  context.fillStyle = '#f7efe2';
  context.font = 'bold 42px system-ui, sans-serif';
  context.fillText('NW', 24, 58);
  context.fillText('NE', canvas.width - 92, 58);
  context.fillText('SW', 24, canvas.height - 28);
  context.fillText('SE', canvas.width - 92, canvas.height - 28);
  context.fillText('EQUATOR', 24, canvas.height / 2 - 16);
  return canvas;
}

function createCoastMaskTexture(project: WorldProject): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const world = project.primaryWorld;
  const { width, height } = world.mapModel.resolution;
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const image = context.createImageData(canvas.width, canvas.height);
  const sourceWater = world.layers.water;
  const sourceWidth = width;
  const sourceHeight = height;

  for (let y = 0; y < canvas.height; y += 1) {
    const sourceY = Math.max(0, Math.min(sourceHeight - 1, Math.floor((y / canvas.height) * sourceHeight)));
    for (let x = 0; x < canvas.width; x += 1) {
      const sourceX = Math.max(0, Math.min(sourceWidth - 1, Math.floor((x / canvas.width) * sourceWidth)));
      const sourceIndex = sourceY * sourceWidth + sourceX;
      const isWater = sourceWater[sourceIndex] === 1;
      let nearCoast = false;
      for (let dy = -2; dy <= 2 && !nearCoast; dy += 1) {
        const ny = Math.max(0, Math.min(sourceHeight - 1, sourceY + dy));
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = (sourceX + dx + sourceWidth) % sourceWidth;
          const neighborWater = sourceWater[ny * sourceWidth + nx] === 1;
          if (neighborWater !== isWater) {
            nearCoast = true;
            break;
          }
        }
      }
      const target = (y * canvas.width + x) * 4;
      const value = nearCoast ? 235 : isWater ? 36 : 9;
      image.data[target] = nearCoast ? 232 : value;
      image.data[target + 1] = nearCoast ? 82 : value;
      image.data[target + 2] = nearCoast ? 72 : value;
      image.data[target + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function createGlobeGeometry(project: WorldProject, scale: GlobeScaleConfig): THREE.SphereGeometry {
  const geometry = new THREE.SphereGeometry(1, 320, 160);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const uvs = geometry.attributes.uv as THREE.BufferAttribute;
  const world = project.primaryWorld;
  const { width, height } = world.mapModel.resolution;
  const [lowDepthElevation] = rasterPercentileRange(world.layers.elevation, 0.02, 0.98);
  const [, highElevation] = rasterPercentileRange(world.layers.elevation, 0.02, 0.98);
  const landRange = Math.max(0.0001, highElevation - world.seaLevel);
  const oceanRange = Math.max(0.0001, world.seaLevel - lowDepthElevation);
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i += 1) {
    vertex.fromBufferAttribute(positions, i).normalize();
    const uvPoint = mapPointFromGlobeUv(new THREE.Vector2(uvs.getX(i), uvs.getY(i)), width, height);
    const elevation = sampleSmoothedWrappedScalar(world.layers.elevation, width, height, uvPoint.x, uvPoint.y);
    const waterWeight = sampleSmoothedWrappedScalar(world.layers.water, width, height, uvPoint.x, uvPoint.y);
    const isWater = waterWeight >= 0.5;
    const land01 = clamp01((elevation - world.seaLevel) / landRange);
    const depth01 = clamp01((world.seaLevel - elevation) / oceanRange);
    const relief = Math.pow(land01, 0.68);
    const radius = isWater
      ? linearInterpolate(scale.shallowSeabedRadius, scale.deepOceanFloorRadius, Math.pow(depth01, 0.76))
      : Math.min(
        scale.exceptionalMountainRadiusCap,
        linearInterpolate(scale.coastalLowlandRadius, scale.highlandRadiusMax, relief)
      );
    positions.setXYZ(i, vertex.x * radius, vertex.y * radius, vertex.z * radius);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function sampleWrappedScalar(values: Float32Array | Uint8Array, width: number, height: number, x: number, y: number): number {
  const wrappedX = ((x % width) + width) % width;
  const clampedY = Math.max(0, Math.min(height - 1, y));
  const x0 = Math.floor(wrappedX) % width;
  const x1 = (x0 + 1) % width;
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(clampedY)));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const tx = wrappedX - Math.floor(wrappedX);
  const ty = clampedY - y0;
  const top = linearInterpolate(values[y0 * width + x0] ?? 0, values[y0 * width + x1] ?? 0, tx);
  const bottom = linearInterpolate(values[y1 * width + x0] ?? 0, values[y1 * width + x1] ?? 0, tx);
  return linearInterpolate(top, bottom, ty);
}

function sampleSmoothedWrappedScalar(values: Float32Array | Uint8Array, width: number, height: number, x: number, y: number): number {
  const taps: Array<[number, number, number]> = [
    [0, 0, 4],
    [-1, 0, 2],
    [1, 0, 2],
    [0, -1, 1],
    [0, 1, 1],
    [-1, -1, 0.5],
    [1, -1, 0.5],
    [-1, 1, 0.5],
    [1, 1, 0.5]
  ];
  let total = 0;
  let weight = 0;
  for (const [dx, dy, tapWeight] of taps) {
    total += sampleWrappedScalar(values, width, height, x + dx, y + dy) * tapWeight;
    weight += tapWeight;
  }
  return weight > 0 ? total / weight : sampleWrappedScalar(values, width, height, x, y);
}

function rasterPercentileRange(values: Float32Array, lowPercentile: number, highPercentile: number): [number, number] {
  const sorted = Array.from(values).sort((a, b) => a - b);
  const low = sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * lowPercentile)))];
  const high = sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * highPercentile)))];
  return low === high ? [sorted[0] ?? 0, sorted[sorted.length - 1] ?? 1] : [low, high];
}

function clampCameraOrbitPitch(value: number): number {
  const limit = Math.PI / 2 - 0.06;
  return Math.max(-limit, Math.min(limit, value));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function linearInterpolate(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

type OrbitalBodyVisual = {
  body: OrbitalPresentationBody;
  group: THREE.Group;
  mesh: THREE.Mesh;
  displayRadius: number;
};

type OrbitalPresentationScene = {
  starfield: THREE.Points;
  starMesh: THREE.Mesh;
  starHalo: THREE.Sprite;
  haloTexture: THREE.CanvasTexture;
  sun: THREE.DirectionalLight;
  primary: OrbitalPresentationBody;
  moons: OrbitalBodyVisual[];
  visibleBodies: OrbitalBodyVisual[];
};

function createOrbitalPresentationScene(
  scene: THREE.Scene,
  artifact: SystemOrbitalContextArtifact
): OrbitalPresentationScene | null {
  const primary = artifact.payload.bodies.find((body) => body.id === artifact.payload.primaryBodyId);
  if (!primary) return null;

  const starfield = createStarfield(`${artifact.seed}:${artifact.artifactSignature}`);
  scene.add(starfield);

  const starColor = new THREE.Color(artifact.payload.star.colorHex);
  const starMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 40, 20),
    new THREE.MeshBasicMaterial({ color: starColor })
  );
  scene.add(starMesh);

  const haloTexture = createStarHaloTexture(artifact.payload.star.colorHex);
  const starHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTexture,
    color: starColor,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  }));
  starHalo.scale.set(1.25, 1.25, 1.25);
  scene.add(starHalo);

  const sun = new THREE.DirectionalLight(starColor, 3.25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 16;
  sun.shadow.camera.left = -4;
  sun.shadow.camera.right = 4;
  sun.shadow.camera.top = 4;
  sun.shadow.camera.bottom = -4;
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.015;
  sun.target.position.set(0, 0, 0);
  scene.add(sun);
  scene.add(sun.target);

  const moons = artifact.payload.bodies
    .filter((body) => body.kind === 'moon' && body.parentBodyId === artifact.payload.primaryBodyId)
    .map((body) => createOrbitalBodyVisual(scene, body, displayRadiusForMoon(body)));
  const visibleIds = new Set(artifact.payload.visibleBodyIds);
  const visibleBodies = artifact.payload.bodies
    .filter((body) => body.kind !== 'moon' && body.id !== artifact.payload.primaryBodyId && (body.visibleFromPrimary || visibleIds.has(body.id)))
    .map((body) => createOrbitalBodyVisual(scene, body, displayRadiusForVisibleBody(body)));

  const presentation = { starfield, starMesh, starHalo, haloTexture, sun, primary, moons, visibleBodies };
  updateOrbitalPresentationScene(presentation, artifact, 0);
  return presentation;
}

function createOrbitalBodyVisual(scene: THREE.Scene, body: OrbitalPresentationBody, displayRadius: number): OrbitalBodyVisual {
  const group = new THREE.Group();
  const radius = displaySizeForBody(body);
  const color = new THREE.Color(orbitalBodyColor(body.kind));
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: body.kind === 'gas-giant' || body.kind === 'ice-giant' ? 0.72 : 0.9,
    metalness: 0.01,
    transparent: body.placeholder,
    opacity: body.placeholder ? 0.78 : 1
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 30, 16), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  if (body.placeholder) {
    const wireframe = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.15, 14, 8),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.32, depthWrite: false })
    );
    group.add(wireframe);
  }
  if (body.kind === 'gas-giant' || body.kind === 'ice-giant') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.55, Math.max(0.006, radius * 0.08), 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xcabf9c, transparent: true, opacity: 0.45, depthWrite: false })
    );
    ring.rotation.x = Math.PI * 0.62;
    group.add(ring);
  }
  scene.add(group);
  return { body, group, mesh, displayRadius };
}

function updateOrbitalPresentationScene(
  presentation: OrbitalPresentationScene,
  artifact: SystemOrbitalContextArtifact,
  simulationDays: number
): void {
  const primaryPosition = orbitalPositionAtDays(presentation.primary, simulationDays);
  const starDirection = new THREE.Vector3(-primaryPosition.x, -primaryPosition.y, -primaryPosition.z);
  if (starDirection.lengthSq() < 0.000001) starDirection.set(-1, 0.25, -0.2);
  starDirection.normalize();
  presentation.starMesh.position.copy(starDirection).multiplyScalar(8.2);
  presentation.starHalo.position.copy(presentation.starMesh.position);
  presentation.sun.position.copy(starDirection).multiplyScalar(6.5);
  presentation.sun.target.position.set(0, 0, 0);
  presentation.sun.target.updateMatrixWorld();
  presentation.sun.updateMatrixWorld();

  for (const visual of presentation.moons) {
    const point = orbitalPositionAtDays(visual.body, simulationDays);
    setDisplayPosition(visual.group, point, visual.displayRadius);
    rotateOrbitalVisual(visual, simulationDays);
  }
  for (const visual of presentation.visibleBodies) {
    const point = relativeOrbitalPositionAtDays(visual.body, presentation.primary, simulationDays);
    setDisplayPosition(visual.group, point, visual.displayRadius);
    rotateOrbitalVisual(visual, simulationDays);
  }

  const luminosityPulse = 1 + Math.sin(simulationDays * 0.025) * 0.025;
  presentation.starHalo.scale.setScalar(1.25 * luminosityPulse);
  presentation.sun.intensity = 3.25 * Math.max(0.72, Math.min(1.35, artifact.payload.star.luminositySolar));
}

function setDisplayPosition(group: THREE.Group, point: { x: number; y: number; z: number }, displayRadius: number): void {
  const direction = new THREE.Vector3(point.x, point.y, point.z);
  if (direction.lengthSq() < 0.000001) direction.set(1, 0, 0);
  group.position.copy(direction.normalize().multiplyScalar(displayRadius));
}

function rotateOrbitalVisual(visual: OrbitalBodyVisual, simulationDays: number): void {
  const rotationPeriodDays = Math.max(0.04, Math.abs(visual.body.rotationPeriodHours) / 24);
  visual.mesh.rotation.y = simulationDays * Math.PI * 2 / rotationPeriodDays;
  visual.mesh.rotation.z = THREE.MathUtils.degToRad(visual.body.axialTiltDeg);
}

function createStarfield(seed: string): THREE.Points {
  const stars = deterministicStarDirections(seed, 1100);
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  stars.forEach((star, index) => {
    const radius = 13.5 + (index % 9) * 0.22;
    positions[index * 3] = star.x * radius;
    positions[index * 3 + 1] = star.y * radius;
    positions[index * 3 + 2] = star.z * radius;
    const tint = index % 7 === 0 ? new THREE.Color(0xbfd8ff) : index % 5 === 0 ? new THREE.Color(0xffdfb0) : new THREE.Color(0xf4f7ff);
    colors[index * 3] = tint.r * star.brightness;
    colors[index * 3 + 1] = tint.g * star.brightness;
    colors[index * 3 + 2] = tint.b * star.brightness;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.035,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  }));
}

function createStarHaloTexture(colorHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 64);
    gradient.addColorStop(0, colorHex);
    gradient.addColorStop(0.18, `${colorHex}cc`);
    gradient.addColorStop(0.5, `${colorHex}55`);
    gradient.addColorStop(1, `${colorHex}00`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function orbitalBodyColor(kind: OrbitalPresentationBody['kind']): number {
  if (kind === 'moon') return 0xb7b1a7;
  if (kind === 'gas-giant') return 0xc89867;
  if (kind === 'ice-giant') return 0x75afc7;
  if (kind === 'dwarf') return 0x968b82;
  if (kind === 'belt') return 0x8a8179;
  return 0xa66e4d;
}

function disposeOrbitalPresentationScene(presentation: OrbitalPresentationScene): void {
  const roots: THREE.Object3D[] = [
    presentation.starfield,
    presentation.starMesh,
    presentation.starHalo,
    ...presentation.moons.map((visual) => visual.group),
    ...presentation.visibleBodies.map((visual) => visual.group)
  ];
  for (const root of roots) {
    root.parent?.remove(root);
    root.traverse((object) => {
      const candidate = object as THREE.Mesh & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
      candidate.geometry?.dispose();
      if (Array.isArray(candidate.material)) candidate.material.forEach((material) => material.dispose());
      else candidate.material?.dispose();
    });
  }
  presentation.sun.parent?.remove(presentation.sun);
  presentation.sun.target.parent?.remove(presentation.sun.target);
  presentation.haloTexture.dispose();
}
