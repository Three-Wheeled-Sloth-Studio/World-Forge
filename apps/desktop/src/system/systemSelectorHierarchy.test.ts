import { describe, expect, it } from 'vitest';
import type { SystemCatalogEntry } from './systemPresentation';
import {
  applySystemSelectorHierarchy,
  buildSystemSelectorOptions,
} from './systemSelectorHierarchy';

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

  it('repairs labels idempotently after React rewrites native options', () => {
    const options = buildSystemSelectorOptions([
      entry('earth', 'Earth', 'rocky', 'sol'),
      entry('earth:luna', 'Luna', 'moon', 'earth'),
    ]);
    const selector = {
      dataset: {} as Record<string, string | undefined>,
      options: [
        { value: 'earth', textContent: 'Earth', label: 'Earth', dataset: {} as Record<string, string | undefined> },
        { value: 'earth:luna', textContent: 'Luna', label: 'Luna', dataset: {} as Record<string, string | undefined> },
      ],
    };

    expect(applySystemSelectorHierarchy(selector, options)).toBeGreaterThan(0);
    expect(selector.options[1]).toMatchObject({
      value: 'earth:luna',
      textContent: '\u00a0\u00a0Luna',
      label: '\u00a0\u00a0Luna',
      dataset: { bodyDepth: '1', parentBodyId: 'earth' },
    });
    expect(selector.dataset.hierarchy).toBe('catalog-parent-v1');
    expect(applySystemSelectorHierarchy(selector, options)).toBe(0);
  });
});
