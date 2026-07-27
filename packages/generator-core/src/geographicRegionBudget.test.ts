import { describe, expect, it } from 'vitest';
import { buildFlatWorldHexOverlay } from './worldHexOverlay';
import { deriveGeographicRegionScaleBudget } from './geographicRegionBudget';

describe('geographic region scale budget', () => {
  it('derives a bounded broad-region target from the world overview hexes', () => {
    const overlay = buildFlatWorldHexOverlay(1);
    const budget = deriveGeographicRegionScaleBudget(overlay);

    expect(budget.overviewLevelId).toBe('world-500mi');
    expect(budget.targetDisplayLevelId).toBe('world-60mi');
    expect(budget.targetRegionCount).toBeGreaterThanOrEqual(20);
    expect(budget.targetRegionCount).toBeLessThanOrEqual(40);
    expect(budget.minOverviewHexesPerRegion).toBeLessThan(budget.preferredOverviewHexesPerRegion);
    expect(budget.maxOverviewHexesPerRegion).toBeGreaterThan(budget.preferredOverviewHexesPerRegion);
    expect(budget.minAreaShare).toBeLessThan(budget.maxAreaShare);
  });

  it('honors an explicit target while retaining safety bounds', () => {
    const overlay = buildFlatWorldHexOverlay(1);

    expect(deriveGeographicRegionScaleBudget(overlay, 12).targetRegionCount).toBe(12);
    expect(deriveGeographicRegionScaleBudget(overlay, 1000).targetRegionCount).toBe(64);
  });
});
