import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import type { SystemSimulationClock } from '../simulation/systemSimulationClock';
import {
  atmosphericPresentationMaterialMode,
  createAtmosphericBodyPresentation,
} from '../presentation/atmosphericBodyPresentation';
import type { GlobeBodyTarget } from './globeBodyTarget';
import { deterministicStarDirections, orbitalPositionAtDays } from './orbitalPresentation';
import { SystemSimulationControls } from './SystemSimulationControls';
import './globeSimulation.css';

type CameraOrbit = { yaw: number; pitch: number };

export function AtmosphericGlobeViewer({
  project,
  orbitalContext,
  target,
  simulationClock,
  zoom,
  onZoom,
  onTargetBodyChange,
}: {
  project: WorldProject;
  orbitalContext: SystemOrbitalContextArtifact;
  target: GlobeBodyTarget;
  simulationClock: SystemSimulationClock;
  zoom: number;
  onZoom: (event: WheelEvent) => void;
  onTargetBodyChange: (bodyId: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraOrbitRef = useRef<CameraOrbit>({ yaw: 0.55, pitch: 0 });

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);
    camera.updateProjectionMatrix();
  }, [zoom]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !target.atmosphericDetail) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x02050a, 1);
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);
    cameraRef.current = camera;

    const axialTiltGroup = new THREE.Group();
    const spinGroup = new THREE.Group();
    scene.add(axialTiltGroup);
    axialTiltGroup.add(spinGroup);
    axialTiltGroup.rotation.z = THREE.MathUtils.degToRad(target.body.axialTiltDeg ?? 0);

    const presentation = createAtmosphericBodyPresentation(
      project,
      target.atmosphericDetail,
      1,
      target.bodyId,
      'inspection',
    );
    spinGroup.add(presentation.object);

    const starfield = createStarfield(`${orbitalContext.seed}:${target.bodyId}`);
    scene.add(starfield);
    scene.add(new THREE.AmbientLight(0x9fb5bd, 0.3));
    const sun = new THREE.DirectionalLight(orbitalContext.payload.star.colorHex, 3.25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.target.position.set(0, 0, 0);
    scene.add(sun);
    scene.add(sun.target);

    const drag = { active: false, x: 0, y: 0, resumePlaying: false };
    const onPointerDown = (event: PointerEvent) => {
      drag.active = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.resumePlaying = simulationClock.getSnapshot().playing;
      simulationClock.setPlaying(false);
      host.dataset.clockGrabState = 'held';
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag.active) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      cameraOrbitRef.current.yaw -= dx * 0.006;
      cameraOrbitRef.current.pitch = clampPitch(cameraOrbitRef.current.pitch + dy * 0.004);
      applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!drag.active) return;
      drag.active = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      host.dataset.clockGrabState = 'released';
      if (drag.resumePlaying) simulationClock.setPlaying(true);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('wheel', onZoom, { passive: false });

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    let frame = 0;
    const animate = (now: number) => {
      const simulationDays = simulationClock.currentDays(now);
      const rotationPeriodDays = Math.max(0.08, Math.abs(target.body.rotationPeriodHours) / 24);
      spinGroup.rotation.y = simulationDays * Math.PI * 2 / rotationPeriodDays;
      const orbitalPosition = orbitalPositionAtDays(target.body, simulationDays);
      const starDirection = new THREE.Vector3(
        -orbitalPosition.x,
        -orbitalPosition.y,
        -orbitalPosition.z,
      );
      if (starDirection.lengthSq() < 0.000001) starDirection.set(-1, 0.25, -0.2);
      starDirection.normalize();
      sun.position.copy(starDirection).multiplyScalar(6.5);
      sun.target.updateMatrixWorld();
      sun.updateMatrixWorld();
      host.dataset.simulationDays = simulationDays.toFixed(6);
      host.dataset.planetSpinRadians = spinGroup.rotation.y.toFixed(6);
      host.dataset.shadowLightVector = sun.position.toArray().map((value) => value.toFixed(5)).join(',');
      host.dataset.cameraDistance = camera.position.length().toFixed(6);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onZoom);
      disposeObjectTree(scene);
      renderer.dispose();
      host.replaceChildren();
      cameraRef.current = null;
    };
  }, [
    onZoom,
    orbitalContext.artifactSignature,
    project,
    simulationClock,
    target.atmosphericDetail,
    target.body,
    target.bodyId,
    zoom,
  ]);

  const polarScale = target.atmosphericDetail
    ? target.atmosphericDetail.shape.kind === 'oblate-spheroid'
      ? target.atmosphericDetail.shape.polarRadiusKm / target.atmosphericDetail.shape.equatorialRadiusKm
      : 1
    : 1;
  const materialMode = target.atmosphericDetail
    ? atmosphericPresentationMaterialMode(project, target.atmosphericDetail)
    : 'derived-atmospheric-profile';

  return (
    <div
      className="globe-viewer"
      aria-label={`Atmospheric globe for ${target.label}`}
      data-globe-target-body={target.bodyId}
      data-globe-target-mode={target.mode}
      data-globe-surface-material={materialMode}
      data-globe-surface-geometry={target.atmosphericDetail?.shape.kind === 'oblate-spheroid'
        ? 'smooth-oblate-spheroid'
        : 'smooth-sphere'}
      data-globe-polar-scale={polarScale.toFixed(6)}
      data-orbital-context="ready"
      data-system-star-light="coupled"
      data-frame-reference="fixed-world-camera-orbit"
      data-weather-presentation="not-applicable"
      data-seasonal-surface="not-applicable"
    >
      <div ref={hostRef} className="globe-render-surface" />
      <section className="globe-body-target-status" aria-label="Globe target">
        <span>Viewing</span>
        <strong>{target.label}</strong>
        <small>Imported atmospheric presentation</small>
        <button
          type="button"
          aria-label="Return globe to primary world"
          onClick={() => onTargetBodyChange(orbitalContext.payload.primaryBodyId)}
        >
          Return to primary
        </button>
      </section>
      <SystemSimulationControls clock={simulationClock} artifact={orbitalContext} />
    </div>
  );
}

function applyCameraOrbit(camera: THREE.PerspectiveCamera, distance: number, orbit: CameraOrbit): void {
  const cosPitch = Math.cos(orbit.pitch);
  camera.position.set(
    Math.sin(orbit.yaw) * cosPitch * distance,
    Math.sin(orbit.pitch) * distance,
    Math.cos(orbit.yaw) * cosPitch * distance,
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
}

function globeCameraDistance(zoom: number): number {
  const clamped = Math.max(0.35, Math.min(4, Number.isFinite(zoom) ? zoom : 1));
  return 3.15 / Math.sqrt(clamped);
}

function clampPitch(value: number): number {
  const limit = Math.PI / 2 - 0.06;
  return Math.max(-limit, Math.min(limit, value));
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
    const tint = index % 7 === 0
      ? new THREE.Color(0xbfd8ff)
      : index % 5 === 0
        ? new THREE.Color(0xffdfb0)
        : new THREE.Color(0xf4f7ff);
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
    depthWrite: false,
  }));
}

function disposeObjectTree(root: THREE.Object3D): void {
  const disposedTextures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const rendered = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    rendered.geometry?.dispose();
    const materials = Array.isArray(rendered.material)
      ? rendered.material
      : rendered.material
        ? [rendered.material]
        : [];
    for (const material of materials) {
      const textured = material as THREE.Material & { map?: THREE.Texture | null };
      if (textured.map && !disposedTextures.has(textured.map)) {
        textured.map.dispose();
        disposedTextures.add(textured.map);
      }
      material.dispose();
    }
  });
}
