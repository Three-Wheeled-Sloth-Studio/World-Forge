export type GenerationResolution = {
  width: number;
  height: number;
};

export type GenerationQualityOption = GenerationResolution & {
  label: string;
};

export type GenerationQualityStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const DEFAULT_GENERATION_RESOLUTION: GenerationResolution = {
  width: 1024,
  height: 512,
};

// Keep the migration marker separate from the workspace payload. The workspace
// storage key is the existing v1 contract owned by sync.ts; we only inspect its
// presence here so a brand-new install can be distinguished from an explicit
// saved High/Ultra choice without rewriting the workspace schema.
const workspaceStorageKey = 'world_forge_workspace_v1';
const defaultRecenterStorageKey = 'world_forge_generation_quality_default_v2';
const defaultRecenterValue = `${DEFAULT_GENERATION_RESOLUTION.width}x${DEFAULT_GENERATION_RESOLUTION.height}`;

export function generationQualityLabel(option: GenerationQualityOption): string {
  if (sameResolution(option, DEFAULT_GENERATION_RESOLUTION)) {
    return `Default ${option.width} x ${option.height}`;
  }
  if (option.width === 512 && option.height === 256) {
    return `Standard ${option.width} x ${option.height}`;
  }
  return option.label;
}

export function shouldRecenterGenerationQuality(
  current: GenerationResolution,
  storage: GenerationQualityStorage | undefined = globalThis.localStorage,
): boolean {
  if (sameResolution(current, DEFAULT_GENERATION_RESOLUTION)) return false;

  try {
    if (storage?.getItem(defaultRecenterStorageKey) === defaultRecenterValue) return false;
    const hasPersistedWorkspace = Boolean(storage?.getItem(workspaceStorageKey));
    if (!hasPersistedWorkspace) return true;

    // 512 x 256 was the old option explicitly labelled Default. Migrate that
    // semantic default once, but preserve saved High/Ultra/Fast choices.
    return current.width === 512 && current.height === 256;
  } catch {
    // If storage is unavailable, prefer correcting the known old Default but do
    // not silently downgrade a higher explicit quality selection.
    return current.width === 512 && current.height === 256;
  }
}

export function markGenerationQualityDefaultRecentered(
  storage: GenerationQualityStorage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(defaultRecenterStorageKey, defaultRecenterValue);
  } catch {
    // Persistence failure should not block generation controls.
  }
}

export function defaultGenerationQualityOption<T extends GenerationQualityOption>(options: T[]): T | undefined {
  return options.find((option) => sameResolution(option, DEFAULT_GENERATION_RESOLUTION));
}

function sameResolution(left: GenerationResolution, right: GenerationResolution): boolean {
  return left.width === right.width && left.height === right.height;
}
