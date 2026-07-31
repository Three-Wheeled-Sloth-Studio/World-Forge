
import { buildCubedSphereTopology, clamp, type CubedSphereTopology } from '@world-forge/shared';
import { describe, expect, it } from 'vitest';
import {
  buildTopologyDirectionGeometry,
  stepTopologyByVectorWithGeometry,
  topologyTerrainGradientWithGeometry
} from './presentClimateTraversal';

describe('present-climate topology traversal', () => {
  const topology = buildCubedSphereTopology(8);
  const geometry = buildTopologyDirectionGeometry(topology);
  const elevation = new Float32Array(topology.cellCount);
  for (let cell = 0; cell < elevation.length; cell += 1) {
    elevation[cell] = Math.fround(Math.sin(cell * 0.137) * 0.42 + Math.cos(cell * 0.031) * 0.18);
  }

  it('matches legacy terrain gradients exactly', () => {
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      expect(topologyTerrainGradientWithGeometry(elevation, topology, geometry, cell))
        .toEqual(legacyTerrainGradient(elevation, topology, cell));
    }
  });

  it('matches legacy directional steps exactly', () => {
    const vectors = [
      { x: 1, y: 0 },
      { x: -0.73, y: 0.42 },
      { x: 0.18, y: -0.91 },
      { x: 0, y: 0 }
    ];
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      for (const vector of vectors) {
        expect(stepTopologyByVectorWithGeometry(topology, geometry, cell, vector.x, vector.y))
          .toBe(legacyStep(topology, cell, vector.x, vector.y));
      }
    }
  });
});

function legacyTerrainGradient(layer: Float32Array, topology: CubedSphereTopology, cell: number) {
  let gx = 0;
  let gy = 0;
  let count = 0;
  for (let direction = 0; direction < 4; direction += 1) {
    const neighbor = topology.neighbors[cell * 4 + direction];
    if (neighbor < 0) continue;
    const dx = wrappedAngle(topology.longitudes[neighbor] - topology.longitudes[cell])
      * Math.max(0.12, Math.cos(topology.latitudes[cell]));
    const dy = topology.latitudes[neighbor] - topology.latitudes[cell];
    const distance2 = Math.max(0.000001, dx * dx + dy * dy);
    const delta = layer[neighbor] - layer[cell];
    gx += (delta * dx) / distance2;
    gy += (delta * dy) / distance2;
    count += 1;
  }
  return count ? { x: clamp(gx / count, -1, 1), y: clamp(gy / count, -1, 1) } : { x: 0, y: 0 };
}

function legacyStep(topology: CubedSphereTopology, cell: number, vectorX: number, vectorY: number): number {
  const length = Math.hypot(vectorX, vectorY);
  if (length < 0.0001) return cell;
  let best = cell;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let direction = 0; direction < 4; direction += 1) {
    const neighbor = topology.neighbors[cell * 4 + direction];
    if (neighbor < 0) continue;
    const dx = wrappedAngle(topology.longitudes[neighbor] - topology.longitudes[cell])
      * Math.max(0.12, Math.cos(topology.latitudes[cell]));
    const dy = topology.latitudes[neighbor] - topology.latitudes[cell];
    const distance = Math.max(0.000001, Math.hypot(dx, dy));
    const score = (dx / distance) * (vectorX / length) + (dy / distance) * (vectorY / length);
    if (score > bestScore) {
      best = neighbor;
      bestScore = score;
    }
  }
  return best;
}

function wrappedAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}
