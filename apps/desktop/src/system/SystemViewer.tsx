import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AirlessRockyBodyArtifact, OrbitalPresentationBody, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import type { StellarSurfaceEnrichmentController } from '../enrichment/useStellarSurfaceEnrichment';
import type { SystemSimulationClock } from '../simulation/systemSimulationClock';
import type { BodyGenerationQueueController } from '../enrichment/useBodyGenerationQueue';
import { airlessArtifactForBody } from '@world-forge/generation-runtime/enrichment/bodyGenerationLifecycle';
import { BodyGenerationPanel } from './BodyGenerationPanel';
import { StellarSurfacePanel } from './StellarSurfacePanel';
import { createStellarCoronaMaterial, createStellarCoronaStreamers, createStellarSurfaceMaterial } from './stellarSurfacePresentation';
import { createAirlessBodyMesh } from './airlessBodyPresentation';
import { SystemSimulationControls } from '../globe/SystemSimulationControls';
import { deterministicStarDirections } from '../globe/orbitalPresentation';
import {
  buildSystemCatalog,
  formatSystemBodyKind,
  systemDisplayBodySize,
  systemDisplayOrbitRadius,
  systemDisplayPositions,
  systemOrbitPathPoints,
  systemStarVisualScale,
  type SystemCatalogEntry,
  type SystemScaleMode
} from './systemPresentation';
import '../globe/globeSimulation.css';
import './systemViewer.css';

type CameraOrbit = { yaw: number; pitch: number };
type BodySceneRecord = {
  group: THREE.Group;
  displaySize: number;
  materialMode: 'scaffold-solid' | 'placeholder-wireframe' | 'airless-rocky-v1' | 'stellar-surface-v1';
};
type OrbitSceneRecord = {
  line: THREE.LineLoop;
  body: OrbitalPresentationBody;
};

export function SystemViewer({
  project,
  orbitalContext,
  simulationClock,
  bodyGeneration,
  stellarSurface,
  zoom,
  onZoom,
  onOpenGlobe
}: {
  project: WorldProject;
  orbitalContext: SystemOrbitalContextArtifact | null;
  simulationClock: SystemSimulationClock;
  bodyGeneration: BodyGenerationQueueController;
  stellarSurface: StellarSurfaceEnrichmentController;
  zoom: number;
  onZoom: (event: WheelEvent) => void;
  onOpenGlobe: (bodyId: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraOrbitRef = useRef<CameraOrbit>({ yaw: 0.58, pitch: 0.34 });
  const selectedBodyIdRef = useRef('');
  const focusedBodyIdRef = useRef('');
  const [scaleMode, setScaleMode] = useState<SystemScaleMode>('compressed');
  const [showOrbitPaths, setShowOrbitPaths] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedBodyId, setSelectedBodyId] = useState('');
  const [focusedBodyId, setFocusedBodyId] = useState('');
  const catalog = useMemo(
    () => orbitalContext ? buildSystemCatalog(project, orbitalContext) : [],
    [orbitalContext?.artifactSignature, project.bodyGeneration?.updatedAt, project.projectId, project.projectName]
  );
  const selectedEntry = catalog.find((entry) => entry.id === selectedBodyId) ?? null;

  useEffect(() => {
    if (!orbitalContext) {
      setSelectedBodyId('');
      setFocusedBodyId('');
      return;
    }
    setSelectedBodyId((current) => catalog.some((entry) => entry.id === current)
      ? current
      : orbitalContext.payload.primaryBodyId);
    setFocusedBodyId((current) => catalog.some((entry) => entry.id === current)
      ? current
      : orbitalContext.payload.primaryBodyId);
  }, [catalog, orbitalContext?.artifactSignature]);

  useEffect(() => {
    selectedBodyIdRef.current = selectedBodyId;
  }, [selectedBodyId]);

  useEffect(() => {
    focusedBodyIdRef.current = focusedBodyId;
  }, [focusedBodyId]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    applySystemCamera(camera, systemCameraDistance(zoom), cameraOrbitRef.current);
    camera.updateProjectionMatrix();
  }, [zoom]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !orbitalContext) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x01040a, 1);
    renderer.domElement.style.touchAction = 'none';
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x01040a, 0.018);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 180);
    applySystemCamera(camera, systemCameraDistance(zoom), cameraOrbitRef.current);
    cameraRef.current = camera;

    const starField = createSystemStarField(orbitalContext.seed);
    scene.add(starField);
    scene.add(new THREE.AmbientLight(0x7890a8, 0.28));

    const bodyRecords = new Map<string, BodySceneRecord>();
    const orbitRecords = new Map<string, OrbitSceneRecord>();
    const starEntry = catalog.find((entry) => entry.kind === 'star');
    const starGroup = new THREE.Group();
    starGroup.userData.systemBodyId = orbitalContext.payload.star.id;
    const stellarArtifact = stellarSurface.artifact;
    const starMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 64, 32),
      stellarArtifact
        ? createStellarSurfaceMaterial(stellarArtifact)
        : new THREE.MeshBasicMaterial({ color: orbitalContext.payload.star.colorHex })
    );
    starMesh.userData.systemBodyId = orbitalContext.payload.star.id;
    starGroup.add(starMesh);
    const starGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.62 * (stellarArtifact?.payload.corona.haloScale ?? 1.26), 40, 20),
      stellarArtifact
        ? createStellarCoronaMaterial(stellarArtifact)
        : new THREE.MeshBasicMaterial({
          color: orbitalContext.payload.star.colorHex,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          side: THREE.BackSide
        })
    );
    starGlow.userData.systemBodyId = orbitalContext.payload.star.id;
    starGroup.add(starGlow);
    if (showLabels && starEntry) starGroup.add(createBodyLabelSprite(starEntry.label, 'generated', 0.94));
    scene.add(starGroup);
    bodyRecords.set(orbitalContext.payload.star.id, { group: starGroup, displaySize: 0.62, materialMode: stellarArtifact ? 'stellar-surface-v1' : 'scaffold-solid' });

    const starLight = new THREE.PointLight(orbitalContext.payload.star.colorHex, 6.4, 80, 1.35);
    scene.add(starLight);

    for (const entry of catalog) {
      if (!entry.body) continue;
      const requestedFidelity = project.bodyGeneration?.records[entry.id]?.requestedFidelity ?? 'preview';
      const generatedArtifact = airlessArtifactForBody(project, orbitalContext, entry.id, requestedFidelity);
      const record = createBodySceneRecord(entry, showLabels, generatedArtifact);
      scene.add(record.group);
      bodyRecords.set(entry.id, record);
      if (showOrbitPaths) {
        const line = createOrbitLine(entry.body, scaleMode, entry.generationStatus);
        scene.add(line);
        orbitRecords.set(entry.id, { line, body: entry.body });
      }
    }

    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffd27d,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    selectionRing.renderOrder = 4;
    scene.add(selectionRing);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const drag = {
      active: false,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      resumePlaying: false
    };

    const onPointerDown = (event: PointerEvent) => {
      drag.active = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
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
      cameraOrbitRef.current.pitch = clamp(cameraOrbitRef.current.pitch + dy * 0.004, -1.12, 1.12);
      applySystemCamera(camera, systemCameraDistance(zoom), cameraOrbitRef.current);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!drag.active) return;
      const movement = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      drag.active = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      host.dataset.clockGrabState = 'released';
      if (drag.resumePlaying) simulationClock.setPlaying(true);
      if (movement > 4) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
      pointer.y = -(((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...bodyRecords.values()].map((record) => record.group), true);
      const bodyId = hits.map((hit) => bodyIdForObject(hit.object)).find(Boolean);
      if (bodyId) setSelectedBodyId(bodyId);
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (!drag.active) return;
      drag.active = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      host.dataset.clockGrabState = 'released';
      if (drag.resumePlaying) simulationClock.setPlaying(true);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerCancel);
    host.addEventListener('wheel', onZoom, { passive: false });

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

    let animationFrame = 0;
    const animate = (now: number) => {
      const simulationDays = simulationClock.currentDays(now);
      const positions = systemDisplayPositions(orbitalContext, simulationDays, scaleMode);
      const focusedId = focusedBodyIdRef.current || orbitalContext.payload.primaryBodyId;
      const focusedPosition = focusedId === orbitalContext.payload.star.id
        ? zeroPoint()
        : positions.get(focusedId) ?? positions.get(orbitalContext.payload.primaryBodyId) ?? zeroPoint();

      for (const [bodyId, record] of bodyRecords) {
        const position = bodyId === orbitalContext.payload.star.id
          ? zeroPoint()
          : positions.get(bodyId) ?? zeroPoint();
        record.group.position.set(
          position.x - focusedPosition.x,
          position.y - focusedPosition.y,
          position.z - focusedPosition.z
        );
        const body = orbitalContext.payload.bodies.find((candidate) => candidate.id === bodyId);
        if (body) record.group.rotation.y = simulationDays * Math.PI * 2 / Math.max(0.1, body.rotationPeriodHours / 24);
        else if (bodyId === orbitalContext.payload.star.id && stellarArtifact) record.group.rotation.y = simulationDays * Math.PI * 2 / Math.max(0.1, stellarArtifact.payload.rotationPeriodDays);
      }

      starLight.position.copy(starGroup.position);
      for (const { line, body } of orbitRecords.values()) {
        const center = body.kind === 'moon' && body.parentBodyId
          ? positions.get(body.parentBodyId) ?? zeroPoint()
          : zeroPoint();
        line.position.set(
          center.x - focusedPosition.x,
          center.y - focusedPosition.y,
          center.z - focusedPosition.z
        );
      }

      const referenceCameraDistance = systemCameraDistance(zoom);
      const starCameraDistance = camera.position.distanceTo(starGroup.position);
      const starVisualScale = systemStarVisualScale(starCameraDistance, referenceCameraDistance);
      starGroup.scale.setScalar(starVisualScale);
      const starApparentRadius = 0.62 * starVisualScale / Math.max(0.001, starCameraDistance);

      const selectedId = selectedBodyIdRef.current;
      const selectedRecord = bodyRecords.get(selectedId);
      if (selectedRecord) {
        selectionRing.visible = true;
        selectionRing.position.copy(selectedRecord.group.position);
        const visualSize = selectedId === orbitalContext.payload.star.id
          ? selectedRecord.displaySize * starVisualScale
          : selectedRecord.displaySize;
        const scale = Math.max(0.14, visualSize * 1.7);
        selectionRing.scale.setScalar(scale);
        selectionRing.lookAt(camera.position);
      } else {
        selectionRing.visible = false;
      }

      host.dataset.simulationDays = simulationDays.toFixed(6);
      host.dataset.cameraDistance = camera.position.length().toFixed(6);
      host.dataset.focusedBody = focusedId;
      host.dataset.selectedBodyMaterial = selectedRecord?.materialMode ?? 'none';
      host.dataset.starVisualScale = starVisualScale.toFixed(6);
      host.dataset.starApparentRadius = starApparentRadius.toFixed(6);
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      host.removeEventListener('wheel', onZoom);
      disposeScene(scene);
      renderer.dispose();
      host.replaceChildren();
      cameraRef.current = null;
    };
  }, [catalog, onZoom, orbitalContext?.artifactSignature, project.bodyGeneration?.updatedAt, project.enrichmentArtifacts, project.projectId, scaleMode, showLabels, showOrbitPaths, simulationClock, stellarSurface.artifact?.artifactSignature]);

  const primaryBodyId = orbitalContext?.payload.primaryBodyId ?? '';
  const starId = orbitalContext?.payload.star.id ?? '';
  const selectedDisplayRadius = selectedEntry?.body
    ? systemDisplayOrbitRadius(selectedEntry.body, scaleMode)
    : 0;
  const selectedFidelity = selectedBodyId ? project.bodyGeneration?.records[selectedBodyId]?.requestedFidelity ?? 'preview' : 'preview';
  const selectedGeneratedArtifact = selectedEntry?.body && orbitalContext
    ? airlessArtifactForBody(project, orbitalContext, selectedBodyId, selectedFidelity)
    : null;
  const canOpenSelectedGlobe = selectedBodyId === primaryBodyId
    || (selectedEntry?.kind === 'moon' && Boolean(selectedGeneratedArtifact));

  return (
    <div
      className="system-viewer"
      data-system-viewer={orbitalContext ? 'ready' : 'waiting'}
      data-system-scale-mode={scaleMode}
      data-system-body-count={catalog.length}
      data-system-selected-body={selectedBodyId || 'none'}
      data-system-focused-body={focusedBodyId || 'none'}
      data-system-orbit-paths={showOrbitPaths ? 'visible' : 'hidden'}
      data-system-labels={showLabels ? 'visible' : 'hidden'}
      data-system-body-queue={bodyGeneration.lifecycle?.queue.length ?? 0}
      data-system-active-body-generation={bodyGeneration.lifecycle?.activeBodyId ?? 'none'}
      data-stellar-surface-status={stellarSurface.status}
      data-system-distance-authority="physical-data-distinct-from-display"
    >
      <div ref={hostRef} className="system-render-surface" aria-label="Generated system viewer" />
      {!orbitalContext ? (
        <div className="system-viewer-loading" role="status">Preparing orbital context...</div>
      ) : (
        <>
          <section className="system-viewer-options" aria-label="System display options">
            <label htmlFor="system-distance-scale">
              <span>Distance</span>
              <select
                id="system-distance-scale"
                aria-label="System distance scale"
                value={scaleMode}
                onChange={(event) => setScaleMode(event.target.value as SystemScaleMode)}
              >
                <option value="compressed">Compressed overview</option>
                <option value="relative">Relative distance</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                aria-label="Show orbit paths"
                checked={showOrbitPaths}
                onChange={(event) => setShowOrbitPaths(event.target.checked)}
              />
              Orbit paths
            </label>
            <label>
              <input
                type="checkbox"
                aria-label="Show labels"
                checked={showLabels}
                onChange={(event) => setShowLabels(event.target.checked)}
              />
              Labels
            </label>
          </section>

          <section
            className="system-body-inspector"
            aria-label="System body inspector"
            data-body-generation-status={selectedEntry?.generationStatus ?? 'none'}
          >
            <div className="system-inspector-heading">
              <span>Selected body</span>
              <strong>{selectedEntry?.label ?? 'None'}</strong>
            </div>
            <label htmlFor="selected-system-body">
              <span>Body</span>
              <select
                id="selected-system-body"
                aria-label="Selected system body"
                value={selectedBodyId}
                onChange={(event) => setSelectedBodyId(event.target.value)}
              >
                {catalog.map((entry) => (
                  <option key={entry.id} value={entry.id} data-generation-status={entry.generationStatus}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <dl>
              <div><dt>Status</dt><dd>{selectedEntry?.generationStatus ?? 'N/A'}</dd></div>
              <div><dt>Type</dt><dd>{selectedEntry ? formatSystemBodyKind(selectedEntry.kind) : 'N/A'}</dd></div>
              <div><dt>ID</dt><dd title={selectedEntry?.id}>{selectedEntry?.id ?? 'N/A'}</dd></div>
              <div><dt>Parent</dt><dd title={selectedEntry?.parentBodyId ?? undefined}>{selectedEntry?.parentBodyId ?? 'System barycenter'}</dd></div>
              <div><dt>Physical orbit</dt><dd>{formatPhysicalOrbit(selectedEntry)}</dd></div>
              <div><dt>Display radius</dt><dd>{selectedEntry?.body ? `${selectedDisplayRadius.toFixed(2)} scene units` : 'N/A'}</dd></div>
              <div><dt>Period</dt><dd>{selectedEntry?.body ? `${formatNumber(selectedEntry.body.orbitalPeriodDays)} days` : 'N/A'}</dd></div>
              <div><dt>Size class</dt><dd>{selectedEntry?.body ? formatNumber(selectedEntry.body.sizeClass) : formatNumber(orbitalContext.payload.star.radiusSolar)}</dd></div>
              <div><dt>Mass class</dt><dd>{selectedEntry?.body ? formatNumber(selectedEntry.body.massClass) : `${formatNumber(orbitalContext.payload.star.massSolar)} solar`}</dd></div>
              <div><dt>Axial tilt</dt><dd>{selectedEntry?.body ? `${formatNumber(selectedEntry.body.axialTiltDeg)} deg` : 'N/A'}</dd></div>
            </dl>
            <div className="system-inspector-actions">
              <button
                type="button"
                className="primary-button"
                aria-label="Focus selected body"
                disabled={!selectedBodyId || focusedBodyId === selectedBodyId}
                onClick={() => setFocusedBodyId(selectedBodyId)}
              >
                Focus selected
              </button>
              <button
                type="button"
                aria-label="Zoom to selected body globe"
                disabled={!canOpenSelectedGlobe}
                title={canOpenSelectedGlobe ? 'Open Globe view centered on this generated body.' : 'Generate this moon before opening it as a globe.'}
                onClick={() => onOpenGlobe(selectedBodyId)}
              >
                Zoom to globe
              </button>
              <button
                type="button"
                aria-label="Return to primary"

                disabled={focusedBodyId === primaryBodyId}
                onClick={() => {
                  setSelectedBodyId(primaryBodyId);
                  setFocusedBodyId(primaryBodyId);
                }}
              >
                Return to primary
              </button>
            </div>
            {selectedBodyId === starId
              ? <StellarSurfacePanel controller={stellarSurface} />
              : <BodyGenerationPanel selectedEntry={selectedEntry} controller={bodyGeneration} />}
            <small>
              Physical orbital values remain authoritative. Body sizes and display distances are exaggerated for inspection.
            </small>
            {selectedBodyId === starId && <small>The generated star is the system origin for this bounded viewer.</small>}
          </section>

          <SystemSimulationControls clock={simulationClock} artifact={orbitalContext} />
        </>
      )}
    </div>
  );
}

function createBodySceneRecord(entry: SystemCatalogEntry, showLabel: boolean, generatedArtifact: AirlessRockyBodyArtifact | null): BodySceneRecord {
  const body = entry.body!;
  const group = new THREE.Group();
  group.userData.systemBodyId = entry.id;
  const displaySize = systemDisplayBodySize(body);
  const color = bodyColor(body.kind, entry.generationStatus);
  const material = entry.generationStatus === 'generated'
    ? new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04 })
    : new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: entry.generationStatus === 'generating' ? 0.94 : 0.78 });

  if (generatedArtifact && body.kind !== 'belt') {
    const mesh = createAirlessBodyMesh(generatedArtifact, displaySize);
    mesh.userData.systemBodyId = entry.id;
    group.add(mesh);
  } else if (body.kind === 'belt') {
    const belt = new THREE.Mesh(
      new THREE.TorusGeometry(displaySize * 1.75, Math.max(0.018, displaySize * 0.1), 8, 56),
      material
    );
    belt.userData.systemBodyId = entry.id;
    group.add(belt);
    const collider = new THREE.Mesh(
      new THREE.SphereGeometry(displaySize * 1.45, 16, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    collider.userData.systemBodyId = entry.id;
    group.add(collider);
  } else {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(displaySize, 32, 16), material);
    mesh.userData.systemBodyId = entry.id;
    group.add(mesh);
  }

  if (showLabel) group.add(createBodyLabelSprite(entry.label, entry.generationStatus, displaySize + 0.28));
  return {
    group,
    displaySize,
    materialMode: generatedArtifact ? 'airless-rocky-v1' : entry.generationStatus === 'generated' ? 'scaffold-solid' : 'placeholder-wireframe'
  };
}

function createOrbitLine(
  body: OrbitalPresentationBody,
  mode: SystemScaleMode,
  generationStatus: SystemCatalogEntry['generationStatus']
): THREE.LineLoop {
  const points = systemOrbitPathPoints(body, mode).map((point) => new THREE.Vector3(point.x, point.y, point.z));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: generationStatus === 'generated' ? 0x7aa8c4 : 0x506273,
    transparent: true,
    opacity: body.kind === 'moon' ? 0.42 : 0.58,
    depthWrite: false
  });
  return new THREE.LineLoop(geometry, material);
}

function createBodyLabelSprite(
  label: string,
  status: SystemCatalogEntry['generationStatus'],
  verticalOffset: number
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 72;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = '600 26px Segoe UI, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.strokeStyle = 'rgba(1, 4, 10, 0.95)';
    context.lineWidth = 7;
    context.strokeText(label, canvas.width / 2, canvas.height / 2);
    context.fillStyle = status === 'generated' ? '#f6e3ad' : status === 'generating' ? '#9ee6c3' : status === 'failed' ? '#ff9b94' : status === 'stale' ? '#f1c27d' : '#aebdca';
    context.fillText(label, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.position.set(0, verticalOffset, 0);
  sprite.scale.set(1.8, 0.34, 1);
  return sprite;
}

function createSystemStarField(seed: string): THREE.Points {
  const stars = deterministicStarDirections(`${seed}:system-view`, 620);
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  for (let index = 0; index < stars.length; index += 1) {
    const star = stars[index];
    const offset = index * 3;
    positions[offset] = star.x * 74;
    positions[offset + 1] = star.y * 74;
    positions[offset + 2] = star.z * 74;
    colors[offset] = star.brightness;
    colors[offset + 1] = star.brightness;
    colors[offset + 2] = Math.min(1, star.brightness * 1.08);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false })
  );
}

function bodyColor(kind: OrbitalPresentationBody['kind'], status: SystemCatalogEntry['generationStatus']): number {
  if (status === 'generating') return 0x7ed6ad;
  if (status === 'queued') return 0x79a9d6;
  if (status === 'failed') return 0xc56f68;
  if (status === 'stale') return 0xd2a35e;
  if (status !== 'generated') return kind === 'moon' ? 0x8d99a4 : 0x72879a;
  if (kind === 'gas-giant') return 0xc99b6b;
  if (kind === 'ice-giant') return 0x74a9bd;
  if (kind === 'dwarf') return 0x9c8f82;
  if (kind === 'belt') return 0x8d8171;
  if (kind === 'moon') return 0xaeb3b6;
  return 0x5e9e7c;
}

function bodyIdForObject(object: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const id = current.userData.systemBodyId;
    if (typeof id === 'string' && id) return id;
    current = current.parent;
  }
  return null;
}

function applySystemCamera(camera: THREE.PerspectiveCamera, distance: number, orbit: CameraOrbit): void {
  const horizontal = Math.cos(orbit.pitch) * distance;
  camera.position.set(
    Math.cos(orbit.yaw) * horizontal,
    Math.sin(orbit.pitch) * distance,
    Math.sin(orbit.yaw) * horizontal
  );
  camera.lookAt(0, 0, 0);
}

function systemCameraDistance(zoom: number): number {
  const safeZoom = clamp(zoom, 0.35, 8);
  return clamp(14.6 / Math.sqrt(safeZoom), 5.15, 26.5);
}

function formatPhysicalOrbit(entry: SystemCatalogEntry | null): string {
  if (!entry?.physicalOrbit) return entry?.kind === 'star' ? 'System origin' : 'N/A';
  return `${formatNumber(entry.physicalOrbit.value)} ${entry.physicalOrbit.unit}`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'N/A';
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function zeroPoint() {
  return { x: 0, y: 0, z: 0 };
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const rendered = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    rendered.geometry?.dispose();
    const materials = Array.isArray(rendered.material) ? rendered.material : rendered.material ? [rendered.material] : [];
    for (const material of materials) {
      const textured = material as THREE.Material & { map?: THREE.Texture };
      textured.map?.dispose();
      material.dispose();
    }
  });
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
