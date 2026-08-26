import { describe, expect, it } from 'vitest';
import { renderValidationReportMarkdown } from './report';
import {
  runValidationScenario,
  type ValidationAdapter,
  type ValidationMetricDefinition,
  type ValidationScenario,
} from './validation';

type Input = { value: number };
type Output = { doubled: number };
type Observations = { expected: number };

const scenario: ValidationScenario<Input, Observations> = {
  id: 'synthetic',
  label: 'Synthetic scenario',
  tier: 'fast',
  input: { value: 4 },
  observations: { expected: 8 },
};

const adapter: ValidationAdapter<Input, Output> = {
  id: 'doubling-adapter',
  version: '1',
  run: (input) => ({ output: { doubled: input.value * 2 }, performance: { wallMs: 1.5 } }),
};

const metric: ValidationMetricDefinition<Output, Observations> = {
  id: 'absolute-error',
  label: 'Absolute error',
  component: 'synthetic',
  evidence: 'structural-invariant',
  unit: 'value',
  proves: 'The adapter returns the expected deterministic result.',
  doesNotProve: 'Any scientific behavior.',
  threshold: { maximum: 0 },
  evaluate: (output, observations) => ({ value: Math.abs(output.doubled - observations.expected), sampleCount: 1 }),
};

describe('runValidationScenario', () => {
  it('evaluates component gates and renders their evidence limits', async () => {
    const report = await runValidationScenario(scenario, adapter, [metric], {
      generatedAt: '2026-08-26T00:00:00.000Z',
    });

    expect(report.summary).toEqual({ passed: true, evaluatedMetrics: 1, failedThresholds: 0, failedBaselines: 0 });
    expect(report.metrics[0]).toMatchObject({ value: 0, sampleCount: 1, thresholdPassed: true });
    expect(renderValidationReportMarkdown(report)).toContain('Does not prove: Any scientific behavior.');
  });

  it('compares directional baselines with tolerances', async () => {
    const report = await runValidationScenario(scenario, adapter, [metric], {
      baseline: {
        scenarioId: scenario.id,
        adapterId: adapter.id,
        metrics: {
          'absolute-error': { value: 0, absoluteTolerance: 0.1, regressionDirection: 'lower' },
        },
      },
    });

    expect(report.metrics[0]).toMatchObject({ baselineValue: 0, baselineDelta: 0, baselinePassed: true });
  });

  it('rejects duplicate metric IDs', async () => {
    await expect(runValidationScenario(scenario, adapter, [metric, metric])).rejects.toThrow('Duplicate validation metric ID');
  });

  it('rejects non-finite metric values', async () => {
    await expect(runValidationScenario(scenario, adapter, [{ ...metric, evaluate: () => ({ value: Number.NaN }) }]))
      .rejects.toThrow('non-finite');
  });

  it('rejects baselines for a different adapter version', async () => {
    await expect(runValidationScenario(scenario, adapter, [metric], {
      baseline: {
        scenarioId: scenario.id,
        adapterId: adapter.id,
        adapterVersion: 'older',
        metrics: {},
      },
    })).rejects.toThrow('adapter version');
  });
});
