import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { WorldProject } from '@world-forge/shared';
import {
  WORLD_BODY_DETAIL_SCHEMA,
  type AtmosphericPresentationDetailV1,
} from '@world-forge/shared/worldBodyDetails';
import {
  atmosphericPolarScale,
  createAtmosphericBodyPresentation,
} from './atmosphericBodyPresentation';

function detail(withAsset = false, withRings = true): AtmosphericPresentationDetailV1 {
  return {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'atmospheric-presentation',
    tier: 'presentation',
    origin: withAsset ? 'imported' : 'derived',
    shape: {
      kind: 'oblate-spheroid',
      equatorialRadiusKm: 71_492,
      polarRadiusKm: 66_854,
    },
    atmosphere: {
      paletteHex: ['#d7b98d', '#9a6f50'],
      bandCount: 12,
      bandContrast: 0.5,
      hazeStrength: 0.2,
    },
    rings: withRings
      ? { innerRadiusRatio: 1.35, outerRadiusRatio: 2.15, opacity: 0.4, tiltDeg: 26.7 }
      : undefined,
    assets: withAsset
      ? [{
          assetId: 'jupiter-albedo',
          role: 'albedo',
          logicalPath: 'bodies/jupiter/albedo.rgb565',
          mediaType: 'application/vnd.world-forge.rgb565',
          encoding: 'rgb565-le',
          resolution: { width: 2, height: 1 },
          byteLength: 4,
        }]
      : undefined,
  };
}

function project(withPayload: boolean): WorldProject {
  return {
    bodyAssetPayloads: withPayload
      ? { 'jupiter-albedo': Uint8Array.from([0x00, 0xf8, 0x1f, 0x00]) }
      : undefined,
  } as unknown as WorldProject;
}

describe('atmospheric body presentation', () => {
  it('uses a smooth oblate sphere and keeps rings as separate geometry', () => {
    const source = detail(false, true);
    const presentation = createAtmosphericBodyPresentation(
      project(false),
      source,
      1,
      'jupiter',
      'inspection',
    );
    const sphere = presentation.object.children[0] as THREE.Mesh<THREE.SphereGeometry>;
    const ring = presentation.object.children[1] as THREE.Mesh<THREE.RingGeometry>;
    const positions = sphere.geometry.getAttribute('position') as THREE.BufferAttribute;
    let minRadius = Number.POSITIVE_INFINITY;
    let maxRadius = 0;
    const vertex = new THREE.Vector3();
    for (let index = 0; index < positions.count; index += 1) {
      vertex.fromBufferAttribute(positions, index);
      const radius = vertex.length();
      minRadius = Math.min(minRadius, radius);
      maxRadius = Math.max(maxRadius, radius);
    }

    expect(maxRadius - minRadius).toBeLessThan(0.00001);
    expect(sphere.scale.y).toBeCloseTo(66_854 / 71_492, 6);
    expect(sphere.userData.surfaceGeometry).toBe('smooth-oblate-spheroid');
    expect(ring.geometry).toBeInstanceOf(THREE.RingGeometry);
    expect(ring.userData.surfaceGeometry).toBe('separate-ring-plane');
    expect(presentation.polarScale).toBe(atmosphericPolarScale(source));
  });

  it('preserves the hydrated RGB565 atmospheric texture', () => {
    const presentation = createAtmosphericBodyPresentation(
      project(true),
      detail(true, false),
      1,
      'jupiter',
      'inspection',
    );
    const sphere = presentation.object.children[0] as THREE.Mesh;
    const material = sphere.material as THREE.MeshStandardMaterial;
    const image = material.map?.image as { width?: number; height?: number } | undefined;

    expect(presentation.materialMode).toBe('imported-atmospheric-rgb565');
    expect(material.map).toBeInstanceOf(THREE.DataTexture);
    expect(image?.width).toBe(2);
    expect(image?.height).toBe(1);
  });
});
