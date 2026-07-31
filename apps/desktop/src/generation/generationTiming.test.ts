import { describe, expect, it } from 'vitest';
import { buildGenerationRunSummary, formatGenerationDuration } from './generationTiming';

describe('generation timing presentation', () => {
  it('formats millisecond, second, and minute durations compactly', () => {
    expect(formatGenerationDuration(842)).toBe('842 ms');
    expect(formatGenerationDuration(5400)).toBe('5.4 s');
    expect(formatGenerationDuration(65_000)).toBe('1m 05s');
  });

  it('identifies the slowest completed native stage without reordering the breakdown', () => {
    const summary = buildGenerationRunSummary({
      completedAt: '2026-07-31T13:20:00.000Z',
      workflowId: 'core.world-generation-experimental',
      workflowLabel: 'World Generation (Experimental)',
      workflowVersion: '0.2.0',
      totalElapsedMs: 5100,
      stages: [
        { stageId: 'world.present-climate', label: 'Present-day climate', elapsedMs: 710 },
        { stageId: 'world.biomes-features', label: 'Biomes and features', elapsedMs: 735 },
        { stageId: 'world.outputs-validation', label: 'Outputs and validation', elapsedMs: 80 }
      ]
    });

    expect(summary.slowestStage).toEqual({
      stageId: 'world.biomes-features',
      label: 'Biomes and features',
      elapsedMs: 735
    });
    expect(summary.stages.map((stage) => stage.stageId)).toEqual([
      'world.present-climate',
      'world.biomes-features',
      'world.outputs-validation'
    ]);
  });

  it('drops invalid stage timings and clamps invalid totals', () => {
    const summary = buildGenerationRunSummary({
      completedAt: '2026-07-31T13:20:00.000Z',
      workflowId: 'core.performance-foundation',
      workflowLabel: 'World Generation (Detailed)',
      workflowVersion: '1.0.0',
      totalElapsedMs: Number.NaN,
      stages: [
        { stageId: 'bad', label: 'Bad', elapsedMs: Number.NaN },
        { stageId: 'negative', label: 'Negative', elapsedMs: -1 }
      ]
    });

    expect(summary.totalElapsedMs).toBe(0);
    expect(summary.stages).toEqual([]);
    expect(summary.slowestStage).toBeUndefined();
  });
});
