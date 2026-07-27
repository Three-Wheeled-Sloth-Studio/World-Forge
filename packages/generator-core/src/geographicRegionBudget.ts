import type { WorldHexOverlay } from '@world-forge/shared';
import type { GeographicRegionScaleBudget } from '@world-forge/shared/geographicRegions';

const DEFAULT_OVERVIEW_HEXES_PER_REGION = 48;
const MINIMUM_REGION_COUNT = 4;
const MAXIMUM_REGION_COUNT = 64;

export function deriveGeographicRegionScaleBudget(
  overlay: WorldHexOverlay,
  targetRegionCount?: number,
): GeographicRegionScaleBudget {
  const overview = overlay.levels.find((level) => level.id === 'world-500mi');
  if (!overview) throw new Error('The world hex overlay is missing the world-500mi overview level.');

  const overviewHexCount = Math.max(1, overview.dimensions.columns * overview.dimensions.rows);
  const derivedTarget = clamp(
    Math.round(overviewHexCount / DEFAULT_OVERVIEW_HEXES_PER_REGION),
    MINIMUM_REGION_COUNT,
    MAXIMUM_REGION_COUNT,
  );
  const cleanTarget = clamp(
    Math.round(targetRegionCount ?? derivedTarget),
    Math.min(MINIMUM_REGION_COUNT, overviewHexCount),
    Math.min(MAXIMUM_REGION_COUNT, overviewHexCount),
  );
  const preferred = overviewHexCount / cleanTarget;

  return {
    overviewLevelId: 'world-500mi',
    targetDisplayLevelId: 'world-60mi',
    overviewHexCount,
    targetRegionCount: cleanTarget,
    preferredOverviewHexesPerRegion: round(preferred, 2),
    minOverviewHexesPerRegion: round(Math.max(1, preferred * 0.35), 2),
    maxOverviewHexesPerRegion: round(Math.max(2, preferred * 2.2), 2),
    minAreaShare: round(0.35 / cleanTarget, 8),
    maxAreaShare: round(Math.min(1, 2.2 / cleanTarget), 8),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
