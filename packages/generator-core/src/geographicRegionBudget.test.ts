import { describe, expect, it } from 'vitest';
import { buildFlatWorldHexOverlay } from './worldHexOverlay';
import {
  buildGeographicOverviewSectors,
  deriveGeographicRegionScaleBudget,
} from './geographicRegionBudget';

describe('geographic region scale budget', () => {
  it('derives first-level regions from a preferred 20 by 20 world-60mi viewport', () => {
    const overlay = buildFlatWorldHexOverlay(1);
    const budget = deriveGeographicRegionScaleBudget(overlay);

    expect(budget.overviewLevelId).toBe('world-500mi');
    expect(budget.targetDisplayLevelId).toBe('world-60mi');
    expect(budget.targetRegionCount).toBeGreaterThanOrEqual(200);
    expect(budget.targetRegionCount).toBeLessThanOrEqual(300);
    expect(budget.preferredDisplayHexesPerRegion).toBe(400);
    expect(budget.minDisplayHexesPerRegion).toBe(100);
    expect(budget.maxDisplayHexesPerRegion).toBe(2500);
    expect(budget.minAreaShare).toBeLessThan(budget.maxAreaShare);
  });

  it('honors an explicit target while retaining safety bounds', () => {
    const overlay = buildFlatWorldHexOverlay(1);

    expect(deriveGeographicRegionScaleBudget(overlay, 12).targetRegionCount).toBe(12);
    expect(deriveGeographicRegionScaleBudget(overlay, 10000).targetRegionCount).toBe(4096);
  });

  it('defines four stable overview sectors at the 500-mile level', () => {
    const sectors = buildGeographicOverviewSectors();

    expect(sectors).toHaveLength(4);
    expect(sectors.map((sector) => sector.id)).toEqual([
      'overview-northwest',
      'overview-northeast',
      'overview-southwest',
      'overview-southeast',
    ]);
    expect(sectors.every((sector) => sector.levelId === 'world-500mi')).toBe(true);
  });
});
