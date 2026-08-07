import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type {
  GeographicScene,
  GeographicSceneGeographicPoint,
  GeographicSceneMaterial,
  GeographicScenePoint3,
} from '@world-forge/shared/geographicScene';
import type { GeographicTileWindow } from '@world-forge/shared/geographicTileWindow';
import {
  createGeographicSceneCameraState,
  geographicPointForScenePosition,
  geographicSceneCameraPosition,
  geographicSceneViewMetrics,
  panGeographicSceneCameraState,
  resetGeographicSceneCameraState,
  rotateGeographicSceneCameraState,
  toggleGeographicScenePitch,
  zoomGeographicSceneCameraState,
  type GeographicSceneCameraFootprint,
  type GeographicSceneCameraState,
} from './geographicSceneInteraction';
import { createGeographicHexSceneThreeObject } from './geographicHexScene';

export type GeographicScenePresentation = 'natural' | 'elevation';
export type GeographicSceneInteractionKind = 'select' | 'open' | 'context';

export type GeographicScenePick = {
  sourceSampleId: string;
  patchId: string;
  position: GeographicScenePoint3;
  geographic: GeographicSceneGeographicPoint;
};

export type GeographicSceneTerrainBufferData = {
  patchId: string;
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
};

type GeographicTerrainPickData = {
  patchId: string;
  sourceSampleIds: readonly string[];
  geographicPoints: readonly GeographicSceneGeographicPoint[];
};

type GeographicSceneRuntime = {
  reset: () => void;
  togglePitch: () => void;
  rotate: (deltaAzimuthDeg: number) => void;
  zoom: (scale: number) => void;
};

export function buildGeographicSceneTerrainBufferData(
  scene: GeographicScene,
  presentation: GeographicScenePresentation,
): GeographicSceneTerrainBufferData[] {
  const materials = new Map(scene.materials.map((material) => [material.id, material]));
  const elevations = scene.terrainPatches.flatMap((patch) =>
    patch.vertices.map((vertex) => vertex.position[2]),
  );
  const minElevation = elevations.length > 0 ? Math.min(...elevations) : 0;
  const maxElevation = elevations.length > 0 ? Math.max(...elevations) : 1;

  return scene.terrainPatches.map((patch) => ({
    patchId: patch.id,
    positions: Float32Array.from(patch.vertices.flatMap((vertex) => vertex.position)),
    colors: Float32Array.from(
      patch.vertices.flatMap((vertex) => {
        const color =
          presentation === 'elevation'
            ? elevationColor(vertex.position[2], minElevation, maxElevation)
            : naturalColor(vertex.materialWeights, materials);
        return [color.r, color.g, color.b];
      }),
    ),
    indices: Uint32Array.from(patch.triangleIndices),
  }));
}

export function createGeographicSceneThreeObject(
  scene: GeographicScene,
  presentation: GeographicScenePresentation,
  tileWindow?: GeographicTileWindow,
  options: { showHexes?: boolean; selectedChildIndex?: number | null } = {},
): THREE.Group {
  if (tileWindow) {
    return createGeographicHexSceneThreeObject(scene, tileWindow, presentation, {
      showHexes: options.showHexes ?? true,
      selectedChildIndex: options.selectedChildIndex ?? null,
    });
  }

  const group = new THREE.Group();
  group.name = `geographic-scene:${scene.signature}`;
  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const patchById = new Map(scene.terrainPatches.map((patch) => [patch.id, patch]));

  for (const data of buildGeographicSceneTerrainBufferData(scene, presentation)) {
    const patch = patchById.get(data.patchId);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, terrainMaterial.clone());
    mesh.name = data.patchId;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.geographicTerrainPickData = {
      patchId: data.patchId,
      sourceSampleIds: patch?.vertices.map((vertex) => vertex.sourceSampleId) ?? [],
      geographicPoints: patch?.vertices.map((vertex) => vertex.geographic) ?? [],
    } satisfies GeographicTerrainPickData;
    group.add(mesh);
  }

  terrainMaterial.dispose();
  const materialById = new Map(scene.materials.map((material) => [material.id, material]));
  for (const surface of scene.waterSurfaces) {
    const material = materialById.get(surface.materialId);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(surface.vertices.flatMap((vertex) => vertex.position), 3),
    );
    geometry.setIndex(
      new THREE.BufferAttribute(Uint32Array.from(surface.triangleIndices), 1),
    );
    geometry.computeVertexNormals();
    const water = new THREE.Mesh(
      geometry,
      new THREE.MeshPhysicalMaterial({
        color: material?.baseColor ?? '#2f7fa6',
        transparent: true,
        opacity: material?.opacity ?? 0.72,
        roughness: material?.roughness ?? 0.38,
        metalness: material?.metalness ?? 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    water.name = surface.id;
    water.position.z = 0.02;
    water.receiveShadow = true;
    group.add(water);
  }

  return group;
}

export function pickGeographicSceneIntersection(
  intersection: THREE.Intersection<THREE.Object3D>,
): GeographicScenePick | null {
  if (!(intersection.object instanceof THREE.Mesh) || !intersection.face) return null;
  const pickData = intersection.object.userData.geographicTerrainPickData as GeographicTerrainPickData | undefined;
  if (!pickData) return null;
  const position = intersection.object.geometry.getAttribute('position');
  const localPoint = intersection.object.worldToLocal(intersection.point.clone());
  const candidateIndices = [intersection.face.a, intersection.face.b, intersection.face.c];
  let nearestIndex = candidateIndices[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const index of candidateIndices) {
    const dx = position.getX(index) - localPoint.x;
    const dy = position.getY(index) - localPoint.y;
    const dz = position.getZ(index) - localPoint.z;
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  const sourceSampleId = pickData.sourceSampleIds[nearestIndex];
  const geographic = pickData.geographicPoints[nearestIndex];
  if (!sourceSampleId || !geographic) return null;
  return {
    sourceSampleId,
    patchId: pickData.patchId,
    position: [position.getX(nearestIndex), position.getY(nearestIndex), position.getZ(nearestIndex)],
    geographic,
  };
}

export function disposeGeographicSceneThreeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.LineSegments)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.dispose();
  });
}

export function GeographicSceneViewer({
  scene,
  presentation,
  tileWindow,
  showHexes = true,
  selectedChildIndex = null,
  selectedSourceSampleId = null,
  onPick,
  onCameraFootprintChange,
}: {
  scene: GeographicScene;
  presentation: GeographicScenePresentation;
  tileWindow?: GeographicTileWindow;
  showHexes?: boolean;
  selectedChildIndex?: number | null;
  selectedSourceSampleId?: string | null;
  onPick?: (
    pick: GeographicScenePick,
    interaction: GeographicSceneInteractionKind,
    pointer: { clientX: number; clientY: number },
  ) => void;
  onCameraFootprintChange?: (footprint: GeographicSceneCameraFootprint) => void;
}) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<GeographicSceneRuntime | null>(null);
  const cameraStateRef = useRef<{ signature: string; state: GeographicSceneCameraState } | null>(null);
  const onPickRef = useRef(onPick);
  const onCameraFootprintChangeRef = useRef(onCameraFootprintChange);
  onPickRef.current = onPick;
  onCameraFootprintChangeRef.current = onCameraFootprintChange;

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    if (cameraStateRef.current?.signature !== scene.signature) {
      cameraStateRef.current = {
        signature: scene.signature,
        state: createGeographicSceneCameraState(scene),
      };
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x091119, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', `Interactive 2.5D geographic scene in ${presentation} presentation`);
    renderer.domElement.style.touchAction = 'none';
    host.replaceChildren(renderer.domElement);

    const threeScene = new THREE.Scene();
    const object = createGeographicSceneThreeObject(scene, presentation, tileWindow, {
      showHexes,
      selectedChildIndex,
    });
    threeScene.add(object);
    threeScene.add(new THREE.AmbientLight(0xffffff, 0.42));
    threeScene.add(new THREE.HemisphereLight(0xcfe6ee, 0x253018, 1.25));
    const sun = new THREE.DirectionalLight(0xfff0d2, 1.85);
    sun.position.set(-1, -1.3, 2.4);
    sun.castShadow = true;
    threeScene.add(sun);

    const spanX = scene.extent.max[0] - scene.extent.min[0];
    const spanY = scene.extent.max[1] - scene.extent.min[1];
    const span = Math.max(1, spanX, spanY);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, span * 20);
    camera.up.set(0, 0, 1);
    const raycaster = new THREE.Raycaster();
    const footprintPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const marker = createSelectionMarker(scene, selectedSourceSampleId);
    if (marker) threeScene.add(marker);

    const updateCamera = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const aspect = width / height;
      const state = cameraStateRef.current?.state ?? createGeographicSceneCameraState(scene);
      const metrics = geographicSceneViewMetrics(scene, aspect, state, height);
      camera.left = -metrics.halfWidth;
      camera.right = metrics.halfWidth;
      camera.top = metrics.halfHeight;
      camera.bottom = -metrics.halfHeight;
      const position = geographicSceneCameraPosition(scene, state);
      camera.position.set(position[0], position[1], position[2]);
      camera.lookAt(state.focus[0], state.focus[1], 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    };

    const emitCameraFootprint = () => {
      const corners: GeographicSceneGeographicPoint[] = [];
      for (const [x, y] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) {
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const point = raycaster.ray.intersectPlane(footprintPlane, new THREE.Vector3());
        if (!point) return;
        corners.push(geographicPointForScenePosition(scene, [point.x, point.y]));
      }
      onCameraFootprintChangeRef.current?.({ corners });
    };

    const render = () => {
      updateCamera();
      renderer.render(threeScene, camera);
      emitCameraFootprint();
    };

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      render();
    };

    const updateState = (state: GeographicSceneCameraState) => {
      cameraStateRef.current = { signature: scene.signature, state };
      render();
    };

    const currentState = () => cameraStateRef.current?.state ?? createGeographicSceneCameraState(scene);

    runtimeRef.current = {
      reset: () => updateState(resetGeographicSceneCameraState(scene)),
      togglePitch: () => updateState(toggleGeographicScenePitch(currentState())),
      rotate: (deltaAzimuthDeg) => updateState(rotateGeographicSceneCameraState(currentState(), deltaAzimuthDeg)),
      zoom: (scale) => updateState(zoomGeographicSceneCameraState(scene, currentState(), scale)),
    };

    const pickAt = (
      clientX: number,
      clientY: number,
      interaction: GeographicSceneInteractionKind,
    ) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const y = -(((clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersection = raycaster
        .intersectObject(object, true)
        .find((candidate) => candidate.object.userData.geographicTerrainPickData);
      if (!intersection) return;
      const pick = pickGeographicSceneIntersection(intersection);
      if (pick) onPickRef.current?.(pick, interaction, { clientX, clientY });
    };

    let drag: {
      pointerId: number;
      mode: 'pan' | 'rotate';
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
      moved: boolean;
    } | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.button !== 1) return;
      renderer.domElement.focus();
      renderer.domElement.setPointerCapture(event.pointerId);
      drag = {
        pointerId: event.pointerId,
        mode: event.button === 1 || event.altKey ? 'rotate' : 'pan',
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
      };
      renderer.domElement.classList.add('dragging');
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - drag.lastX;
      const deltaY = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
      if (drag.mode === 'rotate') {
        updateState(rotateGeographicSceneCameraState(currentState(), deltaX * 0.18, -deltaY * 0.12));
      } else {
        updateState(panGeographicSceneCameraState(
          scene,
          currentState(),
          deltaX,
          deltaY,
          Math.max(1, host.clientHeight),
          Math.max(0.01, host.clientWidth / Math.max(1, host.clientHeight)),
        ));
      }
    };

    const finishPointer = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const shouldPick = !drag.moved && event.button === 0;
      drag = null;
      renderer.domElement.classList.remove('dragging');
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      if (shouldPick) pickAt(event.clientX, event.clientY, 'select');
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      updateState(zoomGeographicSceneCameraState(scene, currentState(), Math.exp(-event.deltaY * 0.0015)));
    };

    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      pickAt(event.clientX, event.clientY, 'open');
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      pickAt(event.clientX, event.clientY, 'context');
    };

    const onKeyDown = (event: KeyboardEvent) => {
      let next: GeographicSceneCameraState | null = null;
      if (event.key === '+' || event.key === '=') next = zoomGeographicSceneCameraState(scene, currentState(), 1.25);
      else if (event.key === '-' || event.key === '_') next = zoomGeographicSceneCameraState(scene, currentState(), 0.8);
      else if (event.key === 'ArrowLeft') next = panGeographicSceneCameraState(scene, currentState(), 60, 0, host.clientHeight, host.clientWidth / Math.max(1, host.clientHeight));
      else if (event.key === 'ArrowRight') next = panGeographicSceneCameraState(scene, currentState(), -60, 0, host.clientHeight, host.clientWidth / Math.max(1, host.clientHeight));
      else if (event.key === 'ArrowUp') next = panGeographicSceneCameraState(scene, currentState(), 0, 60, host.clientHeight, host.clientWidth / Math.max(1, host.clientHeight));
      else if (event.key === 'ArrowDown') next = panGeographicSceneCameraState(scene, currentState(), 0, -60, host.clientHeight, host.clientWidth / Math.max(1, host.clientHeight));
      else if (event.key.toLowerCase() === 'r') next = resetGeographicSceneCameraState(scene);
      else if (event.key.toLowerCase() === 't') next = toggleGeographicScenePitch(currentState());
      else if (event.key === '[') next = rotateGeographicSceneCameraState(currentState(), -5);
      else if (event.key === ']') next = rotateGeographicSceneCameraState(currentState(), 5);
      if (!next) return;
      event.preventDefault();
      updateState(next);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', finishPointer);
    renderer.domElement.addEventListener('pointercancel', finishPointer);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('dblclick', onDoubleClick);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('keydown', onKeyDown);

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    return () => {
      runtimeRef.current = null;
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', finishPointer);
      renderer.domElement.removeEventListener('pointercancel', finishPointer);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('dblclick', onDoubleClick);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('keydown', onKeyDown);
      disposeGeographicSceneThreeObject(object);
      if (marker) {
        marker.geometry.dispose();
        marker.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [presentation, scene, selectedChildIndex, selectedSourceSampleId, showHexes, tileWindow]);

  return (
    <div
      className="geographic-scene-viewer"
      data-scene-signature={scene.signature}
      data-scene-presentation={presentation}
      data-scene-geometry={tileWindow ? 'stepped-hex' : 'continuous-patch'}
    >
      <div ref={canvasHostRef} className="geographic-scene-canvas-host" />
      <div className="geographic-scene-controls" role="group" aria-label="2.5D map view controls">
        <button type="button" onClick={() => runtimeRef.current?.reset()}>Reset</button>
        <button type="button" onClick={() => runtimeRef.current?.togglePitch()}>Tilt</button>
        <button type="button" aria-label="Rotate map left" onClick={() => runtimeRef.current?.rotate(-5)}>↺</button>
        <button type="button" aria-label="Rotate map right" onClick={() => runtimeRef.current?.rotate(5)}>↻</button>
        <button type="button" aria-label="Zoom out" onClick={() => runtimeRef.current?.zoom(0.8)}>−</button>
        <button type="button" aria-label="Zoom in" onClick={() => runtimeRef.current?.zoom(1.25)}>+</button>
      </div>
      <div className="geographic-scene-help">Drag to pan · wheel to zoom · Alt-drag to tilt/rotate</div>
    </div>
  );
}

function createSelectionMarker(
  scene: GeographicScene,
  sourceSampleId: string | null,
): THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null {
  if (!sourceSampleId) return null;
  const vertex = scene.terrainPatches
    .flatMap((patch) => patch.vertices)
    .find((candidate) => candidate.sourceSampleId === sourceSampleId);
  if (!vertex) return null;
  const span = Math.max(
    1,
    scene.extent.max[0] - scene.extent.min[0],
    scene.extent.max[1] - scene.extent.min[1],
  );
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(span * 0.012, 18, 12),
    new THREE.MeshBasicMaterial({ color: '#fff1a8', depthTest: false }),
  );
  marker.name = `geographic-scene-selection:${sourceSampleId}`;
  marker.position.set(vertex.position[0], vertex.position[1], vertex.position[2] + span * 0.02);
  marker.renderOrder = 20;
  return marker;
}

function naturalColor(
  weights: readonly { materialId: string; weight: number }[],
  materials: ReadonlyMap<string, GeographicSceneMaterial>,
): THREE.Color {
  const color = new THREE.Color(0x777777);
  if (weights.length === 0) return color;
  color.setRGB(0, 0, 0);
  let total = 0;
  for (const weight of weights) {
    const material = materials.get(weight.materialId);
    if (!material || weight.weight <= 0) continue;
    const source = new THREE.Color(material.baseColor);
    color.r += source.r * weight.weight;
    color.g += source.g * weight.weight;
    color.b += source.b * weight.weight;
    total += weight.weight;
  }
  if (total <= 0) return color.set(0x777777);
  return color.multiplyScalar(1 / total);
}

function elevationColor(value: number, min: number, max: number): THREE.Color {
  const ratio = max <= min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (ratio < 0.5) {
    return new THREE.Color('#24475b').lerp(new THREE.Color('#6f8f4e'), ratio * 2);
  }
  return new THREE.Color('#6f8f4e').lerp(new THREE.Color('#f0eee4'), (ratio - 0.5) * 2);
}
