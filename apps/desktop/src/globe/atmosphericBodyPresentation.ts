import * as THREE from 'three';
import type { AtmosphericPresentationDetailV1, WorldBodyAssetRefV1 } from '@world-forge/shared/worldBodyDetails';
import type { WorldBodyAssetPayloads } from '@world-forge/shared/worldBodies';

export type ResolvedAtmosphericAppearance = {
  asset: WorldBodyAssetRefV1;
  bytes: Uint8Array;
};

export type AtmosphericPresentationObject = {
  object: THREE.Group;
  materialMode: 'imported-atmospheric-map' | 'derived-atmospheric-profile';
  textureDetail: string;
  sourceAssetId: string | null;
  dispose: () => void;
};

export function resolveAtmosphericAppearance(
  detail: AtmosphericPresentationDetailV1,
  payloads: WorldBodyAssetPayloads | undefined,
): ResolvedAtmosphericAppearance | null {
  if (!payloads) return null;
  for (const role of ['albedo', 'clouds'] as const) {
    const asset = detail.assets?.find((candidate) => candidate.role === role);
    const bytes = asset ? payloads[asset.assetId] : undefined;
    if (asset && bytes?.byteLength) return { asset, bytes };
  }
  return null;
}

export function atmosphericPolarScale(detail: AtmosphericPresentationDetailV1): number {
  if (detail.shape.kind !== 'oblate-spheroid') return 1;
  return clamp(detail.shape.polarRadiusKm / detail.shape.equatorialRadiusKm, 0.6, 1);
}

export function createAtmosphericPresentationObject(
  detail: AtmosphericPresentationDetailV1,
  payloads: WorldBodyAssetPayloads | undefined,
  maxAnisotropy = 1,
): AtmosphericPresentationObject {
  const group = new THREE.Group();
  const appearance = resolveAtmosphericAppearance(detail, payloads);
  const fallbackColor = detail.atmosphere.paletteHex[0] ?? '#c8b69e';
  const surfaceMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(fallbackColor),
    roughness: 0.84,
    metalness: 0,
  });
  const surface = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 96), surfaceMaterial);
  surface.scale.y = atmosphericPolarScale(detail);
  surface.castShadow = true;
  surface.receiveShadow = true;
  group.add(surface);

  const hazeOpacity = clamp(detail.atmosphere.hazeStrength * 0.22, 0.015, 0.16);
  const haze = new THREE.Mesh(
    new THREE.SphereGeometry(1.026, 128, 64),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(detail.atmosphere.paletteHex.at(-1) ?? fallbackColor),
      transparent: true,
      opacity: hazeOpacity,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  haze.scale.y = atmosphericPolarScale(detail);
  group.add(haze);

  if (detail.rings) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(detail.rings.innerRadiusRatio, detail.rings.outerRadiusRatio, 192),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(detail.atmosphere.paletteHex[1] ?? fallbackColor),
        transparent: true,
        opacity: clamp(detail.rings.opacity, 0.04, 0.9),
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2 + THREE.MathUtils.degToRad(detail.rings.tiltDeg);
    ring.receiveShadow = true;
    group.add(ring);
  }

  let disposed = false;
  let objectUrl: string | null = null;
  let loadedTexture: THREE.Texture | null = null;
  if (appearance) {
    const blob = new Blob([appearance.bytes.slice().buffer], { type: appearance.asset.mediaType });
    objectUrl = URL.createObjectURL(blob);
    new THREE.TextureLoader().load(
      objectUrl,
      (texture) => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
        surfaceMaterial.map = texture;
        surfaceMaterial.color.set(0xffffff);
        surfaceMaterial.needsUpdate = true;
        loadedTexture = texture;
      },
      undefined,
      () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      },
    );
  }

  const resolution = appearance?.asset.resolution;
  const textureDetail = resolution
    ? `${resolution.width}x${resolution.height}`
    : appearance
      ? `${appearance.bytes.byteLength}-bytes`
      : 'derived-profile';
  group.userData.atmosphericPresentation = true;
  group.userData.atmosphericMaterialMode = appearance ? 'imported-atmospheric-map' : 'derived-atmospheric-profile';
  group.userData.atmosphericTextureDetail = textureDetail;
  group.userData.atmosphericSourceAssetId = appearance?.asset.assetId ?? null;

  return {
    object: group,
    materialMode: appearance ? 'imported-atmospheric-map' : 'derived-atmospheric-profile',
    textureDetail,
    sourceAssetId: appearance?.asset.assetId ?? null,
    dispose: () => {
      disposed = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      loadedTexture?.dispose();
      loadedTexture = null;
    },
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
