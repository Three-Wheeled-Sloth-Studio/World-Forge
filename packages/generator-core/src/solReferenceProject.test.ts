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
  it('keeps Sol, Earth, and the wider body inventory in one World Forge project', () => {
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
    expect(catalog.bodies.some((body) => body.bodyId === 'sol' && body.bodyType === 'star')).toBe(true);
    expect(catalog.bodies.some((body) => body.bodyId === 'luna' && body.parentBodyId === 'earth')).toBe(true);
    expect(catalog.bodies.some((body) => body.bodyId === 'phobos' && body.parentBodyId === 'mars')).toBe(true);
    expect(catalog.bodies.some((body) => body.bodyId === 'deimos' && body.parentBodyId === 'mars')).toBe(true);
    expect(catalog.bodies.some((body) => body.bodyId === 'main-asteroid-belt' && body.bodyType === 'belt')).toBe(true);
  });

  it('gives every canonical star, planet, and selected moon a bounded Globe presentation', () => {
    const catalog = readWorldBodyCatalog(createSolReferenceProject(earthSurface()));
    const earth = catalog.bodies.find((body) => body.bodyId === 'earth');
    const sol = catalog.bodies.find((body) => body.bodyId === 'sol');
    const mercury = catalog.bodies.find((body) => body.bodyId === 'mercury');
    const mars = catalog.bodies.find((body) => body.bodyId === 'mars');
    const jupiter = catalog.bodies.find((body) => body.bodyId === 'jupiter');
    const saturn = catalog.bodies.find((body) => body.bodyId === 'saturn');
    const phobos = catalog.bodies.find((body) => body.bodyId === 'phobos');
    const belt = catalog.bodies.find((body) => body.bodyId === 'main-asteroid-belt');

    expect(earth?.capabilities).toEqual({ globe: true, map: true, explorer: true, irregularShape: false });
    expect(earth?.surface?.name).toBe('Earth');
    expect(earth?.detail?.kind).toBe('geographic-surface');

    expect(sol?.detail?.kind).toBe('basic-presentation');
    expect(sol?.capabilities).toEqual({ globe: true, map: false, explorer: false, irregularShape: false });
    expect(sol?.detail?.kind === 'basic-presentation' ? sol.detail.surface.emissiveHex : null).toBe('#ffb23f');

    expect(mercury?.detail?.kind).toBe('basic-presentation');
    expect(mercury?.capabilities.globe).toBe(true);
    expect(mercury?.capabilities.map).toBe(false);

    expect(mars?.capabilities.map).toBe(false);
    expect(mars?.surface).toBeUndefined();
    expect(mars?.detail?.kind).toBe('basic-presentation');
    expect(mars?.physical?.meanRadiusKm).toBe(3389.5);
    expect(mars?.orbit?.periodDays).toBe(686.98);

    expect(jupiter?.detail?.kind).toBe('atmospheric-presentation');
    expect(jupiter?.capabilities).toEqual({ globe: true, map: false, explorer: false, irregularShape: false });
    expect(saturn?.detail?.kind === 'atmospheric-presentation' ? saturn.detail.rings?.outerRadiusRatio : null).toBe(2.27);
    expect(saturn?.capabilities.globe).toBe(true);

    expect(phobos?.detail?.kind).toBe('basic-presentation');
    expect(phobos?.detail?.kind === 'basic-presentation' ? phobos.detail.shape.kind : null).toBe('triaxial-ellipsoid');
    expect(phobos?.capabilities.globe).toBe(true);
    expect(phobos?.capabilities.map).toBe(false);

    const nonBeltBodies = catalog.bodies.filter((body) => body.bodyType !== 'belt');
    expect(nonBeltBodies.every((body) => body.capabilities.globe)).toBe(true);

    expect(belt?.detail?.kind).toBe('population');
    expect(belt?.detail?.tier).toBe('presentation');
    expect(belt?.capabilities.globe).toBe(false);
  });

  it('keeps orbital ordering distinct around the main belt', () => {
    const bodies = createSolReferenceProject(earthSurface()).solarSystem.bodies;
    const orders = Object.fromEntries(bodies.map((body) => [body.id, body.orbitalOrder]));
    expect(orders.mars).toBe(4);
    expect(orders['main-asteroid-belt']).toBe(5);
    expect(orders.jupiter).toBe(6);
  });
});
