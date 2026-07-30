import type { MapMode } from '@world-forge/renderer';

export type WorkspaceMode = 'build' | 'explore' | 'export';

export function workspaceModeForProject(hasProject: boolean): WorkspaceMode {
  return hasProject ? 'explore' : 'build';
}

export const workspaceModeOptions: ReadonlyArray<{
  id: WorkspaceMode;
  label: string;
  description: string;
}> = [
  {
    id: 'build',
    label: 'Build',
    description: 'Choose generation inputs and create or regenerate the world.'
  },
  {
    id: 'explore',
    label: 'Explore',
    description: 'Change presentation, inspect locations, and navigate the generated world.'
  },
  {
    id: 'export',
    label: 'Export',
    description: 'Download common formats and prepare tile or VTT outputs.'
  }
];

const userFacingMapModes: readonly MapMode[] = [
  'biomes',
  'elevation',
  'heightmap',
  'temperature',
  'rainfall',
  'climate-moisture',
  'climate-precipitation',
  'wind',
  'current',
  'terrain-only'
];

export function normalizeUserFacingMapMode(mode: MapMode): MapMode {
  return userFacingMapModes.includes(mode) ? mode : 'biomes';
}
