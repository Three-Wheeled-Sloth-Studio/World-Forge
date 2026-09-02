import { describe, expect, it } from 'vitest';
import { catchmentIncumbentShareForTopology, lakeWetnessSupportForTopology } from './wetlandHydrology';

describe('wetland hydrology scale support', () => {
  it('requires stronger sink moisture support when a coarse cell represents a broader area', () => {
    expect(lakeWetnessSupportForTopology(64)).toBe(0.5);
    expect(lakeWetnessSupportForTopology(256)).toBe(0.35);
    expect(lakeWetnessSupportForTopology(1024)).toBe(0);
  });

  it('preserves more incumbent evidence on coarse catchment grids', () => {
    expect(catchmentIncumbentShareForTopology(64)).toBe(0.875);
    expect(catchmentIncumbentShareForTopology(256)).toBe(0.5);
    expect(catchmentIncumbentShareForTopology(1024)).toBe(0.5);
  });
});
