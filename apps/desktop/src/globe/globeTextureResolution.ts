import type { Resolution } from '@world-forge/shared';

const PRODUCT_MAX_GLOBE_TEXTURE_EDGE = 4096;

export function globeTextureResolutionForSource(
  source: Resolution,
  maxTextureSize = PRODUCT_MAX_GLOBE_TEXTURE_EDGE,
): Resolution {
  const sourceWidth = Math.max(1, Math.round(source.width));
  const sourceHeight = Math.max(1, Math.round(source.height));
  const deviceLimit = Number.isFinite(maxTextureSize)
    ? Math.max(1, Math.floor(maxTextureSize))
    : PRODUCT_MAX_GLOBE_TEXTURE_EDGE;
  const maxEdge = Math.min(PRODUCT_MAX_GLOBE_TEXTURE_EDGE, deviceLimit);
  const scale = Math.min(1, maxEdge / sourceWidth, maxEdge / sourceHeight);

  return {
    width: Math.max(1, Math.floor(sourceWidth * scale)),
    height: Math.max(1, Math.floor(sourceHeight * scale)),
  };
}
