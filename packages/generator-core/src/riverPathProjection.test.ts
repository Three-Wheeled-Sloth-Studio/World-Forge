import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import { areTopologyNeighbors, projectTopologyRiverPath } from './riverPathProjection';

describe('projectTopologyRiverPath', () => {
  const topology = buildCubedSphereTopology(12);
  const width = 96;
  const height = 48;

  it('retains valid cube-face seam transitions', () => {
    const faceSize = topology.resolution * topology.resolution;
    let pair: [number, number] | undefined;
    for (let cell = 0; cell < topology.cellCount && !pair; cell += 1) {
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor >= 0 && Math.floor(cell / faceSize) !== Math.floor(neighbor / faceSize)) {
          pair = [cell, neighbor];
          break;
        }
      }
    }
    expect(pair).toBeDefined();
    expect(areTopologyNeighbors(topology, pair![0], pair![1])).toBe(true);
    expect(projectTopologyRiverPath(pair!, topology, width, height).length).toBeGreaterThan(0);
  });

  it('retains antimeridian neighbors for renderer-side path splitting', () => {
    let pair: [number, number] | undefined;
    for (let cell = 0; cell < topology.cellCount && !pair; cell += 1) {
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor < 0) continue;
        const projected = projectTopologyRiverPath([cell, neighbor], topology, width, height);
        if (projected.length < 2) continue;
        if (Math.abs((projected[0] % width) - (projected[1] % width)) > width / 2) {
          pair = [cell, neighbor];
          break;
        }
      }
    }
    expect(pair).toBeDefined();
    const projected = projectTopologyRiverPath(pair!, topology, width, height);
    expect(Math.abs((projected[0] % width) - (projected[1] % width))).toBeGreaterThan(width / 2);
  });

  it('truncates invalid non-neighbor jumps instead of connecting them', () => {
    const source = 0;
    let invalid = topology.cellCount - 1;
    while (areTopologyNeighbors(topology, source, invalid)) invalid -= 1;
    expect(projectTopologyRiverPath([source, invalid], topology, width, height)).toHaveLength(1);
  });

  it('deduplicates repeated cells and preserves a valid closed path', () => {
    let source = 0;
    let neighbor = topology.neighbors[0];
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      const candidate = topology.neighbors[cell * 4];
      if (candidate >= 0 && areTopologyNeighbors(topology, candidate, cell)) {
        source = cell;
        neighbor = candidate;
        break;
      }
    }
    const projected = projectTopologyRiverPath([source, source, neighbor, source], topology, width, height);
    expect(projected.length).toBeGreaterThanOrEqual(2);
    expect(projected[0]).toBe(projected[projected.length - 1]);
  });
});
