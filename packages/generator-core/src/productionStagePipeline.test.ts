import { describe, expect, it } from 'vitest';
import type { GenerationDiagnostics } from '@world-forge/shared';
import { appendProductionPerformanceDiagnostics } from './productionStagePipeline';

describe('production performance attribution', () => {
  it('replaces overlapping wrapper phases with non-overlapping production stages', () => {
    const diagnostics = {
      totalMs: 100,
      phases: [
        { name: 'primary-world', ms: 30 },
        { name: 'plate-motion-vector-scaling', ms: 2 },
        { name: 'deep-time-aging', ms: 50 },
        { name: 'terminal-orbital-phase-alignment-and-reconciliation', ms: 3 },
        { name: 'biomes.cohesion', ms: 4 },
        { name: 'biomes.diagnostics', ms: 1 },
        { name: 'metrics', ms: 2 }
      ]
    } as GenerationDiagnostics;

    appendProductionPerformanceDiagnostics(diagnostics, [], 95);

    expect(diagnostics.phases.some((phase) => phase.name === 'deep-time-aging')).toBe(false);
    expect(diagnostics.phases).toEqual(expect.arrayContaining([
      { name: 'production.stage.foundation', ms: 30 },
      { name: 'production.stage.motion', ms: 2 },
      { name: 'production.stage.history', ms: 50 },
      { name: 'production.stage.reconciliation', ms: 3 },
      { name: 'production.stage.postprocess', ms: 5 },
      { name: 'production.stage.unattributed', ms: 5 },
      { name: 'metrics', ms: 2 }
    ]));
  });

  it('aggregates repeated fine-operation records and excludes parent wrappers', () => {
    const diagnostics = { totalMs: 20, phases: [] } as GenerationDiagnostics;

    appendProductionPerformanceDiagnostics(diagnostics, [
      { name: 'basin-circulation.pack-gyres', elapsedMs: 6 },
      { name: 'basin-circulation.pack-gyres', elapsedMs: 4 },
      { name: 'basin-circulation', elapsedMs: 12, parent: true }
    ], 20);

    expect(diagnostics.phases).toContainEqual({
      name: 'performance.operation.basin-circulation.pack-gyres',
      ms: 10
    });
    expect(diagnostics.phases.some((phase) => phase.name === 'performance.operation.basin-circulation')).toBe(false);
  });
});
