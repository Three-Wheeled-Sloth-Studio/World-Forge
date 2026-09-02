import { describe, expect, it } from 'vitest';
import {
  catchmentIncumbentShareForTopology,
  DEFAULT_WETLAND_HYDROLOGY_MODEL,
  lakeWetnessSupportForTopology,
} from './wetlandHydrology';

describe('wetland hydrology scale support', () => {
  it('uses the accepted catchment budget model by default', () => {
    expect(DEFAULT_WETLAND_HYDROLOGY_MODEL).toBe('catchment-budget-v1');
  });
  it('requires stronger sink moisture support when a coarse cell represents a broader area', () => {
    expect(lakeWetnessSupportForTopology(64)).toBe(0.5);
    expect(lakeWetnessSupportForTopology(256)).toBe(0.35);
    expect(lakeWetnessSupportForTopology(1024)).toBe(0);
  });

  it('preserves more incumbent evidence on coarse catchment grids', () => {
    expect(catchmentIncumbentShareForTopology(64)).toBe(0.875);
    expect(catchmentIncumbentShareForTopology(256)).toBe(0.55);
    expect(catchmentIncumbentShareForTopology(1024)).toBe(0.55);
  });
});
