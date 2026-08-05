import * as THREE from 'three';
import type { WorldProject } from '@world-forge/shared';
import type { RasterSurfaceDetailV1 } from '@world-forge/shared/worldBodyDetails';
import {
  decodeRgb565ToRgba,
  referenceRasterSurfaceForBody,
} from '@world-forge/renderer';

export type ReferenceRasterPresentationDetailLevel = 'system' | 'inspection';
export type ReferenceRasterPresentationMaterialMode = 'imported-reference-rgb565';

export type ReferenceRasterBodyPresentation = {
  object: THREE.Group;
  materialMode: ReferenceRasterPresentationMaterialMode;
  scale: { x: number; y: number; z: number };
  sourceResolution: { width: number; height: number };
};

export function createReferenceRasterBodyPresentation(
  project: WorldProject,
  detail: RasterSurfaceDetailV1,
  displaySize: number,
  bodyId: string,
  detailLevel: ReferenceRasterPresentationDetailLevel = 'system',
): ReferenceRasterBodyPresentation {
  const staged = referenceRasterSurfaceForBody(project, bodyId);
  if (!staged?.albedo) {
    throw new Error(`Reference raster presentation for ${bodyId} requires a hydrated RGB565 albedo asset.`);
  }
  const rgba = decodeRgb565ToRgba(
    staged.albedo.bytes,
    staged.albedo.width,
    staged.albedo.height,
  );
  const texture = new THREE.DataTexture(
    Uint8Array.from(rgba),
    staged.albedo.width,
    staged.albedo.height,
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

  const segments = detailLevel === 'inspection'
    ? { width: 192, height: 96 }
    : { width: 48, height: 24 };
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.92,
    metalness: 0,
  });
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(displaySize, segments.width, segments.height),
    material,
  );
  const scale = referenceRasterShapeScale(detail);
  sphere.scale.set(scale.x, scale.y, scale.z);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  sphere.userData.systemBodyId = bodyId;
  sphere.userData.surfaceGeometry = referenceRasterGeometryLabel(detail);
  sphere.userData.referenceRasterAssetId = staged.albedo.assetId;
  sphere.userData.referenceRasterResolution = `${staged.albedo.width}x${staged.albedo.height}`;

  const group = new THREE.Group();
  group.add(sphere);
  group.userData.systemBodyId = bodyId;
  group.userData.surfaceGeometry = referenceRasterGeometryLabel(detail);
  group.userData.materialMode = 'imported-reference-rgb565';
  group.userData.referenceRasterAssetId = staged.albedo.assetId;
  group.userData.referenceRasterResolution = `${staged.albedo.width}x${staged.albedo.height}`;

  return {
    object: group,
    materialMode: 'imported-reference-rgb565',
    scale,
    sourceResolution: { width: staged.albedo.width, height: staged.albedo.height },
  };
}

export function referenceRasterShapeScale(
  detail: RasterSurfaceDetailV1,
): { x: number; y: number; z: number } {
  switch (detail.shape.kind) {
    case 'sphere':
      return { x: 1, y: 1, z: 1 };
    case 'oblate-spheroid': {
      const ratio = detail.shape.polarRadiusKm / detail.shape.equatorialRadiusKm;
      return { x: 1, y: clampScale(ratio), z: 1 };
    }
    case 'triaxial-ellipsoid': {
      const maximum = Math.max(detail.shape.axisAKm, detail.shape.axisBKm, detail.shape.axisCKm);
      return {
        x: clampScale(detail.shape.axisAKm / maximum),
        y: clampScale(detail.shape.axisCKm / maximum),
        z: clampScale(detail.shape.axisBKm / maximum),
      };
    }
  }
}

export function referenceRasterGeometryLabel(detail: RasterSurfaceDetailV1): string {
  switch (detail.shape.kind) {
    case 'sphere': return 'smooth-reference-sphere';
    case 'oblate-spheroid': return 'smooth-reference-oblate-spheroid';
    case 'triaxial-ellipsoid': return 'smooth-reference-triaxial-ellipsoid';
  }
}

function clampScale(value: number): number {
  return Math.max(0.1, Math.min(1, value));
}
