import { describe, expect, it } from 'vitest';
import { DeepTimeProgressTracker, deepTimeSubstageForProgress } from './deepTimeInstrumentation';
import type { DeepTimeProgress } from './deepTimePipeline';

function progress(input: Partial<DeepTimeProgress> & Pick<DeepTimeProgress, 'phase'>): DeepTimeProgress {
  return {
    phase: input.phase,
    progress: input.progress ?? 0,
    message: input.message ?? input.phase,
    epochIndex: input.epochIndex,
    epochCount: input.epochCount
  };
}

describe('deep-time substage instrumentation', () => {
  it('maps the existing progress contract to meaningful substages', () => {
    expect(deepTimeSubstageForProgress(progress({ phase: 'initializing', progress: 0.04 }))?.id).toBe('setup-models');
    expect(deepTimeSubstageForProgress(progress({ phase: 'initializing', progress: 0.055 }))?.id).toBe('fragment-placement');
    expect(deepTimeSubstageForProgress(progress({ phase: 'epoch', progress: 0.3 }))?.id).toBe('surface-aging');
    expect(deepTimeSubstageForProgress(progress({ phase: 'reconciling', progress: 0.77 }))?.id).toBe('fragment-history');
    expect(deepTimeSubstageForProgress(progress({ phase: 'reconciling', progress: 0.79 }))?.id).toBe('water-reconciliation');
    expect(deepTimeSubstageForProgress(progress({ phase: 'reconciling', progress: 0.84 }))?.id).toBe('climate-rebuild');
    expect(deepTimeSubstageForProgress(progress({ phase: 'reconciling', progress: 0.89 }))?.id).toBe('hydrology-rebuild');
    expect(deepTimeSubstageForProgress(progress({ phase: 'reconciling', progress: 0.93 }))?.id).toBe('biome-projection-validation');
    expect(deepTimeSubstageForProgress(progress({ phase: 'complete', progress: 1 }))).toBeNull();
  });

  it('coalesces repeated epoch events into one surface-aging timing record', () => {
    let now = 0;
    const tracker = new DeepTimeProgressTracker(() => now);
    tracker.observe(progress({ phase: 'initializing', progress: 0.04, message: 'setup' }));
    now = 5;
    tracker.observe(progress({ phase: 'initializing', progress: 0.055, message: 'placement' }));
    now = 15;
    tracker.observe(progress({ phase: 'epoch', progress: 0.2, message: 'epoch 1' }));
    now = 25;
    tracker.observe(progress({ phase: 'epoch', progress: 0.4, message: 'epoch 2' }));
    now = 40;
    tracker.observe(progress({ phase: 'reconciling', progress: 0.77, message: 'history' }));
    now = 50;
    tracker.observe(progress({ phase: 'complete', progress: 1, message: 'complete' }));

    const records = tracker.finish();
    expect(records.map((record) => record.id)).toEqual([
      'setup-models',
      'fragment-placement',
      'surface-aging',
      'fragment-history'
    ]);
    expect(records.find((record) => record.id === 'surface-aging')).toMatchObject({
      elapsedMs: 25,
      progressEvents: 2
    });
  });
});
