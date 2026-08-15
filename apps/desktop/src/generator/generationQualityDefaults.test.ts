import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GENERATION_RESOLUTION,
  defaultGenerationQualityOption,
  generationQualityLabel,
  markGenerationQualityDefaultRecentered,
  shouldRecenterGenerationQuality,
  type GenerationQualityStorage,
} from './generationQualityDefaults';

class MemoryStorage implements GenerationQualityStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const options = [
  { label: 'Fast 256 x 128', width: 256, height: 128 },
  { label: 'Default 512 x 256', width: 512, height: 256 },
  { label: 'Large 1024 x 512', width: 1024, height: 512 },
  { label: 'High 2048 x 1024', width: 2048, height: 1024 },
];

describe('generation quality default recenter', () => {
  it('makes 1024 x 512 the semantic Default while keeping 512 x 256 as Standard', () => {
    expect(generationQualityLabel(options[1])).toBe('Standard 512 x 256');
    expect(generationQualityLabel(options[2])).toBe('Default 1024 x 512');
    expect(defaultGenerationQualityOption(options)).toEqual(options[2]);
    expect(DEFAULT_GENERATION_RESOLUTION).toEqual({ width: 1024, height: 512 });
  });

  it('recenters a brand-new workspace from the legacy startup quality', () => {
    const storage = new MemoryStorage();
    expect(shouldRecenterGenerationQuality({ width: 2048, height: 1024 }, storage)).toBe(true);
  });

  it('recenters the persisted old 512 x 256 semantic Default once', () => {
    const storage = new MemoryStorage();
    storage.setItem('world_forge_workspace_v1', '{}');
    expect(shouldRecenterGenerationQuality({ width: 512, height: 256 }, storage)).toBe(true);
    markGenerationQualityDefaultRecentered(storage);
    expect(shouldRecenterGenerationQuality({ width: 512, height: 256 }, storage)).toBe(false);
  });

  it('preserves an explicitly persisted higher-quality choice', () => {
    const storage = new MemoryStorage();
    storage.setItem('world_forge_workspace_v1', '{}');
    expect(shouldRecenterGenerationQuality({ width: 2048, height: 1024 }, storage)).toBe(false);
  });
});
