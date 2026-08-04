import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { WorldProject } from '@world-forge/shared';
import { WORLD_BODY_DETAIL_SCHEMA } from '@world-forge/shared/worldBodyDetails';
import { WORLD_BODY_CATALOG_SCHEMA } from '@world-forge/shared/worldBodies';
import { createReferenceSystemBodyPresentation } from './referenceSystemBodyPresentation';
import type { SystemCatalogEntry } from './systemPresentation';

const entry: SystemCatalogEntry = {
  id: 'jupiter',
  label: 'Jupiter',
  kind: 'gas-giant',
  parentBodyId: 'sol',
  generationStatus: 'ready',
  generationEligible: true,
  generationProfile: 'gas-giant-body',
  generationReason: 'Reference body',
  body: {} as SystemCatalogEntry['body'],
  physicalOrbit: { value: 5.2, unit: 'AU' },
};

function project(withPayload: boolean, withRings = false): WorldProject {
  return {
    projectId: 'project-sol-test',
    projectName: 'Sol System',
    primaryWorld: { id: 'earth', name: 'Earth' },
    solarSystem: { primaryWorldId: 'earth', bodies: [] },
    bodyCatalog: {
      schema: WORLD_BODY_CATALOG_SCHEMA,
      primaryBodyId: 'earth',
      activeBodyId: 'jupiter',
      bodies: [{
        bodyId: 'jupiter',
        name: 'Jupiter',
        bodyType: 'gas-giant',
        capabilities: { globe: withPayload, map: false, explorer: false, irregularShape: false },
        dataOrigin: withPayload ? 'imported' : 'derived',
        detail: {
          schema: WORLD_BODY_DETAIL_SCHEMA,
          kind: 'atmospheric-presentation',
          tier: 'presentation',
          origin: withPayload ? 'imported' : 'derived',
          shape: { kind: 'oblate-spheroid', equatorialRadiusKm: 71_492, polarRadiusKm: 66_854 },
          atmosphere: {
            paletteHex: ['#d7b98d', '#9a6f50'],
            bandCount: 12,
            bandContrast: 0.5,
            hazeStrength: 0.2,
          },
          rings: withRings ? { innerRadiusRatio: 1.35, outerRadiusRatio: 2.15, opacity: 0.4, tiltDeg: 26.7 } : undefined,
          assets: withPayload ? [{
            assetId: 'jupiter-albedo',
            role: 'albedo',
            logicalPath: 'bodies/jupiter/albedo.rgb565',
            mediaType: 'application/vnd.world-forge.rgb565',
            encoding: 'rgb565-le',
            resolution: { width: 2, height: 1 },
            byteLength: 4,
          }] : undefined,
        },
      }],
    },
    bodyAssetPayloads: withPayload
      ? { 'jupiter-albedo': Uint8Array.from([0x00, 0xf8, 0x1f, 0x00]) }
      : undefined,
  } as unknown as WorldProject;
}

describe('reference System body presentation', () => {
  it('renders a visible derived atmospheric profile without claiming an imported texture', () => {
    const presentation = createReferenceSystemBodyPresentation(project(false, true), entry, 0.5);
    expect(presentation?.materialMode).toBe('derived-atmospheric-profile');
    expect(presentation?.object.children).toHaveLength(2);
    const sphere = presentation?.object.children[0] as THREE.Mesh;
    expect(sphere).toBeInstanceOf(THREE.Mesh);
    expect(sphere.scale.y).toBeLessThan(1);
    expect((sphere.material as THREE.MeshStandardMaterial).map).toBeNull();
    expect(presentation?.object.children[1]).toBeInstanceOf(THREE.Mesh);
  });

  it('uses the hydrated RGB565 source texture when available', () => {
    const presentation = createReferenceSystemBodyPresentation(project(true), entry, 0.5);
    expect(presentation?.materialMode).toBe('imported-atmospheric-rgb565');
    const sphere = presentation?.object.children[0] as THREE.Mesh;
    const material = sphere.material as THREE.MeshStandardMaterial;
    expect(material.map).toBeInstanceOf(THREE.DataTexture);
    const image = material.map?.image as { width?: number; height?: number } | undefined;
    expect(image?.width).toBe(2);
    expect(image?.height).toBe(1);
  });
});
