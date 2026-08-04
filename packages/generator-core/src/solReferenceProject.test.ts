import { describe, expect, it } from 'vitest';
import { readWorldBodyCatalog } from '@world-forge/shared/worldBodies';
import { importReferenceBodyRaster, REFERENCE_BODY_RASTER_SCHEMA } from './referenceBodyImport';
import { createSolReferenceProject } from './solReferenceProject';

function earthSurface() {
  const width = 8;
  const height = 4;
  const elevationMeters = Float32Array.from({ length: width * height }, (_, index) => index % width < 5 ? -2000 : 500 + index * 10);
  return importReferenceBodyRaster({
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
    },
    topologyResolution: 8,
  });
}

describe('Sol reference project', () => {
  it('keeps Earth and the wider Sol inventory in one World Forge project', () => {
    const project = createSolReferenceProject(earthSurface());
    const catalog = readWorldBodyCatalog(project);

    expect(project.projectId).toBe('project-sol-reference');
    expect(project.primaryWorld.id).toBe('earth');
    expect(project.solarSystem.primaryWorldId).toBe('earth');
    expect(project.solarSystem.bodies.map((body) => body.id)).toEqual([
      'mercury', 'venus', 'earth', 'mars', 'main-asteroid-belt',
      'jupiter', 'saturn', 'uranus', 'neptune', 'kuiper-belt',
    ]);
    expect(catalog.primaryBodyId).toBe('earth');
    expect(catalog.bodies.some((body) => body.bodyId === 'luna' && body.parentBodyId === 'earth')).toBe(true);
    expect(catalog.bodies.some((body) => body.bodyId === 'phobos' && body.parentBodyId === 'mars')).toBe(true);
    expect(catalog.bodies.some((body) => body.bodyId === 'deimos' && body.parentBodyId === 'mars')).toBe(true);
    expect(catalog.bodies.some((body) => body.bodyId === 'main-asteroid-belt' && body.bodyType === 'belt')).toBe(true);
  });

  it('exposes only Earth as mappable until other real surfaces are imported', () => {
    const catalog = readWorldBodyCatalog(createSolReferenceProject(earthSurface()));
    const earth = catalog.bodies.find((body) => body.bodyId === 'earth');
    const mars = catalog.bodies.find((body) => body.bodyId === 'mars');

    expect(earth?.capabilities).toEqual({ globe: true, map: true, explorer: true, irregularShape: false });
    expect(earth?.surface?.name).toBe('Earth');
    expect(mars?.capabilities.map).toBe(false);
    expect(mars?.surface).toBeUndefined();
    expect(mars?.physical?.meanRadiusKm).toBe(3389.5);
    expect(mars?.orbit?.periodDays).toBe(686.98);
  });

  it('keeps orbital ordering distinct around the main belt', () => {
    const bodies = createSolReferenceProject(earthSurface()).solarSystem.bodies;
    const orders = Object.fromEntries(bodies.map((body) => [body.id, body.orbitalOrder]));
    expect(orders.mars).toBe(4);
    expect(orders['main-asteroid-belt']).toBe(5);
    expect(orders.jupiter).toBe(6);
  });
});
