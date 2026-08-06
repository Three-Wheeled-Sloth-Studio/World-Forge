import type { GeographicRegionBounds } from '@world-forge/shared/geographicRegions';

export type GeographicAtlasContextRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function geographicAtlasContextRects(
  bounds: GeographicRegionBounds,
): GeographicAtlasContextRect[] {
  const y = clamp((90 - bounds.maxLatitude) / 180, 0, 1);
  const bottom = clamp((90 - bounds.minLatitude) / 180, 0, 1);
  const height = Math.max(0, bottom - y);
  const minLongitude = clamp(bounds.minLongitude, -180, 180);
  const maxLongitude = clamp(bounds.maxLongitude, -180, 180);
  const minX = clamp((minLongitude + 180) / 360, 0, 1);
  const maxX = clamp((maxLongitude + 180) / 360, 0, 1);

  if (bounds.wrapsLongitude || minX > maxX) {
    return [
      { x: minX, y, width: Math.max(0, 1 - minX), height },
      { x: 0, y, width: Math.max(0, maxX), height },
    ].filter((rect) => rect.width > 0 && rect.height > 0);
  }

  const width = Math.max(0, maxX - minX);
  return width > 0 && height > 0 ? [{ x: minX, y, width, height }] : [];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
