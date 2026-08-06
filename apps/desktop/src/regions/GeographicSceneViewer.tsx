import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type {
  GeographicScene,
  GeographicSceneMaterial,
} from '@world-forge/shared/geographicScene';

export type GeographicScenePresentation = 'natural' | 'elevation';

export type GeographicSceneTerrainBufferData = {
  patchId: string;
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
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
): THREE.Group {
  const group = new THREE.Group();
  group.name = `geographic-scene:${scene.signature}`;
  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  for (const data of buildGeographicSceneTerrainBufferData(scene, presentation)) {
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
    geometry.setIndex(surface.triangleIndices);
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

export function disposeGeographicSceneThreeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.dispose();
  });
}

export function GeographicSceneViewer({
  scene,
  presentation,
}: {
  scene: GeographicScene;
  presentation: GeographicScenePresentation;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x091119, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.replaceChildren(renderer.domElement);

    const threeScene = new THREE.Scene();
    const object = createGeographicSceneThreeObject(scene, presentation);
    threeScene.add(object);
    threeScene.add(new THREE.HemisphereLight(0xbfd9e6, 0x26321d, 1.65));
    const sun = new THREE.DirectionalLight(0xfff0d2, 2.2);
    sun.position.set(-1, -1.3, 2.4);
    sun.castShadow = true;
    threeScene.add(sun);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100_000);
    const spanX = scene.extent.max[0] - scene.extent.min[0];
    const spanY = scene.extent.max[1] - scene.extent.min[1];
    const span = Math.max(1, spanX, spanY);
    const centerX = (scene.extent.min[0] + scene.extent.max[0]) / 2;
    const centerY = (scene.extent.min[1] + scene.extent.max[1]) / 2;
    camera.position.set(centerX, centerY - span * 0.7, span * 0.9);
    camera.up.set(0, 0, 1);
    camera.lookAt(centerX, centerY, 0);

    const render = () => renderer.render(threeScene, camera);
    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const aspect = width / height;
      const halfHeight = span * 0.58;
      const halfWidth = halfHeight * aspect;
      camera.left = -halfWidth + centerX;
      camera.right = halfWidth + centerX;
      camera.top = halfHeight + centerY;
      camera.bottom = -halfHeight + centerY;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    return () => {
      observer.disconnect();
      disposeGeographicSceneThreeObject(object);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [presentation, scene]);

  return (
    <div
      ref={hostRef}
      className="geographic-scene-viewer"
      data-scene-signature={scene.signature}
      data-scene-presentation={presentation}
      aria-label={`2.5D geographic scene in ${presentation} presentation`}
    />
  );
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
