import * as THREE from 'three';
import type { GeneratedSystemBodyArtifact, GeneratedSystemBodyFeature } from '@world-forge/shared';

export function createGeneratedBodyObject(
  artifact: GeneratedSystemBodyArtifact,
  displaySize: number
): THREE.Object3D {
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
  const texture = createGeneratedBodyTexture(artifact);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: artifact.payload.presentationKind === 'solid' ? 0.91 : 0.78,
    metalness: 0.01,
    bumpMap: artifact.payload.presentationKind === 'solid' ? texture : null,
    bumpScale: artifact.payload.presentationKind === 'solid' ? displaySize * 0.035 : 0
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.generatedBodyArtifactKey = artifact.artifactKey;
  mesh.userData.generatedBodyMaterial = generatedBodyMaterialMode(artifact);
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
  return group;
}

export function generatedBodyMaterialMode(artifact: GeneratedSystemBodyArtifact): string {
  return `system-body-${artifact.bodyProfile}-v1`;
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
    const height = sampleField(artifact.payload.heightField, artifact.payload.resolution, u, 1 - v);
    const factor = 1 + height * 0.055;
    positions.setXYZ(
      index,
      positions.getX(index) * factor,
      positions.getY(index) * factor,
      positions.getZ(index) * factor
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  if (geometry.boundingSphere) geometry.boundingSphere.radius = displaySize * 1.08;
}

function createGeneratedBodyTexture(artifact: GeneratedSystemBodyArtifact): THREE.CanvasTexture {
  const { width, height } = artifact.payload.resolution;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const context = canvas.getContext('2d');
  if (context && width > 0 && height > 0) {
    const image = context.createImageData(width, height);
    const palette = bodyPalette(artifact);
    for (let index = 0; index < width * height; index += 1) {
      const albedo = artifact.payload.albedoField[index] ?? 0.5;
      const thermal = artifact.payload.thermalField[index] ?? 0;
      const heightValue = artifact.payload.heightField[index] ?? 0;
      const band = artifact.payload.bandField[index] ?? 0;
      const shade = 0.55 + albedo * 0.68 + heightValue * 0.08;
      const warm = thermal * 0.055 + band * 0.07;
      const offset = index * 4;
      image.data[offset] = clampByte(palette.r * shade * (1 + warm));
      image.data[offset + 1] = clampByte(palette.g * shade * (1 + warm * 0.35));
      image.data[offset + 2] = clampByte(palette.b * shade * (1 - warm * 0.3));
      image.data[offset + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    if (artifact.payload.presentationKind === 'gas-giant' || artifact.payload.presentationKind === 'ice-giant') {
      for (const feature of artifact.payload.features.filter((candidate) => candidate.kind === 'storm')) {
        drawStorm(context, feature, width, height, palette);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
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
  return group;
}

function bodyPalette(artifact: GeneratedSystemBodyArtifact): { r: number; g: number; b: number } {
  if (artifact.bodyProfile === 'gas-giant-body') return { r: 205, g: 160, b: 106 };
  if (artifact.bodyProfile === 'ice-giant-body') return { r: 94, g: 171, b: 210 };
  if (artifact.bodyProfile === 'dwarf-body') return { r: 158, g: 150, b: 145 };
  if (artifact.bodyProfile === 'rocky-body') return { r: 146, g: 116, b: 82 };
  return { r: 146, g: 147, b: 150 };
}

function drawStorm(
  context: CanvasRenderingContext2D,
  feature: GeneratedSystemBodyFeature,
  width: number,
  height: number,
  palette: { r: number; g: number; b: number }
): void {
  const x = ((feature.longitudeDeg + 180) / 360) * width;
  const y = ((90 - feature.latitudeDeg) / 180) * height;
  const radiusX = Math.max(2, feature.angularRadiusDeg / 360 * width);
  const radiusY = Math.max(1.5, feature.angularRadiusDeg / 180 * height * 0.62);
  const factor = 1 + feature.contrast + feature.hueShift;
  const color = {
    r: clampByte(palette.r * factor),
    g: clampByte(palette.g * (1 + feature.contrast * 0.7)),
    b: clampByte(palette.b * (1 - feature.hueShift * 0.7))
  };
  for (const wrapOffset of [-width, 0, width]) {
    const gradient = context.createRadialGradient(x + wrapOffset, y, 0, x + wrapOffset, y, radiusX);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.88)`);
    gradient.addColorStop(0.58, `rgba(${color.r}, ${color.g}, ${color.b}, 0.52)`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
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

function sampleField(
  field: number[],
  resolution: { width: number; height: number },
  u: number,
  v: number
): number {
  if (!field.length || resolution.width <= 0 || resolution.height <= 0) return 0;
  const x = ((Math.floor(u * resolution.width) % resolution.width) + resolution.width) % resolution.width;
  const y = Math.max(0, Math.min(resolution.height - 1, Math.floor(v * resolution.height)));
  return field[y * resolution.width + x] ?? 0;
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
