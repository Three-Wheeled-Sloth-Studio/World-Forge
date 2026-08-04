import * as THREE from 'three';
import type { WorldProject } from '@world-forge/shared';
import type { AtmosphericPresentationDetailV1 } from '@world-forge/shared/worldBodyDetails';
import type { MultiBodyWorldProject } from '@world-forge/shared/worldBodies';
import { decodeRgb565ToRgba } from '@world-forge/renderer';

export type AtmosphericPresentationDetailLevel = 'system' | 'inspection';
export type AtmosphericPresentationMaterialMode =
  | 'imported-atmospheric-rgb565'
  | 'derived-atmospheric-profile';

export type AtmosphericBodyPresentation = {
  object: THREE.Group;
  materialMode: AtmosphericPresentationMaterialMode;
  polarScale: number;
};

export function createAtmosphericBodyPresentation(
  project: WorldProject,
  detail: AtmosphericPresentationDetailV1,
  displaySize: number,
  bodyId: string,
  detailLevel: AtmosphericPresentationDetailLevel = 'system',
): AtmosphericBodyPresentation {
  const materialMode = atmosphericPresentationMaterialMode(project, detail);
  const texture = materialMode === 'imported-atmospheric-rgb565'
    ? atmosphericTexture(project, detail)
    : null;
  const material = texture
    ? new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88, metalness: 0 })
    : new THREE.MeshStandardMaterial({
        color: detail.atmosphere.paletteHex[0] ?? '#8797a3',
        roughness: 0.9,
        metalness: 0,
      });
  const segments = detailLevel === 'inspection'
    ? { width: 192, height: 96 }
    : { width: 48, height: 24 };
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(displaySize, segments.width, segments.height),
    material,
  );
  const polarScale = atmosphericPolarScale(detail);
  sphere.scale.set(1, polarScale, 1);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  sphere.userData.systemBodyId = bodyId;
  sphere.userData.surfaceGeometry = detail.shape.kind === 'oblate-spheroid'
    ? 'smooth-oblate-spheroid'
    : 'smooth-sphere';
  sphere.userData.polarScale = polarScale;
  group.add(sphere);

  if (detail.rings) {
    const ringColor = detail.atmosphere.paletteHex.at(-1)
      ?? detail.atmosphere.paletteHex[0]
      ?? '#bca982';
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        displaySize * detail.rings.innerRadiusRatio,
        displaySize * detail.rings.outerRadiusRatio,
        detailLevel === 'inspection' ? 192 : 96,
      ),
      new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: detail.rings.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = detail.rings.tiltDeg * Math.PI / 180;
    ring.userData.systemBodyId = bodyId;
    ring.userData.surfaceGeometry = 'separate-ring-plane';
    group.add(ring);
  }

  group.userData.systemBodyId = bodyId;
  group.userData.surfaceGeometry = detail.shape.kind === 'oblate-spheroid'
    ? 'smooth-oblate-spheroid'
    : 'smooth-sphere';
  group.userData.polarScale = polarScale;
  group.userData.materialMode = materialMode;
  group.traverse((child) => { child.userData.systemBodyId = bodyId; });

  return {
    object: group,
    materialMode,
    polarScale,
  };
}

export function atmosphericPresentationMaterialMode(
  project: WorldProject,
  detail: AtmosphericPresentationDetailV1,
): AtmosphericPresentationMaterialMode {
  const asset = atmosphericTextureAsset(detail);
  if (!asset?.resolution) return 'derived-atmospheric-profile';
  const bytes = (project as MultiBodyWorldProject).bodyAssetPayloads?.[asset.assetId];
  return bytes?.byteLength === asset.resolution.width * asset.resolution.height * 2
    ? 'imported-atmospheric-rgb565'
    : 'derived-atmospheric-profile';
}

export function atmosphericPolarScale(detail: AtmosphericPresentationDetailV1): number {
  if (detail.shape.kind !== 'oblate-spheroid') return 1;
  const ratio = detail.shape.polarRadiusKm / detail.shape.equatorialRadiusKm;
  return Math.max(0.1, Math.min(1, ratio));
}

function atmosphericTextureAsset(
  detail: AtmosphericPresentationDetailV1,
) {
  return detail.assets?.find((candidate) => candidate.role === 'albedo'
    && candidate.encoding === 'rgb565-le'
    && candidate.resolution);
}

function atmosphericTexture(
  project: WorldProject,
  detail: AtmosphericPresentationDetailV1,
): THREE.DataTexture | null {
  const asset = atmosphericTextureAsset(detail);
  if (!asset?.resolution) return null;
  const bytes = (project as MultiBodyWorldProject).bodyAssetPayloads?.[asset.assetId];
  if (!bytes || bytes.byteLength !== asset.resolution.width * asset.resolution.height * 2) return null;
  const rgba = decodeRgb565ToRgba(bytes, asset.resolution.width, asset.resolution.height);
  const texture = new THREE.DataTexture(
    Uint8Array.from(rgba),
    asset.resolution.width,
    asset.resolution.height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
