import { describe, expect, it } from 'vitest';
import {
  buildGenerationStageChart,
  formatGenerationStagePercentage,
  generationStageTooltipText,
  pieSlicePath
} from './generationStageChart';

describe('generation stage timing chart', () => {
  it('normalizes measured stage time into a complete pie while retaining zero-time stages', () => {
    const chart = buildGenerationStageChart([
      { stageId: 'biomes', label: 'Biomes and features', elapsedMs: 49_000 },
      { stageId: 'foundation', label: 'Initial world foundation', elapsedMs: 46_000 },
      { stageId: 'aging', label: 'Deep-time aging', elapsedMs: 14_000 },
      { stageId: 'plates', label: 'Plate and craton structure', elapsedMs: 13_000 },
      { stageId: 'crust', label: 'Primordial crust', elapsedMs: 4_600 },
      { stageId: 'outputs', label: 'Outputs and validation', elapsedMs: 4_500 },
      { stageId: 'orbit', label: 'System and orbit', elapsedMs: 1 },
      { stageId: 'climate', label: 'Present-day climate', elapsedMs: 0 }
    ]);

    expect(chart.totalElapsedMs).toBe(131_101);
    expect(chart.slices).toHaveLength(8);
    expect(chart.slices.reduce((total, slice) => total + slice.percentage, 0)).toBeCloseTo(100, 8);
    expect(chart.slices[0].percentage).toBeCloseTo(37.3758, 3);
    expect(chart.slices[0].path).toContain('A 66 66');
    expect(chart.slices.at(-1)?.percentage).toBe(0);
    expect(chart.slices.at(-1)?.path).toBe('');
  });

  it('produces the same absolute and percentage values used by hover and focus text', () => {
    const chart = buildGenerationStageChart([
      { stageId: 'biomes', label: 'Biomes and features', elapsedMs: 49_000 },
      { stageId: 'other', label: 'Other work', elapsedMs: 83_000 }
    ]);
    expect(formatGenerationStagePercentage(chart.slices[0].percentage)).toBe('37.1%');
    expect(generationStageTooltipText(chart.slices[0])).toBe(
      'Biomes and features\n49 s\n37.1% of measured stage time'
    );
  });

  it('handles a single measured stage and invalid durations without invalid geometry', () => {
    const chart = buildGenerationStageChart([
      { stageId: 'only', label: 'Only stage', elapsedMs: 10 },
      { stageId: 'invalid', label: 'Invalid stage', elapsedMs: Number.NaN }
    ]);
    expect(chart.totalElapsedMs).toBe(10);
    expect(chart.slices[0].percentage).toBe(100);
    expect(chart.slices[0].path).toContain('A 66 66 0 1 1');
    expect(pieSlicePath(0, 0)).toBe('');
  });
});
