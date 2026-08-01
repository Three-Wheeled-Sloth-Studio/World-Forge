import * as THREE from 'three';
import type { AirlessRockyBodyArtifact } from '@world-forge/shared';

export function createAirlessBodyMesh(
  artifact: AirlessRockyBodyArtifact,
  displaySize: number
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(displaySize, 48, 24);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uvs = geometry.getAttribute('uv') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const u = uvs.getX(index);
    const v = uvs.getY(index);
    const height = sampleField(artifact.payload.heightField, artifact.payload.resolution, u, 1 - v);
    const factor = 1 + height * 0.065;
    positions.setXYZ(
      index,
      positions.getX(index) * factor,
      positions.getY(index) * factor,
      positions.getZ(index) * factor
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const texture = createAlbedoTexture(artifact);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.96,
    metalness: 0.01,
    bumpMap: texture,
    bumpScale: displaySize * 0.035
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.generatedBodyArtifactKey = artifact.artifactKey;
  mesh.userData.generatedBodyMaterial = 'airless-rocky-v1';
  return mesh;
}

function createAlbedoTexture(artifact: AirlessRockyBodyArtifact): THREE.CanvasTexture {
  const { width, height } = artifact.payload.resolution;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) {
    const image = context.createImageData(width, height);
    for (let index = 0; index < artifact.payload.albedoField.length; index += 1) {
      const albedo = artifact.payload.albedoField[index];
      const thermal = artifact.payload.thermalField[index] ?? 0;
      const heightValue = artifact.payload.heightField[index] ?? 0;
      const gray = clampByte(60 + albedo * 150 + heightValue * 14);
      const offset = index * 4;
      image.data[offset] = clampByte(gray + thermal * 8);
      image.data[offset + 1] = clampByte(gray + thermal * 4);
      image.data[offset + 2] = clampByte(gray - thermal * 3);
      image.data[offset + 3] = 255;
    }
    context.putImageData(image, 0, 0);
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

function sampleField(
  field: number[],
  resolution: { width: number; height: number },
  u: number,
  v: number
): number {
  const x = ((Math.floor(u * resolution.width) % resolution.width) + resolution.width) % resolution.width;
  const y = Math.max(0, Math.min(resolution.height - 1, Math.floor(v * resolution.height)));
  return field[y * resolution.width + x] ?? 0;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
