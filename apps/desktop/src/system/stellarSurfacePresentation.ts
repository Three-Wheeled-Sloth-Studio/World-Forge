import * as THREE from 'three';
import type { StellarSurfaceFeature, StellarSurfacePresentationArtifact } from '@world-forge/shared';

export function createStellarSurfaceMaterial(artifact: StellarSurfacePresentationArtifact): THREE.MeshBasicMaterial {
  const texture = createStellarSurfaceTexture(artifact);
  return new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff });
}

export function createStellarCoronaMaterial(artifact: StellarSurfacePresentationArtifact): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: artifact.payload.baseColorHex,
    transparent: true,
    opacity: Math.min(0.32, 0.08 + artifact.payload.corona.glowStrength * 0.34),
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  });
}

export function createStellarCoronaStreamers(artifact: StellarSurfacePresentationArtifact, photosphereRadius: number): THREE.Group {
  const group = new THREE.Group();
  for (const streamer of artifact.payload.corona.streamers) {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 64;
    textureCanvas.height = 256;
    const context = textureCanvas.getContext('2d');
    if (!context) continue;
    const gradient = context.createLinearGradient(0, textureCanvas.height, 0, 0);
    gradient.addColorStop(0, `rgba(255, 242, 190, ${0.32 * streamer.brightness})`);
    gradient.addColorStop(0.42, `rgba(255, 224, 150, ${0.16 * streamer.brightness})`);
    gradient.addColorStop(1, 'rgba(255, 224, 150, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(textureCanvas.width * 0.38, textureCanvas.height);
    context.quadraticCurveTo(textureCanvas.width * 0.06, textureCanvas.height * 0.42, textureCanvas.width * 0.48, 0);
    context.quadraticCurveTo(textureCanvas.width * 0.94, textureCanvas.height * 0.42, textureCanvas.width * 0.62, textureCanvas.height);
    context.closePath();
    context.fill();
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const height = photosphereRadius * (0.4 + streamer.reach * 0.8);
    const width = Math.max(0.025, photosphereRadius * streamer.widthDeg / 120);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    const angle = streamer.angleDeg * Math.PI / 180;
    const radialDistance = photosphereRadius + height * 0.43;
    mesh.position.set(Math.cos(angle) * radialDistance, Math.sin(angle) * radialDistance, 0);
    mesh.rotation.z = angle - Math.PI / 2;
    mesh.renderOrder = 2;
    group.add(mesh);
  }
  return group;
}

export function createStellarSurfaceTexture(artifact: StellarSurfacePresentationArtifact): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  const base = hexRgb(artifact.payload.baseColorHex);
  context.fillStyle = rgb(base.r, base.g, base.b);
  context.fillRect(0, 0, width, height);

  const cellsX = 128;
  const cellsY = 64;
  const cellWidth = width / cellsX;
  const cellHeight = height / cellsY;
  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const noise = hashUnit(artifact.seed, x + y * cellsX + Math.round(artifact.payload.granulation.phase * 1000));
      const centered = noise * 2 - 1;
      const amount = centered * artifact.payload.granulation.contrast;
      const red = clampByte(base.r * (1 + amount * 0.75));
      const green = clampByte(base.g * (1 + amount * 0.65));
      const blue = clampByte(base.b * (1 + amount * 0.45));
      context.globalAlpha = 0.52;
      context.fillStyle = rgb(red, green, blue);
      context.fillRect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1);
    }
  }
  context.globalAlpha = 1;
  for (const feature of artifact.payload.faculae) drawFeature(context, feature, width, height, base);
  for (const feature of artifact.payload.spots) drawFeature(context, feature, width, height, base);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function drawFeature(
  context: CanvasRenderingContext2D,
  feature: StellarSurfaceFeature,
  width: number,
  height: number,
  base: { r: number; g: number; b: number }
): void {
  const x = ((feature.longitudeDeg + 180) / 360) * width;
  const y = ((90 - feature.latitudeDeg) / 180) * height;
  const radiusX = Math.max(3, feature.angularRadiusDeg / 360 * width);
  const radiusY = Math.max(2, feature.angularRadiusDeg / 180 * height * 0.72);
  const factor = 1 + feature.contrast;
  const color = {
    r: clampByte(base.r * factor),
    g: clampByte(base.g * factor),
    b: clampByte(base.b * factor)
  };
  for (const wrapOffset of [-width, 0, width]) {
    const gradient = context.createRadialGradient(x + wrapOffset, y, 0, x + wrapOffset, y, radiusX);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${feature.kind === 'spot' ? 0.9 : 0.62})`);
    gradient.addColorStop(0.58, `rgba(${color.r}, ${color.g}, ${color.b}, ${feature.kind === 'spot' ? 0.62 : 0.34})`);
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

function hexRgb(value: string): { r: number; g: number; b: number } {
  const normalized = value.replace('#', '');
  const parsed = Number.parseInt(normalized, 16);
  return {
    r: Number.isFinite(parsed) ? (parsed >> 16) & 255 : 255,
    g: Number.isFinite(parsed) ? (parsed >> 8) & 255 : 224,
    b: Number.isFinite(parsed) ? parsed & 255 : 160
  };
}

function rgb(r: number, g: number, b: number): string {
  return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)})`;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
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
