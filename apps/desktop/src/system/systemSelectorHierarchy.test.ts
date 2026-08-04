import { describe, expect, it } from 'vitest';
import type { SystemCatalogEntry } from './systemPresentation';
import { buildSystemSelectorOptions } from './systemSelectorHierarchy';

function entry(
  id: string,
  label: string,
  kind: SystemCatalogEntry['kind'],
  parentBodyId: string | null,
): SystemCatalogEntry {
  return {
    id,
    label,
    kind,
    parentBodyId,
    generationStatus: 'ready',
    generationEligible: false,
    generationProfile: null,
    generationReason: 'Selector test',
    body: null,
    physicalOrbit: null,
  };
}

describe('System selector hierarchy', () => {
  it('indents moons without changing stable option values or peer entries', () => {
    const options = buildSystemSelectorOptions([
      entry('earth', 'Earth', 'rocky', 'sol'),
      entry('earth:luna', 'Luna', 'moon', 'earth'),
      entry('main-belt', 'Main Asteroid Belt', 'belt', 'sol'),
    ]);

    expect(options.map((option) => option.id)).toEqual([
      'earth',
      'earth:luna',
      'main-belt',
    ]);
    expect(options[0]).toMatchObject({ label: 'Earth', depth: 0 });
    expect(options[1]).toMatchObject({
      label: '\u00a0\u00a0Luna',
      depth: 1,
      parentBodyId: 'earth',
    });
    expect(options[2]).toMatchObject({
      label: 'Main Asteroid Belt',
      depth: 0,
    });
  });
});
