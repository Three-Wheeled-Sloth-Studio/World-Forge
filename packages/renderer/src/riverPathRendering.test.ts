import { describe, expect, it } from 'vitest';
import { splitWrappedRiverPath } from './index';

describe('splitWrappedRiverPath', () => {
  it('splits an antimeridian crossing instead of drawing across the map', () => {
    const width = 10;
    const path = [2 * width + 8, 2 * width + 9, 2 * width, 2 * width + 1];
    const segments = splitWrappedRiverPath(path, width, 1, 1);
    expect(segments).toHaveLength(2);
    expect(segments[0].map((point) => point.x)).toEqual([8.5, 9.5]);
    expect(segments[1].map((point) => point.x)).toEqual([0.5, 1.5]);
  });

  it('keeps ordinary and terminal paths in one segment', () => {
    const width = 10;
    const path = [11, 12, 13, 13];
    const segments = splitWrappedRiverPath(path, width, 1, 1);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveLength(4);
  });
});
