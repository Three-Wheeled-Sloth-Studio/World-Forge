import type { WorldHexOverlay } from '@world-forge/shared';
import type {
  GeographicOverviewSector,
  GeographicRegionScaleBudget,
} from '@world-forge/shared/geographicRegions';

const MINIMUM_VIEWPORT_SIDE = 10;
const PREFERRED_VIEWPORT_SIDE = 20;
const MAXIMUM_VIEWPORT_SIDE = 50;
const MINIMUM_REGION_COUNT = 4;
const MAXIMUM_REGION_COUNT = 4096;

export function deriveGeographicRegionScaleBudget(
  overlay: WorldHexOverlay,
  targetRegionCount?: number,
): GeographicRegionScaleBudget {
  const overview = overlay.levels.find((level) => level.id === 'world-500mi');
  if (!overview) throw new Error('The world hex overlay is missing the world-500mi overview level.');
  const targetDisplay = overlay.levels.find((level) => level.id === 'world-60mi');
  if (!targetDisplay) throw new Error('The world hex overlay is missing the world-60mi display level.');

  const overviewHexCount = Math.max(1, overview.dimensions.columns * overview.dimensions.rows);
  const targetDisplayHexCount = Math.max(
    1,
    targetDisplay.dimensions.columns * targetDisplay.dimensions.rows,
  );
  const preferredDisplayHexesPerRegion = PREFERRED_VIEWPORT_SIDE ** 2;
  const derivedTarget = clamp(
    Math.round(targetDisplayHexCount / preferredDisplayHexesPerRegion),
    MINIMUM_REGION_COUNT,
    MAXIMUM_REGION_COUNT,
  );
  const cleanTarget = clamp(
    Math.round(targetRegionCount ?? derivedTarget),
    Math.min(MINIMUM_REGION_COUNT, overviewHexCount),
    Math.min(MAXIMUM_REGION_COUNT, targetDisplayHexCount),
  );

  return {
    overviewLevelId: 'world-500mi',
    targetDisplayLevelId: 'world-60mi',
    overviewHexCount,
    targetDisplayHexCount,
    targetRegionCount: cleanTarget,
    minimumViewportHexColumns: MINIMUM_VIEWPORT_SIDE,
    minimumViewportHexRows: MINIMUM_VIEWPORT_SIDE,
    preferredViewportHexColumns: PREFERRED_VIEWPORT_SIDE,
    preferredViewportHexRows: PREFERRED_VIEWPORT_SIDE,
    maximumViewportHexColumns: MAXIMUM_VIEWPORT_SIDE,
    maximumViewportHexRows: MAXIMUM_VIEWPORT_SIDE,
    preferredDisplayHexesPerRegion,
    minDisplayHexesPerRegion: MINIMUM_VIEWPORT_SIDE ** 2,
    maxDisplayHexesPerRegion: MAXIMUM_VIEWPORT_SIDE ** 2,
    minAreaShare: round((MINIMUM_VIEWPORT_SIDE ** 2) / targetDisplayHexCount, 8),
    maxAreaShare: round(Math.min(1, (MAXIMUM_VIEWPORT_SIDE ** 2) / targetDisplayHexCount), 8),
  };
}

export function buildGeographicOverviewSectors(): GeographicOverviewSector[] {
  return [
    sector('overview-northwest', 0, 0, 90, -180, 0),
    sector('overview-northeast', 1, 0, 90, 0, 180),
    sector('overview-southwest', 2, -90, 0, -180, 0),
    sector('overview-southeast', 3, -90, 0, 0, 180),
  ];
}

function sector(
  id: GeographicOverviewSector['id'],
  index: number,
  minLatitude: number,
  maxLatitude: number,
  minLongitude: number,
  maxLongitude: number,
): GeographicOverviewSector {
  return {
    id,
    index,
    levelId: 'world-500mi',
    bounds: {
      minLatitude,
      maxLatitude,
      minLongitude,
      maxLongitude,
      wrapsLongitude: false,
    },
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
