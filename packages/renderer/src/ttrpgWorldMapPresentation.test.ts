import { describe, expect, it } from 'vitest';
import { surfacePresentationTheme, ttrpgBiomeForSurfacePresentation, ttrpgWorldMapTheme } from './index';

describe('top-level TTRPG world map presentation', () => {
  it('keeps warm parchment land materially distinct from the cool water wash', () => {
    const theme = surfacePresentationTheme(ttrpgWorldMapTheme);
    const water = [theme.colors.oceanDeep, theme.colors.ocean, theme.colors.shelf];
    const land = [theme.colors.tundra, theme.colors.desert, theme.colors.grassland, theme.colors.forest, theme.colors.rainforest, theme.colors.mountain, theme.colors.wetland];

    expect(new Set(water).size).toBe(3);
    for (const landColor of land) {
      for (const waterColor of water) {
        expect(colorDistance(landColor, waterColor)).toBeGreaterThan(82);
      }
    }
    expect(theme.colors.coastline).toBe('#4a3828');
    expect(theme.colors.river).toBe('#58787d');
  });

  it('keeps the canonical water mask authoritative at the final TTRPG biome seam', () => {
    expect(ttrpgBiomeForSurfacePresentation('ocean', false)).toBe('grassland');
    expect(ttrpgBiomeForSurfacePresentation('forest', false)).toBe('forest');
    expect(ttrpgBiomeForSurfacePresentation('grassland', true)).toBe('ocean');
    expect(ttrpgBiomeForSurfacePresentation('ocean', true)).toBe('ocean');
  });
});

function colorDistance(left: string, right: string): number {
  const a = rgb(left);
  const b = rgb(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function rgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}
