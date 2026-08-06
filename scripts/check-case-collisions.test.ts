import { describe, expect, it } from 'vitest';
import { findCaseCollisions } from './check-case-collisions.mjs';

describe('case-collision repository guard', () => {
  it('detects paths that differ only by capitalization', () => {
    expect(findCaseCollisions([
      'apps/desktop/src/regions/GeographicAtlasContextMap.tsx',
      'apps/desktop/src/regions/geographicAtlasContextMap.tsx',
      'apps/desktop/src/regions/geographicAtlasContextGeometry.ts',
    ])).toEqual([[
      'apps/desktop/src/regions/GeographicAtlasContextMap.tsx',
      'apps/desktop/src/regions/geographicAtlasContextMap.tsx',
    ]]);
  });

  it('allows related modules whose complete names remain distinct when folded', () => {
    expect(findCaseCollisions([
      'apps/desktop/src/regions/GeographicAtlasContextMap.tsx',
      'apps/desktop/src/regions/geographicAtlasContextGeometry.ts',
      'apps/desktop/src/regions/geographicAtlasContextMap.test.ts',
    ])).toEqual([]);
  });
});
