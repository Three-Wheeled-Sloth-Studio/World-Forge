import { describe, expect, it } from 'vitest';
import { surfacePresentationTheme, ttrpgBiomeForSurfacePresentation, ttrpgWorldMapTheme } from './index';

describe('top-level TTRPG world map presentation', () => {
  it('keeps a restrained parchment land palette distinct from muted water', () => {
    const theme = surfacePresentationTheme(ttrpgWorldMapTheme);
    const water = [theme.colors.oceanDeep, theme.colors.ocean, theme.colors.shelf];
    const land = [theme.colors.tundra, theme.colors.desert, theme.colors.grassland, theme.colors.forest, theme.colors.rainforest, theme.colors.mountain, theme.colors.wetland];

    expect(new Set(water).size).toBe(3);
    for (const landColor of land) {
      expect(water).not.toContain(landColor);
    }
    expect(theme.colors.coastline).toBe('#4a3a29');
    expect(theme.colors.river).toBe('#55797c');
  });

  it('keeps the canonical water mask authoritative at the final TTRPG biome seam', () => {
    expect(ttrpgBiomeForSurfacePresentation('ocean', false)).toBe('grassland');
    expect(ttrpgBiomeForSurfacePresentation('forest', false)).toBe('forest');
    expect(ttrpgBiomeForSurfacePresentation('grassland', true)).toBe('ocean');
    expect(ttrpgBiomeForSurfacePresentation('ocean', true)).toBe('ocean');
  });
});
