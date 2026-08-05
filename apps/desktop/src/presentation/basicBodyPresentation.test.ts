import { describe, expect, it } from 'vitest';
import { WORLD_BODY_DETAIL_SCHEMA, type BasicPresentationDetailV1 } from '@world-forge/shared/worldBodyDetails';
import {
  basicPresentationGeometryLabel,
  basicPresentationGeometryScale,
  createBasicBodyPresentation,
} from './basicBodyPresentation';

function detail(
  shape: BasicPresentationDetailV1['shape'],
  overrides: Partial<BasicPresentationDetailV1> = {},
): BasicPresentationDetailV1 {
  return {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'basic-presentation',
    tier: 'presentation',
    origin: 'derived',
    shape,
    surface: {
      paletteHex: ['#8f8b84', '#5d5b57'],
      roughness: 0.98,
      metalness: 0,
    },
    ...overrides,
  };
}

describe('basic body presentation', () => {
  it('keeps spherical bodies unscaled', () => {
    const source = detail({ kind: 'sphere' });
    expect(basicPresentationGeometryScale(source)).toEqual({ x: 1, y: 1, z: 1 });
    expect(basicPresentationGeometryLabel(source)).toBe('smooth-sphere');
  });

  it('preserves oblate and triaxial shape ratios', () => {
    const oblate = detail({
      kind: 'oblate-spheroid',
      equatorialRadiusKm: 60_000,
      polarRadiusKm: 54_000,
    });
    expect(basicPresentationGeometryScale(oblate)).toEqual({ x: 1, y: 0.9, z: 1 });
    expect(basicPresentationGeometryLabel(oblate)).toBe('smooth-oblate-spheroid');

    const triaxial = detail({
      kind: 'triaxial-ellipsoid',
      axisAKm: 13,
      axisBKm: 10,
      axisCKm: 7.8,
    });
    expect(basicPresentationGeometryScale(triaxial)).toEqual({ x: 1, y: 0.6, z: 10 / 13 });
    expect(basicPresentationGeometryLabel(triaxial)).toBe('smooth-triaxial-ellipsoid');
  });

  it('builds emissive, halo, and ring presentation from the contract', () => {
    const source = detail({ kind: 'sphere' }, {
      surface: {
        paletteHex: ['#fff2b0', '#f58b35'],
        roughness: 0.7,
        metalness: 0,
        emissiveHex: '#ffb23f',
        emissiveIntensity: 1.8,
      },
      halo: { colorHex: '#ffd36a', opacity: 0.24, scale: 1.22 },
      rings: {
        innerRadiusRatio: 1.4,
        outerRadiusRatio: 2.1,
        opacity: 0.35,
        tiltDeg: 17,
        colorHex: '#b7a789',
      },
    });

    const presentation = createBasicBodyPresentation(source, 1, 'test-body');
    expect(presentation.materialMode).toBe('basic-emissive-profile');
    expect(presentation.object.children).toHaveLength(3);
    expect(presentation.object.userData.systemBodyId).toBe('test-body');
    expect(presentation.object.children.map((child) => child.userData.surfaceGeometry)).toEqual([
      'smooth-sphere',
      'basic-halo-shell',
      'basic-ring-plane',
    ]);
  });
});
