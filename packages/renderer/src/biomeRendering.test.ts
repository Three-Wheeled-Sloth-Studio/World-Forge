import { describe, expect, it } from 'vitest';
import {
  biomeToCode,
  codeToBiome,
  type WorldProject,
} from '@world-forge/shared';
import {
  cleanGameMapTheme,
  landElevationPercentileRange,
  naturalLandBiomeForPresentation,
  naturalSnowTintStrength,
  projectForSurfaceIcePresentation,
  projectForSurfacePresentation,
  surfacePresentationTheme,
} from './index';

describe('biome rendering elevation and snow semantics', () => {
  it('normalizes natural land elevation without ocean cells', () => {
    const elevation = new Float32Array([-0.8, -0.4, 0.1, 0.2, 0.4]);
    const water = new Uint8Array([1, 1, 0, 0, 0]);
    const [low, high] = landElevationPercentileRange(elevation, water, 0, 1);

    expect(low).toBeCloseTo(0.1, 5);
    expect(high).toBeCloseTo(0.4, 5);
  });

  it('renders a stale ice-cap biome as tundra when permanent ice is absent', () => {
    expect(naturalLandBiomeForPresentation('ice_cap', false)).toBe('tundra');
    expect(naturalLandBiomeForPresentation('ice_cap', true)).toBe('ice_cap');
    expect(naturalLandBiomeForPresentation('grassland', false)).toBe('grassland');
  });

  it('applies permanent surface ice authority to data-mode land without rewriting source facts', () => {
    const project = presentationFixture();
    project.primaryWorld.layers.ice[0] = 1;
    project.primaryWorld.layers.biomes[0] = biomeToCode('ice_cap');
    project.primaryWorld.layers.water[1] = 1;
    project.primaryWorld.layers.ice[1] = 1;
    project.primaryWorld.layers.biomes[1] = biomeToCode('ocean');

    const presentation = projectForSurfaceIcePresentation(project);

    expect(project.primaryWorld.layers.ice[0]).toBe(1);
    expect(codeToBiome(project.primaryWorld.layers.biomes[0])).toBe('ice_cap');
    expect(presentation.primaryWorld.layers.ice[0]).toBe(0);
    expect(codeToBiome(presentation.primaryWorld.layers.biomes[0])).toBe('tundra');
    expect(presentation.primaryWorld.layers.ice[1]).toBe(1);
    expect(codeToBiome(presentation.primaryWorld.layers.biomes[1])).toBe('ocean');
  });

  it('keeps the canonical water mask authoritative when stale biome labels cross land and water', () => {
    const project = presentationFixture();
    project.primaryWorld.layers.biomes[0] = biomeToCode('ocean');
    project.primaryWorld.layers.water[0] = 0;
    project.primaryWorld.layers.biomes[1] = biomeToCode('grassland');
    project.primaryWorld.layers.water[1] = 1;

    const presentation = projectForSurfacePresentation(project);

    expect(codeToBiome(project.primaryWorld.layers.biomes[0])).toBe('ocean');
    expect(project.primaryWorld.layers.water[0]).toBe(0);
    expect(codeToBiome(presentation.primaryWorld.layers.biomes[0])).not.toBe('ocean');
    expect(presentation.primaryWorld.layers.water[0]).toBe(0);
    expect(codeToBiome(presentation.primaryWorld.layers.biomes[1])).toBe('ocean');
    expect(presentation.primaryWorld.layers.water[1]).toBe(1);
  });

  it('keeps water-like land palette entries out of the water color family', () => {
    const theme = {
      ...cleanGameMapTheme,
      colors: {
        ...cleanGameMapTheme.colors,
        wetland: '#6f9f78',
      },
    };

    const presentation = surfacePresentationTheme(theme);

    expect(presentation.colors.wetland).toBe('#788d62');
    expect(presentation.colors.ocean).toBe(theme.colors.ocean);
    expect(presentation.colors.shelf).toBe(theme.colors.shelf);
    expect(presentation.colors.grassland).toBe(theme.colors.grassland);
  });

  it('does not whiten warm highlands as snow', () => {
    expect(naturalSnowTintStrength({
      ice: false,
      temperatureC: 18,
      landElevation01: 0.98,
      altitudeAboveSeaLevel: 0.62,
      slope: 0.34
    })).toBe(0);
  });

  it('allows cold exposed highlands to carry bounded snow tone', () => {
    const strength = naturalSnowTintStrength({
      ice: false,
      temperatureC: -8,
      landElevation01: 0.96,
      altitudeAboveSeaLevel: 0.58,
      slope: 0.31
    });

    expect(strength).toBeGreaterThan(0.9);
    expect(strength).toBeLessThanOrEqual(1);
  });

  it('keeps decorative snowline display below permanent ice strength', () => {
    const displayTint = naturalSnowTintStrength({
      ice: false,
      temperatureC: -8,
      landElevation01: 0.96,
      altitudeAboveSeaLevel: 0.58,
      slope: 0.31
    }) * 0.28;

    expect(displayTint).toBeGreaterThan(0.2);
    expect(displayTint).toBeLessThan(0.35);
  });

  it('keeps the explicit ice mask authoritative', () => {
    expect(naturalSnowTintStrength({
      ice: true,
      temperatureC: 20,
      landElevation01: 0.1,
      altitudeAboveSeaLevel: 0.01,
      slope: 0
    })).toBe(1);
  });
});

function presentationFixture(): WorldProject {
  const mapCellCount = 8;
  const topologyCellCount = 24;
  return {
    config: {
      biomeRules: undefined,
    },
    primaryWorld: {
      seaLevel: 0,
      mapModel: { resolution: { width: 4, height: 2 } },
      topology: { resolution: 2 },
      topologyLayers: {
        elevation: new Float32Array(topologyCellCount).fill(0.2),
        water: new Uint8Array(topologyCellCount),
        temperature: new Float32Array(topologyCellCount).fill(18),
        ice: new Uint8Array(topologyCellCount),
      },
      layers: {
        elevation: new Float32Array(mapCellCount).fill(0.2),
        water: new Uint8Array(mapCellCount),
        ice: new Uint8Array(mapCellCount),
        biomes: new Uint8Array(mapCellCount).fill(biomeToCode('grassland')),
        temperature: new Float32Array(mapCellCount).fill(18),
        wetness: new Float32Array(mapCellCount).fill(0.4),
        river: new Float32Array(mapCellCount),
        lakes: new Uint8Array(mapCellCount),
      },
    },
  } as unknown as WorldProject;
}
