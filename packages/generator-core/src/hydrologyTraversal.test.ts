import { describe, expect, it } from 'vitest';
import { stableDescendingFloat32Indices, traceCachedDownstreamPath } from './hydrologyTraversal';

describe('hydrology traversal optimization', () => {
  it('matches stable descending comparison sort for finite Float32 values', () => {
    const values = new Float32Array([
      0.5,
      -0,
      3.25,
      -2,
      0.5,
      0,
      1.25,
      -2,
      3.25,
      0.125,
      -0.125
    ]);
    const expected = Array.from({ length: values.length }, (_, index) => index)
      .sort((left, right) => values[right] - values[left]);
    expect(Array.from(stableDescendingFloat32Indices(values))).toEqual(expected);
  });

  it('matches comparison sort across a deterministic mixed terrain sample', () => {
    const values = new Float32Array(4096);
    for (let index = 0; index < values.length; index += 1) {
      const band = (index % 37) - 18;
      values[index] = Math.fround(Math.sin(index * 0.17) * 0.8 + band * 0.0125);
      if (index % 71 === 0) values[index] = 0.25;
    }
    const expected = Array.from({ length: values.length }, (_, index) => index)
      .sort((left, right) => values[right] - values[left]);
    expect(Array.from(stableDescendingFloat32Indices(values))).toEqual(expected);
  });

  it('reuses shared downstream suffixes without changing paths or termini', () => {
    const downstream = new Int32Array([
      2, // 0 -> shared route
      2, // 1 -> shared route
      3,
      4,
      5,
      -1,
      4, // 6 joins later
      6
    ]);
    const water = new Set([5]);
    const cache = new Map<number, { path: number[]; terminus: 'ocean' | 'basin' }>();
    const trace = (source: number) => traceCachedDownstreamPath({
      source,
      downstream,
      maxSteps: downstream.length,
      defaultTerminus: 'basin' as const,
      terminusAt: (cell) => water.has(cell) ? 'ocean' as const : undefined,
      cache
    });

    expect(trace(0)).toEqual({ path: [0, 2, 3, 4, 5], terminus: 'ocean' });
    expect(trace(1)).toEqual({ path: [1, 2, 3, 4, 5], terminus: 'ocean' });
    expect(trace(7)).toEqual({ path: [7, 6, 4, 5], terminus: 'ocean' });
    expect(cache.get(4)).toEqual({ path: [4, 5], terminus: 'ocean' });
  });

  it('preserves the default terminus for sink cells', () => {
    const downstream = new Int32Array([-1, 0]);
    const cache = new Map<number, { path: number[]; terminus: 'basin' }>();
    const result = traceCachedDownstreamPath({
      source: 1,
      downstream,
      maxSteps: downstream.length,
      defaultTerminus: 'basin',
      terminusAt: () => undefined,
      cache
    });
    expect(result).toEqual({ path: [1, 0], terminus: 'basin' });
  });
});
