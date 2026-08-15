import { describe, expect, it } from 'vitest';
import { supportsTtrpgWorldPresentation, worldPresentationOptions } from './workspacePresentations';

describe('world presentation availability', () => {
  it('exposes TTRPG for both map and globe biome views', () => {
    const ttrpg = worldPresentationOptions.find((option) => option.value === 'ttrpg');

    expect(ttrpg?.mapOnly).toBe(false);
    expect(supportsTtrpgWorldPresentation('map', 'biomes')).toBe(true);
    expect(supportsTtrpgWorldPresentation('globe', 'biomes')).toBe(true);
    expect(supportsTtrpgWorldPresentation('system', 'biomes')).toBe(false);
    expect(supportsTtrpgWorldPresentation('globe', 'elevation')).toBe(false);
  });
});
