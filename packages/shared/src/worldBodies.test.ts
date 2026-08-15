import { describe, expect, it } from 'vitest';
import type { PrimaryWorld, WorldProject } from './index';
import { WORLD_BODY_DETAIL_SCHEMA } from './worldBodyDetails';
import {
  activeWorldBodyId,
  projectForWorldBody,
  readWorldBodyCatalog,
  withActiveWorldBody,
  withWorldBodyDetail,
  withWorldBodySurface,
  worldBodyDetailForBody,
  type WorldBodyRecordV1,
} from './worldBodies';

function surface(id: string, name: string): PrimaryWorld {
  return { id, name } as PrimaryWorld;
}

function project(): WorldProject {
  return {
    projectId: 'sol-reference',
    projectName: 'Sol System',
    primaryWorld: surface('earth-surface', 'Earth'),
    solarSystem: {
      primaryWorldId: 'earth',
      bodies: [
        { id: 'earth', bodyType: 'rocky', isPrimaryWorld: true, moons: [{ id: 'luna', name: 'Luna' }] },
        { id: 'mars', bodyType: 'rocky', isPrimaryWorld: false, moons: [] },
      ],
    },
  } as unknown as WorldProject;
}

function surfacedBody(bodyId: string, name: string, bodySurface: PrimaryWorld): Omit<WorldBodyRecordV1, 'surface'> & { surface: PrimaryWorld } {
  return {
    bodyId,
    name,
    bodyType: 'rocky',
    capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
    dataOrigin: 'imported',
    surface: bodySurface,
  };
}

describe('world body catalog', () => {
  it('adapts legacy primary-world projects without inventing secondary surfaces', () => {
    const source = project();
    const catalog = readWorldBodyCatalog(source);

    expect(catalog.primaryBodyId).toBe('earth');
    expect(activeWorldBodyId(source)).toBe('earth');
    expect(projectForWorldBody(source, 'earth')?.primaryWorld.name).toBe('Earth');
    expect(projectForWorldBody(source, 'mars')).toBeNull();
    expect(worldBodyDetailForBody(source, 'earth')?.tier).toBe('geographic');
    expect(worldBodyDetailForBody(source, 'mars')?.tier).toBe('catalog');
  });

  it('stores a secondary body surface inside the same system project', () => {
    const source = withWorldBodySurface(project(), surfacedBody('mars', 'Mars', surface('mars-surface', 'Mars')));

    const active = withActiveWorldBody(source, 'mars');
    const projected = projectForWorldBody(active, 'mars');

    expect(activeWorldBodyId(active)).toBe('mars');
    expect(projected?.projectId).toBe('sol-reference');
    expect(projected?.primaryWorld.name).toBe('Mars');
    expect(readWorldBodyCatalog(projected!).bodies).toHaveLength(3);
    expect(worldBodyDetailForBody(projected!, 'mars')?.kind).toBe('geographic-surface');
  });

  it('uses the current root primary world when a materialized catalog carries an older primary surface snapshot', () => {
    const materialized = withWorldBodySurface(project(), surfacedBody('mars', 'Mars', surface('mars-surface', 'Mars')));
    const updatedPrimary = surface('earth-surface', 'Earth current');
    const source = { ...materialized, primaryWorld: updatedPrimary } as WorldProject;

    const catalog = readWorldBodyCatalog(source);
    const primaryRecord = catalog.bodies.find((body) => body.bodyId === catalog.primaryBodyId);

    expect(primaryRecord?.surface).toBe(updatedPrimary);
    expect(projectForWorldBody(source, 'earth')?.primaryWorld).toBe(updatedPrimary);
  });

  it('preserves the durable primary when a secondary body is projected through primaryWorld', () => {
    const source = withWorldBodySurface(project(), surfacedBody('mars', 'Mars', surface('mars-surface', 'Mars')));
    const projectedMars = projectForWorldBody(withActiveWorldBody(source, 'mars'), 'mars')!;

    expect(projectedMars.primaryWorld.name).toBe('Mars');
    expect(projectForWorldBody(projectedMars, 'earth')?.primaryWorld.name).toBe('Earth');
    expect(readWorldBodyCatalog(projectedMars).bodies.find((body) => body.bodyId === 'earth')?.surface?.name).toBe('Earth');
  });

  it('keeps explicit primary-surface writes synchronized with the root project', () => {
    const source = withWorldBodySurface(project(), surfacedBody('mars', 'Mars', surface('mars-surface', 'Mars')));
    const updatedPrimary = surface('earth-surface', 'Earth edited');
    const updated = withWorldBodySurface(source, surfacedBody('earth', 'Earth', updatedPrimary));

    expect(updated.primaryWorld).toBe(updatedPrimary);
    expect(readWorldBodyCatalog(updated).bodies.find((body) => body.bodyId === 'earth')?.surface).toBe(updatedPrimary);
  });

  it('adds lightweight presentation detail without creating a geographic surface', () => {
    const source = withWorldBodyDetail(project(), 'mars', {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'atmospheric-presentation',
      tier: 'presentation',
      origin: 'derived',
      shape: { kind: 'sphere' },
      atmosphere: {
        paletteHex: ['#c96f45', '#df9d73'],
        bandCount: 2,
        bandContrast: 0.2,
        hazeStrength: 0.1,
      },
    });

    expect(worldBodyDetailForBody(source, 'mars')?.tier).toBe('presentation');
    expect(projectForWorldBody(source, 'mars')).toBeNull();
  });

  it('ignores an unknown active body instead of corrupting selection', () => {
    const source = project();
    expect(withActiveWorldBody(source, 'pluto')).toBe(source);
  });
});
