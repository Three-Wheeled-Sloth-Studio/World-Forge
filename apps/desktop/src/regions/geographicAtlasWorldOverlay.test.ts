import { describe, expect, it } from 'vitest';
import { worldMacroOverlayCanvasBox } from './geographicAtlasWorldOverlay';

describe('world atlas overlay alignment', () => {
  it('uses the displayed base-canvas box rather than stretching across the workspace', () => {
    expect(worldMacroOverlayCanvasBox(
      { left: 180, top: 96, width: 1280, height: 640 },
      { left: 24, top: 40, width: 1536, height: 864 },
    )).toEqual({
      left: 156,
      top: 56,
      width: 1280,
      height: 640,
    });
  });
});
