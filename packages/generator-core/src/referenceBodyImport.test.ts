import { describe, expect, it } from 'vitest';
import { codeToBiome } from '@world-forge/shared';
import {
  importReferenceBodyRaster,
  REFERENCE_BODY_RASTER_SCHEMA,
  type ReferenceBodyRasterV1,
} from './referenceBodyImport';

function fixture(): ReferenceBodyRasterV1 {
  const width = 8;
  const height = 4;
  const elevationMeters = new Float32Array([
    -4200, -3600, -2800, -1800, -800, 120, 600, 1500,
    -3800, -2500, -900, 30, 220, 800, 2100, 4800,
    -3200, -1200, -40, 10, 400, 1300, 2900, 7200,
    -4500, -3400, -1700, -300, 40, 500, 1800, 3600,
  ]);
  return {
    schema: REFERENCE_BODY_RASTER_SCHEMA,
    bodyId: 'earth',
    name: 'Earth',
    resolution: { width, height },
    elevationMeters,
    physical: {
      radiusKm: 6371.0088,
      massEarth: 1,
      axialTiltDeg: 23.439,
      orbitalEccentricity: 0.0167,
      averageTemperatureC: 14,
      seaLevelMeters: 0,
      tideInfluence: 1,
    },
    topologyResolution: 8,
  };
}

describe('reference body raster import', () => {
  it('preserves recognizable imported elevation and derives missing canonical layers', () => {
    const world = importReferenceBodyRaster(fixture());

    expect(world.id).toBe('earth');
    expect(world.mapModel).toEqual({
      resolution: { width: 8, height: 4 },
      projection: 'equirectangular',
      wrapMode: 'east-west',
    });
    expect(world.layers.elevation).toHaveLength(32);
    expect(world.layers.elevation[0]).toBeLessThan(0);
    expect(world.layers.elevation[23]).toBe(1);
    expect(world.layers.water[0]).toBe(1);
    expect(world.layers.water[23]).toBe(0);
    expect(world.oceanPercentage).toBeGreaterThan(40);
    expect(world.topologyLayers.elevation.length).toBe(world.topology.cellCount);
    expect(world.referenceImport.elevationMetersRange).toEqual({ min: -4500, max: 7200 });
    expect(world.referenceImport.layerOrigins.elevation).toBe('imported');
    expect(world.referenceImport.layerOrigins.temperature).toBe('derived');
  });

  it('uses supplied masks and classifications without replacing them', () => {
    const source = fixture();
    const count = source.resolution.width * source.resolution.height;
    source.waterMask = new Uint8Array(count).fill(0);
    source.waterMask[3] = 1;
    source.temperatureC = new Float32Array(count).fill(-12);
    source.iceMask = new Uint8Array(count).fill(1);
    source.biomeCodes = new Uint8Array(count).fill(1);

    const world = importReferenceBodyRaster(source);

    expect(world.layers.water.reduce((sum, value) => sum + value, 0)).toBe(1);
    expect(world.layers.temperature.every((value) => value === -12)).toBe(true);
    expect(world.layers.ice.every((value) => value === 1)).toBe(true);
    expect(codeToBiome(world.layers.biomes[0])).toBe('ice_cap');
    expect(world.referenceImport.layerOrigins.water).toBe('imported');
    expect(world.referenceImport.layerOrigins.biomes).toBe('imported');
  });

  it('rejects malformed source grids before creating a partial world', () => {
    const source = fixture();
    source.elevationMeters = new Float32Array(3);
    expect(() => importReferenceBodyRaster(source)).toThrow('elevationMeters must contain 32 cells');
  });
});
