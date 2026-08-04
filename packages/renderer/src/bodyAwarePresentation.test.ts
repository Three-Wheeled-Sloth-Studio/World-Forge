import { beforeEach, describe, expect, it } from 'vitest';
import type { PrimaryWorld, WorldProject } from '@world-forge/shared';
import { withActiveWorldBody, withWorldBodySurface } from '@world-forge/shared/worldBodies';
import { rememberSessionActiveWorldBody, resetSessionActiveWorldBody } from '@world-forge/shared/worldBodySession';
import { activeBodyProject, mapProjectForActiveBody } from './bodyAwarePresentation';

function surface(id: string): PrimaryWorld {
  return { id, name: id } as PrimaryWorld;
}

function project(): WorldProject {
  return {
    projectId: 'system-1',
    projectName: 'System',
    primaryWorld: surface('earth'),
    solarSystem: {
      primaryWorldId: 'earth',
      bodies: [
        { id: 'earth', bodyType: 'rocky', isPrimaryWorld: true, moons: [] },
        { id: 'mars', bodyType: 'rocky', isPrimaryWorld: false, moons: [] },
      ],
    },
  } as unknown as WorldProject;
}

describe('active-body renderer projection', () => {
  beforeEach(() => resetSessionActiveWorldBody());

  it('projects the selected surfaced body without splitting the system project', () => {
    const withMars = withWorldBodySurface(project(), {
      bodyId: 'mars',
      name: 'Mars',
      bodyType: 'rocky',
      capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
      dataOrigin: 'imported',
      surface: surface('mars'),
    });
    const active = withActiveWorldBody(withMars, 'mars');
    const rendered = activeBodyProject(active);

    expect(rendered.projectId).toBe('system-1');
    expect(rendered.primaryWorld.id).toBe('mars');
  });

  it('uses the session body selected by the system viewer', () => {
    const withMars = withWorldBodySurface(project(), {
      bodyId: 'mars',
      name: 'Mars',
      bodyType: 'rocky',
      capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
      dataOrigin: 'imported',
      surface: surface('mars'),
    });
    expect(rememberSessionActiveWorldBody(withMars, 'mars')).toBe(true);
    expect(mapProjectForActiveBody(withMars)?.primaryWorld.id).toBe('mars');
  });

  it('reports no mappable project when the active body has no surface', () => {
    const active = withActiveWorldBody(project(), 'mars');
    expect(mapProjectForActiveBody(active)).toBeNull();
    expect(activeBodyProject(active).primaryWorld.id).toBe('earth');
  });
});
