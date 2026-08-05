import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import { worldBodyRecord } from '@world-forge/shared/worldBodies';
import type { SystemSimulationClock } from '../simulation/systemSimulationClock';
import { createBasicBodyPresentation } from '../presentation/basicBodyPresentation';
import type { GlobeBodyTarget } from './globeBodyTarget';
import { deterministicStarDirections, orbitalPositionAtDays } from './orbitalPresentation';
import { SystemSimulationControls } from './SystemSimulationControls';
import './globeSimulation.css';

type CameraOrbit = { yaw: number; pitch: number };

export function BasicBodyGlobeViewer({
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
  const cameraOrbitRef = useRef<CameraOrbit>({ yaw: 0.55, pitch: 0.08 });

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);
    camera.updateProjectionMatrix();
  }, [zoom]);

  useEffect(() => {
    const host = hostRef.current;
    const detail = target.basicDetail;
    if (!host || !detail) return;

    const record = worldBodyRecord(project, target.bodyId);
    const isStar = record?.bodyType === 'star' || target.bodyId === orbitalContext.payload.star.id;
    const axialTiltDeg = target.body?.axialTiltDeg ?? record?.physical?.axialTiltDeg ?? 0;
    const rotationPeriodHours = Math.max(
      0.08 * 24,
      Math.abs(target.body?.rotationPeriodHours ?? record?.physical?.rotationPeriodHours ?? 24),
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isStar;
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
    axialTiltGroup.rotation.z = THREE.MathUtils.degToRad(axialTiltDeg);

    const presentation = createBasicBodyPresentation(detail, 1, target.bodyId);
    spinGroup.add(presentation.object);

    scene.add(createStarfield(`${orbitalContext.seed}:${target.bodyId}:basic`));
    scene.add(new THREE.AmbientLight(isStar ? 0xffdca2 : 0x9fb5bd, isStar ? 0.8 : 0.3));
    const sun = new THREE.DirectionalLight(orbitalContext.payload.star.colorHex, isStar ? 0 : 3.25);
    sun.castShadow = !isStar;
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
      spinGroup.rotation.y = simulationDays * Math.PI * 2 / (rotationPeriodHours / 24);
      if (target.body) {
        const orbitalPosition = orbitalPositionAtDays(target.body, simulationDays);
        const starDirection = new THREE.Vector3(
          -orbitalPosition.x,
          -orbitalPosition.y,
          -orbitalPosition.z,
        );
        if (starDirection.lengthSq() < 0.000001) starDirection.set(-1, 0.25, -0.2);
        starDirection.normalize();
        sun.position.copy(starDirection).multiplyScalar(6.5);
      } else {
        sun.position.set(-5, 2, -2);
      }
      sun.target.updateMatrixWorld();
      sun.updateMatrixWorld();
      host.dataset.simulationDays = simulationDays.toFixed(6);
      host.dataset.bodySpinRadians = spinGroup.rotation.y.toFixed(6);
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
    target.basicDetail,
    target.body,
    target.bodyId,
    zoom,
  ]);

  const record = worldBodyRecord(project, target.bodyId);
  const presentationKind = record?.bodyType === 'star' ? 'Basic stellar presentation' : 'Basic reference presentation';

  return (
    <div
      className="globe-viewer"
      aria-label={`Basic globe for ${target.label}`}
      data-globe-target-body={target.bodyId}
      data-globe-target-mode={target.mode}
      data-globe-surface-material={target.basicDetail?.surface.emissiveHex
        ? 'basic-emissive-profile'
        : 'basic-matte-profile'}
      data-globe-surface-geometry={target.basicDetail?.shape.kind ?? 'unknown'}
      data-orbital-context="ready"
      data-system-star-light={record?.bodyType === 'star' ? 'self-emissive' : 'coupled'}
      data-frame-reference="fixed-world-camera-orbit"
      data-weather-presentation="not-applicable"
      data-seasonal-surface="not-applicable"
    >
      <div ref={hostRef} className="globe-render-surface" />
      <section className="globe-body-target-status" aria-label="Globe target">
        <span>Viewing</span>
        <strong>{target.label}</strong>
        <small>{presentationKind}</small>
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
    for (const material of materials) material.dispose();
  });
}
