import { describe, expect, it } from 'vitest';
import { spearmanRankCorrelation } from './earthMetrics';

describe('Earth downstream metric math', () => {
  it('reports perfect monotonic agreement independent of scale', () => {
    expect(spearmanRankCorrelation([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 10);
  });

  it('handles tied ranks deterministically', () => {
    expect(spearmanRankCorrelation([1, 1, 2, 3], [4, 4, 3, 1])).toBeLessThan(-0.9);
  });
});
