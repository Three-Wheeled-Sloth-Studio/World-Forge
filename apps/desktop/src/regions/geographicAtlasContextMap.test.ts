import { describe, expect, it } from 'vitest';
import { geographicAtlasContextRects } from './geographicAtlasContextMap';

describe('geographicAtlasContextRects', () => {
  it('maps an ordinary geographic extent into one normalized rectangle', () => {
    const [rect] = geographicAtlasContextRects({
      minLatitude: -30,
      maxLatitude: 60,
      minLongitude: -90,
      maxLongitude: 45,
      wrapsLongitude: false,
    });

    expect(rect).toBeDefined();
    expect(rect.x).toBeCloseTo(0.25);
    expect(rect.y).toBeCloseTo(1 / 6);
    expect(rect.width).toBeCloseTo(0.375);
    expect(rect.height).toBeCloseTo(0.5);
  });

  it('splits a seam-crossing extent into compact edge rectangles', () => {
    const rects = geographicAtlasContextRects({
      minLatitude: -20,
      maxLatitude: 20,
      minLongitude: 150,
      maxLongitude: -160,
      wrapsLongitude: true,
    });

    expect(rects).toHaveLength(2);
    expect(rects[0].x).toBeCloseTo(11 / 12);
    expect(rects[0].y).toBeCloseTo(7 / 18);
    expect(rects[0].width).toBeCloseTo(1 / 12);
    expect(rects[0].height).toBeCloseTo(2 / 9);
    expect(rects[1].x).toBe(0);
    expect(rects[1].y).toBeCloseTo(7 / 18);
    expect(rects[1].width).toBeCloseTo(1 / 18);
    expect(rects[1].height).toBeCloseTo(2 / 9);
  });
});
