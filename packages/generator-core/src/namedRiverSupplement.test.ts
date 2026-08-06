import { describe, expect, it } from 'vitest';
import {
  biomeToCode,
  buildCubedSphereTopology,
  type CubedSphereTopology,
  type WorldProject,
} from '@world-forge/shared';
import {
  CURRENT_GENERATOR_VERSION,
  expectedNamedRiverCount,
  supplementNamedTopologyRivers,
} from './index';

describe('named topology river promotion', () => {
  it('uses the resolved-river generator version', () => {
    expect(CURRENT_GENERATOR_VERSION).toBe('0.1.2-mvp');
  });

  it('promotes an existing signaled drainage path only when it reaches real water', () => {
    const topology = buildCubedSphereTopology(4);
    const drainagePath = longestBreadthFirstPath(topology, 0).slice(0, 7);
    expect(drainagePath.length).toBeGreaterThanOrEqual(6);

    const cellCount = topology.cellCount;
    const elevation = new Float32Array(cellCount).fill(2);
    const water = new Uint8Array(cellCount);
    const river = new Float32Array(cellCount);
    const wetness = new Float32Array(cellCount).fill(0.5);
    const lakes = new Uint8Array(cellCount);
    const ice = new Uint8Array(cellCount);
    const biomes = new Uint8Array(cellCount).fill(biomeToCode('grassland'));

    drainagePath.forEach((cell, index) => {
      elevation[cell] = 0.9 - index * 0.12;
      river[cell] = Math.max(0.12, 1 - index * 0.12);
      wetness[cell] = 0.8;
    });
    const mouth = drainagePath[drainagePath.length - 1];
    water[mouth] = 1;
    elevation[mouth] = -0.2;
    biomes[mouth] = biomeToCode('ocean');

    const project = {
      projectId: 'river-supplement-test',
      seed: 'river-supplement-test',
      selectedValues: {
        riverDensity: 1.6,
        oceanPercentage: 1,
        oceanTolerancePercentagePoints: 100,
      },
      primaryWorld: {
        id: 'primary-world',
        seaLevel: 0,
        topology: {
          kind: 'cubed-sphere',
          resolution: topology.resolution,
          cellCount,
        },
        mapModel: {
          resolution: { width: 16, height: 8 },
          projection: 'equirectangular',
          wrapMode: 'horizontal',
        },
        topologyLayers: {
          elevation,
          water,
          river,
          wetness,
          lakes,
          ice,
          biomes,
        },
        layers: {
          elevation: new Float32Array(128),
          water: new Uint8Array(128),
          lakes: new Uint8Array(128),
          ice: new Uint8Array(128),
          biomes: new Uint8Array(128).fill(biomeToCode('grassland')),
        },
        rivers: [],
      },
    } as unknown as WorldProject;

    const supplemented = supplementNamedTopologyRivers(project);

    expect(project.primaryWorld.rivers).toHaveLength(0);
    expect(supplemented.primaryWorld.rivers).toHaveLength(1);
    const promoted = supplemented.primaryWorld.rivers[0];
    expect(promoted.terminus).toBe('ocean');
    expect(promoted.topologyPath?.[0]).toBe(drainagePath[0]);
    expect(promoted.topologyPath?.[promoted.topologyPath.length - 1]).toBe(mouth);
    expect(water[promoted.topologyPath?.[promoted.topologyPath.length - 1] ?? -1]).toBe(1);
    expect(supplemented.metrics.riverCount).toBe(1);
  });

  it('bounds expected named-river count by density and available land', () => {
    expect(expectedNamedRiverCount(0, 1000)).toBe(0);
    expect(expectedNamedRiverCount(1.6, 5)).toBe(1);
    expect(expectedNamedRiverCount(1.6, 1200)).toBe(48);
    expect(expectedNamedRiverCount(8, 100000)).toBe(120);
  });
});

function longestBreadthFirstPath(topology: CubedSphereTopology, start: number): number[] {
  const parent = new Int32Array(topology.cellCount);
  parent.fill(-1);
  const distance = new Int32Array(topology.cellCount);
  distance.fill(-1);
  const queue = new Int32Array(topology.cellCount);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  distance[start] = 0;
  let farthest = start;

  while (head < tail) {
    const cell = queue[head++];
    if (distance[cell] > distance[farthest]) farthest = cell;
    for (let offset = 0; offset < 4; offset += 1) {
      const neighbor = topology.neighbors[cell * 4 + offset];
      if (neighbor < 0 || distance[neighbor] >= 0) continue;
      distance[neighbor] = distance[cell] + 1;
      parent[neighbor] = cell;
      queue[tail++] = neighbor;
    }
  }

  const path: number[] = [];
  for (let cell = farthest; cell >= 0; cell = parent[cell]) path.push(cell);
  return path.reverse();
}
