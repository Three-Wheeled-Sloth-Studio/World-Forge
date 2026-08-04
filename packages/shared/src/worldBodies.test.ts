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
    const source = withWorldBodySurface(project(), {
      bodyId: 'mars',
      name: 'Mars',
      bodyType: 'rocky',
      capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
      dataOrigin: 'imported',
      surface: surface('mars-surface', 'Mars'),
    });

    const active = withActiveWorldBody(source, 'mars');
    const projected = projectForWorldBody(active, 'mars');

    expect(activeWorldBodyId(active)).toBe('mars');
    expect(projected?.projectId).toBe('sol-reference');
    expect(projected?.primaryWorld.name).toBe('Mars');
    expect(readWorldBodyCatalog(projected!).bodies).toHaveLength(3);
    expect(worldBodyDetailForBody(projected!, 'mars')?.kind).toBe('geographic-surface');
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
