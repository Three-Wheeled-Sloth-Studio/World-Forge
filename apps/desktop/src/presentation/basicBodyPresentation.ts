import * as THREE from 'three';
import type { BasicPresentationDetailV1 } from '@world-forge/shared/worldBodyDetails';

export type BasicBodyPresentationMaterialMode = 'basic-matte-profile' | 'basic-emissive-profile';

export type BasicBodyPresentation = {
  object: THREE.Group;
  materialMode: BasicBodyPresentationMaterialMode;
  geometryScale: { x: number; y: number; z: number };
};

export function createBasicBodyPresentation(
  detail: BasicPresentationDetailV1,
  displaySize: number,
  bodyId: string,
): BasicBodyPresentation {
  const geometryScale = basicPresentationGeometryScale(detail);
  const primaryColor = detail.surface.paletteHex[0] ?? '#8f8f8f';
  const emissive = detail.surface.emissiveHex;
  const materialMode: BasicBodyPresentationMaterialMode = emissive
    ? 'basic-emissive-profile'
    : 'basic-matte-profile';
  const material = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: detail.surface.roughness,
    metalness: detail.surface.metalness,
    emissive: emissive ?? '#000000',
    emissiveIntensity: emissive ? detail.surface.emissiveIntensity ?? 1 : 0,
  });

  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(displaySize, 160, 80),
    material,
  );
  sphere.scale.set(geometryScale.x, geometryScale.y, geometryScale.z);
  sphere.castShadow = !emissive;
  sphere.receiveShadow = !emissive;
  sphere.userData.systemBodyId = bodyId;
  sphere.userData.surfaceGeometry = basicPresentationGeometryLabel(detail);
  group.add(sphere);

  if (detail.halo) {
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(displaySize * detail.halo.scale, 96, 48),
      new THREE.MeshBasicMaterial({
        color: detail.halo.colorHex,
        transparent: true,
        opacity: detail.halo.opacity,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    );
    halo.scale.set(geometryScale.x, geometryScale.y, geometryScale.z);
    halo.userData.systemBodyId = bodyId;
    halo.userData.surfaceGeometry = 'basic-halo-shell';
    group.add(halo);
  }

  if (detail.rings) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        displaySize * detail.rings.innerRadiusRatio,
        displaySize * detail.rings.outerRadiusRatio,
        192,
      ),
      new THREE.MeshBasicMaterial({
        color: detail.rings.colorHex ?? detail.surface.paletteHex.at(-1) ?? primaryColor,
        transparent: true,
        opacity: detail.rings.opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = THREE.MathUtils.degToRad(detail.rings.tiltDeg);
    ring.userData.systemBodyId = bodyId;
    ring.userData.surfaceGeometry = 'basic-ring-plane';
    group.add(ring);
  }

  group.userData.systemBodyId = bodyId;
  group.userData.surfaceGeometry = basicPresentationGeometryLabel(detail);
  group.userData.materialMode = materialMode;
  group.traverse((child) => { child.userData.systemBodyId = bodyId; });

  return { object: group, materialMode, geometryScale };
}

export function basicPresentationGeometryScale(
  detail: Pick<BasicPresentationDetailV1, 'shape'>,
): { x: number; y: number; z: number } {
  if (detail.shape.kind === 'sphere') return { x: 1, y: 1, z: 1 };
  if (detail.shape.kind === 'oblate-spheroid') {
    return {
      x: 1,
      y: clampScale(detail.shape.polarRadiusKm / detail.shape.equatorialRadiusKm),
      z: 1,
    };
  }
  const maximum = Math.max(detail.shape.axisAKm, detail.shape.axisBKm, detail.shape.axisCKm);
  return {
    x: clampScale(detail.shape.axisAKm / maximum),
    y: clampScale(detail.shape.axisCKm / maximum),
    z: clampScale(detail.shape.axisBKm / maximum),
  };
}

export function basicPresentationGeometryLabel(
  detail: Pick<BasicPresentationDetailV1, 'shape'>,
): string {
  if (detail.shape.kind === 'sphere') return 'smooth-sphere';
  if (detail.shape.kind === 'oblate-spheroid') return 'smooth-oblate-spheroid';
  return 'smooth-triaxial-ellipsoid';
}

function clampScale(value: number): number {
  return Math.max(0.1, Math.min(1, Number.isFinite(value) ? value : 1));
}
