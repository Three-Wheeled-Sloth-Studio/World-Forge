import { describe, expect, it } from 'vitest';
import {
  isTtrpgWorldPresentation,
  supportsTtrpgWorldPresentation,
  worldPresentationOptions,
} from './workspacePresentations';

describe('world presentation options', () => {
  it('exposes TTRPG beside Data and Natural in the top-level presentation selector', () => {
    expect(worldPresentationOptions.map((option) => option.value)).toEqual(['data', 'natural', 'ttrpg']);
    expect(worldPresentationOptions.map((option) => option.label)).toEqual(['Data', 'Natural', 'TTRPG']);
  });

  it('keeps TTRPG as a Biomes presentation for map and globe, not system or analytical layers', () => {
    expect(supportsTtrpgWorldPresentation('map', 'biomes')).toBe(true);
    expect(supportsTtrpgWorldPresentation('globe', 'biomes')).toBe(true);
    expect(supportsTtrpgWorldPresentation('system', 'biomes')).toBe(false);
    expect(supportsTtrpgWorldPresentation('map', 'elevation')).toBe(false);
    expect(supportsTtrpgWorldPresentation('globe', 'elevation')).toBe(false);
  });

  it('recognizes the runtime TTRPG presentation token', () => {
    expect(isTtrpgWorldPresentation('ttrpg')).toBe(true);
    expect(isTtrpgWorldPresentation('natural')).toBe(false);
  });
});
