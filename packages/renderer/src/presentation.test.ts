import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from '../../generator-core/src/index';
import { applyBasinAwareCirculation } from '../../generator-core/src/basinCirculation';
import { buildSparseFlowPaths } from './presentation';

let acceptedWorld: ReturnType<typeof generatedWorld> | undefined;

function generatedWorld() {
  const project = generateProject(createDefaultConfig('sparse-presentation-001', { width: 256, height: 128 }));
  applyBasinAwareCirculation(project);
  return project.primaryWorld;
}

function sharedWorld() {
  acceptedWorld ??= generatedWorld();
  return acceptedWorld;
}

function pathSignature(paths: ReturnType<typeof buildSparseFlowPaths>) {
  return paths.map((path) => ({
    id: path.id,
    points: path.points.length,
    start: path.points[0] ? [Math.round(path.points[0].x * 1000), Math.round(path.points[0].y * 1000)] : null,
    end: path.points.at(-1) ? [Math.round(path.points.at(-1)!.x * 1000), Math.round(path.points.at(-1)!.y * 1000)] : null,
    speed: Math.round(path.averageSpeed * 10000),
    colorClass: path.colorClass
  }));
}

function pathLength(points: Array<{ x: number; y: number }>): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return total;
}

describe('sparse wind and current presentation', () => {
  it('reduces wind presentation to a bounded set of long deterministic paths', () => {
    const world = sharedWorld();
    const first = buildSparseFlowPaths(world, 'wind', 1024, 512);
    const second = buildSparseFlowPaths(world, 'wind', 1024, 512);

    expect(first.length).toBeGreaterThan(4);
    expect(first.length).toBeLessThanOrEqual(28);
    expect(Math.max(...first.map((path) => pathLength(path.points)))).toBeGreaterThan(world.mapModel.resolution.width * 0.35);
    expect(first.every((path) => path.points.length >= 10)).toBe(true);
    expect(pathSignature(first)).toEqual(pathSignature(second));
  }, 30_000);

  it('uses a bounded set of water-confined gyre and equatorial paths', () => {
    const world = sharedWorld();
    const paths = buildSparseFlowPaths(world, 'current', 1024, 512);
    const { width, height } = world.mapModel.resolution;

    expect(paths.length).toBeGreaterThan(2);
    expect(paths.length).toBeLessThanOrEqual(20);
    expect(Math.max(...paths.map((path) => pathLength(path.points)))).toBeGreaterThan(width * 0.2);
    for (const path of paths) {
      for (const point of path.points) {
        const x = ((Math.floor(point.x) % width) + width) % width;
        const y = Math.max(0, Math.min(height - 1, Math.round(point.y)));
        expect(world.layers.water[y * width + x]).toBe(1);
      }
    }
  }, 30_000);

  it('changes only presentation density and leaves authoritative vectors untouched', () => {
    const world = sharedWorld();
    const windXBefore = Array.from(world.layers.windX);
    const windYBefore = Array.from(world.layers.windY);
    const currentXBefore = Array.from(world.layers.currentX);
    const currentYBefore = Array.from(world.layers.currentY);

    buildSparseFlowPaths(world, 'wind', 1024, 512);
    buildSparseFlowPaths(world, 'current', 1024, 512);

    expect(Array.from(world.layers.windX)).toEqual(windXBefore);
    expect(Array.from(world.layers.windY)).toEqual(windYBefore);
    expect(Array.from(world.layers.currentX)).toEqual(currentXBefore);
    expect(Array.from(world.layers.currentY)).toEqual(currentYBefore);
  }, 30_000);
});
