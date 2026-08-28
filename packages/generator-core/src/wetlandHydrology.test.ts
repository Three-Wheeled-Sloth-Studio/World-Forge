import { describe, expect, it } from 'vitest';
import { lakeWetnessSupportForTopology } from './wetlandHydrology';

describe('wetland hydrology scale support', () => {
  it('requires stronger sink moisture support when a coarse cell represents a broader area', () => {
    expect(lakeWetnessSupportForTopology(64)).toBe(0.5);
    expect(lakeWetnessSupportForTopology(256)).toBe(0.35);
    expect(lakeWetnessSupportForTopology(1024)).toBe(0);
  });
});
