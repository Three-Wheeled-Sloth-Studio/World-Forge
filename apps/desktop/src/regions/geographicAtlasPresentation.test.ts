import { describe, expect, it } from 'vitest';
import type { GeographicHierarchyOpenMap } from './geographicHierarchyPreview';
import { resolveGeographicDrilldownPresentation } from './useGeographicAtlasController';

const levels: GeographicHierarchyOpenMap['level'][] = [
  'macro-area',
  'region',
  'subregion',
  'local',
  'detail',
];

describe('geographic atlas presentation resolution', () => {
  it('keeps Auto on the canonical tile renderer at every drilldown level', () => {
    for (const level of levels) {
      expect(resolveGeographicDrilldownPresentation('auto', level)).toEqual({
        mode: 'tiles',
        tilePresentation: 'natural',
      });
    }
  });

  it('keeps terrain on canonical tiles and the legacy overlay explicit-only', () => {
    expect(resolveGeographicDrilldownPresentation('terrain', 'subregion')).toEqual({
      mode: 'tiles',
      tilePresentation: 'terrain',
    });
    expect(resolveGeographicDrilldownPresentation('overlay', 'subregion')).toEqual({
      mode: 'overlay',
      tilePresentation: 'natural',
    });
  });
});
