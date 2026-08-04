import * as THREE from 'three';
import type { WorldProject } from '@world-forge/shared';
import type { AtmosphericPresentationDetailV1 } from '@world-forge/shared/worldBodyDetails';
import {
  worldBodyRecord,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';
import { decodeRgb565ToRgba } from '@world-forge/renderer';
import type { SystemCatalogEntry } from './systemPresentation';

export type ReferenceSystemBodyPresentation = {
  object: THREE.Object3D;
  materialMode: 'imported-atmospheric-rgb565' | 'derived-atmospheric-profile';
};

export function createReferenceSystemBodyPresentation(
  project: WorldProject,
  entry: SystemCatalogEntry,
  displaySize: number,
): ReferenceSystemBodyPresentation | null {
  const record = worldBodyRecord(project, entry.id);
  if (record?.detail?.kind !== 'atmospheric-presentation') return null;
  const detail = record.detail;
  const texture = atmosphericTexture(project, detail);
  const material = texture
    ? new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88, metalness: 0 })
    : new THREE.MeshStandardMaterial({
        color: detail.atmosphere.paletteHex[0] ?? '#8797a3',
        roughness: 0.9,
        metalness: 0,
      });
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(displaySize, 48, 24), material);
  sphere.userData.systemBodyId = entry.id;
  if (detail.shape.kind === 'oblate-spheroid') {
    const polarRatio = detail.shape.polarRadiusKm / Math.max(1, detail.shape.equatorialRadiusKm);
    sphere.scale.set(1, clamp(polarRatio, 0.72, 1), 1);
  }
  group.add(sphere);

  if (detail.rings) {
    const ringColor = detail.atmosphere.paletteHex.at(-1) ?? detail.atmosphere.paletteHex[0] ?? '#bca982';
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        displaySize * detail.rings.innerRadiusRatio,
        displaySize * detail.rings.outerRadiusRatio,
        96,
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
    ring.userData.systemBodyId = entry.id;
    group.add(ring);
  }

  group.userData.systemBodyId = entry.id;
  group.traverse((child) => { child.userData.systemBodyId = entry.id; });
  return {
    object: group,
    materialMode: texture ? 'imported-atmospheric-rgb565' : 'derived-atmospheric-profile',
  };
}

function atmosphericTexture(
  project: WorldProject,
  detail: AtmosphericPresentationDetailV1,
): THREE.DataTexture | null {
  const asset = detail.assets?.find((candidate) => candidate.role === 'albedo'
    && candidate.encoding === 'rgb565-le'
    && candidate.resolution);
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
  texture.needsUpdate = true;
  return texture;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
