import type { SystemCatalogEntry } from './systemPresentation';

export type SystemSelectorOption = {
  id: string;
  label: string;
  depth: 0 | 1;
  parentBodyId: string | null;
};

type SelectorOptionElement = {
  value: string;
  textContent: string | null;
  label: string;
  dataset: Record<string, string | undefined>;
};

type SelectorElement = {
  options: ArrayLike<SelectorOptionElement>;
  dataset: Record<string, string | undefined>;
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

export function applySystemSelectorHierarchy(
  selector: SelectorElement,
  options: SystemSelectorOption[],
): number {
  const byId = new Map(options.map((option) => [option.id, option]));
  let repairs = 0;

  for (const htmlOption of Array.from(selector.options)) {
    const option = byId.get(htmlOption.value);
    if (!option) continue;
    const depth = String(option.depth);
    if (htmlOption.textContent !== option.label) {
      htmlOption.textContent = option.label;
      repairs += 1;
    }
    if (htmlOption.label !== option.label) {
      htmlOption.label = option.label;
      repairs += 1;
    }
    if (htmlOption.dataset.bodyDepth !== depth) {
      htmlOption.dataset.bodyDepth = depth;
      repairs += 1;
    }
    if (option.parentBodyId) {
      if (htmlOption.dataset.parentBodyId !== option.parentBodyId) {
        htmlOption.dataset.parentBodyId = option.parentBodyId;
        repairs += 1;
      }
    } else if (htmlOption.dataset.parentBodyId !== undefined) {
      delete htmlOption.dataset.parentBodyId;
      repairs += 1;
    }
  }

  selector.dataset.hierarchy = 'catalog-parent-v1';
  selector.dataset.hierarchySignature = options
    .map((option) => `${option.id}:${option.depth}:${option.parentBodyId ?? ''}:${option.label}`)
    .join('|');
  return repairs;
}
