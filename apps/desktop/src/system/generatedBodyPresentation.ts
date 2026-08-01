import * as THREE from 'three';
import type { GeneratedSystemBodyArtifact, GeneratedSystemBodyFeature } from '@world-forge/shared';

export type GeneratedBodyTextureDetail = 'system' | 'inspection';
export type GeneratedBodyPresentationOptions = {
  detail?: GeneratedBodyTextureDetail;
};

type Rgb = readonly [number, number, number];
type BodyPalette = {
  family: string;
  stops: readonly Rgb[];
  accent: Rgb;
  haze: Rgb | null;
  hazeStrength: number;
};

const canvasCache = new Map<string, HTMLCanvasElement>();
const MAX_CACHED_CANVASES = 18;

export function createGeneratedBodyObject(
  artifact: GeneratedSystemBodyArtifact,
  displaySize: number,
  options: GeneratedBodyPresentationOptions = {}
): THREE.Object3D {
  const detail = options.detail ?? 'system';
  if (artifact.payload.presentationKind === 'belt') {
    return createBeltObject(artifact, displaySize);
  }
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(
    displaySize,
    artifact.payload.presentationKind === 'solid' ? 48 : 64,
    artifact.payload.presentationKind === 'solid' ? 24 : 32
  );
  if (artifact.payload.presentationKind === 'solid') {
    displaceSolidGeometry(geometry, artifact, displaySize);
  }
  const resolution = textureResolution(artifact, detail);
  const texture = createGeneratedBodyTexture(artifact, detail);
  const bumpTexture = artifact.payload.presentationKind === 'solid'
    ? createGeneratedBodyBumpTexture(artifact, detail)
    : null;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: artifact.payload.presentationKind === 'solid' ? 0.88 : 0.7,
    metalness: 0.01,
    bumpMap: bumpTexture,
    bumpScale: bumpTexture ? displaySize * 0.028 : 0
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.generatedBodyArtifactKey = artifact.artifactKey;
  mesh.userData.generatedBodyMaterial = generatedBodyMaterialMode(artifact);
  mesh.userData.generatedBodyTextureDetail = `${detail}-${resolution.width}x${resolution.height}`;
  group.add(mesh);

  if (artifact.payload.rings) {
    const ring = artifact.payload.rings;
    const ringGeometry = new THREE.RingGeometry(displaySize * ring.innerRadius, displaySize * ring.outerRadius, 96);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: artifact.payload.presentationKind === 'ice-giant' ? 0xb9d5df : 0xd8c39d,
      transparent: true,
      opacity: ring.opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.rotation.z = THREE.MathUtils.degToRad(ring.tiltDeg);
    ringMesh.userData.generatedBodyArtifactKey = artifact.artifactKey;
    group.add(ringMesh);
  }
  group.userData.generatedBodyArtifactKey = artifact.artifactKey;
  group.userData.generatedBodyMaterial = generatedBodyMaterialMode(artifact);
  group.userData.generatedBodyTextureDetail = `${detail}-${resolution.width}x${resolution.height}`;
  return group;
}

export function generatedBodyMaterialMode(artifact: GeneratedSystemBodyArtifact): string {
  return `system-body-${artifact.bodyProfile}-v2`;
}

export function generatedBodyPaletteFamily(artifact: GeneratedSystemBodyArtifact): string {
  return bodyPalette(artifact).family;
}

function displaceSolidGeometry(
  geometry: THREE.SphereGeometry,
  artifact: GeneratedSystemBodyArtifact,
  displaySize: number
): void {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uvs = geometry.getAttribute('uv') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const u = uvs.getX(index);
    const v = uvs.getY(index);
    const height = sampleFieldBilinear(artifact.payload.heightField, artifact.payload.resolution, u, 1 - v);
    const factor = 1 + height * 0.05;
    positions.setXYZ(
      index,
      positions.getX(index) * factor,
      positions.getY(index) * factor,
      positions.getZ(index) * factor
    );
  }
  positions.needsUpdate = true;
  resetRadialNormals(geometry);
  geometry.computeBoundingSphere();
  if (geometry.boundingSphere) geometry.boundingSphere.radius = displaySize * 1.08;
}

function resetRadialNormals(geometry: THREE.SphereGeometry): void {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const normal = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    normal.set(positions.getX(index), positions.getY(index), positions.getZ(index)).normalize();
    normals.setXYZ(index, normal.x, normal.y, normal.z);
  }
  normals.needsUpdate = true;
}

function createGeneratedBodyTexture(
  artifact: GeneratedSystemBodyArtifact,
  detail: GeneratedBodyTextureDetail
): THREE.CanvasTexture {
  const resolution = textureResolution(artifact, detail);
  const key = `${artifact.artifactSignature}:surface:${detail}:${resolution.width}x${resolution.height}`;
  const canvas = cachedCanvas(key, () => createSurfaceCanvas(artifact, resolution));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createGeneratedBodyBumpTexture(
  artifact: GeneratedSystemBodyArtifact,
  detail: GeneratedBodyTextureDetail
): THREE.CanvasTexture {
  const resolution = textureResolution(artifact, detail);
  const key = `${artifact.artifactSignature}:bump:${detail}:${resolution.width}x${resolution.height}`;
  const canvas = cachedCanvas(key, () => createBumpCanvas(artifact, resolution));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function textureResolution(
  artifact: GeneratedSystemBodyArtifact,
  detail: GeneratedBodyTextureDetail
): { width: number; height: number } {
  if (detail === 'system') return artifact.payload.resolution;
  const width = artifact.requestedFidelity === 'standard' ? 512 : 256;
  return { width, height: Math.floor(width / 2) };
}

function createSurfaceCanvas(
  artifact: GeneratedSystemBodyArtifact,
  resolution: { width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, resolution.width);
  canvas.height = Math.max(1, resolution.height);
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const image = context.createImageData(canvas.width, canvas.height);
  const palette = bodyPalette(artifact);
  for (let y = 0; y < canvas.height; y += 1) {
    const v = (y + 0.5) / canvas.height;
    for (let x = 0; x < canvas.width; x += 1) {
      const u = (x + 0.5) / canvas.width;
      const albedo = sampleFieldBilinear(artifact.payload.albedoField, artifact.payload.resolution, u, v, 0.5);
      const thermal = sampleFieldBilinear(artifact.payload.thermalField, artifact.payload.resolution, u, v, 0);
      const height = sampleFieldBilinear(artifact.payload.heightField, artifact.payload.resolution, u, v, 0);
      const band = sampleFieldBilinear(artifact.payload.bandField, artifact.payload.resolution, u, v, 0);
      const detail = periodicSurfaceDetail(artifact.seed, u, v);
      const color = surfaceColor(artifact, palette, albedo, thermal, height, band, detail, u, v);
      const offset = (y * canvas.width + x) * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  if (artifact.payload.presentationKind === 'gas-giant' || artifact.payload.presentationKind === 'ice-giant') {
    for (const feature of artifact.payload.features.filter((candidate) => candidate.kind === 'storm')) {
      drawStorm(context, feature, canvas.width, canvas.height, palette.accent);
    }
  }
  blendCanvasSeam(context, canvas.width, canvas.height, 3);
  return canvas;
}

function createBumpCanvas(
  artifact: GeneratedSystemBodyArtifact,
  resolution: { width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, resolution.width);
  canvas.height = Math.max(1, resolution.height);
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const image = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    const v = (y + 0.5) / canvas.height;
    for (let x = 0; x < canvas.width; x += 1) {
      const u = (x + 0.5) / canvas.width;
      const height = sampleFieldBilinear(artifact.payload.heightField, artifact.payload.resolution, u, v, 0);
      const micro = periodicSurfaceDetail(artifact.seed, u, v) * 0.12;
      const value = clampByte((0.5 + height * 0.42 + micro) * 255);
      const offset = (y * canvas.width + x) * 4;
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  blendCanvasSeam(context, canvas.width, canvas.height, 3);
  return canvas;
}

function surfaceColor(
  artifact: GeneratedSystemBodyArtifact,
  palette: BodyPalette,
  albedo: number,
  thermal: number,
  height: number,
  band: number,
  detail: number,
  u: number,
  v: number
): Rgb {
  const isGiant = artifact.payload.presentationKind === 'gas-giant' || artifact.payload.presentationKind === 'ice-giant';
  const latitude = Math.abs(v - 0.5) * 2;
  const value = isGiant
    ? clamp01(0.5 + band * 0.3 + (albedo - 0.5) * 0.34 + detail * 0.055)
    : clamp01(0.5 + height * 0.31 + (albedo - 0.5) * 0.46 + detail * 0.09);
  let color = samplePalette(palette.stops, value);
  const warm = (thermal - 0.5) * (isGiant ? 0.08 : 0.13);
  color = [
    clampByte(color[0] * (1 + warm)),
    clampByte(color[1] * (1 + warm * 0.25)),
    clampByte(color[2] * (1 - warm * 0.55))
  ];
  if (palette.haze) {
    const hazeVariation = 0.72 + 0.18 * Math.sin(u * Math.PI * 6 + seedPhase(artifact.seed, 31)) + 0.1 * (1 - latitude);
    color = mixRgb(color, palette.haze, clamp01(palette.hazeStrength * hazeVariation));
  }
  return color;
}

function bodyPalette(artifact: GeneratedSystemBodyArtifact): BodyPalette {
  const variant = Math.floor(hashUnit(artifact.seed, 9001) * 3);
  const meanThermal = meanField(artifact.payload.thermalField);
  if (artifact.bodyProfile === 'gas-giant-body') {
    if (variant === 0) return palette('gas-jovian', ['#38251f', '#8c5232', '#d1a06b', '#f1ddb6', '#b55d36'], '#c96d42');
    if (variant === 1) return palette('gas-saturnian', ['#5d4a35', '#ad8b5e', '#ddc89a', '#f2e5c6', '#c79f63'], '#d6b678');
    return palette('gas-cool-banded', ['#343d47', '#68798b', '#a9b2b6', '#ddd5c6', '#8f7560'], '#a77d64');
  }
  if (artifact.bodyProfile === 'ice-giant-body') {
    if (variant === 0) return palette('ice-uranian', ['#173f54', '#337d96', '#72bdc8', '#b7e1df', '#4b93a6'], '#d5f3ef');
    return palette('ice-neptunian', ['#101d51', '#193d91', '#3b73c4', '#83b9e5', '#3566ad'], '#d6edff');
  }
  if (artifact.bodyProfile === 'dwarf-body') {
    if (meanThermal < 0.25 || artifact.payload.stats.meanAlbedo > 0.58) {
      return palette('dwarf-icy', ['#454a50', '#747b82', '#a8afb4', '#d9dddc', '#8a8f91'], '#e7f2f6');
    }
    return palette('dwarf-neutral', ['#342d2a', '#66574e', '#948477', '#c4b6aa', '#7f6f65'], '#d3c0ad');
  }
  if (artifact.bodyProfile === 'airless-rocky-body') {
    return variant === 0
      ? palette('moon-lunar-gray', ['#262729', '#555659', '#858589', '#b6b4b0', '#727276'], '#d1cbc1')
      : palette('moon-mercurian', ['#2e2926', '#5d5048', '#88766a', '#b6a18f', '#756258'], '#cbb9a8');
  }
  const atmospheric = artifact.payload.radiusClass >= 0.8;
  if (atmospheric && meanThermal > 0.52) {
    return palette('rocky-hot-haze', ['#493522', '#916837', '#d2a65e', '#f1d89a', '#ad7840'], '#f4cf7a', '#e5bd72', 0.2);
  }
  if (atmospheric && meanThermal < 0.26) {
    return variant === 0
      ? palette('rocky-cold-haze', ['#3d2621', '#7f4432', '#b76d49', '#d9a374', '#94543c'], '#dda078', '#c88254', 0.16)
      : palette('rocky-cold-blue-haze', ['#202d38', '#3e5e70', '#6f8e98', '#b1c2bf', '#6b7b78'], '#d4dfdc', '#7399a9', 0.15);
  }
  if (atmospheric) {
    return variant === 0
      ? palette('rocky-temperate-haze', ['#243337', '#3d625f', '#718773', '#b2a06e', '#806249'], '#d0bb7b', '#73999b', 0.12)
      : palette('rocky-oxidized-haze', ['#38261f', '#77432e', '#a9653e', '#c99b6f', '#87513a'], '#d69a6a', '#bd7650', 0.1);
  }
  return variant === 0
    ? palette('rocky-airless-warm', ['#30261f', '#604635', '#90705a', '#b99c84', '#745540'], '#d0ad8c')
    : palette('rocky-airless-neutral', ['#28292a', '#535352', '#80807c', '#aaa69e', '#6d6b67'], '#c4bdb1');
}

function palette(
  family: string,
  colors: readonly string[],
  accent: string,
  haze: string | null = null,
  hazeStrength = 0
): BodyPalette {
  return {
    family,
    stops: colors.map(hexRgb),
    accent: hexRgb(accent),
    haze: haze ? hexRgb(haze) : null,
    hazeStrength
  };
}

function samplePalette(stops: readonly Rgb[], value: number): Rgb {
  if (!stops.length) return [128, 128, 128];
  if (stops.length === 1) return stops[0];
  const position = clamp01(value) * (stops.length - 1);
  const leftIndex = Math.min(stops.length - 1, Math.floor(position));
  const rightIndex = Math.min(stops.length - 1, leftIndex + 1);
  return mixRgb(stops[leftIndex], stops[rightIndex], position - leftIndex);
}

function periodicSurfaceDetail(seed: string, u: number, v: number): number {
  const longitude = u * Math.PI * 2;
  const latitude = (0.5 - v) * Math.PI;
  const phaseA = seedPhase(seed, 71);
  const phaseB = seedPhase(seed, 79);
  const broad = Math.sin(longitude * 7 + phaseA) * Math.cos(latitude * 5 - phaseB);
  const medium = Math.sin(longitude * 17 - phaseB) * Math.cos(latitude * 11 + phaseA) * 0.55;
  const fine = Math.sin(longitude * 31 + latitude * 19 + phaseA * 0.7) * 0.25;
  return (broad + medium + fine) / 1.8;
}

function cachedCanvas(key: string, factory: () => HTMLCanvasElement): HTMLCanvasElement {
  const cached = canvasCache.get(key);
  if (cached) {
    canvasCache.delete(key);
    canvasCache.set(key, cached);
    return cached;
  }
  const canvas = factory();
  canvasCache.set(key, canvas);
  while (canvasCache.size > MAX_CACHED_CANVASES) {
    const oldest = canvasCache.keys().next().value as string | undefined;
    if (!oldest) break;
    canvasCache.delete(oldest);
  }
  return canvas;
}

function blendCanvasSeam(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  requestedColumns: number
): void {
  if (width <= 1 || height <= 0) return;
  const image = context.getImageData(0, 0, width, height);
  const columns = Math.max(1, Math.min(requestedColumns, Math.floor(width / 2)));
  for (let y = 0; y < height; y += 1) {
    for (let offset = 0; offset < columns; offset += 1) {
      const left = (y * width + offset) * 4;
      const right = (y * width + width - 1 - offset) * 4;
      const weight = 1 - offset / columns;
      for (let channel = 0; channel < 4; channel += 1) {
        const meanValue = (image.data[left + channel] + image.data[right + channel]) * 0.5;
        image.data[left + channel] = clampByte(image.data[left + channel] + (meanValue - image.data[left + channel]) * weight);
        image.data[right + channel] = clampByte(image.data[right + channel] + (meanValue - image.data[right + channel]) * weight);
      }
    }
  }
  context.putImageData(image, 0, 0);
}

function createBeltObject(
  artifact: GeneratedSystemBodyArtifact,
  displaySize: number
): THREE.Object3D {
  const group = new THREE.Group();
  const belt = artifact.payload.belt;
  const count = belt?.particleCount ?? 0;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const inner = (belt?.innerRadius ?? 0.75) * displaySize;
  const outer = (belt?.outerRadius ?? 1.35) * displaySize;
  const verticalSpread = (belt?.verticalSpread ?? 0.05) * displaySize;
  for (let index = 0; index < count; index += 1) {
    const angle = hashUnit(artifact.seed, index * 5) * Math.PI * 2;
    const radius = inner + (outer - inner) * Math.sqrt(hashUnit(artifact.seed, index * 5 + 1));
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = hashSigned(artifact.seed, index * 5 + 2) * verticalSpread;
    positions[offset + 2] = Math.sin(angle) * radius;
    const brightness = 0.52 + hashUnit(artifact.seed, index * 5 + 3) * 0.38;
    colors[offset] = brightness;
    colors[offset + 1] = brightness * 0.88;
    colors[offset + 2] = brightness * 0.72;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: Math.max(0.006, displaySize * 0.025),
      vertexColors: true,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      sizeAttenuation: true
    })
  );
  points.userData.generatedBodyArtifactKey = artifact.artifactKey;
  group.add(points);
  const collider = new THREE.Mesh(
    new THREE.SphereGeometry(displaySize * 1.1, 20, 10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  collider.userData.generatedBodyArtifactKey = artifact.artifactKey;
  group.add(collider);
  group.userData.generatedBodyArtifactKey = artifact.artifactKey;
  group.userData.generatedBodyMaterial = generatedBodyMaterialMode(artifact);
  group.userData.generatedBodyTextureDetail = 'belt-procedural';
  return group;
}

function drawStorm(
  context: CanvasRenderingContext2D,
  feature: GeneratedSystemBodyFeature,
  width: number,
  height: number,
  accent: Rgb
): void {
  const x = ((feature.longitudeDeg + 180) / 360) * width;
  const y = ((90 - feature.latitudeDeg) / 180) * height;
  const radiusX = Math.max(2, feature.angularRadiusDeg / 360 * width);
  const radiusY = Math.max(1.5, feature.angularRadiusDeg / 180 * height * 0.62);
  const factor = 0.85 + feature.contrast + feature.hueShift * 0.4;
  const color = accent.map((channel) => clampByte(channel * factor)) as unknown as Rgb;
  for (const wrapOffset of [-width, 0, width]) {
    const gradient = context.createRadialGradient(x + wrapOffset, y, 0, x + wrapOffset, y, radiusX);
    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`);
    gradient.addColorStop(0.58, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.54)`);
    gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
    context.save();
    context.translate(x + wrapOffset, y);
    context.scale(1, radiusY / radiusX);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radiusX, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function sampleFieldBilinear(
  field: number[],
  resolution: { width: number; height: number },
  u: number,
  v: number,
  fallback = 0
): number {
  if (!field.length || resolution.width <= 0 || resolution.height <= 0) return fallback;
  const sourceX = wrapUnit(u) * resolution.width - 0.5;
  const sourceY = clamp01(v) * resolution.height - 0.5;
  const x0 = Math.floor(sourceX);
  const y0 = Math.max(0, Math.min(resolution.height - 1, Math.floor(sourceY)));
  const x1 = x0 + 1;
  const y1 = Math.max(0, Math.min(resolution.height - 1, y0 + 1));
  const tx = sourceX - Math.floor(sourceX);
  const ty = sourceY - Math.floor(sourceY);
  const sample = (x: number, y: number) => {
    const wrappedX = ((x % resolution.width) + resolution.width) % resolution.width;
    return field[y * resolution.width + wrappedX] ?? fallback;
  };
  const top = sample(x0, y0) + (sample(x1, y0) - sample(x0, y0)) * tx;
  const bottom = sample(x0, y1) + (sample(x1, y1) - sample(x0, y1)) * tx;
  return top + (bottom - top) * ty;
}

function meanField(field: number[]): number {
  return field.length ? field.reduce((sum, value) => sum + value, 0) / field.length : 0;
}

function seedPhase(seed: string, index: number): number {
  return hashUnit(seed, index) * Math.PI * 2;
}

function hexRgb(value: string): Rgb {
  const normalized = value.replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
}

function mixRgb(left: Rgb, right: Rgb, amount: number): Rgb {
  const t = clamp01(amount);
  return [
    clampByte(left[0] + (right[0] - left[0]) * t),
    clampByte(left[1] + (right[1] - left[1]) * t),
    clampByte(left[2] + (right[2] - left[2]) * t)
  ];
}

function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function hashSigned(seed: string, index: number): number {
  return hashUnit(seed, index) * 2 - 1;
}

function hashUnit(seed: string, index: number): number {
  let hash = 2166136261;
  const value = `${seed}:${index}`;
  for (let offset = 0; offset < value.length; offset += 1) {
    hash ^= value.charCodeAt(offset);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967295;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
