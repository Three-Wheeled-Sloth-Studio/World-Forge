import type { SystemCatalogEntry } from './systemPresentation';

export type SystemSelectorOption = {
  id: string;
  label: string;
  depth: 0 | 1;
  parentBodyId: string | null;
};

export function buildSystemSelectorOptions(
  catalog: SystemCatalogEntry[],
): SystemSelectorOption[] {
  return catalog.map((entry) => {
    const depth: 0 | 1 = entry.kind === 'moon' && Boolean(entry.parentBodyId) ? 1 : 0;
    return {
      id: entry.id,
      label: depth === 1 ? `\u00a0\u00a0${entry.label}` : entry.label,
      depth,
      parentBodyId: entry.parentBodyId,
    };
  });
}
