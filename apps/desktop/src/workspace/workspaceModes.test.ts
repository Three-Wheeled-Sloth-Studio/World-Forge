import { describe, expect, it } from 'vitest';
import { normalizeUserFacingMapMode, workspaceModeForProject, workspaceModeOptions } from './workspaceModes';

describe('workspace modes', () => {
  it('offers the three real user jobs in order', () => {
    expect(workspaceModeOptions.map((option) => option.id)).toEqual(['build', 'explore', 'export']);
  });

  it('starts in Build without a world and moves to Explore when one becomes available', () => {
    expect(workspaceModeForProject(false)).toBe('build');
    expect(workspaceModeForProject(true)).toBe('explore');
  });

  it('keeps ordinary map subjects available', () => {
    expect(normalizeUserFacingMapMode('biomes')).toBe('biomes');
    expect(normalizeUserFacingMapMode('temperature')).toBe('temperature');
    expect(normalizeUserFacingMapMode('terrain-only')).toBe('terrain-only');
  });

  it('moves debug-only map subjects out of the ordinary Explore selector', () => {
    expect(normalizeUserFacingMapMode('water-mask')).toBe('biomes');
    expect(normalizeUserFacingMapMode('sea-level')).toBe('biomes');
    expect(normalizeUserFacingMapMode('topology-face')).toBe('biomes');
  });
});
