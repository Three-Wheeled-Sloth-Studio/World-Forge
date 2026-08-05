import { describe, expect, it } from 'vitest';
import {
  WORLD_BODY_DETAIL_SCHEMA,
  type RasterSurfaceDetailV1,
} from '@world-forge/shared/worldBodyDetails';
import {
  referenceRasterGeometryLabel,
  referenceRasterShapeScale,
} from './referenceRasterBodyPresentation';

describe('reference raster body shape presentation', () => {
  it('keeps spherical reference bodies isotropic', () => {
    const detail = rasterDetail({ kind: 'sphere' });
    expect(referenceRasterShapeScale(detail)).toEqual({ x: 1, y: 1, z: 1 });
    expect(referenceRasterGeometryLabel(detail)).toBe('smooth-reference-sphere');
  });

  it('uses the physical polar-to-equatorial ratio for oblate bodies', () => {
    const detail = rasterDetail({
      kind: 'oblate-spheroid',
      equatorialRadiusKm: 3396.19,
      polarRadiusKm: 3376.2,
    });
    const scale = referenceRasterShapeScale(detail);

    expect(scale.x).toBe(1);
    expect(scale.z).toBe(1);
    expect(scale.y).toBeCloseTo(3376.2 / 3396.19, 8);
    expect(referenceRasterGeometryLabel(detail)).toBe('smooth-reference-oblate-spheroid');
  });

  it('normalizes triaxial axes without changing their relative proportions', () => {
    const detail = rasterDetail({
      kind: 'triaxial-ellipsoid',
      axisAKm: 15,
      axisBKm: 12,
      axisCKm: 9,
    });

    expect(referenceRasterShapeScale(detail)).toEqual({ x: 1, y: 0.6, z: 0.8 });
    expect(referenceRasterGeometryLabel(detail)).toBe('smooth-reference-triaxial-ellipsoid');
  });
});

function rasterDetail(shape: RasterSurfaceDetailV1['shape']): RasterSurfaceDetailV1 {
  return {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'raster-surface',
    tier: 'reference-surface',
    origin: 'imported',
    shape,
    projection: 'equirectangular',
    resolution: { width: 2, height: 1 },
    layerRoles: ['albedo'],
    assets: [{
      assetId: 'reference-albedo',
      role: 'albedo',
      logicalPath: 'bodies/reference/albedo.rgb565',
      mediaType: 'application/vnd.world-forge.rgb565',
      encoding: 'rgb565-le',
      resolution: { width: 2, height: 1 },
      byteLength: 4,
    }],
  };
}
